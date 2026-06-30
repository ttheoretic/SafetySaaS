-- Finding triage / suppression: persist false-positive / accepted-risk /
-- resolved decisions across re-scans, keyed by a stable finding fingerprint.

CREATE TYPE "TriageStatus" AS ENUM ('open', 'false_positive', 'accepted_risk', 'resolved');

CREATE TABLE "FindingSuppression" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "status" "TriageStatus" NOT NULL DEFAULT 'open',
    "note" TEXT,
    "actorUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FindingSuppression_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FindingSuppression_projectId_fingerprint_key" ON "FindingSuppression"("projectId", "fingerprint");
CREATE INDEX "FindingSuppression_projectId_idx" ON "FindingSuppression"("projectId");
