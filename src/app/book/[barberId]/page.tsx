'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import {
  UserProfile,
  Availability,
  ServiceCategory,
  Booking,
  TimeSlot,
} from '@/lib/types';
import { useUser } from '@/firebase';
import { Header } from '@/components/Header';
import { Loader2, Calendar as CalendarIcon, Clock, Tag, MapPin } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { generateTimeSlots } from '@/lib/data';
import { format, isToday, isTomorrow, addDays, startOfDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { setDefaultOptions } from 'date-fns/setDefaultOptions';

export default function BookingPage() {
  const { barberId } = useParams();
  const { user, db, userProfile, loading: userLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  // Set default locale for date-fns
  useEffect(() => {
    setDefaultOptions({ locale: enUS });
  }, []);

  const [barber, setBarber] = useState<UserProfile | null>(null);
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [services, setServices] = useState<ServiceCategory[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    startOfDay(new Date())
  );
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!db || !barberId) return;

    const fetchBarberData = async () => {
      setIsLoading(true);
      try {
        // Fetch barber profile
        const barberRef = doc(db, 'users', barberId as string);
        const barberSnap = await getDoc(barberRef);
        if (barberSnap.exists()) {
          setBarber(barberSnap.data() as UserProfile);
        } else {
          toast({ variant: 'destructive', title: 'Barber not found' });
          router.push('/');
          return;
        }

        // Fetch availability
        const availabilityRef = doc(db, 'availability', barberId as string);
        const availabilitySnap = await getDoc(availabilityRef);
        if (availabilitySnap.exists()) {
          setAvailability(availabilitySnap.data() as Availability);
        }

        // Fetch services
        const servicesQuery = query(
          collection(db, 'services'),
          where('barberId', '==', barberId)
        );
        const servicesSnapshot = await getDocs(servicesQuery);
        setServices(
          servicesSnapshot.docs.map(
            (doc) => ({ id: doc.id, ...doc.data() } as ServiceCategory)
          )
        );
      } catch (error) {
        console.error('Error fetching barber data:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load barber details.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchBarberData();

    // Listen for bookings in real-time
    const bookingsQuery = query(
      collection(db, 'bookings'),
      where('barberId', '==', barberId)
    );
    const unsubscribe = onSnapshot(bookingsQuery, (snapshot) => {
      setBookings(snapshot.docs.map((doc) => doc.data() as Booking));
    });

    return () => unsubscribe();
  }, [db, barberId, router, toast]);

  const getAvailableSlots = (): TimeSlot[] => {
    if (!availability || !selectedDate) return [];

    const dayName = format(selectedDate, 'EEEE').toLowerCase();
    const daySchedule = availability.schedule[dayName];

    if (!daySchedule || !daySchedule.isEnabled) return [];

    const { startTime, endTime } = daySchedule;
    const { slotDuration } = availability;
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    const allSlots = generateTimeSlots(
      startHour,
      startMinute,
      endHour,
      endMinute,
      slotDuration
    );

    // Filter out past slots for today
    if (isToday(selectedDate)) {
      const now = new Date();
      const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
      
      return allSlots.filter(slot => {
        const [slotHour, slotMinute] = slot.time.split(':').map(Number);
        const slotTimeMinutes = slotHour * 60 + slotMinute;
        return slotTimeMinutes > currentTimeMinutes + 30; // 30 min buffer
      });
    }

    return allSlots;
  };

  const handleServiceToggle = (serviceId: string) => {
    setSelectedServices((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleReserve = async () => {
    if (!user || !db || !selectedDate || !selectedTime || selectedServices.length === 0) {
        toast({
            variant: 'destructive',
            title: 'Missing Information',
            description: 'Please select a date, time, and at least one service.',
        });
        return;
    }

    setIsSubmitting(true);
    const bookingDate = format(selectedDate, 'yyyy-MM-dd');
    const bookingId = `${barberId}_${bookingDate}_${selectedTime.replace(':', '')}`;

    try {
        const bookingRef = doc(db, 'bookings', bookingId);
        const bookingSnap = await getDoc(bookingRef);

        if (bookingSnap.exists()) {
            toast({
                variant: 'destructive',
                title: 'Slot Unavailable',
                description: 'This time slot has just been booked. Please select another time.',
            });
            setIsSubmitting(false);
            return;
        }

        const newBooking: Booking = {
            id: bookingId,
            barberId: barberId as string,
            clientId: user.uid,
            clientName: userProfile?.name || user.displayName || 'Anonymous',
            date: bookingDate,
            time: selectedTime,
            serviceIds: selectedServices,
            status: 'confirmed',
        };

        await setDoc(bookingRef, newBooking);
        toast({
            title: 'Booking Confirmed!',
            description: `Your appointment with ${barber?.name} on ${format(selectedDate, 'PPP')} at ${selectedTime} is confirmed.`,
        });
        router.push('/');

    } catch (error: any) {
        console.error('Error creating booking:', error);
        toast({
            variant: 'destructive',
            title: 'Booking Failed',
            description: 'An unexpected error occurred. Please try again.',
        });
    } finally {
        setIsSubmitting(false);
    }
  };


  if (isLoading || userLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!barber) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto p-4 text-center">
          <p>Barber not found.</p>
        </main>
      </div>
    );
  }

  const availableSlots = getAvailableSlots();

  const getDateDisplayText = (date: Date | undefined) => {
    if (!date) return 'Select a date';
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEEE, MMMM dd');
  };

  const isDayDisabled = (date: Date) => {
    // Disable past dates
    if (date < startOfDay(new Date())) return true;
    
    // Disable dates beyond 30 days from now
    if (date > addDays(new Date(), 30)) return true;
    
    // Disable if barber is not available on this day
    if (!availability?.schedule) return true;
    
    const dayName = format(date, 'EEEE').toLowerCase();
    const daySchedule = availability.schedule[dayName];
    
    return !daySchedule || !daySchedule.isEnabled;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-6xl p-4 md:p-6">
        {/* Barber Profile Header */}
        <Card className="mb-8">
          <CardHeader className="pb-6">
            <div className="flex flex-col items-center text-center sm:flex-row sm:text-left">
              <Avatar className="h-24 w-24 mb-4 sm:mb-0 sm:mr-6">
                <AvatarImage src="" alt={barber.name} />
                <AvatarFallback className="text-2xl font-bold">
                  {barber.name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <CardTitle className="text-3xl mb-2">{barber.name}</CardTitle>
                <CardDescription className="flex items-center justify-center sm:justify-start text-base mb-2">
                  <MapPin className="h-4 w-4 mr-1" />
                  {barber.address}
                </CardDescription>
                <div className="text-sm text-muted-foreground">
                  Professional Barber • Book your appointment
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid gap-8 lg:grid-cols-12">
          {/* Date & Time Selection */}
          <Card className="lg:col-span-7">
            <CardHeader>
              <CardTitle className="flex items-center text-xl">
                <CalendarIcon className="mr-2 h-5 w-5" />
                Select Date & Time
              </CardTitle>
              <CardDescription>
                Choose your preferred appointment date and time slot
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-8 xl:grid-cols-2">
                {/* Calendar */}
                <div className="flex justify-center xl:justify-start">
                  <div className="w-full max-w-sm">
                    <div className="bg-card rounded-lg border shadow-sm p-4">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => {
                          setSelectedDate(date);
                          setSelectedTime(null); // Reset time when date changes
                        }}
                        disabled={isDayDisabled}
                        initialFocus
                        className="w-full"
                        classNames={{
                          months: "flex flex-col space-y-4",
                          month: "space-y-4 w-full",
                          caption: "flex justify-center pt-1 relative items-center",
                          caption_label: "text-sm font-medium",
                          nav: "space-x-1 flex items-center",
                          nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                          nav_button_previous: "absolute left-1",
                          nav_button_next: "absolute right-1",
                          table: "w-full border-collapse space-y-1",
                          head_row: "grid grid-cols-7 w-full",
                          head_cell: "text-muted-foreground rounded-md w-9 h-9 font-normal text-[0.8rem] flex items-center justify-center",
                          row: "grid grid-cols-7 w-full mt-1",
                          cell: "h-9 w-9 text-center text-sm p-0 relative flex items-center justify-center [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                          day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 rounded-md transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                          day_range_end: "day-range-end",
                          day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                          day_today: "bg-accent text-accent-foreground",
                          day_outside: "day-outside text-muted-foreground aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
                          day_disabled: "text-muted-foreground opacity-50 cursor-not-allowed",
                          day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                          day_hidden: "invisible",
                        }}
                      />
                    </div>
                  </div>
                </div>
                
                {/* Time Slots */}
                <div className="space-y-4 xl:col-span-1">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">
                      Available Times
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {getDateDisplayText(selectedDate)}
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    {selectedDate ? (
                      availableSlots.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-2 gap-3">
                          {availableSlots.map((slot) => {
                            const isBooked = bookings.some(
                              (b) =>
                                b.date === format(selectedDate, 'yyyy-MM-dd') &&
                                b.time === slot.time &&
                                b.status === 'confirmed'
                            );
                            return (
                              <Button
                                key={slot.time}
                                variant={
                                  selectedTime === slot.time
                                    ? 'default'
                                    : 'outline'
                                }
                                disabled={isBooked}
                                onClick={() => setSelectedTime(slot.time)}
                                className="h-12 text-sm font-medium relative transition-all duration-200 hover:scale-105 disabled:hover:scale-100"
                              >
                                <Clock className="mr-2 h-4 w-4" />
                                {slot.time}
                                {isBooked && (
                                  <div className="absolute inset-0 bg-destructive/20 rounded-md flex items-center justify-center">
                                    <span className="text-xs font-medium text-destructive">Booked</span>
                                  </div>
                                )}
                              </Button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center p-8 bg-muted/50 rounded-lg border-2 border-dashed">
                          <Clock className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                          <p className="text-lg font-medium mb-2">No slots available</p>
                          <p className="text-sm text-muted-foreground">
                            Try selecting a different date
                          </p>
                        </div>
                      )
                    ) : (
                      <div className="text-center p-8 bg-muted/50 rounded-lg border-2 border-dashed">
                        <CalendarIcon className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                        <p className="text-lg font-medium mb-2">Select a date first</p>
                        <p className="text-sm text-muted-foreground">
                          Choose your preferred appointment date
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Services & Booking */}
          <div className="lg:col-span-5 space-y-6">
            {/* Service Selection */}
            {selectedTime && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-xl">
                    <Tag className="mr-2 h-5 w-5" />
                    Select Services
                  </CardTitle>
                  <CardDescription>
                    Choose the services you'd like to book
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {services.length > 0 ? (
                      services.map((service) => (
                        <div
                          key={service.id}
                          className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <Checkbox
                            id={service.id}
                            checked={selectedServices.includes(service.id)}
                            onCheckedChange={() => handleServiceToggle(service.id)}
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <Label
                              htmlFor={service.id}
                              className="cursor-pointer text-sm font-medium leading-relaxed"
                            >
                              {service.name}
                            </Label>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-xs text-muted-foreground">
                                {service.duration} minutes
                              </span>
                              <span className="text-sm font-semibold text-primary">
                                PKR {service.price}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center p-6 bg-muted/50 rounded-lg">
                        <Tag className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm font-medium">No services available</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Booking Summary & Confirmation */}
            {selectedTime && selectedServices.length > 0 && (
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="text-xl">Booking Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Barber:</span>
                      <span className="font-medium">{barber.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Date:</span>
                      <span className="font-medium">
                        {selectedDate && format(selectedDate, 'PPP')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Time:</span>
                      <span className="font-medium">{selectedTime}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Services:</span>
                      <span className="font-medium">{selectedServices.length} selected</span>
                    </div>
                    <div className="pt-2 border-t">
                      <div className="flex justify-between font-semibold">
                        <span>Total:</span>
                        <span className="text-primary">
                          PKR{' '}
                          {services
                            .filter(s => selectedServices.includes(s.id))
                            .reduce((total, service) => total + service.price, 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleReserve} 
                    disabled={isSubmitting} 
                    size="lg" 
                    className="w-full h-12 text-base font-semibold"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Confirm Booking'
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Instruction Card */}
            {!selectedTime && (
              <Card className="border-muted-foreground/20">
                <CardContent className="pt-6">
                  <div className="text-center space-y-2">
                    <Clock className="mx-auto h-8 w-8 text-muted-foreground" />
                    <h3 className="font-semibold">Ready to Book?</h3>
                    <p className="text-sm text-muted-foreground">
                      Select your preferred date and time to continue
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
