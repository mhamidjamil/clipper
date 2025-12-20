
export interface Barber {
  id: string;
  name: string;
  avatarUrl: string;
}

export interface TimeSlot {
  time: string;
  isReserved: boolean;
}

export interface BarberSchedule {
  barberId: string;
  availableSlots: TimeSlot[];
}

export interface Booking {
  id: string;
  barberId: string;
  clientId: string;
  clientName: string | null;
  date: string;
  time: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  role: 'client' | 'barber';
  name?: string;
}

    