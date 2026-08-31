import { describe, it, expect } from 'vitest';
import { attachAiComponents } from './scan';
import { exampleGraph } from '../fixtures';
import type { AiComponentSignal } from './signals';
import type { SystemGraph } from '../model';

const model: AiComponentSignal = { id: 'ai-openai', kind: 'ai_model', name: 'OpenAI', provider: 'openai' };
const agent: AiComponentSignal = { id: 'ai-agent', kind: 'ai_agent', name: 'AI agent' };
const store: AiComponentSignal = { id: 'ai-pinecone', kind: 'vector_store', name: 'Pinecone' };

describe('attachAiComponents', () => {
  it('returns the graph untouched when nothing AI was found', () => {
    expect(attachAiComponents(exampleGraph, [])).toBe(exampleGraph);
  });

  it('adds the model as a node and connects it from the service tier', () => {
    const g = attachAiComponents(exampleGraph, [model]);
    const node = g.nodes.find((n) => n.id === 'ai-openai')!;
    expect(node).toMatchObject({ kind: 'ai_model', provider: 'openai', estimated: true });
    // A hosted model is an authenticated, rate-limited external dependency.
    expect(node.hasAuth).toBe(true);
    expect(g.edges).toContainEqual({ from: 'api', to: 'ai-openai', criticality: 0.5 });
  });

  it('routes through the agent when one exists', () => {
    const g = attachAiComponents(exampleGraph, [model, agent, store]);
    expect(g.edges).toContainEqual({ from: 'api', to: 'ai-agent', criticality: 0.5 });
    expect(g.edges.some((e) => e.from === 'ai-agent' && e.to === 'ai-openai')).toBe(true);
    expect(g.edges.some((e) => e.from === 'ai-agent' && e.to === 'ai-pinecone')).toBe(true);
    // The service tier should not also wire straight to the model.
    expect(g.edges.some((e) => e.from === 'api' && e.to === 'ai-openai')).toBe(false);
  });

  it('merges the same component discovered in several repos', () => {
    const g = attachAiComponents(exampleGraph, [model, { ...model }]);
    expect(g.nodes.filter((n) => n.id === 'ai-openai')).toHaveLength(1);
  });

  it('never duplicates a component the graph already has', () => {
    const once = attachAiComponents(exampleGraph, [model]);
    const twice = attachAiComponents(once, [model]);
    expect(twice).toBe(once);
  });

  it('falls back to the entrypoints when there is no service tier', () => {
    const frontendOnly: SystemGraph = {
      nodes: [{ id: 'fe', kind: 'frontend', name: 'Web' }],
      edges: [],
    };
    const g = attachAiComponents(frontendOnly, [model]);
    expect(g.edges).toContainEqual({ from: 'fe', to: 'ai-openai', criticality: 0.5 });
  });

  it('keeps AI components reachable so blast-radius analysis sees them', () => {
    const g = attachAiComponents(exampleGraph, [model]);
    const reachable = new Set(g.edges.map((e) => e.to));
    expect(reachable.has('ai-openai')).toBe(true);
  });
});
