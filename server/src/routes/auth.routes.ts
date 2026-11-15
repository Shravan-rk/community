import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { env } from '../env.js';
import { AppError } from '../lib/errors.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { signAccessToken } from '../lib/jwt.js';
import { recordAudit } from '../lib/audit.js';
import { publicUser } from '../lib/publicUser.js';
import { safeEqual } from '../lib/safeEqual.js';
import { ADMIN_REGISTRABLE_ROLES, LANGUAGES, ROLES, STAFF_REGISTRABLE_ROLES } from '../lib/roles.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { authLimiter } from '../middleware/rateLimit.js';

const router = Router();

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(72, 'Password must be at most 72 characters.')
  .regex(/[A-Za-z]/, 'Password must include a letter.')
  .regex(/[0-9]/, 'Password must include a number.');

const emailSchema = z.string().trim().toLowerCase().email('Enter a valid email address.').max(190);
const phoneSchema = z
  .string()
  .trim()
  .max(20)
  .regex(/^[+0-9][0-9 ()-]{7,19}$/, 'Enter a valid phone number.')
  .optional();

const registerSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name.').max(120),
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
  preferredLanguage: z.enum(LANGUAGES).default('kn'),
});

const staffRegisterSchema = registerSchema.extend({
  role: z.enum([...STAFF_REGISTRABLE_ROLES, ...ADMIN_REGISTRABLE_ROLES] as [string, ...string[]]),
  inviteCode: z.string().min(1, 'Invite code is required.'),
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password.').max(200),
});

async function createUserWithDefaults(input: {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
  preferredLanguage: string;
  role: string;
}) {
  const passwordHash = await hashPassword(input.password);
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        fullName: input.fullName,
        email: input.email,
        phone: input.phone ?? null,
        passwordHash,
        role: input.role,
        preferredLanguage: input.preferredLanguage,
      },
    });
    await tx.citizenProfile.create({
      data: { userId: user.id, state: 'Karnataka' },
    });
    await tx.notificationPreference.create({
      data: { userId: user.id },
    });
    await tx.userConsent.create({
      data: {
        userId: user.id,
        consentType: 'DATA_PROCESSING',
        granted: true,
        version: '1.0',
        grantedAt: new Date(),
      },
    });
    return user;
  });
}

router.post(
  '/register',
  authLimiter,
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof registerSchema>;

    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) throw AppError.conflict('An account with this email already exists.');

    const user = await createUserWithDefaults({ ...body, role: 'CITIZEN' });

    await recordAudit(
      { actorId: user.id, actorRole: user.role, action: 'AUTH_REGISTER', entityType: 'User', entityId: user.id },
      req,
    );

    res.status(201).json({
      token: signAccessToken(user),
      user: publicUser(user),
    });
  }),
);

router.post(
  '/register/staff',
  authLimiter,
  validate(staffRegisterSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof staffRegisterSchema>;
    const isAdminRole = (ADMIN_REGISTRABLE_ROLES as string[]).includes(body.role);
    const expectedCode = isAdminRole ? env.ADMIN_INVITE_CODE : env.STAFF_INVITE_CODE;

    if (!safeEqual(body.inviteCode, expectedCode)) {
      throw AppError.forbidden('The invite code is not valid.');
    }

    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) throw AppError.conflict('An account with this email already exists.');

    const user = await createUserWithDefaults(body);

    await recordAudit(
      {
        actorId: user.id,
        actorRole: user.role,
        action: 'AUTH_REGISTER_STAFF',
        entityType: 'User',
        entityId: user.id,
        metadata: { role: user.role },
      },
      req,
    );

    res.status(201).json({ token: signAccessToken(user), user: publicUser(user) });
  }),
);

router.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof loginSchema>;

    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user) throw AppError.unauthorized('Email or password is incorrect.');

    const valid = await verifyPassword(body.password, user.passwordHash);
    if (!valid) {
      await recordAudit(
        { actorId: user.id, actorRole: user.role, action: 'AUTH_LOGIN_FAILED', entityType: 'User', entityId: user.id },
        req,
      );
      throw AppError.unauthorized('Email or password is incorrect.');
    }

    if (!user.isActive) throw AppError.forbidden('This account has been disabled. Contact support.');

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await recordAudit(
      { actorId: user.id, actorRole: user.role, action: 'AUTH_LOGIN', entityType: 'User', entityId: user.id },
      req,
    );

    const profile = await prisma.citizenProfile.findUnique({ where: { userId: user.id } });

    res.json({
      token: signAccessToken(updated),
      user: publicUser(updated),
      profile,
    });
  }),
);

router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw AppError.unauthorized();

    const [profile, notificationPreference, consents] = await Promise.all([
      prisma.citizenProfile.findUnique({ where: { userId } }),
      prisma.notificationPreference.findUnique({ where: { userId } }),
      prisma.userConsent.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
    ]);

    res.json({ user: publicUser(user), profile, notificationPreference, consents });
  }),
);

router.post(
  '/logout',
  authenticate,
  asyncHandler(async (req, res) => {
    await recordAudit(
      {
        action: 'AUTH_LOGOUT',
        entityType: 'User',
        entityId: req.user!.id,
      },
      req,
    );
    res.status(204).send();
  }),
);

router.get('/roles', (_req, res) => {
  res.json({ roles: ROLES });
});

export default router;
