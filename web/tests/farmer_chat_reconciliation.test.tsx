import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FarmerChatBox } from "@/components/farmer/FarmerChatBox";
import * as farmerTalkActions from "@/lib/actions/farmer-talk";

vi.mock("@/lib/actions/farmer-talk", () => ({
  getFarmerConversationHistoryAction: vi.fn(),
  sendFarmerChatMessageAction: vi.fn(),
}));

const mockDictionary = {
  title: "पशु आरोग्य सहाय्यक",
  subtitle: "AI Health Chat",
  disclaimer: "AI सल्ला प्राथमिक माहितीसाठी आहे.",
  escalationNotice: "तातडीने पशुवैद्यकीय मदत घ्या!",
  typePlaceholder: "लक्षणे किंवा प्रश्न येथे लिहा...",
  send: "पाठवा",
  quickPromptsTitle: "नेहमीचे प्रश्न",
  prompt1: "गाय दूध कमी देत आहे आणि सुस्त वाटते.",
  prompt2: "तोंडाला लाळ गळत आहे आणि ताप आहे.",
  prompt3: "पोट फुगले आहे आणि चारा खात नाही.",
  prompt4: "लसीकरण कधी करून घ्यावे?",
};

const mockInitialContext = {
  animalIdentity: {
    id: "animal-123",
    tag: "MH-PUN-001",
    species: "COW",
    breed: "Gir",
    ageMonths: 36,
    gender: "FEMALE",
  },
  location: {
    farmName: "Patil Farm",
    villageName: "Baramati",
    blockName: "Baramati",
    districtName: "Pune",
  },
  recentCases: [],
  vaccinations: [],
  treatments: [],
  samples: [],
};

