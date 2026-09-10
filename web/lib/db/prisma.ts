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
  const hasAssistanceRequest =
    !!runtimeModel?.models?.AssistanceRequest ||
    typeof (cached as unknown as Record<string, unknown> | undefined)?.assistanceRequest === "object";

  if (!cached || !hasAssignedVetField || !hasAssistanceRequest) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma as PrismaClient;
}

/**
 * Safely checks if a model or field exists in the current Prisma runtime client.
 */
export function hasModel(modelName: string): boolean {
  const client = getValidClient() as any;
  const runtimeModel = client?._runtimeDataModel;
  if (!runtimeModel?.models) return !!client[modelName] || !!client[modelName.toLowerCase()];
  
  return !!(runtimeModel.models[modelName] || 
            Object.values(runtimeModel.models).find((m: any) => m.name?.toLowerCase() === modelName.toLowerCase()));
}

export function hasField(modelName: string, fieldName: string): boolean {
  const client = getValidClient() as any;
  const runtimeModel = client?._runtimeDataModel;
  if (!runtimeModel?.models) return false;
  
  const model = runtimeModel.models[modelName] || 
                Object.values(runtimeModel.models).find((m: any) => m.name?.toLowerCase() === modelName.toLowerCase());
                
  if (!model?.fields) return false;
  
  const field = model.fields.find((f: any) => f.name === fieldName);
  return !!field;
}

/**
 * Checks if a field is a relation (object kind) and thus includable.
 */
export function isRelation(modelName: string, fieldName: string): boolean {
  const client = getValidClient() as any;
  const runtimeModel = client?._runtimeDataModel;
  if (!runtimeModel?.models) return false;
  
  const model = runtimeModel.models[modelName] || 
                Object.values(runtimeModel.models).find((m: any) => m.name?.toLowerCase() === modelName.toLowerCase());
                
  if (!model?.fields) return false;
  
  const field = model.fields.find((f: any) => f.name === fieldName);
  return field?.kind === "object";
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getValidClient();
    const value = Reflect.get(client, prop, client);
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});

export default prisma;
