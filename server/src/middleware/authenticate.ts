import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../db.js';
import { verifyAccessToken } from '../lib/jwt.js';
import { AppError } from '../lib/errors.js';

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.headers.authorization ?? '';
    if (!header.startsWith('Bearer ')) throw AppError.unauthorized();

    const token = header.slice('Bearer '.length).trim();
    if (!token) throw AppError.unauthorized();

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      throw AppError.unauthorized('Invalid or expired session.');
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, fullName: true, role: true, isActive: true },
    });

    if (!user) throw AppError.unauthorized('Account no longer exists.');
    if (!user.isActive) throw AppError.forbidden('This account has been disabled. Contact support.');

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}
