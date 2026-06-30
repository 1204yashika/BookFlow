import { auth } from "@/auth";
import { prisma } from "@bookflow/db";
import { redirect } from "next/navigation";
import { OrgPickerClient } from "./picker-client";

export default async function SelectOrgPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Already has an active org? Skip the picker.
  if (session.user.organizationId) redirect("/");

  const memberships = session.user.memberships ?? [];
  if (memberships.length === 0) {
    return (
      <main style={{ padding: 40, fontFamily: "system-ui" }}>
        <h1>No organizations</h1>
        <p>You're not a member of any organization yet.</p>
      </main>
    );
  }

  // Fetch org names for display
  const orgs = await prisma.organization.findMany({
    where: { id: { in: memberships.map((m) => m.organizationId) } },
    select: { id: true, name: true, slug: true },
  });

  const options = orgs.map((o) => ({
    ...o,
    role: memberships.find((m) => m.organizationId === o.id)?.role ?? "MEMBER",
  }));

  return (
    <main style={{ padding: 40, fontFamily: "system-ui", maxWidth: 420 }}>
      <h1>Choose an organization</h1>
      <p>You belong to multiple organizations. Pick one to continue.</p>
      <OrgPickerClient options={options} />
    </main>
  );
}