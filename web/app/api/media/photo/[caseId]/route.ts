import { NextRequest, NextResponse } from "next/server";
import { getAuthorizedCasePhoto } from "@/lib/storage/auth";

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
      return NextResponse.json(
        { error: authResult.error || "Photo access unauthorized or missing." },
        { status: authResult.error?.includes("not found") ? 404 : 403 }
      );
    }

    const photoUrl = authResult.photoUrl;

    // 1. Handle Mock URL in local/dev environments
    if (photoUrl.includes("mock-blob.vercel-storage.com")) {
      // Return a clean mock SVG binary
      const mockSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
          <rect width="600" height="400" fill="#09090b"/>
          <rect x="2" y="2" width="596" height="396" rx="12" fill="none" stroke="#27272a" stroke-width="2"/>
          <circle cx="300" cy="170" r="48" fill="#18181b" stroke="#3f3f46" stroke-width="2"/>
          <path d="M285 170 C285 160, 315 160, 315 170 C315 180, 285 185, 300 200" stroke="#818cf8" stroke-width="3" fill="none" stroke-linecap="round"/>
          <circle cx="300" cy="210" r="3" fill="#818cf8"/>
          <text x="300" y="260" font-family="sans-serif" font-size="16" font-weight="600" fill="#f4f4f5" text-anchor="middle">Maitri Clinical Photo Sample</text>
          <text x="300" y="285" font-family="sans-serif" font-size="12" fill="#71717a" text-anchor="middle">Case Reference: ${caseId}</text>
          <text x="300" y="340" font-family="sans-serif" font-size="11" fill="#4ade80" text-anchor="middle">✓ Private Authorized Stream Verified</text>
        </svg>
      `.trim();

      return new NextResponse(mockSvg, {
        status: 200,
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "private, max-age=3600",
        },
      });
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
            "Cache-Control": "private, max-age=3600",
          },
        });
      }
    }

    // 3. Fetch private Vercel Blob object server-side and proxy stream
    const blobResponse = await fetch(photoUrl);
    if (!blobResponse.ok) {
      return NextResponse.json({ error: "Failed to fetch stored photo." }, { status: 502 });
    }

    const contentType = blobResponse.headers.get("content-type") || "image/jpeg";
    const arrayBuffer = await blobResponse.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err: unknown) {
    console.error("[Private Media Proxy Error]:", err);
    return NextResponse.json({ error: "Internal media streaming error." }, { status: 500 });
  }
}
