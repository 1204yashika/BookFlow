import { PrismaClient, Role, Weekday, BookingStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding...");

  // Clean slate — delete in dependency order (children before parents)
  await prisma.booking.deleteMany();
  await prisma.availability.deleteMany();
  await prisma.staffService.deleteMany();
  await prisma.staff.deleteMany();
  await prisma.service.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  // 1. The tenant
  const org = await prisma.organization.create({
    data: { name: "Glow Salon", slug: "glow-salon" },
  });

  // 2. Users: an owner and a customer
  const owner = await prisma.user.create({
    data: { email: "owner@glow.test", name: "Priya (Owner)" },
  });
  const customer = await prisma.user.create({
    data: { email: "customer@glow.test", name: "Yashika" },
  });

  // 3. Memberships — link users to the org with roles
  await prisma.membership.createMany({
    data: [
      { userId: owner.id, organizationId: org.id, role: Role.OWNER },
      { userId: customer.id, organizationId: org.id, role: Role.CUSTOMER },
    ],
  });

  // 4. Services
  const haircut = await prisma.service.create({
    data: {
      organizationId: org.id,
      name: "Men's Haircut",
      durationMinutes: 30,
      priceCents: 50000, // ₹500.00
    },
  });
  const colour = await prisma.service.create({
    data: {
      organizationId: org.id,
      name: "Hair Colour",
      durationMinutes: 90,
      priceCents: 250000, // ₹2,500.00
    },
  });

  // 5. Staff — Ravi has NO user account (offline stylist), Meena does
  const meenaUser = await prisma.user.create({
    data: { email: "meena@glow.test", name: "Meena" },
  });
  await prisma.membership.create({
    data: { userId: meenaUser.id, organizationId: org.id, role: Role.STAFF },
  });

  const ravi = await prisma.staff.create({
    data: { organizationId: org.id, name: "Ravi", title: "Senior Stylist" },
  });
  const meena = await prisma.staff.create({
    data: {
      organizationId: org.id,
      name: "Meena",
      title: "Colour Specialist",
      userId: meenaUser.id, // linked to a login
    },
  });

  // 6. Which staff can do which services
  await prisma.staffService.createMany({
    data: [
      { staffId: ravi.id, serviceId: haircut.id },
      { staffId: meena.id, serviceId: haircut.id },
      { staffId: meena.id, serviceId: colour.id },
    ],
  });

  // 7. Availability — Ravi works Mon–Fri 9:00–17:00 (540–1020 min)
  const weekdays = [Weekday.MON, Weekday.TUE, Weekday.WED, Weekday.THU, Weekday.FRI];
  await prisma.availability.createMany({
    data: weekdays.map((weekday) => ({
      staffId: ravi.id,
      weekday,
      startMin: 540,
      endMin: 1020,
    })),
  });

  // 8. One existing booking — so you can test the overlap constraint against it
  const start = new Date();
  start.setUTCHours(10, 0, 0, 0); // today 10:00 UTC
  const end = new Date(start);
  end.setUTCMinutes(end.getUTCMinutes() + haircut.durationMinutes);

  await prisma.booking.create({
    data: {
      organizationId: org.id,
      serviceId: haircut.id,
      staffId: ravi.id,
      customerId: customer.id,
      startAt: start,
      endAt: end,
      priceCents: haircut.priceCents, // snapshot
      status: BookingStatus.CONFIRMED,
    },
  });

  console.log("✅ Seed complete:", { org: org.slug, ravi: ravi.name });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.disconnect?.() ?? (await prisma.$disconnect());
  });