import { describe, it, expect } from 'vitest';
import {
  canCreateProject, canAddMember, hasFeature, planLimits, PLAN_ORDER,
} from './plans';

describe('plan limits', () => {
  it('starter allows exactly one project', () => {
    expect(canCreateProject('starter', 0)).toBe(true);
    expect(canCreateProject('starter', 1)).toBe(false);
  });

  it('enterprise is unlimited', () => {
    expect(canCreateProject('enterprise', 10_000)).toBe(true);
    expect(canAddMember('enterprise', 10_000)).toBe(true);
  });

  it('gates AI predictions and PDF reports below growth', () => {
    expect(hasFeature('starter', 'aiPredictions')).toBe(false);
    expect(hasFeature('starter', 'pdfReports')).toBe(false);
    expect(hasFeature('growth', 'aiPredictions')).toBe(true);
    expect(hasFeature('pro', 'pdfReports')).toBe(true);
  });

  it('limits increase monotonically with tier', () => {
    for (let i = 1; i < PLAN_ORDER.length; i++) {
      const lower = planLimits(PLAN_ORDER[i - 1]);
      const higher = planLimits(PLAN_ORDER[i]);
      expect(higher.maxProjects).toBeGreaterThanOrEqual(lower.maxProjects);
      expect(higher.maxMembers).toBeGreaterThanOrEqual(lower.maxMembers);
    }
  });
});
