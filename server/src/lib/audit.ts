import type { Request } from 'express';
import { prisma } from '../db.js';

interface AuditInput {
  actorId?: string | null;
  actorRole?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}

export async function recordAudit(input: AuditInput, req?: Request): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? req?.user?.id ?? null,
        actorRole: input.actorRole ?? req?.user?.role ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        metadataJson: input.metadata ? JSON.stringify(input.metadata) : null,
        ip: req?.ip ?? null,
        userAgent: req?.headers['user-agent']?.slice(0, 300) ?? null,
      },
    });
  } catch (error) {
    console.error('[audit] failed to record audit entry', error);
  }
}
