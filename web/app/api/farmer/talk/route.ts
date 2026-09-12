import { NextResponse } from "next/server";
import { generateFarmerTalkResponse, AnimalContextPacket } from "@/lib/ai/farmer-talk";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { animalContext, conversationHistory, userMessage, preferredLanguage } = body;

    if (!animalContext || !userMessage) {
      return NextResponse.json(
        { error: "Missing required payload: animalContext and userMessage are required." },
        { status: 400 }
      );
    }

    const response = await generateFarmerTalkResponse(
      animalContext as AnimalContextPacket,
      conversationHistory || [],
      userMessage,
      preferredLanguage || "en"
    );

    return NextResponse.json(response);
  } catch (error) {
    console.error("[API Route /api/farmer/talk Error]:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while generating the advice." },
      { status: 500 }
    );
  }
}
