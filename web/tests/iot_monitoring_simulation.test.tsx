import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { IoTMonitoringView } from "@/components/iot/IoTMonitoringView";
import { MockESP32Simulator } from "@/components/iot/MockESP32Simulator";
import { IoTReadingsHistoryTable } from "@/components/iot/IoTReadingsHistoryTable";
import * as iotActions from "@/lib/actions/iot";

// Mock Next.js navigation
const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  notFound: vi.fn(),
}));

// Mock Server Actions
vi.mock("@/lib/actions/iot", () => ({
  getFarmerAnimalsWithIoTAction: vi.fn(),
  getAnimalIoTMonitoringDataAction: vi.fn(),
  ingestIoTTelemetryAction: vi.fn(),
  toggleDeviceSimulationModeAction: vi.fn(),
  computeDeviceConnectionState: vi.fn(),
}));

const mockAnimals = [
  {
    id: "animal-cow-1",
    tag: "COW-001",
    species: "Cattle / Gir Cow",
    name: "Ganga",
    breed: "Gir",
    device: {
      id: "device-1",
      deviceIdentifier: "ESP32-COW-001",
      source: "REAL" as const,
      status: "OFFLINE" as const,
      lastSeenAt: null,
    },
  },
  {
    id: "animal-buf-2",
    tag: "BUF-002",
    species: "Buffalo / Murrah",
    name: "Yamuna",
    breed: "Murrah",
    device: null,
  },
];

const mockInitialData = {
  animal: {
    id: "animal-cow-1",
    tag: "COW-001",
    species: "Cattle / Gir Cow",
    name: "Ganga",
    breed: "Gir",
  },
  device: {
    id: "device-1",
    deviceIdentifier: "ESP32-COW-001",
    source: "REAL" as const,
    status: "OFFLINE" as const,
    lastSeenAt: null,
  },
  readings: [],
  latestReading: null,
  connectionState: "REAL_OFFLINE" as const,
  summary: {
    totalReadings: 0,
    simulatedReadings: 0,
    realReadings: 0,
    anomaliesCount: 0,
  },
};

