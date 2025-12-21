
'use client';

import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getFirestore, doc, setDoc, collection } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Barber, TimeSlot } from '@/lib/types';
import { Barbers, BarberSchedules } from '@/lib/data';

const db = getFirestore(app);

export default function Home() {
  const { toast } = useToast();
  const [barbers] = useState<Barber[]>(Barbers);
  const [schedules] = useState(BarberSchedules);

  const bookAppointment = async (
    barberId: string,
    slot: TimeSlot,
    date: Date
  ) => {
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
      const bookingId = `${barberId}_${bookingDate}_${slot.time.replace(':', '')}`;
      const bookingRef = doc(db, 'bookings', bookingId);

      await setDoc(bookingRef, {
        barberId,
        clientName: 'Test Client', // Placeholder
        time: slot.time,
        date: bookingDate,
      });

      toast({
        title: 'Booking Confirmed!',
        description: `Your appointment with Barber ${barberId} at ${slot.time} is booked.`,
      });

      // This would ideally re-fetch data from firestore
      // For now, we will just update the local state
      slot.isReserved = true;
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
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-14 items-center justify-between px-4 md:px-6">
          <h1 className="text-xl font-bold tracking-tight">Barber Book</h1>
          <Button variant="outline">Login</Button>
        </div>
      </header>

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
                    <AvatarImage
                      src={barber.avatarUrl}
                      alt={barber.name}
                    />
                    <AvatarFallback>
                      {barber.name.charAt(0)}
                    </AvatarFallback>
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

