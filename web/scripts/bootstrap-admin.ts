/**
 * Maitri Initial Admin Bootstrap Script
 *
 * Usage:
 *   npx tsx web/scripts/bootstrap-admin.ts <clerkUserId>
 *
 * Description:
 *   Promotes an existing registered user to the ADMIN role with ACTIVE status.
 *   This script is the exclusive mechanism to create the initial platform admin.
 *   There is no UI, self-service route, or unauthenticated API endpoint for admin creation.
 */

import prisma from "../lib/db/prisma";
import { clerkClient } from "@clerk/nextjs/server";
import { UserRole, UserStatus } from "@prisma/client";

async function main() {
  const clerkUserId = process.argv[2];

  if (!clerkUserId || clerkUserId.trim() === "") {
    console.error("❌ Error: Missing required <clerkUserId> argument.");
    console.error("\nUsage:\n  npx tsx web/scripts/bootstrap-admin.ts <clerkUserId>\n");
    process.exit(1);
  }

  const trimmedClerkId = clerkUserId.trim();
  console.log(`🔍 Inspecting user account for Clerk ID: "${trimmedClerkId}"...`);

  const existingUser = await prisma.user.findUnique({
    where: { clerkId: trimmedClerkId },
    include: {
      district: true,
      block: true,
      village: true,
    },
  });

  if (!existingUser) {
    console.error(`❌ User not found in database for Clerk ID "${trimmedClerkId}".`);
    console.error("   The user must first sign up and complete initial registration in the web portal.");
    console.error("   Bootstrap cannot create an arbitrary user out of thin air.");
    process.exit(1);
  }

  console.log(`👤 Found user: ${existingUser.name} (${existingUser.phone})`);
  console.log(`   Current Role:   ${existingUser.role}`);
  console.log(`   Current Status: ${existingUser.status}`);

  // Idempotency check: if already active ADMIN, avoid redundant updates
  if (existingUser.role === "ADMIN" && existingUser.status === "ACTIVE") {
    console.log("✅ User is already an active platform ADMIN. No changes needed.");
    process.exit(0);
  }

  const previousState = {
    role: existingUser.role,
    status: existingUser.status,
  };

  const newState = {
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
  };

  // Perform atomic database update and audit logging
  console.log("⚙️  Promoting user to ADMIN with ACTIVE status...");
  const [updatedUser, auditEntry] = await prisma.$transaction([
    prisma.user.update({
      where: { id: existingUser.id },
      data: {
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      },
    }),
    prisma.auditLog.create({
      data: {
        actorUserId: existingUser.id,
        action: "ADMIN_BOOTSTRAPPED",
        targetUserId: existingUser.id,
        previousValue: JSON.stringify(previousState),
        newValue: JSON.stringify(newState),
        reason: "Initial admin bootstrap executed via CLI script",
      },
    }),
  ]);

  // Synchronize Clerk publicMetadata outside the transaction
  try {
    const client = await clerkClient();
    await client.users.updateUserMetadata(trimmedClerkId, {
      publicMetadata: {
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      },
    });
    console.log("☁️  Clerk user metadata synchronized successfully.");
  } catch (clerkErr) {
    console.warn("⚠️  Warning: Failed to sync Clerk metadata automatically:", clerkErr);
    console.warn("   Prisma database record has been updated and audit logged.");
  }

  console.log("\n🎉 Admin bootstrap completed successfully!");
  console.log(`   User ID:     ${updatedUser.id}`);
  console.log(`   Name:        ${updatedUser.name}`);
  console.log(`   New Role:    ${updatedUser.role}`);
  console.log(`   New Status:  ${updatedUser.status}`);
  console.log(`   Audit Entry: ${auditEntry.id} (${auditEntry.action})`);
}

main()
  .catch((err) => {
    console.error("❌ Fatal error during admin bootstrap:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
