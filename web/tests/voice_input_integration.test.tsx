import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { FarmerChatBox } from "@/components/farmer/FarmerChatBox";
import {
  mapAppLocaleToSpeechLang,
  SpeechRecognitionEventLike,
  SpeechRecognitionErrorEventLike,
} from "@/lib/hooks/useSpeechRecognition";
import * as farmerTalkActions from "@/lib/actions/farmer-talk";
import enDict from "@/lib/i18n/dictionaries/en.json";
import hiDict from "@/lib/i18n/dictionaries/hi.json";
import mrDict from "@/lib/i18n/dictionaries/mr.json";
import bnDict from "@/lib/i18n/dictionaries/bn.json";

vi.mock("@/lib/actions/farmer-talk", () => ({
  getFarmerConversationHistoryAction: vi.fn(),
  sendFarmerChatMessageAction: vi.fn(),
}));

class MockSpeechRecognition {
  static instances: MockSpeechRecognition[] = [];
  lang = "en-IN";
  continuous = false;
  interimResults = false;
  maxAlternatives = 1;
  onstart: (() => void) | null = null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null = null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null = null;
  onend: (() => void) | null = null;

  start = vi.fn(() => {
    MockSpeechRecognition.instances.push(this);
    if (this.onstart) {
      this.onstart();
    }
  });

  stop = vi.fn(() => {
    if (this.onend) {
      this.onend();
    }
  });

  abort = vi.fn(() => {
    if (this.onend) {
      this.onend();
    }
  });

  static reset() {
    MockSpeechRecognition.instances = [];
  }
}

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

