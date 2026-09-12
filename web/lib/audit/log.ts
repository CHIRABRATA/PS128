import "server-only";
import prisma from "@/lib/db/prisma";

export interface LogAuditParams {
  actorUserId?: string | null;
  action: string;
  targetUserId?: string | null;
  previousValue?: string | Record<string, unknown> | null;
  newValue?: string | Record<string, unknown> | null;
  reason?: string | null;
}

const SENSITIVE_KEY_PATTERN = /^(password|token|secret|apiKey|authorization|credential|passphrase|privateKey)/i;

/**
 * Recursively redacts sensitive keys from objects and arrays
 */
export function redactSensitiveData(val: unknown): unknown {
  if (val === null || val === undefined) {
    return val;
  }

  if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") {
    return val;
  }

  if (Array.isArray(val)) {
    return val.map((item) => redactSensitiveData(item));
  }

  if (typeof val === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(val as Record<string, unknown>)) {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        result[key] = "[REDACTED]";
      } else {
        result[key] = redactSensitiveData(value);
      }
    }
    return result;
  }

  return String(val);
}

/**
 * Helper to safely serialize audit values without leaking secrets or circular objects
 */
export function serializeAuditValue(val: unknown): string | null {
  if (val === undefined || val === null) {
    return null;
  }
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      const redacted = redactSensitiveData(parsed);
      return JSON.stringify(redacted);
    } catch {
      return val;
    }
  }
  try {
    const redacted = redactSensitiveData(val);
    return JSON.stringify(redacted);
  } catch {
    return String(val);
  }
}

/**
 * Appends an immutable AuditLog entry in PostgreSQL.
 *
 * Requirements:
 * - Server-only execution
 * - Append-only (never mutates or deletes existing audit rows)
 * - Safe JSON serialization for previousValue / newValue
 */
export async function logAuditEvent(
  actorUserId: string | null | undefined,
  action: string,
  targetUserId?: string | null,
  previousValue?: unknown,
  newValue?: unknown,
  reason?: string | null
) {
  try {
    const entry = await prisma.auditLog.create({
      data: {
        actorUserId: actorUserId || null,
        action: action.trim(),
        targetUserId: targetUserId || null,
        previousValue: serializeAuditValue(previousValue),
        newValue: serializeAuditValue(newValue),
        reason: reason?.trim() || null,
      },
    });
    return entry;
  } catch (error) {
    console.error(`[AuditLog Failure] Failed to record audit event "${action}":`, error);
    // Audit logging should not crash the primary operational transaction, but errors are logged
    return null;
  }
}

