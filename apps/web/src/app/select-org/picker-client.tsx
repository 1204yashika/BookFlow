"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Option = { id: string; name: string; slug: string; role: string };

export function OrgPickerClient({ options }: { options: Option[] }) {
  const { update } = useSession();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function choose(orgId: string) {
    setBusy(orgId);
    // Fires the jwt `trigger === "update"` branch with our chosen org
    await update({ organizationId: orgId });
    router.push("/");
    router.refresh();
  }

  return (
    <ul style={{ listStyle: "none", padding: 0 }}>
      {options.map((o) => (
        <li key={o.id} style={{ marginBottom: 8 }}>
          <button
            onClick={() => choose(o.id)}
            disabled={busy !== null}
            style={{ width: "100%", textAlign: "left", padding: 12, cursor: "pointer" }}
          >
            <strong>{o.name}</strong> — <small>{o.role}</small>
          </button>
        </li>
      ))}
    </ul>
  );
}