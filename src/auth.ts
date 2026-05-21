// =============================================================================
// src/auth.ts — Auth.js v5 Configuration (CredentialsProvider)
// =============================================================================
// Implements email/password authentication with a strict sign-in gate:
//   • Only users with status === 'APPROVED' may sign in.
//   • PENDING and REJECTED users receive a clear error message.
//   • Passwords are verified against bcrypt hashes stored in PostgreSQL.
//   • The JWT session strategy carries userId, role, and status for
//     downstream middleware and server-component checks.
// =============================================================================

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { UserRole, UserStatus } from "@prisma/client";

// ---------------------------------------------------------------------------
// Extend the default session / JWT types so TypeScript knows about our
// custom fields (role, status, userId) everywhere in the app.
// ---------------------------------------------------------------------------
declare module "next-auth" {
  interface User {
    role: UserRole;
    status: UserStatus;
  }

  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: UserRole;
      status: UserStatus;
    };
  }
}

declare module "next-auth" {
  interface JWT {
    id: string;
    role: UserRole;
    status: UserStatus;
  }
}

// ---------------------------------------------------------------------------
// Auth.js v5 configuration
// ---------------------------------------------------------------------------
export const { handlers, auth, signIn, signOut } = NextAuth({
  // We use JWT sessions because cPanel shared hosting has no persistent
  // server-side session store available by default.
  session: { strategy: "jwt" },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  providers: [
    Credentials({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "you@example.com" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required.");
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        // ---------------------------------------------------------------
        // 1. Look up the user by email
        // ---------------------------------------------------------------
        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase().trim() },
        });

        if (!user) {
          throw new Error("Invalid email or password.");
        }

        // ---------------------------------------------------------------
        // 2. Verify the password against the stored bcrypt hash
        // ---------------------------------------------------------------
        const isPasswordValid = await compare(password, user.passwordHash);

        if (!isPasswordValid) {
          throw new Error("Invalid email or password.");
        }

        // ---------------------------------------------------------------
        // 3. Return the user object (role + status travel into the JWT)
        // ---------------------------------------------------------------
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
        };
      },
    }),
  ],

  callbacks: {
    // -------------------------------------------------------------------
    // signIn callback — GATE: block PENDING and REJECTED users
    // -------------------------------------------------------------------
    async signIn({ user }) {
      if (user.status === "PENDING") {
        throw new Error(
          "Your account is pending approval. Please wait for an administrator to verify your registration."
        );
      }

      if (user.status === "REJECTED") {
        throw new Error(
          "Your account has been rejected. Please contact support for more information."
        );
      }

      // Only APPROVED users reach this point.
      return true;
    },

    // -------------------------------------------------------------------
    // jwt callback — embed custom claims into the token
    // -------------------------------------------------------------------
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
        token.status = user.status;
      }
      return token;
    },

    // -------------------------------------------------------------------
    // session callback — expose custom claims to client components
    // -------------------------------------------------------------------
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as UserRole;
      session.user.status = token.status as UserStatus;
      return session;
    },
  },
});
