import { DefaultSession } from "next-auth";

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