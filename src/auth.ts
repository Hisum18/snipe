import "server-only";

import { DrizzleAdapter } from "@auth/drizzle-adapter";
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { z } from "zod";

import { db } from "@/db";
import { accounts, sessions, users, verificationTokens } from "@/db/schema";

export const runtime = "nodejs";

const credentialsSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(200),
});

// Google is optional — only wired up when its credentials are present, so the
// app boots and email/password works even before Google is configured.
const googleEnabled = Boolean(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  // JWT sessions are required for the Credentials provider (it bypasses the
  // adapter's DB sessions). Google users are still persisted via the adapter.
  session: { strategy: "jwt" },
  trustHost: true,
  pages: { signIn: "/login" },
  providers: [
    ...(googleEnabled
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
            // A user who signed up with email+password can also use Google with
            // the same verified email and land on the same account.
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (raw) => {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const email = parsed.data.email.toLowerCase();

        const rows = await db
          .select()
          .from(users)
          .where(sql`lower(${users.email}) = ${email}`)
          .limit(1);
        const user = rows[0];
        // No account, or an OAuth-only account with no password set.
        if (!user?.passwordHash) return null;

        const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
});
