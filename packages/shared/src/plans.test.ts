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
    expect(canScanToday('starter', 4)).toBe(true);
    expect(canScanToday('starter', 5)).toBe(false);
    expect(canScanToday('growth', 49)).toBe(true);
    expect(canScanToday('growth', 50)).toBe(false);
  });

  it('gives every paid tier AI predictions but gates richer features below growth', () => {
    expect(hasFeature('starter', 'aiPredictions')).toBe(true);
    expect(hasFeature('starter', 'simulations')).toBe(true);
    expect(hasFeature('starter', 'reports')).toBe(false);
    expect(hasFeature('starter', 'scenarioLab')).toBe(false);
    expect(hasFeature('starter', 'revenueImpact')).toBe(false);
    expect(hasFeature('growth', 'reports')).toBe(true);
    expect(hasFeature('growth', 'revenueImpact')).toBe(true);
    expect(hasFeature('pro', 'revenueImpact')).toBe(true);
  });

  it('escalates monitoring, alerts and history with the tier', () => {
    expect(planLimits('starter').monitoring).toBe('daily');
    expect(planLimits('growth').monitoring).toBe('hourly');
    expect(planLimits('pro').monitoring).toBe('continuous');
    expect(planLimits('starter').alerts).toBe('email');
    expect(planLimits('pro').alerts).toBe('slack_teams');
    expect(planLimits('starter').historyDays).toBe(30);
    expect(planLimits('pro').historyDays).toBe(Infinity);
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
