import { prisma } from "@bookflow/db";
import { Weekday } from "@bookflow/db";
import { fromZonedTime } from "date-fns-tz";

export type Slot = { startAt: Date; endAt: Date }; // both UTC

// JS getDay() → our Weekday enum (0 = Sunday)
const WEEKDAYS: Weekday[] = [
  Weekday.SUN, Weekday.MON, Weekday.TUE, Weekday.WED,
  Weekday.THU, Weekday.FRI, Weekday.SAT,
];

/**
 * Compute bookable slots for one staff member, one service, on one date.
 * @param dateISO  the target date, e.g. "2026-06-26" (interpreted in org TZ)
 */
export async function getAvailableSlots(params: {
  organizationId: string;
  staffId: string;
  serviceId: string;
  dateISO: string;
  stepMinutes?: number; // slot granularity; default = service duration
}): Promise<Slot[]> {
  const { organizationId, staffId, serviceId, dateISO } = params;

  // --- fetch what we need (all tenant-scoped) ---
  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: { timezone: true },
  });
  const service = await prisma.service.findFirstOrThrow({
    where: { id: serviceId, organizationId },
    select: { durationMinutes: true },
  });

  const tz = org.timezone;
  const duration = service.durationMinutes;
  const step = params.stepMinutes ?? duration;

  // 1. weekday of the target date
  const weekday = WEEKDAYS[new Date(`${dateISO}T00:00:00`).getDay()];

  // 2. availability windows for that staff + weekday
  const windows = await prisma.availability.findMany({
    where: { staffId, weekday },
    select: { startMin: true, endMin: true },
  });
  if (windows.length === 0) return [];

  // 3. generate candidate slots, converting local minutes → UTC instants
  const candidates: Slot[] = [];
  for (const w of windows) {
    for (let m = w.startMin; m + duration <= w.endMin; m += step) {
      // local wall-clock time on that date, e.g. dateISO + 09:00
      const localStart = `${dateISO}T${pad(Math.floor(m / 60))}:${pad(m % 60)}:00`;
      const localEnd   = minutesToLocal(dateISO, m + duration);
      candidates.push({
        startAt: fromZonedTime(localStart, tz), // → UTC
        endAt: fromZonedTime(localEnd, tz),     // → UTC
      });
    }
  }

  // 4. existing active bookings for that staff overlapping the day
  const dayStartUtc = fromZonedTime(`${dateISO}T00:00:00`, tz);
  const dayEndUtc   = fromZonedTime(`${dateISO}T23:59:59`, tz);
  const booked = await prisma.booking.findMany({
    where: {
      staffId,
      organizationId,
      status: { not: "CANCELLED" },
      startAt: { gte: dayStartUtc, lte: dayEndUtc },
    },
    select: { startAt: true, endAt: true },
  });

  // 5. drop candidates that overlap any booking, and 6. drop past slots
  const now = new Date();
  return candidates.filter((slot) => {
    if (slot.startAt < now) return false; // past
    const collides = booked.some(
      (b) => slot.startAt < b.endAt && b.startAt < slot.endAt // overlap test
    );
    return !collides;
  });
}

// helpers
function pad(n: number) {
  return n.toString().padStart(2, "0");
}
function minutesToLocal(dateISO: string, totalMin: number) {
  return `${dateISO}T${pad(Math.floor(totalMin / 60))}:${pad(totalMin % 60)}:00`;
}