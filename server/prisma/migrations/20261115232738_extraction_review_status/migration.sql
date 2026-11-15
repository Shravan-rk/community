-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ExtractionResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schemeId" TEXT,
    "monitoringJobId" TEXT,
    "sourceUrl" TEXT,
    "rawDocumentId" TEXT,
    "extractedJson" TEXT NOT NULL,
    "confidence" REAL,
    "model" TEXT,
    "needsReview" BOOLEAN NOT NULL DEFAULT true,
    "reviewStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewNotes" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExtractionResult_schemeId_fkey" FOREIGN KEY ("schemeId") REFERENCES "Scheme" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ExtractionResult_monitoringJobId_fkey" FOREIGN KEY ("monitoringJobId") REFERENCES "MonitoringJob" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ExtractionResult_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ExtractionResult" ("confidence", "createdAt", "extractedJson", "id", "model", "monitoringJobId", "needsReview", "rawDocumentId", "reviewedAt", "reviewedById", "schemeId", "sourceUrl") SELECT "confidence", "createdAt", "extractedJson", "id", "model", "monitoringJobId", "needsReview", "rawDocumentId", "reviewedAt", "reviewedById", "schemeId", "sourceUrl" FROM "ExtractionResult";
DROP TABLE "ExtractionResult";
ALTER TABLE "new_ExtractionResult" RENAME TO "ExtractionResult";
CREATE UNIQUE INDEX "ExtractionResult_schemeId_key" ON "ExtractionResult"("schemeId");
CREATE INDEX "ExtractionResult_needsReview_idx" ON "ExtractionResult"("needsReview");
CREATE INDEX "ExtractionResult_reviewStatus_idx" ON "ExtractionResult"("reviewStatus");
CREATE INDEX "ExtractionResult_monitoringJobId_idx" ON "ExtractionResult"("monitoringJobId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
