import { describe, it, expect } from 'vitest';
import { exampleGraph, Prediction } from '@riscly/shared';
import { PredictionService } from './prediction.service';
import { AiProvider, AnalyzedIssue, PredictRequest } from './ai-provider';
import { NullAiProvider } from './null.provider';

/** Only the prediction path matters here; the code-analysis members of the
 *  provider contract are stubbed so the fake stays a valid AiProvider. */
class FakeAiProvider implements AiProvider {
  readonly name = 'fake';
  readonly enabled = true;
  constructor(private readonly out: Prediction[]) {}
  async predict(_req: PredictRequest): Promise<Prediction[]> {
    return this.out;
  }
  async chat(): Promise<string> {
    return 'fake';
  }
  async generateCodeFix(): Promise<null> {
    return null;
  }
  async analyzeCode(): Promise<AnalyzedIssue[]> {
    return [];
  }
  async analyzeMaintainability(): Promise<AnalyzedIssue[]> {
    return [];
  }
}

describe('PredictionService', () => {
  it('returns heuristic predictions when AI is disabled', async () => {
    const service = new PredictionService(new NullAiProvider());
    const report = await service.predict(exampleGraph, { currentUsers: 4000 });
    expect(report.aiEnabled).toBe(false);
    expect(report.predictions.length).toBeGreaterThan(0);
    expect(report.predictions.every((p) => p.source === 'heuristic')).toBe(true);
  });

  it('merges AI predictions with heuristics', async () => {
    const aiPred: Prediction = {
      id: 'x',
      category: 'architecture',
      severity: 'high',
      title: 'Hidden coupling between API and queue will stall at scale',
      horizon: 'at ~200,000 users',
      likelihood: 0.9,
      rationale: '...',
      recommendation: '...',
      source: 'ai',
    };
    const service = new PredictionService(new FakeAiProvider([aiPred]));
    const report = await service.predict(exampleGraph);
    expect(report.aiEnabled).toBe(true);
    expect(report.predictions.some((p) => p.source === 'ai')).toBe(true);
    // Sorted by likelihood — the high-likelihood AI prediction leads.
    expect(report.predictions[0].likelihood).toBe(0.9);
  });

  it('de-duplicates an AI prediction that restates a heuristic', async () => {
    // Same title as the heuristic DB bottleneck prediction.
    const dup: Prediction = {
      id: 'dup',
      nodeId: 'db',
      category: 'bottleneck',
      severity: 'high',
      title: 'PostgreSQL will become the primary bottleneck',
      horizon: 'soon',
      likelihood: 0.99,
      rationale: '...',
      recommendation: '...',
      source: 'ai',
    };
    const service = new PredictionService(new FakeAiProvider([dup]));
    const report = await service.predict(exampleGraph);
    const dbPreds = report.predictions.filter((p) => p.nodeId === 'db');
    // Only the heuristic survives the title collision.
    expect(dbPreds).toHaveLength(1);
    expect(dbPreds[0].source).toBe('heuristic');
  });

  it('survives an AI provider that returns nothing', async () => {
    const service = new PredictionService(new FakeAiProvider([]));
    const report = await service.predict(exampleGraph);
    expect(report.predictions.length).toBeGreaterThan(0);
  });
});
