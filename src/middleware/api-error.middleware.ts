import { Prisma } from '@prisma/client';
import { ErrorRequestHandler, NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { ValidationMessages } from '../constants/messages';
import { ApiError } from '../utils/api-error.util';
import { removeUploadedFilesOnError } from '../utils/file-upload.util';

const checkContentType = (req: Request, res: Response, next: NextFunction) => {
  const contentType = req.get('Content-Type');

  if (!contentType || contentType !== 'application/json') {
    res
      .status(StatusCodes.BAD_REQUEST)
      .json({ success: false, message: 'Only application/json Content-Type is allowed' });
    return;
  }

  next();
};

const checkContentTypeAsURLEncodedFormData = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const contentType = String(req.get('Content-Type')).split(';')[0];

  if (!contentType || contentType !== 'application/x-www-form-urlencoded') {
    res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: 'Content-Type required as application/x-www-form-urlencoded',
    });
    return;
  }

  next();
};

const apiErrorHandler = (
  err: ErrorRequestHandler,
  req: Request,
  res: Response,

  next: NextFunction,
): void => {
  // Clean up any files uploaded during this request if an error occurred
  removeUploadedFilesOnError(req);

  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.errors && err.errors.length > 0 ? { errors: err.errors } : {}),
    });
    return;
  }

  if (
    err instanceof SyntaxError &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (err as any).status === StatusCodes.BAD_REQUEST &&
    'body' in err
  ) {
    // Handle JSON syntax error
    res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: 'Invalid JSON' });
    return;
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2003') {
      const rawField = typeof err.meta?.field_name === 'string' ? err.meta.field_name : '';
      const fieldMatch = rawField.match(/_([a-zA-Z0-9_]+)_fkey/);
      const fieldName = fieldMatch ? fieldMatch[1] : rawField;
      const target = fieldName ? `'${fieldName}'` : 'referenced record';

      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: `Invalid reference: The ${target} does not exist.`,
      });
      return;
    }
    // Unique constraint (duplicate SKU, invoice number, email, ...)
    if (err.code === 'P2002') {
      res
        .status(StatusCodes.CONFLICT)
        .json({ success: false, message: ValidationMessages.DUPLICATE_RECORD });
      return;
    }
    // Handle Prisma validation errors
    if (err.meta) {
      const firstKey = Object.keys(err?.meta)[0];
      const cause = String(err?.meta[firstKey] ?? '');
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ success: false, message: `Invalid data reference or ID: ${cause}` });
      return;
    }
  }
  if (
    err instanceof Prisma.PrismaClientUnknownRequestError ||
    err instanceof Prisma.PrismaClientRustPanicError ||
    err instanceof Prisma.PrismaClientInitializationError ||
    err instanceof Prisma.PrismaClientValidationError
  ) {
    // Internal Prisma error details are logged above but not exposed to the client.
    res
      .status(StatusCodes.BAD_REQUEST)
      .json({ success: false, message: ValidationMessages.BAD_REQUEST });
    return;
  }
  // Handle other errors
  console.error('Unhandled error', err);
  res
    .status(StatusCodes.INTERNAL_SERVER_ERROR)
    .json({ success: false, message: ValidationMessages.INTERNAL_SERVER_ERROR });
  return;
};

const unmatchedRoutes = (req: Request, res: Response): void => {
  res
    .status(StatusCodes.NOT_FOUND)
    .json({ success: false, message: ValidationMessages.ROUTE_NOT_FOUND });
  return;
};

export { apiErrorHandler, checkContentType, checkContentTypeAsURLEncodedFormData, unmatchedRoutes };
