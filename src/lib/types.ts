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
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  serviceIds: string[];
  status: 'confirmed' | 'cancelled';
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

export interface ServiceCategory {
  id: string;
  barberId: string;
  name: string;
  duration: number; // in minutes
  price: number; // in PKR
}
