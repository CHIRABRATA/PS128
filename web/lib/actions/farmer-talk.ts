"use server";

import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireFarmer, assertFarmerOwnsAnimal } from "@/lib/auth/permissions";
import { checkRateLimit } from "@/lib/security/rate-limit";
import {
  generateFarmerTalkResponse,
  AnimalContextPacket,
} from "@/lib/ai/farmer-talk";

const sendMessageInputSchema = z.object({
  animalId: z.string().min(1, "Animal ID is required"),
  message: z.string().min(1, "Message cannot be empty").max(500, "Message is too long"),
  clientSubmissionId: z.string().min(5, "Client submission ID is required"),
  conversationId: z.string().optional(),
});

export type SendMessageInput = z.infer<typeof sendMessageInputSchema>;

/**
 * Sanitizes veterinary notes to remove sensitive personal phone numbers / staff-only comments
 */
function sanitizeVetNotes(rawNotes: string | null): string | null {
  if (!rawNotes) return null;
  // Remove phone numbers and internal tags
  return rawNotes
    .replace(/\b\d{10}\b/g, "[Phone Redacted]")
    .replace(/INTERNAL ONLY:?/gi, "")
    .trim();
}

/**
 * Assembles a bounded, real-data AnimalContextPacket for the selected animal
 */
