-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'CITIZEN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "preferredLanguage" TEXT NOT NULL DEFAULT 'kn',
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CitizenProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "dateOfBirth" DATETIME,
    "gender" TEXT,
    "state" TEXT DEFAULT 'Karnataka',
    "district" TEXT,
    "taluk" TEXT,
    "village" TEXT,
    "gramPanchayat" TEXT,
    "occupation" TEXT,
    "annualIncome" INTEGER,
    "education" TEXT,
    "landHoldingAcres" REAL,
    "familySize" INTEGER,
    "disabilityStatus" BOOLEAN,
    "socialCategory" TEXT,
    "aadhaarLast4" TEXT,
    "profileJson" TEXT,
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CitizenProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserConsent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "consentType" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT false,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "grantedAt" DATETIME,
    "revokedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserConsent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorId" TEXT,
    "actorRole" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadataJson" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SchemeCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameKn" TEXT NOT NULL,
    "nameHi" TEXT NOT NULL,
    "descriptionEn" TEXT,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SchemeSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "monitoringIntervalMinutes" INTEGER NOT NULL DEFAULT 1440,
    "lastCheckedAt" DATETIME,
    "lastSuccessAt" DATETIME,
    "lastError" TEXT,
    "reliabilityScore" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Scheme" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleKn" TEXT,
    "titleHi" TEXT,
    "summaryEn" TEXT NOT NULL,
    "summaryKn" TEXT,
    "summaryHi" TEXT,
    "descriptionEn" TEXT,
    "descriptionKn" TEXT,
    "department" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'STATE',
    "state" TEXT DEFAULT 'Karnataka',
    "categoryId" TEXT NOT NULL,
    "benefitsEn" TEXT NOT NULL,
    "benefitsKn" TEXT,
    "eligibilityEn" TEXT,
    "eligibilityKn" TEXT,
    "requiredDocumentsJson" TEXT,
    "applicationProcessEn" TEXT,
    "applicationProcessKn" TEXT,
    "applicationUrl" TEXT,
    "officialUrl" TEXT,
    "notificationNumber" TEXT,
    "applicationDeadline" DATETIME,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "sourceId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "isDemoData" BOOLEAN NOT NULL DEFAULT false,
    "lastVerifiedAt" DATETIME,
    "publishedAt" DATETIME,
    "createdById" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "views" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Scheme_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "SchemeCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Scheme_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "SchemeSource" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Scheme_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SchemeVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schemeId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshotJson" TEXT NOT NULL,
    "changeSummary" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SchemeVersion_schemeId_fkey" FOREIGN KEY ("schemeId") REFERENCES "Scheme" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SchemeVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SchemeTranslation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schemeId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "fieldsJson" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'AI',
    "quality" TEXT NOT NULL DEFAULT 'DRAFT',
    "reviewedById" TEXT,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SchemeTranslation_schemeId_fkey" FOREIGN KEY ("schemeId") REFERENCES "Scheme" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SchemeTranslation_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EligibilityRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schemeId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "valueJson" TEXT NOT NULL,
    "descriptionEn" TEXT,
    "descriptionKn" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EligibilityRule_schemeId_fkey" FOREIGN KEY ("schemeId") REFERENCES "Scheme" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SchemeDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schemeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fileUrl" TEXT,
    "fileType" TEXT,
    "checksum" TEXT,
    "sizeBytes" INTEGER,
    "sourceUrl" TEXT,
    "fetchedAt" DATETIME,
    "extractedText" TEXT,
    "ocrStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SchemeDocument_schemeId_fkey" FOREIGN KEY ("schemeId") REFERENCES "Scheme" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SavedScheme" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "schemeId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SavedScheme_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SavedScheme_schemeId_fkey" FOREIGN KEY ("schemeId") REFERENCES "Scheme" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApplicationRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "schemeId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "referenceNumber" TEXT,
    "notes" TEXT,
    "documentsJson" TEXT,
    "submittedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ApplicationRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ApplicationRecord_schemeId_fkey" FOREIGN KEY ("schemeId") REFERENCES "Scheme" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "schemeId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'kn',
    "type" TEXT NOT NULL DEFAULT 'SCHEME_UPDATE',
    "channel" TEXT NOT NULL DEFAULT 'IN_APP',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "readAt" DATETIME,
    "sentAt" DATETIME,
    "dedupeKey" TEXT,
    "metadataJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Notification_schemeId_fkey" FOREIGN KEY ("schemeId") REFERENCES "Scheme" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "inApp" BOOLEAN NOT NULL DEFAULT true,
    "webPush" BOOLEAN NOT NULL DEFAULT false,
    "sms" BOOLEAN NOT NULL DEFAULT false,
    "whatsapp" BOOLEAN NOT NULL DEFAULT false,
    "email" BOOLEAN NOT NULL DEFAULT false,
    "categoriesJson" TEXT,
    "districtsJson" TEXT,
    "quietHoursStart" INTEGER,
    "quietHoursEnd" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AssistanceCentre" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "taluk" TEXT,
    "village" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "latitude" REAL,
    "longitude" REAL,
    "openingHours" TEXT,
    "verifiedAt" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AssistanceRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "centreId" TEXT,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "contactPhone" TEXT,
    "assignedToId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AssistanceRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AssistanceRequest_centreId_fkey" FOREIGN KEY ("centreId") REFERENCES "AssistanceCentre" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AssistanceRequest_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "schemeId" TEXT,
    "rating" INTEGER,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Feedback_schemeId_fkey" FOREIGN KEY ("schemeId") REFERENCES "Scheme" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MonitoringJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "startedAt" DATETIME,
    "finishedAt" DATETIME,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "itemsFound" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MonitoringJob_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "SchemeSource" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExtractionResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schemeId" TEXT,
    "monitoringJobId" TEXT,
    "sourceUrl" TEXT,
    "rawDocumentId" TEXT,
    "extractedJson" TEXT NOT NULL,
    "confidence" REAL,
    "model" TEXT,
    "needsReview" BOOLEAN NOT NULL DEFAULT true,
    "reviewedById" TEXT,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExtractionResult_schemeId_fkey" FOREIGN KEY ("schemeId") REFERENCES "Scheme" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ExtractionResult_monitoringJobId_fkey" FOREIGN KEY ("monitoringJobId") REFERENCES "MonitoringJob" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ExtractionResult_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VerificationRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schemeId" TEXT NOT NULL,
    "verifierId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "notes" TEXT,
    "sourceEvidenceUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VerificationRecord_schemeId_fkey" FOREIGN KEY ("schemeId") REFERENCES "Scheme" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VerificationRecord_verifierId_fkey" FOREIGN KEY ("verifierId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "User"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "CitizenProfile_userId_key" ON "CitizenProfile"("userId");

