import path from "path";
import dotenv from "dotenv";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config();

const connectionString = process.env.DATABASE_URL || "";
const adapter = new PrismaNeon({ connectionString });

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

// In development with hot-reloading (Turbopack), ensure cached instance is fresh and has all generated model delegates
const isCachedClientValid =
  globalForPrisma.prisma &&
  typeof (globalForPrisma.prisma as unknown as Record<string, unknown>).assistanceRequest === "object" &&
  typeof (globalForPrisma.prisma as unknown as Record<string, unknown>).case === "object";

export const prisma = isCachedClientValid
  ? (globalForPrisma.prisma as PrismaClient)
  : createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
