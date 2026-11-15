import { prisma } from '../../src/db.js';

export async function resetDatabase(): Promise<void> {
  await prisma.notification.deleteMany();
  await prisma.notificationPreference.deleteMany();
  await prisma.userConsent.deleteMany();
  await prisma.savedScheme.deleteMany();
  await prisma.applicationRecord.deleteMany();
  await prisma.assistanceRequest.deleteMany();
  await prisma.feedback.deleteMany();
  await prisma.verificationRecord.deleteMany();
  await prisma.extractionResult.deleteMany();
  await prisma.monitoringJob.deleteMany();
  await prisma.schemeVersion.deleteMany();
  await prisma.schemeTranslation.deleteMany();
  await prisma.eligibilityRule.deleteMany();
  await prisma.schemeDocument.deleteMany();
  await prisma.scheme.deleteMany();
  await prisma.schemeSource.deleteMany();
  await prisma.schemeCategory.deleteMany();
  await prisma.assistanceCentre.deleteMany();
  await prisma.citizenProfile.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();
}
