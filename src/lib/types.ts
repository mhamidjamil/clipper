
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
  clientName: string;
  date: string;
  time: string;
}