-- CreateIndex
CREATE INDEX "CitizenProfile_state_idx" ON "CitizenProfile"("state");

-- CreateIndex
CREATE INDEX "CitizenProfile_district_idx" ON "CitizenProfile"("district");

-- CreateIndex
CREATE INDEX "UserConsent_consentType_idx" ON "UserConsent"("consentType");

-- CreateIndex
CREATE UNIQUE INDEX "UserConsent_userId_consentType_key" ON "UserConsent"("userId", "consentType");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SchemeCategory_slug_key" ON "SchemeCategory"("slug");

-- CreateIndex
CREATE INDEX "SchemeCategory_isActive_idx" ON "SchemeCategory"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "SchemeSource_slug_key" ON "SchemeSource"("slug");

-- CreateIndex
CREATE INDEX "SchemeSource_isActive_idx" ON "SchemeSource"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Scheme_slug_key" ON "Scheme"("slug");

-- CreateIndex
CREATE INDEX "Scheme_status_idx" ON "Scheme"("status");

-- CreateIndex
CREATE INDEX "Scheme_categoryId_idx" ON "Scheme"("categoryId");

-- CreateIndex
CREATE INDEX "Scheme_state_status_idx" ON "Scheme"("state", "status");

-- CreateIndex
CREATE INDEX "Scheme_department_idx" ON "Scheme"("department");

