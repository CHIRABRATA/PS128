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

function getValidClient(): PrismaClient {
  const cached = globalForPrisma.prisma;
  const runtimeModel = (cached as unknown as { _runtimeDataModel?: { models?: Record<string, { fields?: Array<{ name: string }> }> } })?._runtimeDataModel;
  const hasAssignedVetField = runtimeModel?.models?.Case?.fields?.some((f) => f.name === "assignedVeterinarianUserId");
  const hasAssistanceRequest = typeof (cached as unknown as Record<string, unknown> | undefined)?.assistanceRequest === "object";

  if (!cached || !hasAssignedVetField || !hasAssistanceRequest) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma as PrismaClient;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getValidClient();
    const value = Reflect.get(client, prop, receiver);
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});

export default prisma;
