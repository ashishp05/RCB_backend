import { Request } from 'express';
import multer from 'multer';

import { deleteLocalFile, getLocalFileUrl, uploadLocalFile } from './local-storage.util';
import s3Helper from './s3.util';

export interface FileUploadResult {
  url: string;
}

/**
 * Uploads a single file to S3 or Local storage based on USE_S3 flag
 */
export const handleFileUpload = async (
  file: Express.Multer.File,
  folder: string,
  req: Request | null = null,
): Promise<FileUploadResult | null> => {
  if (!file) return null;

  if (s3Helper.isEnabled()) {
    const fileName = `${Date.now()}_${file.originalname.replace(/\s+/g, '-')}`;
    const s3Key = `${folder}/${fileName}`;
    const relativePath = await s3Helper.uploadFile(file.buffer, s3Key, file.mimetype);

    if (req) {
      req.uploadedFileKeys = req.uploadedFileKeys || [];
      req.uploadedFileKeys.push(relativePath);
    }

    return {
      url: relativePath,
    };
  } else {
    return await uploadLocalFile(file, folder, req);
  }
};

/**
 * Uploads an array of files to S3 or Local storage
 */
export const handleMultipleFilesUpload = async (
  files: Express.Multer.File[],
  folder: string,
  req: Request | null = null,
): Promise<FileUploadResult[]> => {
  if (!files || files.length === 0) return [];

  const uploadPromises = files.map(file => handleFileUpload(file, folder, req));
  const results = await Promise.all(uploadPromises);
  return results.filter((res): res is FileUploadResult => res !== null);
};

/**
 * Deletes a file from S3 or Local storage based on USE_S3 flag
 */
export const deleteFile = async (localPath: string): Promise<void> => {
  if (!localPath) return;

  if (s3Helper.isEnabled()) {
    await s3Helper.deleteFile(localPath);
  } else {
    await deleteLocalFile(localPath);
  }
};

/**
 * Retrieves the full accessible URL for a stored file
 */
export const getFileUrl = (localPath: string | null | undefined): string | null => {
  if (!localPath) return null;

  if (s3Helper.isEnabled()) {
    return s3Helper.getUrl(localPath);
  } else {
    return getLocalFileUrl(localPath);
  }
};

/**
 * Cleans up all uploaded files during a request if an error occurs downstream
 */
export const removeUploadedFilesOnError = (req: Request): void => {
  try {
    const keys = req.uploadedFileKeys;
    if (!Array.isArray(keys) || keys.length === 0) return;

    keys.forEach(key => {
      if (key) {
        void deleteFile(key);
      }
    });
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : String(error);

    console.error('❌ Error in removeUploadedFilesOnError:', errMessage);
  }
};
