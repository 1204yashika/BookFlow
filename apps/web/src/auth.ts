import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@bookflow/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds) {
        if (!creds?.email || !creds?.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: creds.email as string },
        });
        if (!user?.passwordHash) return null;
        const valid = await bcrypt.compare(creds.password as string, user.passwordHash);
        if (!valid) return null;
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // First sign-in: load the user's memberships, but DON'T pick an active org yet
      if (user) {
        const memberships = await prisma.membership.findMany({
          where: { userId: user.id as string },
          select: { organizationId: true, role: true },
        });
        token.userId = user.id;
        token.memberships = memberships;          // all orgs they belong to
        token.organizationId = null;              // not chosen yet
        token.role = null;

        // Convenience: if they belong to exactly one org, auto-select it
        if (memberships.length === 1) {
          token.organizationId = memberships[0].organizationId;
          token.role = memberships[0].role;
        }
      }

      // Later: when the picker/switcher fires an update, set the active org
      if (trigger === "update" && session?.organizationId) {
        const chosen = (token.memberships as Array<{ organizationId: string; role: string }> | undefined)
          ?.find((m) => m.organizationId === session.organizationId);

        // SECURITY: only allow switching to an org the user actually belongs to
        if (chosen) {
          token.organizationId = chosen.organizationId;
          token.role = chosen.role;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.organizationId = (token.organizationId as string | null) ?? null;
        session.user.role = (token.role as string | null) ?? null;
        session.user.memberships = (token.memberships as Array<{ organizationId: string; role: string }>) ?? [];
      }
      return session;
    },
  },
});