describe("FarmerChatBox Component (Batch 2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads and displays existing conversation history", async () => {
    vi.mocked(farmerTalkActions.getFarmerConversationHistoryAction).mockResolvedValueOnce({
      success: true,
      conversationId: "conv-1",
      messages: [
        {
          id: "msg-1",
          role: "user",
          content: "गाय गवत खात नाहीये",
          createdAt: new Date().toISOString(),
        },
        {
          id: "msg-2",
          role: "assistant",
          content: "ताप तपासा आणि भरपूर स्वच्छ पाणी द्या.",
          createdAt: new Date().toISOString(),
        },
      ],
    });

    render(
      <FarmerChatBox
        animalId="animal-123"
        initialContext={mockInitialContext}
        dictionary={mockDictionary}
      />
    );

    expect(await screen.findByText("गाय गवत खात नाहीये")).toBeInTheDocument();
    expect(await screen.findByText("ताप तपासा आणि भरपूर स्वच्छ पाणी द्या.")).toBeInTheDocument();
  });

  it("optimistically renders message and updates to sent on successful API response", async () => {
    vi.mocked(farmerTalkActions.getFarmerConversationHistoryAction).mockResolvedValueOnce({
      success: true,
      conversationId: "conv-1",
      messages: [],
    });

    vi.mocked(farmerTalkActions.sendFarmerChatMessageAction).mockImplementationOnce(
      async ({ message }) => {
        return {
          success: true,
          conversationId: "conv-1",
          userMessage: {
            id: "real-user-id",
            role: "user",
            content: message,
            createdAt: new Date().toISOString(),
          },
          assistantMessage: {
            id: "real-assist-id",
            role: "assistant",
            content: "लक्षणे नोंदवली आहेत. डॉक्टरांशी संपर्क साधा.",
            createdAt: new Date().toISOString(),
          },
          needsVeterinarian: false,
          riskNotice: null,
          suggestedNextStep: undefined,
        };
      }
    );

    render(
      <FarmerChatBox
        animalId="animal-123"
        initialContext={mockInitialContext}
        dictionary={mockDictionary}
      />
    );

    const input = await screen.findByPlaceholderText(mockDictionary.typePlaceholder);
    fireEvent.change(input, { target: { value: "गाय खोकत आहे" } });

    const submitBtn = screen.getByRole("button", { name: "" }); // icon button
    fireEvent.click(submitBtn);

    // Optimistic user message appears
    expect(screen.getByText("गाय खोकत आहे")).toBeInTheDocument();

    // AI response lands
    await waitFor(() => {
      expect(screen.getByText("लक्षणे नोंदवली आहेत. डॉक्टरांशी संपर्क साधा.")).toBeInTheDocument();
    });
  });

  it("handles send failure, displays failed badge and allows inline retry", async () => {
    vi.mocked(farmerTalkActions.getFarmerConversationHistoryAction).mockResolvedValueOnce({
      success: true,
      conversationId: "conv-1",
      messages: [],
    });

    // First attempt fails
    vi.mocked(farmerTalkActions.sendFarmerChatMessageAction).mockResolvedValueOnce({
      success: false,
      error: "LLM Gateway Timeout",
    });

    render(
      <FarmerChatBox
        animalId="animal-123"
        initialContext={mockInitialContext}
        dictionary={mockDictionary}
      />
    );

    const input = await screen.findByPlaceholderText(mockDictionary.typePlaceholder);
    fireEvent.change(input, { target: { value: "पोटात कळ आहे" } });

    const submitBtn = screen.getByRole("button", { name: "" });
    fireEvent.click(submitBtn);

    // Message shows failed status and retry button
    expect(await screen.findByText(/संदेश अयशस्वी/i)).toBeInTheDocument();
    const retryBtn = screen.getByRole("button", { name: /पुन्हा पाठवा \(Retry\)/i });
    expect(retryBtn).toBeInTheDocument();

    // Second attempt (retry) succeeds
    vi.mocked(farmerTalkActions.sendFarmerChatMessageAction).mockResolvedValueOnce({
      success: true,
      conversationId: "conv-1",
      userMessage: {
        id: "retry-user-id",
        role: "user",
        content: "पोटात कळ आहे",
        createdAt: new Date().toISOString(),
      },
      assistantMessage: {
        id: "retry-assist-id",
        role: "assistant",
        content: "तात्काळ कोमट पाणी द्या.",
        createdAt: new Date().toISOString(),
      },
      needsVeterinarian: false,
      riskNotice: null,
      suggestedNextStep: undefined,
    });

    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText("तात्काळ कोमट पाणी द्या.")).toBeInTheDocument();
    });
  });

  it("allows sending messages directly from quick prompts", async () => {
    vi.mocked(farmerTalkActions.getFarmerConversationHistoryAction).mockResolvedValueOnce({
      success: true,
      conversationId: "conv-1",
      messages: [],
    });

    vi.mocked(farmerTalkActions.sendFarmerChatMessageAction).mockResolvedValueOnce({
      success: true,
      conversationId: "conv-1",
      userMessage: {
        id: "prompt-user-id",
        role: "user",
        content: mockDictionary.prompt1,
        createdAt: new Date().toISOString(),
      },
      assistantMessage: {
        id: "prompt-assist-id",
        role: "assistant",
        content: "आहारात बदल करा आणि खनिज मिश्रण द्या.",
        createdAt: new Date().toISOString(),
      },
      needsVeterinarian: false,
      riskNotice: null,
      suggestedNextStep: undefined,
    });

    render(
      <FarmerChatBox
        animalId="animal-123"
        initialContext={mockInitialContext}
        dictionary={mockDictionary}
      />
    );

    const quickPromptBtn = await screen.findByRole("button", { name: mockDictionary.prompt1 });
    fireEvent.click(quickPromptBtn);

    expect(screen.getAllByText(mockDictionary.prompt1).length).toBeGreaterThanOrEqual(2);
    await waitFor(() => {
      expect(screen.getByText("आहारात बदल करा आणि खनिज मिश्रण द्या.")).toBeInTheDocument();
    });
  });
});
