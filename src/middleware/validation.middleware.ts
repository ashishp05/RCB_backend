import { NextFunction, Request, Response } from 'express';
import { ZodSchema } from 'zod';

/**
 * Validation middleware for request data using Zod
 */
export const validateRequest = (schema: ZodSchema<unknown>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const validationResult = schema.safeParse(req.body);

    if (!validationResult.success) {
      // Extract error messages
      const errorMessages = validationResult.error.issues.map(err => ({
        path: err.path.join('.'),
        message: err.message,
      }));

      // Send a response if validation fails
      res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errorMessages,
      });

      return; // Ensure no further middleware is called
    }

    // Attach parsed data to the request object (optional, but useful)
    req.body = validationResult.data;

    // Call next middleware if validation passes
    next();
  };
};

/**
 * Validation middleware for query parameters using Zod
 */
export const validateQuery = (schema: ZodSchema<unknown>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const validationResult = schema.safeParse(req.query);

    if (!validationResult.success) {
      const errorMessages = validationResult.error.issues.map(err => ({
        path: err.path.join('.'),
        message: err.message,
      }));

      res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errorMessages,
      });

      return;
    }

    // Replace req.query getter with Zod's coerced & validated data
    Object.defineProperty(req, 'query', {
      value: validationResult.data,
      writable: true,
      configurable: true,
      enumerable: true,
    });
    next();
  };
};
