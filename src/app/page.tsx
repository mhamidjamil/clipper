
'use client';

import { useState, useEffect } from 'react';
import {
  doc,
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import { useRouter } from 'next/navigation';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

import { useToast } from '@/hooks/use-toast';
import {
  TimeSlot,
  Booking,
  UserProfile,
  Availability,
  ServiceCategory,
} from '@/lib/types';
import { generateTimeSlots } from '@/lib/data';
import { Search, Phone, MapPin, Clock, Tag, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useUser } from '@/firebase';
import { Header } from '@/components/Header';

type BarberProfile = UserProfile & {
  services: ServiceCategory[];
  availability?: Availability;
};

function ClientView() {
  const { toast } = useToast();
  const [barbers, setBarbers] = useState<BarberProfile[]>([]);
  const { user, db, userProfile } = useUser();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const today = new Date();
  const todayDayName = today
    .toLocaleDateString('en-US', { weekday: 'long' })
    .toLowerCase();
  const todayDateString = today.toISOString().split('T')[0];

  useEffect(() => {
    if (!db) return;
    setIsLoading(true);

    const fetchBarbersData = async () => {
      try {
        // 1. Fetch all barbers
        const barbersQuery = query(
          collection(db, 'users'),
          where('role', '==', 'barber')
        );
        const barbersSnapshot = await getDocs(barbersQuery);
        const barbersData = barbersSnapshot.docs.map(
          (doc) => doc.data() as UserProfile
        );

        // 2. For each barber, fetch their services and availability
        const enhancedBarbers = await Promise.all(
          barbersData.map(async (barber) => {
            // Fetch Services
            const servicesQuery = query(
              collection(db, 'services'),
              where('barberId', '==', barber.uid)
            );
            const servicesSnapshot = await getDocs(servicesQuery);
            const services = servicesSnapshot.docs.map(
              (doc) => ({ id: doc.id, ...doc.data() } as ServiceCategory)
            );

            // Fetch Availability
            const availabilityRef = doc(db, 'availability', barber.uid);
            const availabilitySnap = await getDoc(availabilityRef);
            const availability = availabilitySnap.exists()
              ? (availabilitySnap.data() as Availability)
              : undefined;

            return {
              ...barber,
              services,
              availability,
            };
          })
        );

        setBarbers(enhancedBarbers);
      } catch (error) {
        console.error('Error fetching barbers data:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Could not load barber information.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchBarbersData();

    // 3. Fetch all relevant bookings
    const bookingsQuery = query(
      collection(db, 'bookings'),
      where('date', '>=', todayDateString)
    );
    const unsubscribeBookings = onSnapshot(bookingsQuery, (querySnapshot) => {
      const bookedSlots = querySnapshot.docs.map(
        (doc) => doc.data() as Booking
      );
      setBookings(bookedSlots);
    });

    return () => {
      unsubscribeBookings();
    };
  }, [db, todayDateString, toast]);

  const getAvailableSlotsForBarber = (barber: BarberProfile): TimeSlot[] => {
    if (
      !barber.availability ||
      !barber.availability.schedule[todayDayName]?.isEnabled
    ) {
      return [];
    }
    const { schedule, slotDuration } = barber.availability;
    const { startTime, endTime } = schedule[todayDayName];
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

  const bookAppointment = async (
    barberId: string,
    slot: TimeSlot,
    date: Date
  ) => {
    if (!user || !db) {
      toast({
        variant: 'destructive',
        title: 'Authentication Required',
        description: 'You need to be logged in to book an appointment.',
      });
      return;
    }

    const bookingDate = date.toISOString().split('T')[0];
    const isAlreadyBooked = bookings.some(
      (b) =>
        b.barberId === barberId && b.date === bookingDate && b.time === slot.time
    );

    if (isAlreadyBooked) {
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: 'This time slot is already reserved.',
      });
      return;
    }

    try {
      const bookingId = `${barberId}_${bookingDate}_${slot.time.replace(
        ':',
        ''
      )}`;
      const bookingRef = doc(db, 'bookings', bookingId);

      const newBooking: Booking = {
        id: bookingId,
        barberId,
        clientId: user.uid,
        clientName: user.displayName || userProfile?.name || 'Anonymous',
        date: bookingDate,
        time: slot.time,
      };

      await setDoc(bookingRef, newBooking);

      toast({
        title: 'Booking Confirmed!',
        description: `Your appointment is booked.`,
      });
    } catch (error) {
      console.error('Error booking appointment: ', error);
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: 'There was a problem with your request.',
      });
    }
  };

  const filteredBarbers = barbers.filter((barber) =>
    barber.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
       <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }


  return (
    <>
      <div className="mb-8 flex items-center gap-2">
        <Search className="h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Search by barber name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
        {filteredBarbers.map((barber) => {
          const availableSlots = getAvailableSlotsForBarber(barber);
          return (
            <Card key={barber.uid}>
              <CardHeader className="flex flex-row items-start gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={''} alt={barber.name} />
                  <AvatarFallback>{barber.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <CardTitle>{barber.name}</CardTitle>
                  {barber.mobileNumber && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{barber.mobileNumber}</span>
                    </div>
                  )}
                  {barber.address && (
                    <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{barber.address}</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="services">
                    <AccordionTrigger>View Services</AccordionTrigger>
                    <AccordionContent>
                      {barber.services.length > 0 ? (
                        <ul className="space-y-2 text-sm">
                          {barber.services.map((service) => (
                            <li
                              key={service.id}
                              className="flex justify-between"
                            >
                              <span className="font-medium">
                                {service.name}
                              </span>
                              <div className="flex items-center gap-4 text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  {service.duration}m
                                </span>
                                <span className="flex items-center gap-1">
                                  <Tag className="h-4 w-4" />
                                  {service.price} PKR
                                </span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No services listed for this barber yet.
                        </p>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="slots">
                    <AccordionTrigger>
                      Available Slots for Today
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="grid grid-cols-3 gap-2 pt-2">
                        {availableSlots.length > 0 ? (
                          availableSlots.map((slot) => {
                            const isBooked = bookings.some(
                              (b) =>
                                b.barberId === barber.uid &&
                                b.time === slot.time &&
                                b.date === todayDateString
                            );

                            return (
                              <Button
                                key={slot.time}
                                variant={isBooked ? 'destructive' : 'outline'}
                                disabled={isBooked}
                                onClick={() =>
                                  bookAppointment(barber.uid, slot, today)
                                }
                              >
                                {slot.time}
                              </Button>
                            );
                          })
                        ) : (
                          <p className="col-span-3 text-sm text-muted-foreground">
                            No available slots for today.
                          </p>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}

function BarberView() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const { user, db } = useUser();

  useEffect(() => {
    if (!db || !user) return;
    const bookingsQuery = query(
      collection(db, 'bookings'),
      where('barberId', '==', user.uid)
    );
    const unsubscribeBookings = onSnapshot(bookingsQuery, (querySnapshot) => {
      const bookingsData = querySnapshot.docs.map(
        (doc) => doc.data() as Booking
      );
      setBookings(bookingsData);
    });

    return () => {
      unsubscribeBookings();
    };
  }, [db, user]);

  const filteredBookings = bookings.filter((booking) =>
    booking.clientName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Bookings</CardTitle>
        <CardDescription>
          Here are the upcoming appointments that clients have booked with you.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-center gap-2">
          <Search className="h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search by client name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client Name</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBookings.length > 0 ? (
              filteredBookings
                .sort((a, b) => {
                  const dateA = new Date(`${a.date}T${a.time}`);
                  const dateB = new Date(`${b.date}T${b.time}`);
                  return dateA.getTime() - dateB.getTime();
                })
                .map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>{booking.clientName}</TableCell>
                    <TableCell>{booking.date}</TableCell>
                    <TableCell>{booking.time}</TableCell>
                  </TableRow>
                ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="text-center">
                  You have no bookings.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function HomePage() {
  const { user, userProfile, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/welcome');
    }
  }, [user, loading, router]);

  if (loading || !userProfile) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto p-4 md:p-6">
        {userProfile.role === 'client' ? <ClientView /> : <BarberView />}
      </main>
    </div>
  );
}

export default function Home() {
  return <HomePage />;
}

    