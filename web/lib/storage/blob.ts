// import "server-only";
import { put, del } from "@vercel/blob";

export interface UploadResult {
  url: string;
  key: string;
}

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB limit
export const ALLOWED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

/**
 * Validates photo file size and MIME type.
 */
export function validateImageFile(mimeType: string, sizeBytes: number): { valid: boolean; error?: string } {
  if (!ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase())) {
    return {
      valid: false,
      error: `Unsupported image format (${mimeType}). Allowed formats: JPEG, PNG, WebP.`,
    };
  }

  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File size exceeds the 10MB maximum limit.`,
    };
  }

  return { valid: true };
}

/**
 * Uploads an image payload to Vercel Blob under a non-guessable private key structure.
 */
export async function uploadToBlob(
  pathKey: string,
  buffer: Buffer,
  contentType: string
): Promise<UploadResult> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  // Development fallback mode if real token is not yet configured locally
  if (!token || token.includes("placeholder")) {
    const devUrl = `https://mock-blob.vercel-storage.com/${pathKey}`;
    return { url: devUrl, key: pathKey };
  }

  const blob = await put(pathKey, buffer, {
    access: "public", // Vercel Blob access setting
    contentType,
    token,
  });

  return {
    url: blob.url,
    key: pathKey,
  };
}

/**
 * Deletes a stored object from Vercel Blob.
 */
export async function deleteFromBlob(urlOrKey: string): Promise<void> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token || token.includes("placeholder") || !urlOrKey.startsWith("http")) {
    return;
  }

  try {
    await del(urlOrKey, { token });
  } catch (err) {
    console.error(`[Storage Orphan Cleanup Failed] ${urlOrKey}:`, err);
  }
}
