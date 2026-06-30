"use server";

import { prisma, Prisma } from "@bookflow/db";
import { requirePermission } from "@/lib/tenant";
import { revalidatePath } from "next/cache";

type CreateBookingInput = {
  serviceId: string;
  staffId: string;
  startAtISO: string; // a UTC instant from the slot engine
};

type Result =
  | { ok: true; bookingId: string }
  | { ok: false; reason: "SLOT_TAKEN" | "INVALID" | "PAST" };

export async function createBooking(input: CreateBookingInput): Promise<Result> {
  // 1. Authorize — RBAC: must be allowed to create bookings, with active org
  const { organizationId, userId } = await requirePermission("booking:create");

  // 2. Load service (tenant-scoped) for duration + price snapshot
  const service = await prisma.service.findFirst({
    where: { id: input.serviceId, organizationId, isActive: true },
    select: { durationMinutes: true, priceCents: true },
  });
  if (!service) return { ok: false, reason: "INVALID" };

  // 3. Compute the time window
  const startAt = new Date(input.startAtISO);
  if (isNaN(startAt.getTime())) return { ok: false, reason: "INVALID" };
  if (startAt < new Date()) return { ok: false, reason: "PAST" };
  const endAt = new Date(startAt.getTime() + service.durationMinutes * 60_000);

  // 4. Optional: verify the staff belongs to the org and can do this service
  const staffOk = await prisma.staffService.findFirst({
    where: { staffId: input.staffId, serviceId: input.serviceId,
             staff: { organizationId, isActive: true } },
    select: { staffId: true },
  });
  if (!staffOk) return { ok: false, reason: "INVALID" };

  // 5. Attempt the insert — let the DB constraint be the judge
  try {
    const booking = await prisma.booking.create({
      data: {
        organizationId,
        serviceId: input.serviceId,
        staffId: input.staffId,
        customerId: userId,
        startAt,
        endAt,
        priceCents: service.priceCents, // SNAPSHOT price at booking time
        status: "PENDING",              // becomes CONFIRMED after payment (Phase 5)
      },
      select: { id: true },
    });

    revalidatePath("/");
    return { ok: true, bookingId: booking.id };
  } catch (e) {
    // The exclusion constraint rejected an overlapping booking
    if (isOverlapViolation(e)) {
      return { ok: false, reason: "SLOT_TAKEN" };
    }
    throw e; // anything else is a real error — don't swallow it
  }
}

/** Detect the booking_no_overlap exclusion-constraint violation. */
function isOverlapViolation(e: unknown): boolean {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    // P2010 = raw DB error (exclusion constraints surface here)
    if (e.code === "P2010" && String(e.message).includes("booking_no_overlap")) {
      return true;
    }
  }
  // Fallback: match the constraint name anywhere in the error
  return e instanceof Error && e.message.includes("booking_no_overlap");
}