import { Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { ResponseMessages } from '../constants/messages';

export class ApiResponse<T = unknown> {
  public statusCode: number;
  public data: T;
  public message: string;
  public success: boolean;

  constructor(statusCode: number, data: T, message: string = 'Success') {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
  }
}

export const sendJsonResponse = <T = unknown>(
  res: Response,
  data: T,
  message: string = ResponseMessages.FETCHED,
  statusCode: number = StatusCodes.OK,
): Response => {
  return res.status(statusCode).json(new ApiResponse(statusCode, data, message));
};
