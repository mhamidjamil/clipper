'use client';

import { useState, useEffect } from 'react';
import {
  getFirestore,
  doc,
  setDoc,
  onSnapshot,
  collection,
  query,
  where,
} from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { useToast } from '@/hooks/use-toast';
import { TimeSlot, BarberSchedule, Booking, UserProfile } from '@/lib/types';
import { generateTimeSlots } from '@/lib/data';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CalendarDays, Search, Moon, Sun, LogOut } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useTheme } from 'next-themes';
import { useUser } from '@/firebase';
import { signOut } from 'firebase/auth';

function Header() {
  const { theme, setTheme } = useTheme();
  const { user, userProfile, auth } = useUser();
  const router = useRouter();

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
      <div className="container mx-auto flex h-14 items-center justify-between px-4 md:px-6">
        <h1 className="text-xl font-bold tracking-tight">Clipper Scheduler</h1>
        <div className="flex items-center gap-4">
          {userProfile?.role === 'barber' && (
            <Link href="/availability" passHref>
              <Button variant="outline" size="icon">
                <CalendarDays className="h-[1.2rem] w-[1.2rem]" />
                <span className="sr-only">Manage Availability</span>
              </Button>
            </Link>
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          >
            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={user.photoURL ?? ''}
                      alt={user.displayName ?? 'User'}
                    />
                    <AvatarFallback>
                      {userProfile?.name?.charAt(0) ?? user.email?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}

function ClientView() {
  const { toast } = useToast();
  const [barbers, setBarbers] = useState<UserProfile[]>([]);
  const [schedules, setSchedules] = useState<BarberSchedule[]>([]);
  const { user, db } = useUser();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const today = new Date();
  const todayDateString = today.toISOString().split('T')[0];

  useEffect(() => {
    if (!db) return;

    // Fetch barbers
    const barbersQuery = query(
      collection(db, 'users'),
      where('role', '==', 'barber')
    );
    const unsubscribeBarbers = onSnapshot(barbersQuery, (snapshot) => {
      const barbersData = snapshot.docs.map(
        (doc) => doc.data() as UserProfile
      );
      setBarbers(barbersData);

      const barberSchedules: BarberSchedule[] = barbersData.map((barber) => ({
        barberId: barber.uid,
        availableSlots: generateTimeSlots(9, 17, 30),
      }));
      setSchedules(barberSchedules);
    });

    // Fetch bookings
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
      unsubscribeBarbers();
      unsubscribeBookings();
    };
  }, [db, todayDateString]);

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
        clientName: user.displayName || 'Anonymous',
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
          const barberSchedule = schedules.find(
            (s) => s.barberId === barber.uid
          );

          return (
            <Card key={barber.uid}>
              <CardHeader className="flex flex-row items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={''} alt={barber.name} />
                  <AvatarFallback>{barber.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle>{barber.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <h3 className="mb-4 text-lg font-semibold">
                  Available Slots for Today
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {barberSchedule?.availableSlots.map((slot) => {
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
                        onClick={() => bookAppointment(barber.uid, slot, today)}
                      >
                        {slot.time}
                      </Button>
                    );
                  })}
                </div>
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
  const [barbers, setBarbers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const { user, db } = useUser();

  useEffect(() => {
    if (!db) return;
    const bookingsQuery = query(
      collection(db, 'bookings'),
      where('barberId', '==', user?.uid)
    );
    const unsubscribeBookings = onSnapshot(bookingsQuery, (querySnapshot) => {
      const bookingsData = querySnapshot.docs.map(
        (doc) => doc.data() as Booking
      );
      setBookings(bookingsData);
    });
    
    const barbersQuery = query(
      collection(db, 'users'),
      where('role', '==', 'barber')
    );
    const unsubscribeBarbers = onSnapshot(barbersQuery, (snapshot) => {
      const barbersData = snapshot.docs.map(
        (doc) => doc.data() as UserProfile
      );
      setBarbers(barbersData);
    });

    return () => {
      unsubscribeBookings();
      unsubscribeBarbers();
    };
  }, [db, user]);

  const filteredBookings = bookings.filter((booking) =>
    booking.clientName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Bookings</CardTitle>
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
              filteredBookings.map((booking) => (
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
        Loading...
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
