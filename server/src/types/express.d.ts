import type { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        fullName: string;
        role: string;
        isActive: boolean;
      };
    }
  }
}

export type AuthedRequest = Request & {
  user: NonNullable<Request['user']>;
};
