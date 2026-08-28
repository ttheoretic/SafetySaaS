-- Add an "in progress" triage state: the risk is acknowledged and someone is
-- working on it, but it is NOT suppressed — it still counts as open until it
-- is actually resolved.
--
-- Additive enum change: safe to apply while the old code is still running,
-- because nothing writes the new value until the new build is deployed.
ALTER TYPE "TriageStatus" ADD VALUE IF NOT EXISTS 'in_progress';
