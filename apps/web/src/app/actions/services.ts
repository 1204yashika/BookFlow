"use server";

import { prisma } from "@bookflow/db";
import { requirePermission } from "@/lib/tenant";
import { revalidatePath } from "next/cache";

export async function createService(input: {
  name: string;
  durationMinutes: number;
  priceCents: number;
}) {
  // ONE line enforces: logged in + has active org + role allows service:create
  const { organizationId } = await requirePermission("service:create");

  const service = await prisma.service.create({
    data: {
      organizationId,                 // tenant-scoped insert
      name: input.name,
      durationMinutes: input.durationMinutes,
      priceCents: input.priceCents,
    },
  });

  revalidatePath("/");
  return service;
}