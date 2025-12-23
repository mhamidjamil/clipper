
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AvailabilityPage() {
  const { user, userProfile, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (userProfile?.role !== 'barber') {
        router.push('/');
      }
    }
  }, [user, userProfile, loading, router]);

  if (loading || !userProfile || userProfile.role !== 'barber') {
    return (
      <div className="flex h-screen items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Manage Your Availability</CardTitle>
        </CardHeader>
        <CardContent>
          <p>
            This is where you will be able to set your available days and time
            slots for clients to book.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
