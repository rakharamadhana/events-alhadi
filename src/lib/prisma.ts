import { PrismaClient } from "@prisma/client";

// ---------------------------------------------------------------------------
// Singleton Prisma Client
// ---------------------------------------------------------------------------
// In development, Next.js hot-reloads modules which would create multiple
// PrismaClient instances and exhaust database connections. This pattern
// caches the client on `globalThis` to prevent connection leaks.
//
// Prisma v7: The DATABASE_URL is read from process.env automatically by
// the generated client when using the `datasourceUrl` option.
// ---------------------------------------------------------------------------

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
