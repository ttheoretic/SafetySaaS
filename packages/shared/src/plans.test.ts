import { describe, it, expect } from 'vitest';
import {
  canCreateProject, canAddMember, canScanToday, hasFeature, planLimits,
  aiModelForPlan, aiTierForPlan, PLAN_ORDER,
} from './plans';

describe('plan limits', () => {
  it('covers exactly one project per subscription (except enterprise)', () => {
    expect(canCreateProject('starter', 0)).toBe(true);
    expect(canCreateProject('starter', 1)).toBe(false);
    expect(canCreateProject('pro', 1)).toBe(false);
  });

  it('enterprise is unlimited', () => {
    expect(canCreateProject('enterprise', 10_000)).toBe(true);
    expect(canAddMember('enterprise', 10_000)).toBe(true);
    expect(canScanToday('enterprise', 10_000)).toBe(true);
  });

  it('caps scans per day per tier', () => {
    expect(canScanToday('starter', 1)).toBe(true);
    expect(canScanToday('starter', 2)).toBe(false);
    expect(canScanToday('growth', 9)).toBe(true);
    expect(canScanToday('growth', 10)).toBe(false);
  });

  it('matches the pricing table: features unlock per tier', () => {
    // Starter: architecture + risk triage only (no deep analysis).
    expect(hasFeature('starter', 'aiPredictions')).toBe(true);
    expect(hasFeature('starter', 'sast')).toBe(false);
    expect(hasFeature('starter', 'sca')).toBe(false);
    expect(hasFeature('starter', 'simulations')).toBe(false);
    expect(hasFeature('starter', 'prExport')).toBe(false);
    // Growth: SAST + SCA + AI PR export, but no secrets/IaC/simulation.
    expect(hasFeature('growth', 'sast')).toBe(true);
    expect(hasFeature('growth', 'sca')).toBe(true);
    expect(hasFeature('growth', 'prExport')).toBe(true);
    expect(hasFeature('growth', 'secretScanning')).toBe(false);
    expect(hasFeature('growth', 'iac')).toBe(false);
    expect(hasFeature('growth', 'simulations')).toBe(false);
    // Pro: full security suite + failure simulation + SSO.
    expect(hasFeature('pro', 'secretScanning')).toBe(true);
    expect(hasFeature('pro', 'iac')).toBe(true);
    expect(hasFeature('pro', 'simulations')).toBe(true);
    expect(hasFeature('pro', 'scenarioLab')).toBe(true);
    expect(hasFeature('pro', 'sso')).toBe(true);
  });

  it('escalates monitoring, alerts and history with the tier', () => {
    expect(planLimits('starter').monitoring).toBe('weekly');
    expect(planLimits('growth').monitoring).toBe('daily');
    expect(planLimits('pro').monitoring).toBe('continuous');
    expect(planLimits('starter').alerts).toBe('email');
    expect(planLimits('pro').alerts).toBe('slack_teams');
    expect(planLimits('starter').historyDays).toBe(7);
    expect(planLimits('growth').historyDays).toBe(90);
    expect(planLimits('pro').historyDays).toBe(365);
    expect(planLimits('enterprise').historyDays).toBe(Infinity);
  });

  it('escalates the AI model with the tier', () => {
    expect(aiTierForPlan('starter')).toBe('basic');
    expect(aiTierForPlan('growth')).toBe('sonnet');
    expect(aiTierForPlan('pro')).toBe('opus');
    expect(aiModelForPlan('starter')).toBe('claude-haiku-4-5');
    expect(aiModelForPlan('growth')).toBe('claude-sonnet-4-6');
    expect(aiModelForPlan('pro')).toBe('claude-opus-4-8');
  });

  it('limits increase monotonically with tier', () => {
    for (let i = 1; i < PLAN_ORDER.length; i++) {
      const lower = planLimits(PLAN_ORDER[i - 1]);
      const higher = planLimits(PLAN_ORDER[i]);
      expect(higher.maxProjects).toBeGreaterThanOrEqual(lower.maxProjects);
      expect(higher.maxMembers).toBeGreaterThanOrEqual(lower.maxMembers);
      expect(higher.maxScansPerDay).toBeGreaterThanOrEqual(lower.maxScansPerDay);
    }
  });
});
