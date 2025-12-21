
'use client';

import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Barber, TimeSlot, BarberSchedule } from '@/lib/types';
import { Barbers, generateTimeSlots } from '@/lib/data';
import { AuthProvider, useAuth } from '@/components/auth-provider';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const db = getFirestore(app);

function Header() {
  const { user } = useAuth();

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (error.code !== 'auth/cancelled-popup-request') {
        console.error('Error signing in with Google: ', error);
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
        {user ? (
          <div className="flex items-center gap-4">
            <span className="font-medium">Welcome, {user.displayName?.split(' ')[0]}</span>
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
    </header>
  );
}


function BookingPage() {
  const { toast } = useToast();
  const [barbers] = useState<Barber[]>(Barbers);
  const [schedules, setSchedules] = useState<BarberSchedule[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    const barberSchedules: BarberSchedule[] = [
      {
        barberId: '1',
        availableSlots: generateTimeSlots(9, 17),
      },
      {
        barberId: '2',
        availableSlots: generateTimeSlots(10, 18),
      },
      {
        barberId: '3',
        availableSlots: generateTimeSlots(9, 15),
      },
    ];
    setSchedules(barberSchedules);
  }, []);

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

    if (slot.isReserved) {
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: 'This time slot is already reserved.',
      });
      return;
    }

    try {
      const bookingDate = date.toISOString().split('T')[0];
      const bookingId = `${barberId}_${bookingDate}_${slot.time.replace(
        ':',
        ''
      )}`;
      const bookingRef = doc(db, 'bookings', bookingId);

      await setDoc(bookingRef, {
        barberId,
        clientId: user.uid,
        clientName: user.displayName,
        time: slot.time,
        date: bookingDate,
      });

      toast({
        title: 'Booking Confirmed!',
        description: `Your appointment is booked.`,
      });

      setSchedules(
        schedules.map((schedule) => {
          if (schedule.barberId === barberId) {
            return {
              ...schedule,
              availableSlots: schedule.availableSlots.map((s) =>
                s.time === slot.time ? { ...s, isReserved: true } : s
              ),
            };
          }
          return schedule;
        })
      );
    } catch (error) {
      console.error('Error booking appointment: ', error);
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: 'There was a problem with your request.',
      });
    }
  };

  const today = new Date();

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto p-4 md:p-6">
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
                    {barberSchedule?.availableSlots.map((slot) => (
                      <Button
                        key={slot.time}
                        variant={slot.isReserved ? 'destructive' : 'outline'}
                        disabled={slot.isReserved}
                        onClick={() => bookAppointment(barber.id, slot, today)}
                      >
                        {slot.time}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}


export default function Home() {
  return (
    <AuthProvider>
      <BookingPage />
    </AuthProvider>
  )
}
