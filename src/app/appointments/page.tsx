'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useUser } from '@/firebase';
import { Header } from '@/components/Header';
import { Booking } from '@/lib/types';
import { format, parseISO, isPast, isToday, isTomorrow } from 'date-fns';
import { Loader2, Calendar, Clock, MapPin, Phone, X, CheckCircle } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function MyAppointmentsPage() {
  const { user, db, userProfile, loading: userLoading } = useUser();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!db || !user || userLoading) return;

    // Redirect non-clients
    if (userProfile?.role !== 'client') {
      window.location.href = '/';
      return;
    }

    const bookingsQuery = query(
      collection(db, 'bookings'),
      where('clientId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(bookingsQuery, (snapshot) => {
      const appointmentData = snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      } as Booking));
      
      // Sort by date and time (upcoming first)
      appointmentData.sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time}`);
        const dateB = new Date(`${b.date}T${b.time}`);
        return dateA.getTime() - dateB.getTime();
      });

      setBookings(appointmentData);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [db, user, userProfile, userLoading]);

  const getAppointmentStatus = (booking: Booking) => {
    const appointmentDateTime = new Date(`${booking.date}T${booking.time}`);
    const now = new Date();

    if (booking.status === 'cancelled') return 'cancelled';
    if (booking.status === 'completed') return 'completed';
    if (isPast(appointmentDateTime)) return 'past';
    if (isToday(parseISO(booking.date))) return 'today';
    if (isTomorrow(parseISO(booking.date))) return 'tomorrow';
    return 'upcoming';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Completed</Badge>;
      case 'past':
        return <Badge variant="secondary">Past</Badge>;
      case 'today':
        return <Badge className="bg-blue-500 hover:bg-blue-600">Today</Badge>;
      case 'tomorrow':
        return <Badge className="bg-orange-500 hover:bg-orange-600">Tomorrow</Badge>;
      case 'upcoming':
        return <Badge variant="outline">Upcoming</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getDateDisplayText = (date: string) => {
    const parsedDate = parseISO(date);
    if (isToday(parsedDate)) return 'Today';
    if (isTomorrow(parsedDate)) return 'Tomorrow';
    return format(parsedDate, 'EEEE, MMMM dd, yyyy');
  };

  const canCancelAppointment = (booking: Booking) => {
    const appointmentDateTime = new Date(`${booking.date}T${booking.time}`);
    const now = new Date();
    const hoursDiff = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    return booking.status === 'confirmed' && hoursDiff > 2; // Can cancel if more than 2 hours away
  };

  const handleCancelAppointment = async (bookingId: string) => {
    if (!db) return;

    try {
      const bookingRef = doc(db, 'bookings', bookingId);
      await updateDoc(bookingRef, {
        status: 'cancelled'
      });
      
      toast({
        title: 'Appointment Cancelled',
        description: 'Your appointment has been successfully cancelled.',
      });
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to cancel appointment. Please try again.',
      });
    }
  };

  if (userLoading || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (userProfile?.role !== 'client') {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto p-4 text-center">
          <p>Access denied. This page is for clients only.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-4xl p-4 md:p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Appointments</h1>
          <p className="text-muted-foreground">
            Manage your upcoming and past appointments
          </p>
        </div>

        {bookings.length === 0 ? (
          <Card className="text-center p-8">
            <CardContent className="pt-6">
              <Calendar className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
              <CardTitle className="mb-2">No Appointments Yet</CardTitle>
              <CardDescription className="mb-4">
                You haven't booked any appointments yet. Ready to get started?
              </CardDescription>
              <Button onClick={() => window.location.href = '/'}>
                Book Your First Appointment
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => {
              const status = getAppointmentStatus(booking);
              return (
                <Card key={booking.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-lg font-bold text-primary">
                            {booking.clientName?.charAt(0) || 'B'}
                          </span>
                        </div>
                        <div>
                          <CardTitle className="text-lg">
                            Appointment with Barber
                          </CardTitle>
                          <CardDescription>
                            Booking ID: {booking.id.split('_').pop()}
                          </CardDescription>
                        </div>
                      </div>
                      {getStatusBadge(status)}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{getDateDisplayText(booking.date)}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{booking.time}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm sm:col-span-2">
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {booking.serviceIds?.length || 0} service(s) selected
                        </span>
                      </div>
                    </div>

                    {canCancelAppointment(booking) && (
                      <div className="mt-4 pt-3 border-t">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                              <X className="h-4 w-4 mr-2" />
                              Cancel Appointment
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Cancel Appointment?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to cancel your appointment on{' '}
                                {getDateDisplayText(booking.date)} at {booking.time}? 
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Keep Appointment</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleCancelAppointment(booking.id)}
                                className="bg-destructive hover:bg-destructive/90"
                              >
                                Yes, Cancel
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}

                    {status === 'cancelled' && (
                      <div className="mt-4 pt-3 border-t">
                        <p className="text-sm text-muted-foreground">
                          This appointment was cancelled.
                        </p>
                      </div>
                    )}

                    {status === 'past' && booking.status !== 'cancelled' && booking.status !== 'completed' && (
                      <div className="mt-4 pt-3 border-t">
                        <p className="text-sm text-muted-foreground">
                          This appointment has passed.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}