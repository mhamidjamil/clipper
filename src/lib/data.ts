
import { TimeSlot } from './types';

export function generateTimeSlots(startHour: number, endHour: number, slotDuration: number): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const startTime = new Date();
    startTime.setHours(startHour, 0, 0, 0);

    const endTime = new Date();
    endTime.setHours(endHour, 0, 0, 0);

    while (startTime < endTime) {
        const hour = startTime.getHours().toString().padStart(2, '0');
        const minute = startTime.getMinutes().toString().padStart(2, '0');
        slots.push({ time: `${hour}:${minute}`, isReserved: false });
        startTime.setMinutes(startTime.getMinutes() + slotDuration);
    }

    return slots;
}
