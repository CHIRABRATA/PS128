import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { ingestIoTData } from "@/lib/api/backend-client";
import { IoTDeviceSource, IoTDeviceStatus } from "@prisma/client";

/**
 * Unified IoT Ingestion Endpoint
 *
 * Accepts telemetry from both:
 * 1. Physical ESP32 microcontrollers
 * 2. Virtual ESP32 Simulator
 *
 * Forwards to FastAPI POST /api/iot/data for authoritative anomaly & threshold processing,
 * and persists the reading in PostgreSQL.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const rawAnimalId = body.animal_id || body.animalId || "ESP32-GENERIC";
    const temperature = typeof body.temperature === "number" ? body.temperature : null;
    const activity = typeof body.activity === "number" ? body.activity : null;
    const useSimulation = Boolean(body.use_simulation || body.useSimulation);
    const simulateFever = Boolean(body.simulate_fever || body.simulateFever);
    const source: IoTDeviceSource =
      body.source === "REAL" || body.source === "REAL_ESP32"
        ? IoTDeviceSource.REAL
        : IoTDeviceSource.SIMULATED;

    // 1. Authoritative Backend Processing via FastAPI
    const backendResult = await ingestIoTData({
      animal_id: rawAnimalId,
      temperature,
      activity,
      use_simulation: useSimulation,
      simulate_fever: simulateFever,
    });

    // 2. Resolve Animal in database if matching ID or Tag
    let animal = null;
    if (rawAnimalId && rawAnimalId !== "ESP32-GENERIC") {
      animal = await prisma.animal.findFirst({
        where: {
          OR: [
            { id: rawAnimalId },
            { tag: rawAnimalId },
            { iotDeviceId: rawAnimalId },
          ],
        },
      });
    }

    // 3. Resolve or Create IoTDevice record
    const deviceIdentifier =
      body.deviceId ||
      (animal?.iotDeviceId ? animal.iotDeviceId : `ESP32-${animal?.tag || rawAnimalId}`);

    const device = await prisma.ioTDevice.upsert({
      where: { deviceIdentifier },
      create: {
        deviceIdentifier,
        animalId: animal?.id || null,
        source,
        status: source === IoTDeviceSource.SIMULATED ? IoTDeviceStatus.SIMULATING : IoTDeviceStatus.ONLINE,
        lastSeenAt: new Date(),
        lastTemperature: backendResult.temperature,
        lastActivity: backendResult.activity_index,
        lastAnomalyState: backendResult.has_anomaly,
      },
      update: {
        ...(animal ? { animalId: animal.id } : {}),
        source,
        status: source === IoTDeviceSource.SIMULATED ? IoTDeviceStatus.SIMULATING : IoTDeviceStatus.ONLINE,
        lastSeenAt: new Date(),
        lastTemperature: backendResult.temperature,
        lastActivity: backendResult.activity_index,
        lastAnomalyState: backendResult.has_anomaly,
      },
    });

    // Also update animal's iotDeviceId if not set
    if (animal && !animal.iotDeviceId) {
      await prisma.animal.update({
        where: { id: animal.id },
        data: { iotDeviceId: deviceIdentifier },
      });
    }

    // 4. Persist IoTReading record
    const reading = await prisma.ioTReading.create({
      data: {
        deviceId: device.id,
        animalId: animal?.id || null,
        source,
        temperature: backendResult.temperature,
        activityIndex: backendResult.activity_index,
        hasAnomaly: backendResult.has_anomaly,
        anomalies: backendResult.anomalies,
        recordedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      readingId: reading.id,
      deviceId: device.deviceIdentifier,
      animalId: animal?.id || null,
      animalTag: animal?.tag || null,
      source: reading.source,
      temperature: backendResult.temperature,
      activity_index: backendResult.activity_index,
      has_anomaly: backendResult.has_anomaly,
      anomalies: backendResult.anomalies,
      recordedAt: reading.recordedAt.toISOString(),
    });
  } catch (error) {
    console.error("[IoT Ingestion Error]:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to process IoT telemetry.",
      },
      { status: 500 }
    );
  }
}
