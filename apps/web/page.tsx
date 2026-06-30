import { prisma } from "@bookflow/db";

export default async function Home() {
  // This runs on the SERVER. The browser never sees Prisma or the DB.
  const orgs = await prisma.organization.findMany({
    select: { name: true, slug: true },
  });

  return (
    <main style={{ padding: 40, fontFamily: "system-ui" }}>
      <h1>BookFlow</h1>
      <p>Organizations in the database (via @bookflow/db):</p>
      <ul>
        {orgs.map((o) => (
          <li key={o.slug}>
            {o.name} — <code>/{o.slug}</code>
          </li>
        ))}
      </ul>
    </main>
  );
}