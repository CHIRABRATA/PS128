import { IoTDeviceSource, IoTDeviceStatus } from "@prisma/client";

export type IoTConnectionState =
  | "REAL_ONLINE"
  | "REAL_OFFLINE"
  | "SIMULATION_ACTIVE"
  | "NO_DEVICE";

/**
 * Pure helper to compute honest connection state from device metadata
 *
 * Rules:
 * - If device is null -> NO_DEVICE
 * - If device.source is SIMULATED or status is SIMULATING -> SIMULATION_ACTIVE
 * - If device.source is REAL and lastSeenAt is within 120 seconds -> REAL_ONLINE
 * - Otherwise (physical hardware not recently seen) -> REAL_OFFLINE (never fake online)
 */
export function computeDeviceConnectionState(
  device: {
    source: IoTDeviceSource;
    status: IoTDeviceStatus;
    lastSeenAt?: Date | string | null;
  } | null
): IoTConnectionState {
  if (!device) {
    return "NO_DEVICE";
  }

  if (device.source === IoTDeviceSource.SIMULATED || device.status === IoTDeviceStatus.SIMULATING) {
    return "SIMULATION_ACTIVE";
  }

  if (device.source === IoTDeviceSource.REAL) {
    if (!device.lastSeenAt) {
      return "REAL_OFFLINE";
    }

    const lastSeen = new Date(device.lastSeenAt).getTime();
    const now = Date.now();
    const diffSec = (now - lastSeen) / 1000;

    // Real hardware must have sent a heartbeat within 120s to be considered online
    if (diffSec <= 120 && device.status === IoTDeviceStatus.ONLINE) {
      return "REAL_ONLINE";
    }

    return "REAL_OFFLINE";
  }

  return "NO_DEVICE";
}
