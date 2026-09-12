import { NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/auth/session";
import { storageProvider, validateImageFile } from "@/lib/storage";
import { checkRateLimit } from "@/lib/security/rate-limit";

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const appUser = await requireActiveUser();
    if (!appUser) {
      return NextResponse.json({ error: "Unauthorized upload request." }, { status: 401 });
    }

    // Rate Limiting: 10 uploads / min per user
    const rateLimit = checkRateLimit(`upload:${appUser.id}`, 10, 60 * 1000);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Too many upload requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rateLimit.resetInMs / 1000)) } }
      );
    }

    // 2. Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No image file provided." }, { status: 400 });
    }

    // 3. Server-side validation (MIME type + file size limit)
    const mimeType = file.type || "image/jpeg";
    const sizeBytes = file.size;

    const validation = validateImageFile(mimeType, sizeBytes);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // 4. Server-side pathname construction: uses authenticated user ID + cryptographically random UUID
    const extensionMap: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/jpg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    };
    const ext = extensionMap[mimeType.toLowerCase()] || "jpg";
    const randomIdentifier = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
    const objectKey = `cases/${appUser.id}/${randomIdentifier}.${ext}`;

    // 5. Convert file to buffer and upload via private storage abstraction
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadResult = await storageProvider.upload(objectKey, buffer, mimeType);

    return NextResponse.json({
      success: true,
      url: uploadResult.url,
      key: uploadResult.key,
    });
  } catch (err: unknown) {
    console.error("[Storage Direct Upload Error]:", err);
    const message = err instanceof Error ? err.message : "Failed to upload image.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
