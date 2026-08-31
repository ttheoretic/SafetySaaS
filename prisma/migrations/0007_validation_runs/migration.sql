-- Validation runs: the history of re-testing open findings against the live
-- sources (is the secret still live? is the vulnerable version still resolved?
-- is the flagged line still there?). Purely additive.
CREATE TABLE "ValidationRun" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "checks" JSONB NOT NULL DEFAULT '[]',
    "actorUserId" TEXT,
    CONSTRAINT "ValidationRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ValidationRun_projectId_startedAt_idx" ON "ValidationRun"("projectId", "startedAt");
