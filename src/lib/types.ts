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
  mobileNumber?: string;
  address?: string;
}

export interface DaySchedule {
  isEnabled: boolean;
  startTime: string;
  endTime: string;
}

export interface Availability {
  barberId: string;
  slotDuration: number; // in minutes
  schedule: {
    [day: string]: DaySchedule;
  };
}
