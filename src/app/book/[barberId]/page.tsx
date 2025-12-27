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
import { Loader2, Calendar as CalendarIcon, Clock, Tag } from 'lucide-react';
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
import { format } from 'date-fns';

export default function BookingPage() {
  const { barberId } = useParams();
  const { user, db, userProfile, loading: userLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const [barber, setBarber] = useState<UserProfile | null>(null);
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [services, setServices] = useState<ServiceCategory[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date()
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

    return generateTimeSlots(
      startHour,
      startMinute,
      endHour,
      endMinute,
      slotDuration
    );
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
            description: error.message || 'An unexpected error occurred.',
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-4xl p-4 md:p-6">
        <Card>
          <CardHeader className="flex flex-col items-center text-center">
            <Avatar className="h-24 w-24">
              <AvatarImage src="" alt={barber.name} />
              <AvatarFallback className="text-3xl">
                {barber.name?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <CardTitle className="mt-4 text-3xl">{barber.name}</CardTitle>
            <CardDescription>{barber.address}</CardDescription>
          </CardHeader>
          <CardContent className="mt-6 space-y-8">
            {/* Step 1: Date and Time Selection */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">1. Select Date & Time</h2>
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                <div className="flex justify-center">
                   <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={ (date) => {
                      setSelectedDate(date);
                      setSelectedTime(null); // Reset time when date changes
                    }}
                    disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() - 1)) || !availability?.schedule[format(date, 'EEEE').toLowerCase()]?.isEnabled}
                    initialFocus
                  />
                </div>
                <div className="space-y-4">
                  <h3 className="font-medium">
                    Available Slots for{' '}
                    {selectedDate ? format(selectedDate, 'PPP') : '...'}
                  </h3>
                   <div className="grid grid-cols-3 gap-2">
                     {availableSlots.length > 0 ? (
                      availableSlots.map((slot) => {
                        const isBooked = bookings.some(
                          (b) =>
                            b.date === (selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '') &&
                            b.time === slot.time
                        );
                        return (
                          <Button
                            key={slot.time}
                            variant={
                              selectedTime === slot.time
                                ? 'default'
                                : isBooked
                                ? 'destructive'
                                : 'outline'
                            }
                            disabled={isBooked}
                            onClick={() => setSelectedTime(slot.time)}
                          >
                            {slot.time}
                          </Button>
                        );
                      })
                    ) : (
                      <p className="col-span-3 text-sm text-muted-foreground">
                        No slots available for this day.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: Service Selection */}
            {selectedTime && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">2. Select Services</h2>
                <div className="space-y-3 rounded-md border p-4">
                  {services.length > 0 ? (
                    services.map((service) => (
                      <div key={service.id} className="flex items-center justify-between">
                         <div className="flex items-center space-x-3">
                           <Checkbox
                            id={service.id}
                            checked={selectedServices.includes(service.id)}
                            onCheckedChange={() => handleServiceToggle(service.id)}
                          />
                          <Label htmlFor={service.id} className="cursor-pointer text-base">
                            {service.name}
                          </Label>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{service.price} PKR</p>
                          <p className="text-sm text-muted-foreground">{service.duration} min</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No services available.
                    </p>
                  )}
                </div>
              </div>
            )}
            
            {/* Step 3: Confirmation */}
            {selectedTime && selectedServices.length > 0 && (
                <div className="flex flex-col items-center gap-4 rounded-lg bg-primary/10 p-6">
                    <h2 className="text-xl font-semibold">3. Confirm Your Booking</h2>
                    <Button onClick={handleReserve} disabled={isSubmitting} size="lg">
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Reserving...
                            </>
                        ) : (
                           'Reserve Now'
                        )}
                    </Button>
                </div>
            )}

          </CardContent>
        </Card>
      </main>
    </div>
  );
}
