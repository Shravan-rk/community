import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';
import { AppError } from '../lib/errors.js';

type Source = 'body' | 'query' | 'params';

export function validate(schema: ZodTypeAny, source: Source = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      next(
        new AppError(400, 'VALIDATION_ERROR', 'Some fields are invalid or missing.', {
          fields: result.error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        }),
      );
      return;
    }
    // Parsed values replace the raw input so downstream handlers deal with
    // validated, coerced and trimmed data. Express query objects are mutable.
    Object.defineProperty(req, source, { value: result.data, writable: true, configurable: true });
    next();
  };
}
