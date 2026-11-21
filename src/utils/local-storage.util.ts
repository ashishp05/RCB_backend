import { Request } from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';

import { env } from '../config/env-config';

export interface FileUploadResult {
  url: string;
}

/**
 * Uploads and writes a single file buffer to local disk under uploads/<folder>/
 */
export const uploadLocalFile = async (
  file: Express.Multer.File,
  folder: string,
  req: Request | null = null,
): Promise<FileUploadResult | null> => {
  if (!file) return null;

  const fileName = `${Date.now()}_${file.originalname.replace(/\s+/g, '-')}`;
  const uploadDir = path.join(process.cwd(), 'uploads', String(folder));
  const fullPath = path.join(uploadDir, fileName);

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  fs.writeFileSync(fullPath, file.buffer);
  const localPath = `${folder}/${fileName}`.replace(/\\/g, '/');

  if (req) {
    req.uploadedFileKeys = req.uploadedFileKeys || [];
    req.uploadedFileKeys.push(localPath);
  }

  return {
    url: localPath,
  };
};

/**
 * Deletes a local file from disk under the uploads/ directory
 */
export const deleteLocalFile = async (localPath: string): Promise<void> => {
  if (!localPath) return;

  try {
    const fullPath = path.join(process.cwd(), 'uploads', localPath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : String(error);

    console.error('❌ Error deleting local file:', errMessage);
  }
};

/**
 * Retrieves the full accessible HTTP URL for a stored local file
 */
export const getLocalFileUrl = (localPath: string): string | null => {
  if (!localPath) return null;

  // If localPath already starts with http:// or https://, return as is
  if (localPath.startsWith('http://') || localPath.startsWith('https://')) {
    return localPath;
  }

  const hostUrl = env.HOST_URL || `http://localhost:${env.PORT || 5000}`;
  const cleanPath = localPath.startsWith('/') ? localPath.slice(1) : localPath;
  return `${hostUrl}/uploads/${cleanPath}`;
};
