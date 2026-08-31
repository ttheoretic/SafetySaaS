import { describe, it, expect } from 'vitest';
import { analyzeAi } from './ai-audit';

const file = (path: string, content: string) => ({ path, content });
const rules = (r: ReturnType<typeof analyzeAi>) => r.issues.map((i) => i.rule);

describe('analyzeAi — discovery', () => {
  it('finds nothing in a repo that does not use AI', () => {
    const r = analyzeAi([
      file('src/app.ts', "import express from 'express';\nconst app = express();"),
    ]);
    expect(r.components).toEqual([]);
    expect(r.issues).toEqual([]);
  });

  it('identifies the model provider from an import', () => {
    const r = analyzeAi([file('src/llm.ts', "import Anthropic from '@anthropic-ai/sdk';")]);
    expect(r.components).toHaveLength(1);
    expect(r.components[0]).toMatchObject({ kind: 'ai_model', name: 'Anthropic', provider: 'anthropic' });
    expect(r.components[0].files).toEqual(['src/llm.ts']);
  });

  it('identifies a vector store and an agent', () => {
    const r = analyzeAi([
      file(
        'src/agent.ts',
        `import OpenAI from 'openai';
         import { PineconeClient } from '@pinecone-database/pinecone';
         const res = await client.chat.completions.create({ tools: [ { name: 'search' } ] });`,
      ),
    ]);
    const kinds = r.components.map((c) => c.kind).sort();
    expect(kinds).toEqual(['ai_agent', 'ai_model', 'vector_store']);
  });

  it('merges the same provider seen in several files', () => {
    const r = analyzeAi([
      file('a.ts', "import OpenAI from 'openai';"),
      file('b.ts', "import OpenAI from 'openai';"),
    ]);
    expect(r.components).toHaveLength(1);
    expect(r.components[0].files).toEqual(['a.ts', 'b.ts']);
  });

  it('does not call plain model usage an agent', () => {
    const r = analyzeAi([
      file('src/llm.ts', "import OpenAI from 'openai';\nawait c.chat.completions.create({ messages });"),
    ]);
    expect(r.components.some((c) => c.kind === 'ai_agent')).toBe(false);
  });
});

describe('analyzeAi — rules', () => {
  it('flags a committed Anthropic key and never echoes it back', () => {
    const key = 'sk-ant-api03-ABCDEFGHIJKLMNOPQRSTUVWXYZ012345';
    const r = analyzeAi([file('src/config.ts', `const k = "${key}";`)]);
    const issue = r.issues.find((i) => i.rule === 'ai/leaked-anthropic-key');
    expect(issue?.severity).toBe('critical');
    expect(issue?.snippet).not.toContain(key);
    expect(issue?.snippet).toContain('redacted');
  });

  it('flags model output reaching an execution sink', () => {
    const r = analyzeAi([
      file(
        'src/agent.ts',
        `import OpenAI from 'openai';
         const response = await llm.call(p);
         eval(response.output);`,
      ),
    ]);
    expect(rules(r)).toContain('ai/unsafe-output-execution');
  });

  it('flags model output used to build a query', () => {
    const r = analyzeAi([
      file(
        'src/db.ts',
        `import Anthropic from '@anthropic-ai/sdk';
         await db.query(completion.content);`,
      ),
    ]);
    expect(rules(r)).toContain('ai/model-generated-sql');
  });

  it('flags untrusted input interpolated into a prompt', () => {
    const r = analyzeAi([
      file(
        'src/chat.ts',
        'import OpenAI from "openai";\nconst prompt = `Answer this: ${req.body.question}`;',
      ),
    ]);
    expect(rules(r)).toContain('ai/prompt-injection-surface');
  });

  it('flags credentials placed into a prompt', () => {
    const r = analyzeAi([
      file('src/chat.ts', 'import OpenAI from "openai";\nconst content = `token: ${apiKey}`;'),
    ]);
    expect(rules(r)).toContain('ai/sensitive-data-in-prompt');
  });

  it('flags a destructive agent tool', () => {
    const r = analyzeAi([
      file(
        'src/tools.ts',
        `import OpenAI from 'openai';
         const tools = [ { name: 'delete_customer', description: 'removes a customer' } ];`,
      ),
    ]);
    expect(rules(r)).toContain('ai/excessive-agency');
  });

  it('keeps AI rules out of files that have nothing to do with AI', () => {
    const r = analyzeAi([file('src/util.ts', 'const prompt = `Hello ${req.body.name}`;')]);
    expect(r.issues).toEqual([]);
  });

  it('tags every finding as heuristic and locates it to a line', () => {
    const r = analyzeAi([
      file('src/chat.ts', 'import OpenAI from "openai";\n\nconst prompt = `x ${req.body.q}`;'),
    ]);
    expect(r.issues.length).toBeGreaterThan(0);
    for (const i of r.issues) {
      expect(i.confidence).toBe('heuristic');
      expect(i.line).toBeGreaterThan(0);
      expect(i.file).toBe('src/chat.ts');
    }
  });

  it('caps repeated matches of the same rule in one file', () => {
    const line = 'const prompt = `${req.body.q}`;\n';
    const r = analyzeAi([file('src/chat.ts', 'import OpenAI from "openai";\n' + line.repeat(20))]);
    const hits = r.issues.filter((i) => i.rule === 'ai/prompt-injection-surface');
    expect(hits.length).toBeLessThanOrEqual(3);
  });
});
