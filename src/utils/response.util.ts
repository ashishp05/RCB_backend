import { Response } from 'express';
import { StatusCodes } from 'http-status-codes';

// API bodies follow the box cricket contract: the payload itself is the JSON body.
// Errors use { success: false, message, errors? } from the error middleware.
export const sendData = <T = unknown>(
  res: Response,
  data: T,
  statusCode: number = StatusCodes.OK,
): Response => res.status(statusCode).json(data);

// Lists that support paging return an array and the full count in X-Total-Count.
export const sendList = <T = unknown>(res: Response, records: T[], total?: number): Response => {
  if (total !== undefined) {
    res.setHeader('X-Total-Count', String(total));
  }
  return res.status(StatusCodes.OK).json(records);
};