-- CreateIndex
CREATE INDEX "Scheme_publishedAt_idx" ON "Scheme"("publishedAt");

-- CreateIndex
CREATE INDEX "SchemeVersion_schemeId_idx" ON "SchemeVersion"("schemeId");

-- CreateIndex
CREATE UNIQUE INDEX "SchemeVersion_schemeId_version_key" ON "SchemeVersion"("schemeId", "version");

-- CreateIndex
CREATE INDEX "SchemeTranslation_quality_idx" ON "SchemeTranslation"("quality");

-- CreateIndex
CREATE UNIQUE INDEX "SchemeTranslation_schemeId_language_key" ON "SchemeTranslation"("schemeId", "language");

-- CreateIndex
CREATE INDEX "EligibilityRule_schemeId_idx" ON "EligibilityRule"("schemeId");

-- CreateIndex
CREATE INDEX "EligibilityRule_field_idx" ON "EligibilityRule"("field");

-- CreateIndex
CREATE INDEX "SchemeDocument_schemeId_idx" ON "SchemeDocument"("schemeId");

-- CreateIndex
CREATE INDEX "SchemeDocument_ocrStatus_idx" ON "SchemeDocument"("ocrStatus");

-- CreateIndex
CREATE INDEX "SavedScheme_schemeId_idx" ON "SavedScheme"("schemeId");

-- CreateIndex
CREATE UNIQUE INDEX "SavedScheme_userId_schemeId_key" ON "SavedScheme"("userId", "schemeId");

-- CreateIndex
CREATE INDEX "ApplicationRecord_userId_idx" ON "ApplicationRecord"("userId");

-- CreateIndex
CREATE INDEX "ApplicationRecord_schemeId_idx" ON "ApplicationRecord"("schemeId");

-- CreateIndex
CREATE INDEX "ApplicationRecord_status_idx" ON "ApplicationRecord"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_dedupeKey_key" ON "Notification"("dedupeKey");

-- CreateIndex
CREATE INDEX "Notification_userId_status_idx" ON "Notification"("userId", "status");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE INDEX "AssistanceCentre_district_taluk_idx" ON "AssistanceCentre"("district", "taluk");

-- CreateIndex
CREATE INDEX "AssistanceCentre_type_idx" ON "AssistanceCentre"("type");

-- CreateIndex
CREATE INDEX "AssistanceRequest_status_idx" ON "AssistanceRequest"("status");

-- CreateIndex
CREATE INDEX "AssistanceRequest_centreId_idx" ON "AssistanceRequest"("centreId");

-- CreateIndex
CREATE INDEX "Feedback_schemeId_idx" ON "Feedback"("schemeId");

-- CreateIndex
CREATE INDEX "Feedback_status_idx" ON "Feedback"("status");

-- CreateIndex
CREATE INDEX "MonitoringJob_sourceId_idx" ON "MonitoringJob"("sourceId");

-- CreateIndex
CREATE INDEX "MonitoringJob_status_idx" ON "MonitoringJob"("status");

-- CreateIndex
CREATE INDEX "MonitoringJob_createdAt_idx" ON "MonitoringJob"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ExtractionResult_schemeId_key" ON "ExtractionResult"("schemeId");

-- CreateIndex
CREATE INDEX "ExtractionResult_needsReview_idx" ON "ExtractionResult"("needsReview");

-- CreateIndex
CREATE INDEX "ExtractionResult_monitoringJobId_idx" ON "ExtractionResult"("monitoringJobId");

-- CreateIndex
CREATE INDEX "VerificationRecord_schemeId_idx" ON "VerificationRecord"("schemeId");

-- CreateIndex
CREATE INDEX "VerificationRecord_verifierId_idx" ON "VerificationRecord"("verifierId");
