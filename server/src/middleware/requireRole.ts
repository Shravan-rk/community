import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../lib/errors.js';
import type { Role } from '../lib/roles.js';

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) {
      next(AppError.unauthorized());
      return;
    }
    if (!roles.includes(user.role as Role)) {
      next(AppError.forbidden());
      return;
    }
    next();
  };
}
