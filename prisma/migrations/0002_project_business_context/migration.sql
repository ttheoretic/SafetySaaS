-- Add per-project business context (MRR, active users, currency) for revenue impact.
ALTER TABLE "Project" ADD COLUMN "businessContext" JSONB;
