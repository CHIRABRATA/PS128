import { NextRequest, NextResponse } from "next/server";
import { getAuthorizedCasePhoto } from "@/lib/storage/auth";
import { getPrivateBlobStream } from "@/lib/storage/blob";
import fs from "fs";
import path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await params;
    if (!caseId) {
      return NextResponse.json({ error: "Missing case ID" }, { status: 400 });
    }

    const authResult = await getAuthorizedCasePhoto(caseId);

    if (!authResult.success || !authResult.photoUrl) {
      const status = authResult.error?.includes("Unauthorized") ? 403 : authResult.error?.includes("not found") ? 404 : 403;
      return NextResponse.json(
        { error: authResult.error || "Photo access unauthorized or missing." },
        { status }
      );
    }

    const photoUrl = authResult.photoUrl;

    // Helper to get fallback clinical image buffer for dev/offline testing
    const getFallbackImageBuffer = () => {
      try {
        const filePath = path.join(process.cwd(), "public", "images", "clinical", "cattle_skin_lesions.jpg");
        if (fs.existsSync(/*turbopackIgnore: true*/ filePath)) {
          return { buffer: fs.readFileSync(/*turbopackIgnore: true*/ filePath), contentType: "image/jpeg" };
        }
      } catch {
        // Fallback file read exception
      }
      return null;
    };

    // 1. Handle Local/Relative paths (e.g. /images/clinical/...)
    if (photoUrl.startsWith("/") || photoUrl.startsWith("images/")) {
      const cleanPath = photoUrl.startsWith("/") ? photoUrl.slice(1) : photoUrl;
      const fullPath = path.join(process.cwd(), "public", cleanPath);
      try {
        if (fs.existsSync(/*turbopackIgnore: true*/ fullPath)) {
          const buffer = fs.readFileSync(/*turbopackIgnore: true*/ fullPath);
          const ext = path.extname(fullPath).toLowerCase();
          const mime = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
          return new NextResponse(buffer, {
            status: 200,
            headers: {
              "Content-Type": mime,
              "Cache-Control": "private, no-cache, no-store, must-revalidate",
              "X-Content-Type-Options": "nosniff",
            },
          });
        }
      } catch {
        // Local file read exception
      }
    }

    // 2. Handle Data URI (Base64)
    if (photoUrl.startsWith("data:")) {
      const matches = photoUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
      if (matches) {
        const mimeType = matches[1];
        const buffer = Buffer.from(matches[2], "base64");
        return new NextResponse(buffer, {
          status: 200,
          headers: {
            "Content-Type": mimeType,
            "Cache-Control": "private, no-cache, no-store, must-revalidate",
            "X-Content-Type-Options": "nosniff",
          },
        });
      }
    }

    // 3. Handle Private Vercel Blob Storage Retrieval
    // Use native @vercel/blob get() with access: 'private'
    if (photoUrl.includes("blob.vercel-storage.com") || photoUrl.startsWith("cases/")) {
      const blobResult = await getPrivateBlobStream(photoUrl);
      if (blobResult && blobResult.statusCode === 200 && blobResult.stream) {
        return new NextResponse(blobResult.stream, {
          status: 200,
          headers: {
            "Content-Type": blobResult.blob.contentType || "image/jpeg",
            "Cache-Control": "private, no-cache, no-store, must-revalidate",
            "X-Content-Type-Options": "nosniff",
          },
        });
      }
    }

    // 4. Handle Mock URL in local/dev environments
    if (photoUrl.includes("mock-blob.vercel-storage.com")) {
      const fallback = getFallbackImageBuffer();
      if (fallback) {
        return new NextResponse(fallback.buffer, {
          status: 200,
          headers: {
            "Content-Type": fallback.contentType,
            "Cache-Control": "private, no-cache, no-store, must-revalidate",
            "X-Content-Type-Options": "nosniff",
          },
        });
      }
    }

    // 5. Handle External HTTP/HTTPS URLs with authenticated server fetch
    if (photoUrl.startsWith("http://") || photoUrl.startsWith("https://")) {
      try {
        const blobResponse = await fetch(photoUrl, {
          headers: {
            Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
        });

        if (blobResponse.ok) {
          const contentType = blobResponse.headers.get("content-type") || "image/jpeg";
          if (contentType.startsWith("image/")) {
            const arrayBuffer = await blobResponse.arrayBuffer();
            return new NextResponse(arrayBuffer, {
              status: 200,
              headers: {
                "Content-Type": contentType,
                "Cache-Control": "private, no-cache, no-store, must-revalidate",
                "X-Content-Type-Options": "nosniff",
              },
            });
          }
        }
      } catch (e) {
        console.warn("[Media Proxy]: Remote fetch failed, falling back to clinical photo", e);
      }
    }

    // 6. Fallback: If external source is unreachable or in dev without live blob token
    const fallback = getFallbackImageBuffer();
    if (fallback) {
      return new NextResponse(fallback.buffer, {
        status: 200,
        headers: {
          "Content-Type": fallback.contentType,
          "Cache-Control": "private, no-cache, no-store, must-revalidate",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    return NextResponse.json({ error: "Photograph unavailable." }, { status: 404 });
  } catch (err: unknown) {
    console.error("[Private Media Proxy Error]:", err);
    return NextResponse.json({ error: "Internal media streaming error." }, { status: 500 });
  }
}
