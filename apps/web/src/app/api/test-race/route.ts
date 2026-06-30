import { createBooking } from "@/app/actions/create-booking";
import { prisma } from "@bookflow/db";
import { getTenant } from "@/lib/tenant";
import { NextResponse } from "next/server";

export async function GET() {
  const { organizationId } = await getTenant();
  const ravi = await prisma.staff.findFirstOrThrow({
    where: { organizationId, name: "Ravi" }, select: { id: true },
  });
  const haircut = await prisma.service.findFirstOrThrow({
    where: { organizationId, name: "Men's Haircut" }, select: { id: true },
  });

  // a fresh future slot both calls fight over
  const startAtISO = new Date(Date.now() + 24 * 3600_000).toISOString();
  const input = { serviceId: haircut.id, staffId: ravi.id, startAtISO };

  // fire BOTH at once — the race
  const [a, b] = await Promise.all([createBooking(input), createBooking(input)]);
  return NextResponse.json({ a, b });
}