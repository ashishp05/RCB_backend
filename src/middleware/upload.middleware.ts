import { NextFunction, Request, RequestHandler, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import multer from 'multer';

type Field = multer.Field;

import { ValidationMessages } from '../constants/messages';
import { ApiError } from '../utils/api-error.util';
import { handleFileUpload, handleMultipleFilesUpload } from '../utils/file-upload.util';

export interface FieldConfig {
  name: string;
  maxCount?: number;
  folder?: string;
  maxSize?: number;
  allowedTypes?: string[];
}

export interface UploadOptions {
  maxSize?: number; // In bytes (default: 10MB)
  allowedTypes?: string[]; // e.g. ['image/jpeg', 'image/png', 'image/webp']
}

const memoryStorage = multer.memoryStorage();

const createMulterInstance = (
  options: UploadOptions = {},
  fieldConfigs: FieldConfig[] | null = null,
) => {
  return multer({
    storage: memoryStorage,
    limits: {
      fileSize: options.maxSize || 10 * 1024 * 1024, // Default 10MB limit
    },
    fileFilter: (
      req: unknown,
      file: Express.Multer.File,
      cb: (error: Error | null, acceptFile?: boolean) => void,
    ) => {
      // 1. Check if there is a specific MIME rule for this specific field
      if (fieldConfigs) {
        const fieldRule = fieldConfigs.find(f => f.name === file.fieldname);
        if (fieldRule && fieldRule.allowedTypes && fieldRule.allowedTypes.length > 0) {
          if (!fieldRule.allowedTypes.includes(file.mimetype)) {
            return cb(
              new Error(
                ValidationMessages.invalidFileType(
                  file.fieldname,
                  fieldRule.allowedTypes.join(', '),
                ),
              ),
            );
          }
          return cb(null, true);
        }
      }

      // 2. Fallback to global options MIME validation
      if (options.allowedTypes && options.allowedTypes.length > 0) {
        if (!options.allowedTypes.includes(file.mimetype)) {
          return cb(
            new Error(
              ValidationMessages.invalidFileType(file.fieldname, options.allowedTypes.join(', ')),
            ),
          );
        }
      }
      cb(null, true);
    },
  });
};

const handleMulterError = (err: unknown, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    return next(new ApiError(StatusCodes.BAD_REQUEST, ValidationMessages.uploadError(err.message)));
  } else if (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return next(new ApiError(StatusCodes.BAD_REQUEST, msg));
  }
  next();
};

export class MediaMiddleware {
  /**
   * Middleware for handling a single file upload field
   */
  static single(
    fieldName: string,
    folderName: string,
    options: UploadOptions = {},
  ): RequestHandler[] {
    return [
      (req: Request, res: Response, next: NextFunction) => {
        const upload = createMulterInstance(options).single(fieldName);
        upload(req, res, (err: unknown) => {
          if (err) return handleMulterError(err, next);
          next();
        });
      },
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const reqFile = (req as any).file;
          if (reqFile) {
            const uploaded = await handleFileUpload(reqFile, folderName, req);
            if (uploaded) {
              reqFile.url = uploaded.url;
              reqFile.localPath = uploaded.url;
            }
          }
          next();
        } catch (error) {
          next(error);
        }
      },
    ];
  }

  /**
   * Middleware for handling an array of files under a single field name (supports images, images[0], images[])
   */
  static array(
    fieldName: string,
    folderName: string,
    maxCount: number = 10,
    options: UploadOptions = {},
  ): RequestHandler[] {
    return [
      (req: Request, res: Response, next: NextFunction) => {
        const upload = createMulterInstance(options).any();
        upload(req, res, (err: unknown) => {
          if (err) return handleMulterError(err, next);

          // Filter files matching fieldName (e.g. images, images[0], images[1], images[])
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const allFiles: any[] = (req as any).files || [];
          const matchedFiles = allFiles.filter(
            file =>
              file.fieldname === fieldName ||
              file.fieldname.startsWith(`${fieldName}[`) ||
              file.fieldname.startsWith(`${fieldName}_`) ||
              file.fieldname.startsWith(`${fieldName}.`),
          );

          if (matchedFiles.length > maxCount) {
            return next(
              new ApiError(
                StatusCodes.BAD_REQUEST,
                `Maximum ${maxCount} files allowed for field '${fieldName}'`,
              ),
            );
          }

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (req as any).files = matchedFiles;
          next();
        });
      },
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const reqFiles = (req as any).files;
          if (reqFiles && Array.isArray(reqFiles) && reqFiles.length > 0) {
            const uploadedFiles = await handleMultipleFilesUpload(reqFiles, folderName, req);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            reqFiles.forEach((file: any, index: number) => {
              if (uploadedFiles[index]) {
                file.url = uploadedFiles[index].url;
                file.localPath = uploadedFiles[index].url;
              }
            });
          }
          next();
        } catch (error) {
          next(error);
        }
      },
    ];
  }

  /**
   * Middleware for handling multiple distinct named fields with custom rules
   */
  static fields(
    fieldsArray: FieldConfig[],
    defaultFolderName: string,
    options: UploadOptions = {},
  ): RequestHandler[] {
    return [
      (req: Request, res: Response, next: NextFunction) => {
        const multerFields: Field[] = fieldsArray.map(f => ({
          name: f.name,
          maxCount: f.maxCount || 10,
        }));

        const upload = createMulterInstance(options, fieldsArray).fields(multerFields);
        upload(req, res, (err: unknown) => {
          if (err) return handleMulterError(err, next);

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const reqFiles = (req as any).files;
          if (reqFiles && !Array.isArray(reqFiles)) {
            for (const field in reqFiles) {
              const fieldRule = fieldsArray.find(f => f.name === field);
              if (fieldRule && fieldRule.maxSize) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                for (const file of reqFiles[field] as any[]) {
                  if (file.size > fieldRule.maxSize) {
                    const sizeLimitMB = (fieldRule.maxSize / (1024 * 1024)).toFixed(1);
                    return next(
                      new ApiError(
                        StatusCodes.BAD_REQUEST,
                        ValidationMessages.fileSizeExceeded(field, sizeLimitMB),
                      ),
                    );
                  }
                }
              }
            }
          }
          next();
        });
      },
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const reqFiles = (req as any).files;
          if (reqFiles && !Array.isArray(reqFiles)) {
            for (const field in reqFiles) {
              const fieldConfig = fieldsArray.find(f => f.name === field);
              const targetFolder = fieldConfig?.folder || defaultFolderName;

              const uploadedFiles = await handleMultipleFilesUpload(
                reqFiles[field],
                targetFolder,
                req,
              );
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              reqFiles[field].forEach((file: any, index: number) => {
                if (uploadedFiles[index]) {
                  file.url = uploadedFiles[index].url;
                  file.localPath = uploadedFiles[index].url;
                }
              });
            }
          }
          next();
        } catch (error) {
          next(error);
        }
      },
    ];
  }
}

/**
 * Fluent factory helper for binding upload middlewares to a target folder
 */
export const uploadFor = (folderName: string, options: UploadOptions = {}) => {
  return {
    single: (fieldName: string) => MediaMiddleware.single(fieldName, folderName, options),
    array: (fieldName: string, maxCount?: number) =>
      MediaMiddleware.array(fieldName, folderName, maxCount, options),
    fields: (fieldsArray: FieldConfig[]) =>
      MediaMiddleware.fields(fieldsArray, folderName, options),
  };
};

export default MediaMiddleware;