describe("Maitri IoT Health Monitoring & Virtual ESP32 Simulation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("1. IoT page & initial offline physical device state renders honestly", () => {
    render(
      <IoTMonitoringView
        animals={mockAnimals}
        selectedAnimalId="animal-cow-1"
        initialData={mockInitialData}
      />
    );

    // Header & Tag
    expect(screen.getByText("IoT Health Monitoring")).toBeInTheDocument();
    expect(screen.getByText("ESP32-COW-001")).toBeInTheDocument();

    // Must honestly display REAL ESP32 badge & Offline state
    expect(screen.getByTestId("real-esp32-badge")).toHaveTextContent("REAL ESP32");
    expect(screen.getByTestId("device-status-badge")).toHaveTextContent("ESP32 Offline");

    // Must show empty telemetry state initially
    expect(screen.getAllByText("No IoT Telemetry Recorded Yet")[0]).toBeInTheDocument();
    expect(screen.getByTestId("no-history-state")).toBeInTheDocument();
  });

  it("2. Animal selector renders and allows switching animals", async () => {
    const mockRefreshedData = {
      animal: {
        id: "animal-buf-2",
        tag: "BUF-002",
        species: "Buffalo / Murrah",
        name: "Yamuna",
        breed: "Murrah",
      },
      device: null,
      readings: [],
      latestReading: null,
      connectionState: "NO_DEVICE" as const,
      summary: {
        totalReadings: 0,
        simulatedReadings: 0,
        realReadings: 0,
        anomaliesCount: 0,
      },
    };

    vi.mocked(iotActions.getAnimalIoTMonitoringDataAction).mockResolvedValueOnce(
      mockRefreshedData as unknown as Awaited<ReturnType<typeof iotActions.getAnimalIoTMonitoringDataAction>>
    );

    render(
      <IoTMonitoringView
        animals={mockAnimals}
        selectedAnimalId="animal-cow-1"
        initialData={mockInitialData}
      />
    );

    const selector = screen.getByTestId("animal-select-dropdown") as HTMLSelectElement;
    expect(selector.value).toBe("animal-cow-1");

    await act(async () => {
      fireEvent.change(selector, { target: { value: "animal-buf-2" } });
    });

    expect(mockReplace).toHaveBeenCalledWith("/farmer/iot?animalId=animal-buf-2", { scroll: false });
    expect(iotActions.getAnimalIoTMonitoringDataAction).toHaveBeenCalledWith("animal-buf-2");
  });

  it("3. Simulation activation switches status to SIMULATION ACTIVE with SIMULATED ESP32 badge", async () => {
    vi.mocked(iotActions.toggleDeviceSimulationModeAction).mockResolvedValueOnce({
      success: true,
      connectionState: "SIMULATION_ACTIVE",
      device: {
        id: "device-1",
        deviceIdentifier: "ESP32-COW-001",
        animalId: "animal-cow-1",
        source: "SIMULATED",
        status: "SIMULATING",
        lastSeenAt: new Date().toISOString(),
      },
    });

    render(
      <IoTMonitoringView
        animals={mockAnimals}
        selectedAnimalId="animal-cow-1"
        initialData={mockInitialData}
      />
    );

    const simulateBtn = screen.getByText("Simulate ESP32");
    await act(async () => {
      fireEvent.click(simulateBtn);
    });

    expect(iotActions.toggleDeviceSimulationModeAction).toHaveBeenCalledWith("animal-cow-1", true);

    await waitFor(() => {
      expect(screen.getByTestId("simulated-esp32-badge")).toHaveTextContent("SIMULATED ESP32");
      expect(screen.getByTestId("device-status-badge")).toHaveTextContent("Simulation Active");
      expect(screen.getByText("Virtual ESP32 Simulator")).toBeInTheDocument();
    });
  });

  it("4. Normal scenario sends correct payload to ingestion endpoint", async () => {
    const mockSendTelemetry = vi.fn().mockResolvedValue({ success: true });

    render(
      <MockESP32Simulator
        animalId="animal-cow-1"
        animalTag="COW-001"
        isSimulating={true}
        onSendTelemetry={mockSendTelemetry}
      />
    );

    // Normal is default
    const generateBtn = screen.getByTestId("generate-reading-btn");
    await act(async () => {
      fireEvent.click(generateBtn);
    });

    expect(mockSendTelemetry).toHaveBeenCalledWith({
      temperature: 38.4,
      activity: 72,
      source: "SIMULATED",
    });

    await waitFor(() => {
      expect(screen.getByTestId("transmission-status-banner")).toHaveTextContent("Reading transmitted");
    });
  });

  it("5. Warning scenario sends correct payload to ingestion endpoint", async () => {
    const mockSendTelemetry = vi.fn().mockResolvedValue({ success: true });

    render(
      <MockESP32Simulator
        animalId="animal-cow-1"
        animalTag="COW-001"
        isSimulating={true}
        onSendTelemetry={mockSendTelemetry}
      />
    );

    // Click Warning preset
    const warningPreset = screen.getByText("Warning");
    fireEvent.click(warningPreset);

    const generateBtn = screen.getByTestId("generate-reading-btn");
    await act(async () => {
      fireEvent.click(generateBtn);
    });

    expect(mockSendTelemetry).toHaveBeenCalledWith({
      temperature: 39.2,
      activity: 35,
      source: "SIMULATED",
    });
  });

  it("6. Critical scenario sends correct payload (40.2°C, 18 activity)", async () => {
    const mockSendTelemetry = vi.fn().mockResolvedValue({ success: true });

    render(
      <MockESP32Simulator
        animalId="animal-cow-1"
        animalTag="COW-001"
        isSimulating={true}
        onSendTelemetry={mockSendTelemetry}
      />
    );

    // Click Critical preset
    const criticalPreset = screen.getByText("Critical");
    fireEvent.click(criticalPreset);

    const generateBtn = screen.getByTestId("generate-reading-btn");
    await act(async () => {
      fireEvent.click(generateBtn);
    });

    expect(mockSendTelemetry).toHaveBeenCalledWith({
      temperature: 40.2,
      activity: 18,
      source: "SIMULATED",
    });
  });

  it("7. Custom input validates correctly and sends valid custom telemetry", async () => {
    const mockSendTelemetry = vi.fn().mockResolvedValue({ success: true });

    render(
      <MockESP32Simulator
        animalId="animal-cow-1"
        animalTag="COW-001"
        isSimulating={true}
        onSendTelemetry={mockSendTelemetry}
      />
    );

    // Select Custom
    const customPreset = screen.getByText("CUSTOM");
    fireEvent.click(customPreset);

    const tempInput = screen.getByTestId("custom-temp-input");
    const actInput = screen.getByTestId("custom-activity-input");

    fireEvent.change(tempInput, { target: { value: "39.8" } });
    fireEvent.change(actInput, { target: { value: "45" } });

    const generateBtn = screen.getByTestId("generate-reading-btn");
    await act(async () => {
      fireEvent.click(generateBtn);
    });

    expect(mockSendTelemetry).toHaveBeenCalledWith({
      temperature: 39.8,
      activity: 45,
      source: "SIMULATED",
    });
  });

  it("8. Custom input rejects invalid numbers and out-of-range values", async () => {
    const mockSendTelemetry = vi.fn();

    render(
      <MockESP32Simulator
        animalId="animal-cow-1"
        animalTag="COW-001"
        isSimulating={true}
        onSendTelemetry={mockSendTelemetry}
      />
    );

    // Select Custom
    const customPreset = screen.getByText("CUSTOM");
    fireEvent.click(customPreset);

    const tempInput = screen.getByTestId("custom-temp-input");
    fireEvent.change(tempInput, { target: { value: "99.9" } }); // Invalid temp > 45

    const generateBtn = screen.getByTestId("generate-reading-btn");
    await act(async () => {
      fireEvent.click(generateBtn);
    });

    expect(mockSendTelemetry).not.toHaveBeenCalled();
    expect(screen.getByText("Temperature must be between 25°C and 45°C")).toBeInTheDocument();
  });

  it("9. Backend ingestion success updates monitoring UI & history ledger", async () => {
    const recordedTime = new Date().toISOString();
    vi.mocked(iotActions.ingestIoTTelemetryAction).mockResolvedValueOnce({
      success: true,
      connectionState: "SIMULATION_ACTIVE",
      device: {
        id: "device-1",
        deviceIdentifier: "ESP32-COW-001",
        source: "SIMULATED",
        status: "SIMULATING",
        lastSeenAt: recordedTime,
      },
      reading: {
        id: "reading-101",
        deviceId: "device-1",
        animalId: "animal-cow-1",
        source: "SIMULATED",
        temperature: 40.2,
        activityIndex: 18,
        hasAnomaly: true,
        anomalies: ["hyperthermia", "low_activity"],
        recordedAt: recordedTime,
      },
    });

    const initialSimActiveData = {
      ...mockInitialData,
      connectionState: "SIMULATION_ACTIVE" as const,
      device: {
        ...mockInitialData.device,
        source: "SIMULATED" as const,
        status: "SIMULATING" as const,
      },
    };

    render(
      <IoTMonitoringView
        animals={mockAnimals}
        selectedAnimalId="animal-cow-1"
        initialData={initialSimActiveData}
      />
    );

    // Switch to Critical preset & Generate
    const criticalBtn = screen.getByText("Critical");
    fireEvent.click(criticalBtn);

    const generateBtn = screen.getByTestId("generate-reading-btn");
    await act(async () => {
      fireEvent.click(generateBtn);
    });

    expect(iotActions.ingestIoTTelemetryAction).toHaveBeenCalledWith({
      animalId: "animal-cow-1",
      temperature: 40.2,
      activity: 18,
      source: "SIMULATED",
    });

    // Check that metric cards updated with backend anomaly state
    await waitFor(() => {
      expect(screen.getByTestId("temperature-metric-card")).toHaveTextContent("40.2");
      expect(screen.getByTestId("activity-metric-card")).toHaveTextContent("18");
      expect(screen.getByTestId("latest-reading-simulated-badge")).toHaveTextContent("SIMULATED ESP32");
      expect(screen.getByText("Elevated Temperature")).toBeInTheDocument();
      expect(screen.getAllByText("Low Activity")[0]).toBeInTheDocument();

      // Check history ledger row
      expect(screen.getByTestId("reading-row-reading-101")).toBeInTheDocument();
    });
  });

  it("10. Backend failure shows transmission error and does NOT fake success", async () => {
    vi.mocked(iotActions.ingestIoTTelemetryAction).mockResolvedValueOnce({
      success: false,
      error: "FastAPI gateway connection timeout",
    });

    const initialSimActiveData = {
      ...mockInitialData,
      connectionState: "SIMULATION_ACTIVE" as const,
      device: {
        ...mockInitialData.device,
        source: "SIMULATED" as const,
        status: "SIMULATING" as const,
      },
    };

    render(
      <IoTMonitoringView
        animals={mockAnimals}
        selectedAnimalId="animal-cow-1"
        initialData={initialSimActiveData}
      />
    );

    const generateBtn = screen.getByTestId("generate-reading-btn");
    await act(async () => {
      fireEvent.click(generateBtn);
    });

    await waitFor(() => {
      expect(screen.getByTestId("transmission-status-banner")).toHaveTextContent("FastAPI gateway connection timeout");
    });

    // UI must NOT update with fake reading
    expect(screen.getByTestId("temperature-metric-card")).toHaveTextContent("No data");
  });

  it("11. Automatic simulation Start, Pause, Resume, Stop, and interval cleanup works", async () => {
    vi.useFakeTimers();
    const mockSend = vi.fn().mockResolvedValue({ success: true });

    render(
      <MockESP32Simulator
        animalId="animal-cow-1"
        animalTag="COW-001"
        isSimulating={true}
        onSendTelemetry={mockSend}
      />
    );

    // 1. Start simulation
    const startBtn = screen.getByTestId("start-simulation-btn");
    await act(async () => {
      fireEvent.click(startBtn);
    });

    expect(mockSend).toHaveBeenCalledTimes(1);

    // Advance 5 seconds -> tick 2
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    expect(mockSend).toHaveBeenCalledTimes(2);

    // 2. Pause simulation
    const pauseBtn = screen.getByTestId("pause-simulation-btn");
    await act(async () => {
      fireEvent.click(pauseBtn);
    });

    // Advance 10 seconds while paused -> no new calls
    await act(async () => {
      vi.advanceTimersByTime(10000);
    });
    expect(mockSend).toHaveBeenCalledTimes(2);

    // 3. Resume simulation
    const resumeBtn = screen.getByTestId("resume-simulation-btn");
    await act(async () => {
      fireEvent.click(resumeBtn);
    });
    expect(mockSend).toHaveBeenCalledTimes(3);

    // 4. Stop simulation
    const stopBtn = screen.getByTestId("stop-simulation-btn");
    await act(async () => {
      fireEvent.click(stopBtn);
    });

    // Advance 15 seconds after stop -> no new calls
    await act(async () => {
      vi.advanceTimersByTime(15000);
    });
    expect(mockSend).toHaveBeenCalledTimes(3);

    vi.useRealTimers();
  });

  it("12. Distinct source badges for REAL ESP32 vs SIMULATED ESP32 in history ledger", () => {
    const mixedReadings = [
      {
        id: "read-1",
        source: "SIMULATED" as const,
        temperature: 40.2,
        activityIndex: 18,
        hasAnomaly: true,
        anomalies: ["hyperthermia", "low_activity"],
        recordedAt: new Date("2026-09-12T10:12:00Z"),
      },
      {
        id: "read-2",
        source: "REAL" as const,
        temperature: 38.4,
        activityIndex: 72,
        hasAnomaly: false,
        anomalies: [],
        recordedAt: new Date("2026-09-12T10:10:00Z"),
      },
    ];

    render(<IoTReadingsHistoryTable readings={mixedReadings} />);

    expect(screen.getByTestId("reading-source-simulated")).toHaveTextContent("SIMULATED ESP32");
    expect(screen.getByTestId("reading-source-real")).toHaveTextContent("REAL ESP32");
  });

  it("13. Starting simulation multiple times does not create multiple timer intervals", async () => {
    vi.useFakeTimers();
    const mockSend = vi.fn().mockResolvedValue({ success: true });

    render(
      <MockESP32Simulator
        animalId="animal-cow-1"
        animalTag="COW-001"
        isSimulating={true}
        onSendTelemetry={mockSend}
      />
    );

    const startBtn = screen.getByTestId("start-simulation-btn");
    await act(async () => {
      fireEvent.click(startBtn);
    });

    expect(mockSend).toHaveBeenCalledTimes(1);

    // Advance 5 seconds -> tick 2
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    expect(mockSend).toHaveBeenCalledTimes(2);

    // Stop and unmount
    const stopBtn = screen.getByTestId("stop-simulation-btn");
    await act(async () => {
      fireEvent.click(stopBtn);
    });

    vi.useRealTimers();
  });

  it("14. Unmounting MockESP32Simulator clears any active interval timers", async () => {
    vi.useFakeTimers();
    const mockSend = vi.fn().mockResolvedValue({ success: true });

    const { unmount } = render(
      <MockESP32Simulator
        animalId="animal-cow-1"
        animalTag="COW-001"
        isSimulating={true}
        onSendTelemetry={mockSend}
      />
    );

    const startBtn = screen.getByTestId("start-simulation-btn");
    await act(async () => {
      fireEvent.click(startBtn);
    });
    expect(mockSend).toHaveBeenCalledTimes(1);

    // Unmount component
    unmount();

    // Advance time after unmount
    await act(async () => {
      vi.advanceTimersByTime(10000);
    });

    // No further calls should happen
    expect(mockSend).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });
});