describe("Maitri Voice Input Integration Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MockSpeechRecognition.reset();
    const win = window as unknown as Record<string, unknown>;
    win.SpeechRecognition = MockSpeechRecognition;
    win.webkitSpeechRecognition = MockSpeechRecognition;

    vi.mocked(farmerTalkActions.getFarmerConversationHistoryAction).mockResolvedValue({
      success: true,
      conversationId: "conv-1",
      messages: [],
    });
  });

  afterEach(() => {
    const win = window as unknown as Record<string, unknown>;
    delete win.SpeechRecognition;
    delete win.webkitSpeechRecognition;
  });

  // 1 & 2. Button renders and has accessible attributes
  it("1 & 2. renders microphone button with accessible label and attributes", async () => {
    render(
      <FarmerChatBox
        animalId="animal-123"
        initialContext={mockInitialContext}
        dictionary={enDict.farmerTalk}
        locale="en"
      />
    );

    const micBtn = await screen.findByRole("button", { name: /Start voice input/i });
    expect(micBtn).toBeInTheDocument();
    expect(micBtn).toHaveAttribute("type", "button");
    expect(micBtn).toHaveAttribute("title", "Start voice input");
    expect(micBtn).toHaveAttribute("aria-pressed", "false");
  });

  // 3. Unsupported browser handling
  it("3. handles unsupported browser gracefully without crashing and disables button", async () => {
    const win = window as unknown as Record<string, unknown>;
    delete win.SpeechRecognition;
    delete win.webkitSpeechRecognition;

    render(
      <FarmerChatBox
        animalId="animal-123"
        initialContext={mockInitialContext}
        dictionary={enDict.farmerTalk}
        locale="en"
      />
    );

    const micBtn = await screen.findByRole("button", {
      name: /Voice input is not supported in this browser/i,
    });
    expect(micBtn).toBeInTheDocument();
    expect(micBtn).toBeDisabled();

    // Text typing still works
    const input = screen.getByPlaceholderText(enDict.farmerTalk.typePlaceholder);
    fireEvent.change(input, { target: { value: "Regular typing still works" } });
    expect(input).toHaveValue("Regular typing still works");
  });

  // 4 & 5. Start listening and UI state change
  it("4 & 5. starts listening and transitions UI to listening state with live feedback", async () => {
    render(
      <FarmerChatBox
        animalId="animal-123"
        initialContext={mockInitialContext}
        dictionary={enDict.farmerTalk}
        locale="en"
      />
    );

    const micBtn = await screen.findByRole("button", { name: /Start voice input/i });
    fireEvent.click(micBtn);

    expect(MockSpeechRecognition.instances.length).toBe(1);
    const instance = MockSpeechRecognition.instances[0];
    expect(instance.start).toHaveBeenCalled();

    // UI should show listening state
    expect(screen.getAllByRole("button", { name: /Stop listening/i })[0]).toBeInTheDocument();
    expect(screen.getByText(/Listening\.\.\./i)).toBeInTheDocument();
  });

  // 6. Stop returns to idle
  it("6. stops listening and returns to idle state when clicked again", async () => {
    render(
      <FarmerChatBox
        animalId="animal-123"
        initialContext={mockInitialContext}
        dictionary={enDict.farmerTalk}
        locale="en"
      />
    );

    const micBtn = await screen.findByRole("button", { name: /Start voice input/i });
    fireEvent.click(micBtn);

    const activeInstance = MockSpeechRecognition.instances[0];
    const stopBtns = screen.getAllByRole("button", { name: /Stop listening/i });
    expect(stopBtns.length).toBeGreaterThan(0);

    // Click the toggle button
    fireEvent.click(stopBtns[1] || stopBtns[0]);

    expect(activeInstance.stop).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Start voice input/i })).toBeInTheDocument();
    });
  });

  // 7. Final transcript enters inputMessage
  it("7. enters final speech transcript into the inputMessage field", async () => {
    render(
      <FarmerChatBox
        animalId="animal-123"
        initialContext={mockInitialContext}
        dictionary={enDict.farmerTalk}
        locale="en"
      />
    );

    const micBtn = await screen.findByRole("button", { name: /Start voice input/i });
    fireEvent.click(micBtn);

    const instance = MockSpeechRecognition.instances[0];

    act(() => {
      instance.onresult?.({
        resultIndex: 0,
        results: [{ 0: { transcript: "Cow has high fever" }, isFinal: true, length: 1 }],
      });
    });

    const input = screen.getByPlaceholderText(enDict.farmerTalk.typePlaceholder);
    expect(input).toHaveValue("Cow has high fever");
  });

  // 8 & 9. Interim transcript does not duplicate final transcript
  it("8 & 9. shows interim transcript during speech and avoids duplicate phrases on finalization", async () => {
    render(
      <FarmerChatBox
        animalId="animal-123"
        initialContext={mockInitialContext}
        dictionary={enDict.farmerTalk}
        locale="en"
      />
    );

    const micBtn = await screen.findByRole("button", { name: /Start voice input/i });
    fireEvent.click(micBtn);

    const instance = MockSpeechRecognition.instances[0];

    // Interim event 1
    act(() => {
      instance.onresult?.({
        resultIndex: 0,
        results: [{ 0: { transcript: "Cow" }, isFinal: false, length: 1 }],
      });
    });

    // Interim shown in preview bubble, not yet in committed input
    expect(screen.getByText(/“Cow”/i)).toBeInTheDocument();
    const input = screen.getByPlaceholderText(enDict.farmerTalk.typePlaceholder);
    expect(input).toHaveValue("");

    // Interim event 2
    act(() => {
      instance.onresult?.({
        resultIndex: 0,
        results: [{ 0: { transcript: "Cow has fever" }, isFinal: false, length: 1 }],
      });
    });
    expect(screen.getByText(/“Cow has fever”/i)).toBeInTheDocument();

    // Final event
    act(() => {
      instance.onresult?.({
        resultIndex: 0,
        results: [{ 0: { transcript: "Cow has fever" }, isFinal: true, length: 1 }],
      });
    });

    expect(input).toHaveValue("Cow has fever");
    expect(input).not.toHaveValue("Cow Cow has fever Cow has fever");
  });

  // 10. Preserves existing typed text when appending
  it("10. preserves existing typed text when appending speech transcript", async () => {
    render(
      <FarmerChatBox
        animalId="animal-123"
        initialContext={mockInitialContext}
        dictionary={enDict.farmerTalk}
        locale="en"
      />
    );

    const input = await screen.findByPlaceholderText(enDict.farmerTalk.typePlaceholder);
    fireEvent.change(input, { target: { value: "Analyze this case" } });
    expect(input).toHaveValue("Analyze this case");

    const micBtn = screen.getByRole("button", { name: /Start voice input/i });
    fireEvent.click(micBtn);

    const instance = MockSpeechRecognition.instances[0];

    act(() => {
      instance.onresult?.({
        resultIndex: 0,
        results: [{ 0: { transcript: "and give advice" }, isFinal: true, length: 1 }],
      });
    });

    expect(input).toHaveValue("Analyze this case and give advice");
  });

  // 11. Empty input + voice
  it("11. handles empty initial input cleanly without leading spaces", async () => {
    render(
      <FarmerChatBox
        animalId="animal-123"
        initialContext={mockInitialContext}
        dictionary={enDict.farmerTalk}
        locale="en"
      />
    );

    const micBtn = await screen.findByRole("button", { name: /Start voice input/i });
    fireEvent.click(micBtn);

    const instance = MockSpeechRecognition.instances[0];

    act(() => {
      instance.onresult?.({
        resultIndex: 0,
        results: [{ 0: { transcript: "Check vaccination status" }, isFinal: true, length: 1 }],
      });
    });

    const input = screen.getByPlaceholderText(enDict.farmerTalk.typePlaceholder);
    expect(input).toHaveValue("Check vaccination status");
  });

  // 12. Voice does NOT auto-submit Gemini
  it("12. does NOT automatically submit to Gemini upon speech completion", async () => {
    render(
      <FarmerChatBox
        animalId="animal-123"
        initialContext={mockInitialContext}
        dictionary={enDict.farmerTalk}
        locale="en"
      />
    );

    const micBtn = await screen.findByRole("button", { name: /Start voice input/i });
    fireEvent.click(micBtn);

    const instance = MockSpeechRecognition.instances[0];

    act(() => {
      instance.onresult?.({
        resultIndex: 0,
        results: [{ 0: { transcript: "Should I call the vet?" }, isFinal: true, length: 1 }],
      });
      instance.onend?.();
    });

    // Verify sendFarmerChatMessageAction was NOT called automatically
    expect(farmerTalkActions.sendFarmerChatMessageAction).not.toHaveBeenCalled();

    // The text is sitting in the input ready for user review
    const input = screen.getByPlaceholderText(enDict.farmerTalk.typePlaceholder);
    expect(input).toHaveValue("Should I call the vet?");
  });

  // 13. Existing Send button submits the voice-populated text
  it("13. allows user to review/edit voice input and submit via the existing Send button", async () => {
    vi.mocked(farmerTalkActions.sendFarmerChatMessageAction).mockResolvedValueOnce({
      success: true,
      conversationId: "conv-1",
      userMessage: {
        id: "msg-user-1",
        role: "user",
        content: "Should I call the vet immediately?",
        createdAt: new Date().toISOString(),
      },
      assistantMessage: {
        id: "msg-ai-1",
        role: "assistant",
        content: "Yes, based on the high fever, please contact your local vet.",
        createdAt: new Date().toISOString(),
      },
      needsVeterinarian: false,
      riskNotice: null,
      suggestedNextStep: "Consult veterinarian",
    });

    render(
      <FarmerChatBox
        animalId="animal-123"
        initialContext={mockInitialContext}
        dictionary={enDict.farmerTalk}
        locale="en"
      />
    );

    const micBtn = await screen.findByRole("button", { name: /Start voice input/i });
    fireEvent.click(micBtn);

    const instance = MockSpeechRecognition.instances[0];

    act(() => {
      instance.onresult?.({
        resultIndex: 0,
        results: [{ 0: { transcript: "Should I call the vet" }, isFinal: true, length: 1 }],
      });
      instance.onend?.();
    });

    const input = screen.getByPlaceholderText(enDict.farmerTalk.typePlaceholder);
    expect(input).toHaveValue("Should I call the vet");

    // User edits by typing " immediately?"
    fireEvent.change(input, { target: { value: "Should I call the vet immediately?" } });
    expect(input).toHaveValue("Should I call the vet immediately?");

    // User clicks Send
    const sendBtn = screen.getByRole("button", { name: "" }); // Send button containing Send icon
    fireEvent.submit(sendBtn.closest("form")!);

    await waitFor(() => {
      expect(farmerTalkActions.sendFarmerChatMessageAction).toHaveBeenCalledWith(
        expect.objectContaining({
          animalId: "animal-123",
          message: "Should I call the vet immediately?",
        })
      );
    });
  });

  // 14. Permission denied handling
  it("14. handles permission denied error without interrupting typed input", async () => {
    render(
      <FarmerChatBox
        animalId="animal-123"
        initialContext={mockInitialContext}
        dictionary={enDict.farmerTalk}
        locale="en"
      />
    );

    const input = await screen.findByPlaceholderText(enDict.farmerTalk.typePlaceholder);
    fireEvent.change(input, { target: { value: "Existing draft" } });

    const micBtn = screen.getByRole("button", { name: /Start voice input/i });
    fireEvent.click(micBtn);

    const instance = MockSpeechRecognition.instances[0];

    act(() => {
      instance.onerror?.({ error: "not-allowed" });
    });

    expect(
      screen.getByText(enDict.farmerTalk.voiceInputPermissionDenied)
    ).toBeInTheDocument();
    // Draft text preserved
    expect(input).toHaveValue("Existing draft");

    // Dismissing error works
    const dismissBtn = screen.getAllByRole("button", { name: /Dismiss/i })[0];
    fireEvent.click(dismissBtn);
    expect(
      screen.queryByText(enDict.farmerTalk.voiceInputPermissionDenied)
    ).not.toBeInTheDocument();
  });

  // 15, 16, 17, 18. Error states
  it("15, 16, 17. handles no-speech, audio-capture, and network errors gracefully", async () => {
    render(
      <FarmerChatBox
        animalId="animal-123"
        initialContext={mockInitialContext}
        dictionary={enDict.farmerTalk}
        locale="en"
      />
    );

    const micBtn = await screen.findByRole("button", { name: /Start voice input/i });

    // 15. no-speech (silent reset)
    fireEvent.click(micBtn);
    let instance = MockSpeechRecognition.instances[0];
    act(() => {
      instance.onerror?.({ error: "no-speech" });
    });
    expect(screen.getByRole("button", { name: /Start voice input/i })).toBeInTheDocument();

    // 16. audio-capture
    fireEvent.click(micBtn);
    instance = MockSpeechRecognition.instances[1];
    act(() => {
      instance.onerror?.({ error: "audio-capture" });
    });
    expect(screen.getByText(enDict.farmerTalk.voiceInputError)).toBeInTheDocument();

    // 17. network
    const dismissBtn = screen.getByRole("button", { name: /Dismiss/i });
    fireEvent.click(dismissBtn);

    fireEvent.click(micBtn);
    instance = MockSpeechRecognition.instances[2];
    act(() => {
      instance.onerror?.({ error: "network" });
    });
    expect(screen.getByText(enDict.farmerTalk.voiceInputError)).toBeInTheDocument();
  });

  // 19, 20, 21, 22. Locale mappings
  it("19, 20, 21, 22. maps en -> en-IN, hi -> hi-IN, mr -> mr-IN, bn -> bn-IN", () => {
    expect(mapAppLocaleToSpeechLang("en")).toBe("en-IN");
    expect(mapAppLocaleToSpeechLang("en-US")).toBe("en-IN");
    expect(mapAppLocaleToSpeechLang("hi")).toBe("hi-IN");
    expect(mapAppLocaleToSpeechLang("mr")).toBe("mr-IN");
    expect(mapAppLocaleToSpeechLang("bn")).toBe("bn-IN");
    expect(mapAppLocaleToSpeechLang("unknown")).toBe("en-IN");
  });

  // 23. UI strings localized for all 4 languages
  it("23. uses localized dictionary strings for Hindi, Marathi, Bengali, and English", async () => {
    // Hindi
    const { unmount: unmountHi } = render(
      <FarmerChatBox
        animalId="animal-123"
        initialContext={mockInitialContext}
        dictionary={hiDict.farmerTalk}
        locale="hi"
      />
    );
    expect(await screen.findByRole("button", { name: /बोलकर लिखें/i })).toBeInTheDocument();
    unmountHi();

    // Marathi
    const { unmount: unmountMr } = render(
      <FarmerChatBox
        animalId="animal-123"
        initialContext={mockInitialContext}
        dictionary={mrDict.farmerTalk}
        locale="mr"
      />
    );
    expect(await screen.findByRole("button", { name: /व्हॉइस इनपुट सुरू करा/i })).toBeInTheDocument();
    unmountMr();

    // Bengali
    const { unmount: unmountBn } = render(
      <FarmerChatBox
        animalId="animal-123"
        initialContext={mockInitialContext}
        dictionary={bnDict.farmerTalk}
        locale="bn"
      />
    );
    expect(await screen.findByRole("button", { name: /ভয়েস ইনপুট শুরু করুন/i })).toBeInTheDocument();
    unmountBn();
  });

  // 25. Unmount cleans up active recognition
  it("25. cleans up and aborts active recognition on component unmount", async () => {
    const { unmount } = render(
      <FarmerChatBox
        animalId="animal-123"
        initialContext={mockInitialContext}
        dictionary={enDict.farmerTalk}
        locale="en"
      />
    );

    const micBtn = await screen.findByRole("button", { name: /Start voice input/i });
    fireEvent.click(micBtn);

    const instance = MockSpeechRecognition.instances[0];
    expect(instance.start).toHaveBeenCalled();

    unmount();
    expect(instance.abort).toHaveBeenCalled();
  });

  // 26 & 27. Multiple sessions & stopping does not wipe typed text
  it("26 & 27. does not reuse stale transcripts in subsequent sessions and preserves input", async () => {
    render(
      <FarmerChatBox
        animalId="animal-123"
        initialContext={mockInitialContext}
        dictionary={enDict.farmerTalk}
        locale="en"
      />
    );

    const micBtn = await screen.findByRole("button", { name: /Start voice input/i });

    // Session 1
    fireEvent.click(micBtn);
    let instance = MockSpeechRecognition.instances[0];
    act(() => {
      instance.onresult?.({
        resultIndex: 0,
        results: [{ 0: { transcript: "First sentence" }, isFinal: true, length: 1 }],
      });
      instance.onend?.();
    });

    const input = screen.getByPlaceholderText(enDict.farmerTalk.typePlaceholder);
    expect(input).toHaveValue("First sentence");

    // Session 2: Click Mic again
    fireEvent.click(screen.getByRole("button", { name: /Start voice input/i }));
    instance = MockSpeechRecognition.instances[1];

    act(() => {
      instance.onresult?.({
        resultIndex: 0,
        results: [{ 0: { transcript: "second sentence" }, isFinal: true, length: 1 }],
      });
      instance.onend?.();
    });

    expect(input).toHaveValue("First sentence second sentence");
  });

  // 28. Disabled while sending
  it("28. disables microphone button while message is sending", async () => {
    vi.mocked(farmerTalkActions.sendFarmerChatMessageAction).mockImplementation(
      () => new Promise(() => {}) // never resolves to keep sending = true
    );

    render(
      <FarmerChatBox
        animalId="animal-123"
        initialContext={mockInitialContext}
        dictionary={enDict.farmerTalk}
        locale="en"
      />
    );

    const input = await screen.findByPlaceholderText(enDict.farmerTalk.typePlaceholder);
    fireEvent.change(input, { target: { value: "Sending test" } });

    const form = input.closest("form")!;
    fireEvent.submit(form);

    const micBtn = screen.getByRole("button", { name: /Start voice input/i });
    expect(micBtn).toBeDisabled();
  });
});
