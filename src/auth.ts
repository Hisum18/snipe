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
import { clientIp, loginByEmail, loginByIp } from "@/lib/ratelimit";

export const runtime = "nodejs";

const credentialsSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(200),
});

// Precomputed bcrypt hash. For an unknown email we still run a compare against
// this so login response time doesn't reveal whether an account exists.
const DUMMY_HASH = bcrypt.hashSync("snipe-login-timing-guard", 12);

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
      authorize: async (raw, request) => {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const email = parsed.data.email.toLowerCase();

        // Brute-force protection: rate-limit login attempts per IP and per email.
        const ip = clientIp(request as unknown as Request);
        const [ipCheck, emailCheck] = await Promise.all([
          loginByIp().limit(ip),
          loginByEmail().limit(email),
        ]);
        if (!ipCheck.success || !emailCheck.success) return null;

        const rows = await db
          .select()
          .from(users)
          .where(sql`lower(${users.email}) = ${email}`)
          .limit(1);
        const user = rows[0];

        // No account, or an OAuth-only account with no password. Still run a
        // bcrypt compare (against a dummy hash) so timing can't distinguish an
        // unknown email from a wrong password.
        if (!user?.passwordHash) {
          await bcrypt.compare(parsed.data.password, DUMMY_HASH);
          return null;
        }

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
