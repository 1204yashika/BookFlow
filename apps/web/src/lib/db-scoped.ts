import { prisma, Prisma } from "@bookflow/db";
import { getTenant } from "./tenant";

export async function getScopedDb() {
  const { organizationId } = await getTenant();

  return {
    organizationId,

    booking: {
      findMany: <A extends Prisma.BookingFindManyArgs>(
        args?: A
      ): Promise<Prisma.BookingGetPayload<A>[]> =>
        prisma.booking.findMany({
          ...args,
          where: { ...args?.where, organizationId },
        } as A) as Promise<Prisma.BookingGetPayload<A>[]>,

      findFirst: <A extends Prisma.BookingFindFirstArgs>(
        args?: A
      ): Promise<Prisma.BookingGetPayload<A> | null> =>
        prisma.booking.findFirst({
          ...args,
          where: { ...args?.where, organizationId },
        } as A) as Promise<Prisma.BookingGetPayload<A> | null>,

      create: (data: Omit<Prisma.BookingCreateInput, "organization">) =>
        prisma.booking.create({
          data: { ...data, organization: { connect: { id: organizationId } } },
        }),
    },

    service: {
      findMany: <A extends Prisma.ServiceFindManyArgs>(
        args?: A
      ): Promise<Prisma.ServiceGetPayload<A>[]> =>
        prisma.service.findMany({
          ...args,
          where: { ...args?.where, organizationId },
        } as A) as Promise<Prisma.ServiceGetPayload<A>[]>,
    },

    staff: {
      findMany: <A extends Prisma.StaffFindManyArgs>(
        args?: A
      ): Promise<Prisma.StaffGetPayload<A>[]> =>
        prisma.staff.findMany({
          ...args,
          where: { ...args?.where, organizationId },
        } as A) as Promise<Prisma.StaffGetPayload<A>[]>,
    },
  };
}