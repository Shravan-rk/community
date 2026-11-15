import type { User } from '@prisma/client';

export interface PublicUser {
  id: string;
  email: string;
  phone: string | null;
  fullName: string;
  role: string;
  isActive: boolean;
  preferredLanguage: string;
  lastLoginAt: Date | null;
  createdAt: Date;
}

export function publicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    fullName: user.fullName,
    role: user.role,
    isActive: user.isActive,
    preferredLanguage: user.preferredLanguage,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  };
}

export function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}