export async function getFarmerAnimalTalkContextAction(animalId: string): Promise<{
  success: boolean;
  contextPacket?: AnimalContextPacket;
  error?: string;
}> {
  try {
    await requireFarmer();
    await assertFarmerOwnsAnimal(animalId);

    const animal = await prisma.animal.findUnique({
      where: { id: animalId },
      include: {
        herd: {
          include: {
            farm: {
              include: {
                village: {
                  include: {
                    block: {
                      include: {
                        district: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        cases: {
          take: 5,
          orderBy: { reportedAt: "desc" },
        },
        vaccinations: {
          take: 10,
          orderBy: { dateGiven: "desc" },
        },
        treatments: {
          take: 10,
          orderBy: { dateGiven: "desc" },
        },
        veterinaryReports: {
          take: 5,
          orderBy: { createdAt: "desc" },
        },
        iotDevices: {
          take: 1,
          orderBy: { updatedAt: "desc" },
        },
        iotReadings: {
          take: 1,
          orderBy: { recordedAt: "desc" },
        },
      },
    });

    if (!animal) {
      return { success: false, error: "Animal not found" };
    }

    const farm = animal.herd.farm;
    const village = farm.village;
    const block = village.block;
    const district = block.district;

    // Fetch lab samples for the animal's recent cases
    const caseIds = animal.cases.map((c) => c.id);
    const samples = caseIds.length > 0
      ? await prisma.sample.findMany({
          where: { caseId: { in: caseIds } },
          take: 5,
          orderBy: { collectedAt: "desc" },
        })
      : [];

    const latestDevice = animal.iotDevices?.[0] || null;
    const latestReading = animal.iotReadings?.[0] || null;

    const iotTelemetry = (latestDevice || latestReading) ? {
      hasDevice: !!latestDevice,
      deviceIdentifier: latestDevice?.deviceIdentifier || null,
      deviceStatus: latestDevice?.status || null,
      source: latestReading?.source || latestDevice?.source || null,
      lastSeenAt: latestDevice?.lastSeenAt ? latestDevice.lastSeenAt.toISOString() : null,
      latestReading: latestReading ? {
        temperature: latestReading.temperature,
        activityIndex: latestReading.activityIndex,
        hasAnomaly: latestReading.hasAnomaly,
        anomalies: latestReading.anomalies,
        source: latestReading.source,
        recordedAt: latestReading.recordedAt.toISOString(),
      } : null,
    } : null;

    const contextPacket: AnimalContextPacket = {
      animalIdentity: {
        tag: animal.tag,
        species: animal.species,
        breed: animal.breed,
        ageMonths: animal.ageMonths,
      },
      location: {
        farmName: farm.name,
        villageName: village.name,
        blockName: block.name,
        districtName: district.name,
      },
      recentCases: animal.cases.map((c) => {
        const analysis = (c.analysisResult as Record<string, unknown> | null) || {};
        const diseasePrediction = (analysis.disease_prediction as Record<string, unknown> | null) || {};

        return {
          caseNumber: c.caseNumber,
          status: c.status,
          reportedAt: c.reportedAt.toISOString(),
          symptoms: c.symptoms,
          durationDays: c.durationDays,
          affectedCount: c.affectedCount,
          mortalityCount: c.mortalityCount,
          overallRiskLevel: (analysis.overall_risk_level as string) || null,
          suspectedCondition: (diseasePrediction.suspected_condition as string) || null,
          vetDiagnosis: c.vetDiagnosis,
          vetAction: c.vetRecommendedAction,
          sanitizedVetNotes: sanitizeVetNotes(c.vetNotes),
        };
      }),
      vaccinations: animal.vaccinations.map((v) => ({
        vaccineName: v.vaccineName,
        dateGiven: v.dateGiven.toISOString().split("T")[0],
        nextDueDate: v.nextDueDate ? v.nextDueDate.toISOString().split("T")[0] : null,
      })),
      treatments: animal.treatments.map((t) => ({
        medication: t.medication,
        dateGiven: t.dateGiven.toISOString().split("T")[0],
        notes: t.notes,
      })),
      veterinaryReports: animal.veterinaryReports.map((vr) => ({
        id: vr.id,
        diagnosis: vr.diagnosis,
        action: vr.action,
        createdAt: vr.createdAt.toISOString().split("T")[0],
        followUpDate: vr.followUpDate ? vr.followUpDate.toISOString().split("T")[0] : null,
        instructions: vr.instructions,
        prescription: vr.prescription,
        notes: sanitizeVetNotes(vr.notes),
      })),
      iotTelemetry,
      samples: samples.map((s) => ({
        status: s.status,
        collectedAt: s.collectedAt.toISOString().split("T")[0],
        resultSummary: s.resultSummary,
      })),
    };

    return { success: true, contextPacket };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to load animal context";
    return { success: false, error: errorMsg };
  }
}

/**
 * Fetches or creates the ChatConversation for farmer + selected animal
 */
export async function getFarmerConversationHistoryAction(animalId: string): Promise<{
  success: boolean;
  conversationId?: string;
  messages?: Array<{ id: string; role: "user" | "assistant"; content: string; createdAt: string }>;
  error?: string;
}> {
  try {
    const farmer = await requireFarmer();
    await assertFarmerOwnsAnimal(animalId);

    let conversation = await prisma.chatConversation.findFirst({
      where: {
        animalId,
        userId: farmer.id,
      },
      include: {
        messages: {
          take: 20,
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!conversation) {
      conversation = await prisma.chatConversation.create({
        data: {
          animalId,
          userId: farmer.id,
        },
        include: {
          messages: true,
        },
      });
    }

    return {
      success: true,
      conversationId: conversation.id,
      messages: conversation.messages.map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to load chat history";
    return { success: false, error: errorMsg };
  }
}

/**
 * Sends a user chat message with clientSubmissionId idempotency & GenAI response execution
 */
export async function sendFarmerChatMessageAction(input: SendMessageInput) {
  try {
    const farmer = await requireFarmer();

    // Rate limit: 20 messages / min per farmer
    const rateLimit = checkRateLimit(`farmer_talk:${farmer.id}`, 20, 60 * 1000);
    if (!rateLimit.success) {
      return { success: false, error: "Rate limit exceeded. Please wait a moment before sending another message." };
    }

    const validation = sendMessageInputSchema.safeParse(input);
    if (!validation.success) {
      return { success: false, error: validation.error.issues[0]?.message || "Invalid input payload" };
    }

    const { animalId, message, clientSubmissionId, conversationId: providedConvId } = validation.data;
    await assertFarmerOwnsAnimal(animalId);

    // Load or create conversation
    let conversationId = providedConvId;
    if (!conversationId) {
      const existingConv = await prisma.chatConversation.findFirst({
        where: { animalId, userId: farmer.id },
      });
      if (existingConv) {
        conversationId = existingConv.id;
      } else {
        const createdConv = await prisma.chatConversation.create({
          data: { animalId, userId: farmer.id },
        });
        conversationId = createdConv.id;
      }
    }

    // Double check conversation belongs to farmer and animal
    const conversation = await prisma.chatConversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation || conversation.userId !== farmer.id || conversation.animalId !== animalId) {
      return { success: false, error: "Unauthorized conversation access" };
    }

    // IDEMPOTENCY PROTECTION (Correction 1):
    // Check if a message with this clientSubmissionId already exists in DB
    let userMsg = await prisma.chatMessage.findUnique({
      where: { id: clientSubmissionId },
    });

    if (!userMsg) {
      // Create user ChatMessage using clientSubmissionId as primary key
      userMsg = await prisma.chatMessage.create({
        data: {
          id: clientSubmissionId,
          conversationId,
          role: "user",
          content: message,
        },
      });
    }

    // Fetch context packet and recent message history
    const contextRes = await getFarmerAnimalTalkContextAction(animalId);
    if (!contextRes.success || !contextRes.contextPacket) {
      return { success: false, error: "Failed to assemble animal context packet" };
    }

    const previousMessages = await prisma.chatMessage.findMany({
      where: { conversationId },
      take: 6,
      orderBy: { createdAt: "asc" },
    });

    const historyForPrompt = previousMessages
      .filter((m) => m.id !== clientSubmissionId)
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    // Call GenAI Provider (Gemini with Groq Fallback & 5-Layer Safety Validation)
    const aiResponse = await generateFarmerTalkResponse(
      contextRes.contextPacket,
      historyForPrompt,
      message,
      farmer.preferredLanguage || "en"
    );

    // Persist Assistant ChatMessage
    const assistantMsg = await prisma.chatMessage.create({
      data: {
        conversationId,
        role: "assistant",
        content: aiResponse.answer,
      },
    });

    // Update conversation timestamp
    await prisma.chatConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return {
      success: true,
      conversationId,
      userMessage: {
        id: userMsg.id,
        role: "user" as const,
        content: userMsg.content,
        createdAt: userMsg.createdAt.toISOString(),
      },
      assistantMessage: {
        id: assistantMsg.id,
        role: "assistant" as const,
        content: assistantMsg.content,
        createdAt: assistantMsg.createdAt.toISOString(),
      },
      needsVeterinarian: aiResponse.needs_veterinarian,
      riskNotice: aiResponse.risk_notice,
      suggestedNextStep: aiResponse.suggested_next_step,
    };
  } catch (err: unknown) {
    console.error("[Farmer Talk Error]:", err);
    const errorMsg = err instanceof Error ? err.message : "An error occurred during chat response generation";
    return { success: false, error: errorMsg };
  }
}
