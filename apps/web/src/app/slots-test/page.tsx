import { getTenant } from "@/lib/tenant";
import { prisma } from "@bookflow/db";
import { getAvailableSlots } from "@/lib/slots";
import { formatInTimeZone } from "date-fns-tz";

export default async function SlotsTest() {
  const { organizationId } = await getTenant();

  const ravi = await prisma.staff.findFirstOrThrow({
    where: { organizationId, name: "Ravi" }, select: { id: true },
  });
  const haircut = await prisma.service.findFirstOrThrow({
    where: { organizationId, name: "Men's Haircut" }, select: { id: true },
  });
  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: organizationId }, select: { timezone: true },
  });

  // pick a weekday date (Mon–Fri) to see Ravi's slots
  const dateISO = "2026-06-26"; // a Friday

  const slots = await getAvailableSlots({
    organizationId, staffId: ravi.id, serviceId: haircut.id, dateISO,
  });

  return (
    <main style={{ padding: 40, fontFamily: "system-ui" }}>
      <h1>Ravi — {dateISO}</h1>
      <ul>
        {slots.map((s, i) => (
          <li key={i}>
            {formatInTimeZone(s.startAt, org.timezone, "HH:mm")} –{" "}
            {formatInTimeZone(s.endAt, org.timezone, "HH:mm")}
          </li>
        ))}
      </ul>
    </main>
  );
}