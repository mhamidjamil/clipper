
import { Barber, BarberSchedule, TimeSlot } from './types';

export const Barbers: Barber[] = [
  {
    id: '1',
    name: 'Adam',
    avatarUrl: 'https://i.pravatar.cc/150?u=adam',
  },
  {
    id: '2',
    name: 'Ben',
    avatarUrl: 'https://i.pravatar.cc/150?u=ben',
  },
  {
    id: '3',
    name: 'Charlie',
    avatarUrl: 'https://i.pravatar.cc/150?u=charlie',
  },
];

export function generateTimeSlots(start: number, end: number): TimeSlot[] {
    const slots = [];
    for (let i = start; i < end; i++) {
        for (let j = 0; j < 2; j++) {
            const hour = i.toString().padStart(2, '0');
            const minute = (j * 30).toString().padStart(2, '0');
            slots.push({ time: `${hour}:${minute}`, isReserved: Math.random() > 0.8 });
        }
    }
    return slots;
}
