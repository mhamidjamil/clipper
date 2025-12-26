'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import type { Availability } from '@/lib/types';
import { Loader2 } from 'lucide-react';

const daysOfWeek = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

const initialSchedule: Availability['schedule'] = daysOfWeek.reduce(
  (acc, day) => {
    acc[day] = {
      isEnabled: day !== 'sunday' && day !== 'saturday', // Default to Weekdays
      startTime: '09:00',
      endTime: '17:00',
    };
    return acc;
  },
  {} as Availability['schedule']
);

export default function AvailabilityPage() {
  const { user, userProfile, loading, db } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);

  const [schedule, setSchedule] = useState(initialSchedule);
  const [slotDuration, setSlotDuration] = useState(30);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (userProfile?.role !== 'barber') {
        router.push('/');
      } else {
        const fetchAvailability = async () => {
          if (!db || !user) return;
          const availabilityRef = doc(db, 'availability', user.uid);
          const docSnap = await getDoc(availabilityRef);
          if (docSnap.exists()) {
            const data = docSnap.data() as Availability;
            setSchedule(data.schedule);
            setSlotDuration(data.slotDuration);
          }
          setIsPageLoading(false);
        };
        fetchAvailability();
      }
    }
  }, [user, userProfile, loading, router, db]);

  const handleDayToggle = (day: string, isEnabled: boolean) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: { ...prev[day], isEnabled },
    }));
  };

  const handleTimeChange = (
    day: string,
    type: 'startTime' | 'endTime',
    value: string
  ) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: { ...prev[day], [type]: value },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !user) return;
    setIsSubmitting(true);

    const availabilityData: Availability = {
      barberId: user.uid,
      slotDuration,
      schedule,
    };

    try {
      const availabilityRef = doc(db, 'availability', user.uid);
      await setDoc(availabilityRef, availabilityData, { merge: true });
      toast({
        title: 'Success!',
        description: 'Your availability has been updated.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Could not update availability.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || isPageLoading || userProfile?.role !== 'barber') {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl p-4 md:p-6">
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Manage Your Availability</CardTitle>
            <CardDescription>
              Set your weekly schedule and appointment duration. Clients will
              only be able to book in your available slots.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="space-y-4 rounded-md border p-4">
              <h3 className="text-lg font-medium">Weekly Hours</h3>
              <div className="space-y-4">
                {daysOfWeek.map((day) => (
                  <div
                    key={day}
                    className="flex flex-col items-start gap-4 rounded-md border p-4 sm:flex-row sm:items-center"
                  >
                    <div className="flex w-full items-center gap-4 sm:w-auto">
                      <Switch
                        id={`switch-${day}`}
                        checked={schedule[day].isEnabled}
                        onCheckedChange={(checked) =>
                          handleDayToggle(day, checked)
                        }
                      />
                      <Label htmlFor={`switch-${day}`} className="w-20 capitalize">
                        {day}
                      </Label>
                    </div>
                    <div className="flex w-full flex-1 items-center gap-4">
                      <Input
                        type="time"
                        value={schedule[day].startTime}
                        onChange={(e) =>
                          handleTimeChange(day, 'startTime', e.target.value)
                        }
                        disabled={!schedule[day].isEnabled}
                        className="w-full sm:w-auto"
                      />
                      <span>to</span>
                      <Input
                        type="time"
                        value={schedule[day].endTime}
                        onChange={(e) =>
                          handleTimeChange(day, 'endTime', e.target.value)
                        }
                        disabled={!schedule[day].isEnabled}
                        className="w-full sm:w-auto"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2 rounded-md border p-4">
               <h3 className="text-lg font-medium">Booking Settings</h3>
              <Label htmlFor="slotDuration">Appointment Duration</Label>
              <Select
                value={String(slotDuration)}
                onValueChange={(value) => setSlotDuration(Number(value))}
              >
                <SelectTrigger id="slotDuration" className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                </SelectContent>
              </Select>
               <p className="text-sm text-muted-foreground">
                The duration of each appointment slot.
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Changes
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
