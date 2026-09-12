import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateImageFile, uploadToBlob, getPrivateBlobStream, MAX_FILE_SIZE_BYTES, ALLOWED_MIME_TYPES } from "@/lib/storage/blob";
import { canUserAccessCase, CaseLocationData } from "@/lib/storage/auth";
import { getReportCopy } from "@/lib/i18n/report";
import type { FullAppUser } from "@/lib/auth/session";

// Mock @vercel/blob
vi.mock("@vercel/blob", () => ({
  put: vi.fn(),
  del: vi.fn(),
  get: vi.fn(),
}));

import { put, get } from "@vercel/blob";

describe("Private Vercel Blob & Media Security Architecture", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. MIME Type and Size Validation", () => {
    it("should export correct limits and allowed types", () => {
      expect(MAX_FILE_SIZE_BYTES).toBe(10 * 1024 * 1024);
      expect(ALLOWED_MIME_TYPES).toContain("image/jpeg");
      expect(ALLOWED_MIME_TYPES).toContain("image/png");
      expect(ALLOWED_MIME_TYPES).toContain("image/webp");
    });

    it("should accept valid JPEG, PNG, and WebP files under 10MB", () => {
      expect(validateImageFile("image/jpeg", 5 * 1024 * 1024).valid).toBe(true);
      expect(validateImageFile("image/png", 8 * 1024 * 1024).valid).toBe(true);
      expect(validateImageFile("image/webp", 2 * 1024 * 1024).valid).toBe(true);
    });

    it("should reject files exceeding the 10MB limit", () => {
      const result = validateImageFile("image/jpeg", 11 * 1024 * 1024);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("10MB");
    });

    it("should reject unallowed MIME types (PDF, HTML, Executables, SVG)", () => {
      expect(validateImageFile("application/pdf", 1024).valid).toBe(false);
      expect(validateImageFile("text/html", 1024).valid).toBe(false);
      expect(validateImageFile("image/svg+xml", 1024).valid).toBe(false);
      expect(validateImageFile("application/x-msdownload", 1024).valid).toBe(false);
    });
  });

  describe("2. Private Storage Operations (No Public Blobs)", () => {
    it("uploadToBlob must call put() with access: 'private'", async () => {
      process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_test_token_12345";
      (put as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        url: "https://blob.vercel-storage.com/cases/user_123/img.jpg",
        pathname: "cases/user_123/img.jpg",
      });

      const buffer = Buffer.from("fake-image-bytes");
      const result = await uploadToBlob("cases/user_123/img.jpg", buffer, "image/jpeg");

      expect(put).toHaveBeenCalledWith(
        "cases/user_123/img.jpg",
        buffer,
        expect.objectContaining({
          access: "private",
          contentType: "image/jpeg",
          token: "vercel_blob_rw_test_token_12345",
        })
      );
      expect(result.url).toBe("https://blob.vercel-storage.com/cases/user_123/img.jpg");
    });

    it("getPrivateBlobStream must call get() with access: 'private'", async () => {
      process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_test_token_12345";
      const mockResult = {
        statusCode: 200,
        stream: {} as ReadableStream,
        blob: { contentType: "image/jpeg" },
      };
      (get as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockResult);

      const streamResult = await getPrivateBlobStream("cases/user_123/img.jpg");

      expect(get).toHaveBeenCalledWith(
        "cases/user_123/img.jpg",
        expect.objectContaining({
          access: "private",
          token: "vercel_blob_rw_test_token_12345",
        })
      );
      expect(streamResult).toEqual(mockResult);
    });
  });

  describe("3. Strict Access Control Invariants for Case Images", () => {
    const mockCase: CaseLocationData = {
      id: "case_001",
      photoUrl: "https://blob.vercel-storage.com/cases/farmer_1/img.jpg",
      createdByUserId: "user_farmer_1",
      assignedVeterinarianUserId: "user_vet_1",
      animal: {
        herd: {
          farm: {
            farmerUserId: "user_farmer_1",
            fieldAgentUserId: "user_agent_1",
            villageId: "village_north",
            village: {
              blockId: "block_central",
              block: {
                districtId: "district_pune",
              },
            },
          },
        },
      },
    };

    it("Farmer access: Allowed for owning farmer or reporter", () => {
      const ownerUser = { id: "user_farmer_1", role: "FARMER" } as FullAppUser;
      expect(canUserAccessCase(ownerUser, mockCase)).toBe(true);
    });

    it("Farmer access: Denied for different farmer", () => {
      const otherFarmer = { id: "user_farmer_other", role: "FARMER" } as FullAppUser;
      expect(canUserAccessCase(otherFarmer, mockCase)).toBe(false);
    });

    it("Field Agent access: Allowed for assigned agent, reporter, or agent in same village/block/district", () => {
      const assignedAgent = { id: "user_agent_1", role: "FIELD_AGENT", districtId: "district_pune" } as FullAppUser;
      expect(canUserAccessCase(assignedAgent, mockCase)).toBe(true);

      const districtAgent = { id: "user_agent_2", role: "FIELD_AGENT", districtId: "district_pune" } as FullAppUser;
      expect(canUserAccessCase(districtAgent, mockCase)).toBe(true);
    });

    it("Field Agent access: Denied for agent in completely different district", () => {
      const otherDistrictAgent = { id: "user_agent_remote", role: "FIELD_AGENT", districtId: "district_mumbai" } as FullAppUser;
      expect(canUserAccessCase(otherDistrictAgent, mockCase)).toBe(false);
    });

    it("Veterinarian access: Allowed for directly assigned veterinarian", () => {
      const assignedVet = { id: "user_vet_1", role: "VETERINARIAN", districtId: "district_other" } as FullAppUser;
      expect(canUserAccessCase(assignedVet, mockCase)).toBe(true);
    });

    it("Veterinarian access: Allowed for veterinarian in same district", () => {
      const sameDistrictVet = { id: "user_vet_2", role: "VETERINARIAN", districtId: "district_pune" } as FullAppUser;
      expect(canUserAccessCase(sameDistrictVet, mockCase)).toBe(true);
    });

    it("Veterinarian access: Denied for unassigned veterinarian in different district", () => {
      const otherDistrictVet = { id: "user_vet_remote", role: "VETERINARIAN", districtId: "district_nagpur" } as FullAppUser;
      expect(canUserAccessCase(otherDistrictVet, mockCase)).toBe(false);
    });

    it("District Authority access: Allowed for authority in same district", () => {
      const puneAuthority = { id: "user_auth_pune", role: "DISTRICT_AUTHORITY", districtId: "district_pune" } as FullAppUser;
      expect(canUserAccessCase(puneAuthority, mockCase)).toBe(true);
    });

    it("District Authority access: Denied for authority in different district", () => {
      const nagpurAuthority = { id: "user_auth_nagpur", role: "DISTRICT_AUTHORITY", districtId: "district_nagpur" } as FullAppUser;
      expect(canUserAccessCase(nagpurAuthority, mockCase)).toBe(false);
    });
  });

  describe("4. Localized UI Copy (No 'Set Blob to Public' instructions)", () => {
    const locales = ["en", "hi", "mr", "bn"] as const;

    it("ensures all locales have photo upload copy and never instruct making storage public", () => {
      for (const locale of locales) {
        const copy = getReportCopy(locale);
        expect(copy.photoUploadFailed).toBeDefined();
        expect(copy.photoRetry).toBeDefined();
        expect(copy.photoUploading).toBeDefined();
        expect(copy.photoUploaded).toBeDefined();

        // Must not contain references instructing user to configure Vercel Blob store to Public
        expect(copy.photoUploadFailed.toLowerCase()).not.toContain("public");
        expect(copy.photoUploadFailed.toLowerCase()).not.toContain("vercel blob store");
      }
    });
  });
});
