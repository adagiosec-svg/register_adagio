import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient;
  prismaDirect: PrismaClient;
};

// 풀링 연결 (일반 쿼리용)
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

// 직접 연결 (트랜잭션용 — PgBouncer 우회, SELECT FOR UPDATE 지원)
export const prismaDirect =
  globalForPrisma.prismaDirect ??
  new PrismaClient({
    datasources: { db: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL } },
    log: ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaDirect = prismaDirect;
}
