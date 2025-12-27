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
import { Badge } from '@/components/ui/badge';

import { useToast } from '@/hooks/use-toast';
import {
  TimeSlot,
  Booking,
  UserProfile,
  Availability,
  ServiceCategory,
} from '@/lib/types';
import { generateTimeSlots } from '@/lib/data';
import { Search, Phone, MapPin, Loader2 } from 'lucide-react';
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
import Link from 'next/link';

type BarberProfile = UserProfile & {
  services: ServiceCategory[];
  availability?: Availability;
};

function ClientView() {
  const { toast } = useToast();
  const [barbers, setBarbers] = useState<BarberProfile[]>([]);
  const { user, db, userProfile } = useUser();
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db) return;
    setIsLoading(true);

    const fetchBarbersData = async () => {
      try {
        const barbersQuery = query(
          collection(db, 'users'),
          where('role', '==', 'barber')
        );
        const barbersSnapshot = await getDocs(barbersQuery);
        const barbersData = barbersSnapshot.docs.map(
          (doc) => doc.data() as UserProfile
        );

        const enhancedBarbers = await Promise.all(
          barbersData.map(async (barber) => {
            const servicesQuery = query(
              collection(db, 'services'),
              where('barberId', '==', barber.uid)
            );
            const availabilityRef = doc(db, 'availability', barber.uid);

            const [servicesSnapshot, availabilitySnap] = await Promise.all([
              getDocs(servicesQuery),
              getDoc(availabilityRef),
            ]);

            const services = servicesSnapshot.docs.map(
              (doc) => ({ id: doc.id, ...doc.data() } as ServiceCategory)
            );
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
  }, [db, toast]);

  const filteredBarbers = barbers.filter((barber) =>
    barber.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
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
          return (
            <Card
              key={barber.uid}
              className="flex h-full flex-col justify-between transition-all hover:shadow-lg"
            >
              <div>
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
                  <h4 className="mb-2 font-semibold">Services</h4>
                  {barber.services.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {barber.services.map((service) => (
                        <Badge key={service.id} variant="secondary">
                          {service.name}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No services listed.
                    </p>
                  )}
                </CardContent>
              </div>
              <CardContent>
                <Link href={`/book/${barber.uid}`} passHref>
                  <Button variant="outline" className="w-full">
                    Book Appointment
                  </Button>
                </Link>
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
