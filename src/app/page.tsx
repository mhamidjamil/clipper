
'use client';

import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getFirestore, doc, setDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Barber, TimeSlot, BarberSchedule, Booking } from '@/lib/types';
import { Barbers, generateTimeSlots } from '@/lib/data';
import { AuthProvider, useAuth } from '@/components/auth-provider';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Users, Briefcase } from 'lucide-react';


const db = getFirestore(app);

function Header({ role, setRole }: { role: 'client' | 'barber', setRole: (role: 'client' | 'barber') => void }) {
  const { toast } = useToast();
  const { user } = useAuth();

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (error.code === 'auth/cancelled-popup-request') {
        // User cancelled the login, do nothing.
        return;
      } else if (error.code === 'auth/configuration-not-found') {
        toast({
          variant: 'destructive',
          title: 'Action Required: Authorize Your App\'s Domain',
          description: "To fix login, go to the Firebase Console -> Authentication -> Settings -> Authorized Domains, and add 'cloudworkstations.dev'. Also ensure Google is an enabled Sign-in provider.",
          duration: 20000,
        });
      } else {
        console.error('Error signing in with Google: ', error);
        toast({
          variant: 'destructive',
          title: 'Login Error',
          description: error.message,
        });
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out: ', error);
    }
  };

  return (
    <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
      <div className="container mx-auto flex h-14 items-center justify-between px-4 md:px-6">
        <h1 className="text-xl font-bold tracking-tight">Clipper Scheduler</h1>
        <div className="flex items-center gap-4">
          {user && (
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    {role === 'client' ? <Users /> : <Briefcase />}
                    <span>{role === 'client' ? 'Client View' : 'Barber View'}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  <DropdownMenuRadioGroup value={role} onValueChange={(value) => setRole(value as 'client' | 'barber')}>
                    <DropdownMenuRadioItem value="client">
                      <Users className="mr-2 h-4 w-4" />
                      <span>Client View</span>
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="barber">
                      <Briefcase className="mr-2 h-4 w-4" />
                      <span>Barber View</span>
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
          )}
          {user ? (
            <div className="flex items-center gap-4">
              <span className="font-medium hidden sm:inline">Welcome, {user.displayName?.split(' ')[0]}</span>
              <Button variant="outline" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          ) : (
            <Button variant="outline" onClick={handleLogin}>
              Login
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}


function ClientView() {
  const { toast } = useToast();
  const [barbers] = useState<Barber[]>(Barbers);
  const [schedules, setSchedules] = useState<BarberSchedule[]>([]);
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const today = new Date();
  const todayDateString = today.toISOString().split('T')[0];

  useEffect(() => {
    const fetchBookings = async () => {
      const bookingsQuery = query(collection(db, "bookings"), where("date", "==", todayDateString));
      const querySnapshot = await getDocs(bookingsQuery);
      const bookedSlots = querySnapshot.docs.map(doc => doc.data() as Booking);
      setBookings(bookedSlots);
    };

    fetchBookings();

    const barberSchedules: BarberSchedule[] = Barbers.map(barber => ({
      barberId: barber.id,
      availableSlots: generateTimeSlots(9, 17, 30),
    }));

    setSchedules(barberSchedules);
  }, [todayDateString]);


  const bookAppointment = async (
    barberId: string,
    slot: TimeSlot,
    date: Date
  ) => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Please log in',
        description: 'You need to be logged in to book an appointment.',
      });
      return;
    }

    const bookingDate = date.toISOString().split('T')[0];
    const isAlreadyBooked = bookings.some(
      (b) => b.barberId === barberId && b.date === bookingDate && b.time === slot.time
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
        clientName: user.displayName,
        date: bookingDate,
        time: slot.time,
      };

      await setDoc(bookingRef, newBooking);

      setBookings([...bookings, newBooking]);

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


  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
      {barbers.map((barber) => {
        const barberSchedule = schedules.find(
          (s) => s.barberId === barber.id
        );

        return (
          <Card key={barber.id}>
            <CardHeader className="flex flex-row items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={barber.avatarUrl} alt={barber.name} />
                <AvatarFallback>{barber.name.charAt(0)}</AvatarFallback>
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
                    b => b.barberId === barber.id && b.time === slot.time && b.date === todayDateString
                  );

                  return (
                    <Button
                      key={slot.time}
                      variant={isBooked ? 'destructive' : 'outline'}
                      disabled={isBooked}
                      onClick={() => bookAppointment(barber.id, slot, today)}
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
  );
}

function BarberView() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Barber View</CardTitle>
      </CardHeader>
      <CardContent>
        <p>This is the placeholder for the barber's schedule and management view. We can build this out next.</p>
      </CardContent>
    </Card>
  );
}

function HomePage() {
  const [role, setRole] = useState<'client' | 'barber'>('client');
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <Header role={role} setRole={setRole} />
      <main className="container mx-auto p-4 md:p-6">
        {!user ? (
           <div className="flex items-center justify-center h-[50vh]">
              <Card className="p-8 text-center">
                <CardHeader>
                  <CardTitle className="text-2xl">Welcome to Clipper Scheduler</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>Please log in to view available appointments and manage your schedule.</p>
                </CardContent>
              </Card>
           </div>
        ) : role === 'client' ? <ClientView /> : <BarberView />}
      </main>
    </div>
  );
}


export default function Home() {
  return (
    <AuthProvider>
      <HomePage />
    </AuthProvider>
  )
}
