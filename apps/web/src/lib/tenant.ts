import { DefaultSession } from "next-auth";
import { auth } from "@/auth";
import { can, type Permission } from "./permissions";

type Membership = { organizationId: string; role: string };

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      organizationId: string | null;
      role: string | null;
      memberships: Membership[];
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    organizationId?: string | null;
    role?: string | null;
    memberships?: Membership[];
  }
}

export type TenantContext = { userId: string; organizationId: string; role: string };

export async function getTenant(): Promise<TenantContext> {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) throw new Error("UNAUTHENTICATED");
  if (!user.organizationId) throw new Error("NO_ACTIVE_ORG");
  return { userId: user.id, organizationId: user.organizationId, role: user.role ?? "CUSTOMER" };
}

/**
 * Resolves tenant context AND enforces a permission.
 * Throws FORBIDDEN if the role isn't allowed the action.
 */
export async function requirePermission(permission: Permission): Promise<TenantContext> {
  const ctx = await getTenant();
  if (!can(ctx.role, permission)) throw new Error("FORBIDDEN");
  return ctx;
}