import "server-only";
import { clerkClient } from "@clerk/nextjs/server";
import { UserRole, UserStatus } from "@prisma/client";

export interface ClerkPublicMetadata {
  role?: UserRole;
  status?: UserStatus;
}

/**
 * Synchronizes application User role and status into Clerk publicMetadata.
 * Safe server-only function.
 */
export async function syncClerkApplicationState(
  clerkUserId: string,
  role: UserRole,
  status: UserStatus
): Promise<boolean> {
  try {
    const client = await clerkClient();
    await client.users.updateUserMetadata(clerkUserId, {
      publicMetadata: {
        role,
        status,
      },
    });
    return true;
  } catch (error) {
    console.error(`[Maitri Auth] Failed to sync Clerk metadata for user ${clerkUserId}:`, error);
    return false;
  }
}
