import { auth } from "@/auth";
import { getScopedDb } from "@/lib/db-scoped";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.organizationId) redirect("/select-org");  // ← the new gate

  const db = await getScopedDb();
  const bookings = await db.booking.findMany({
    include: { service: true, staff: true },
    orderBy: { startAt: "asc" },
  });

  return (
    <main style={{ padding: 40, fontFamily: "system-ui" }}>
      <h1>BookFlow</h1>
      <p>{session.user.email} · org {db.organizationId} · {session.user.role}</p>
      <ul>{bookings.map((b) => <li key={b.id}>{b.service.name} with {b.staff.name} — {b.status}</li>)}</ul>
    </main>
  );
}