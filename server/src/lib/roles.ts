export const ROLES = [
  'CITIZEN',
  'VILLAGE_FACILITATOR',
  'SCHEME_VERIFIER',
  'ADMIN',
  'SUPER_ADMIN',
] as const;

export type Role = (typeof ROLES)[number];

export const LANGUAGES = ['kn', 'en', 'hi'] as const;
export type Language = (typeof LANGUAGES)[number];

export const STAFF_REGISTRABLE_ROLES: Role[] = ['VILLAGE_FACILITATOR', 'SCHEME_VERIFIER'];
export const ADMIN_REGISTRABLE_ROLES: Role[] = ['ADMIN'];

export const ROLE_RANK: Record<Role, number> = {
  CITIZEN: 0,
  VILLAGE_FACILITATOR: 1,
  SCHEME_VERIFIER: 2,
  ADMIN: 3,
  SUPER_ADMIN: 4,
};

export const SCHEME_STATUSES = [
  'DRAFT',
  'PENDING_VERIFICATION',
  'VERIFIED',
  'PUBLISHED',
  'REJECTED',
  'EXPIRED',
] as const;
export type SchemeStatus = (typeof SCHEME_STATUSES)[number];

export const isRole = (value: unknown): value is Role =>
  typeof value === 'string' && (ROLES as readonly string[]).includes(value);

export const hasRoleAtLeast = (role: Role, minimum: Role): boolean =>
  ROLE_RANK[role] >= ROLE_RANK[minimum];
