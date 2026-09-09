"use server";

import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { UserStatus } from "@prisma/client";

import { syncClerkApplicationState } from "@/lib/auth/metadata";

const onboardingSchema = z.object({
  role: z.enum(["FARMER", "FIELD_AGENT", "VETERINARIAN", "DISTRICT_AUTHORITY"]),
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().min(10, "Please enter a valid 10-digit phone number"),
  preferredLanguage: z.string().default("en"),
  districtId: z.string().optional().nullable(),
  blockId: z.string().optional().nullable(),
  villageId: z.string().optional().nullable(),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;

export async function completeOnboardingAction(input: OnboardingInput) {
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: "Unauthenticated. Please sign in." };
  }

  // 1. Server-side Zod validation (do NOT trust client payload)
  const validation = onboardingSchema.safeParse(input);
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0]?.message || "Invalid input data",
    };
  }

  const { role, name, phone, preferredLanguage, districtId, blockId, villageId } = validation.data;

  // 2. Enforce strict onboarding status rules on server
  let status: UserStatus = "PENDING_APPROVAL";
  if (role === "FARMER") {
    status = "ACTIVE";
  }

  // 3. Check for existing User record
  const existingUser = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  if (existingUser) {
    return {
      success: true,
      redirectUrl: existingUser.status === "ACTIVE" ? "/dashboard" : "/pending-approval",
      message: "User profile already exists.",
    };
  }

  // 4. Verify geographic entities if provided
  if (districtId) {
    const districtExists = await prisma.district.findUnique({ where: { id: districtId } });
    if (!districtExists) {
      return { success: false, error: "Invalid District selected." };
    }
  }

  if (blockId) {
    const blockExists = await prisma.block.findUnique({ where: { id: blockId } });
    if (!blockExists) {
      return { success: false, error: "Invalid Block selected." };
    }
  }

  if (villageId) {
    const villageExists = await prisma.village.findUnique({ where: { id: villageId } });
    if (!villageExists) {
      return { success: false, error: "Invalid Village selected." };
    }
  }

  // 5. Create authoritative User record in Prisma
  const newUser = await prisma.user.create({
    data: {
      clerkId: userId,
      role,
      status,
      name,
      phone,
      preferredLanguage: preferredLanguage || "en",
      districtId: districtId || null,
      blockId: blockId || null,
      villageId: villageId || null,
    },
  });

  // 6. Synchronize Clerk publicMetadata
  await syncClerkApplicationState(userId, newUser.role, newUser.status);

  const redirectUrl = newUser.status === "ACTIVE" ? "/dashboard" : "/pending-approval";

  return {
    success: true,
    redirectUrl,
  };
}
