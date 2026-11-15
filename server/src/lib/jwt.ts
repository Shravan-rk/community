import jwt from 'jsonwebtoken';
import { env } from '../env.js';
import type { Role } from './roles.js';
import { isRole } from './roles.js';

const ISSUER = 'grama-sahay';
const AUDIENCE = 'grama-sahay-app';

export interface AccessTokenPayload {
  sub: string;
  role: Role;
}

export function signAccessToken(user: { id: string; role: string }): string {
  const options: jwt.SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    issuer: ISSUER,
    audience: AUDIENCE,
  };
  return jwt.sign({ sub: user.id, role: user.role }, env.JWT_SECRET, options);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET, {
    issuer: ISSUER,
    audience: AUDIENCE,
  });
  if (typeof decoded === 'string' || !decoded.sub || !isRole(decoded.role)) {
    throw new Error('Malformed token');
  }
  return { sub: decoded.sub, role: decoded.role };
}
