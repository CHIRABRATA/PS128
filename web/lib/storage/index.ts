// import "server-only";
import {
  uploadToBlob,
  deleteFromBlob,
  validateImageFile,
  UploadResult,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_MIME_TYPES,
} from "./blob";

export interface StorageProvider {
  upload(pathKey: string, buffer: Buffer, contentType: string): Promise<UploadResult>;
  delete(urlOrKey: string): Promise<void>;
}

/**
 * Production Vercel Blob storage provider implementation wrapped by standard abstraction interface.
 */
export const storageProvider: StorageProvider = {
  upload: uploadToBlob,
  delete: deleteFromBlob,
};

export { validateImageFile, MAX_FILE_SIZE_BYTES, ALLOWED_MIME_TYPES };
export type { UploadResult };
