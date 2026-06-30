import type { QualityHotspot, QualitySummary } from '@riscly/shared';

/**
 * Maintainability analysis — "future-problem" signals.
 *
 * Pure, dependency-free heuristics over a file's text: size, a cyclomatic-style
 * complexity proxy, nesting depth and TODO/FIXME density. These don't find
 * security bugs; they surface code that is hard to change and therefore likely
 * to cause defects or incidents later. Language-agnostic on purpose.
 */

const CODE_EXT = new Set([
  'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'py', 'go', 'rb', 'php', 'java',
  'kt', 'kts', 'cs', 'rs', 'c', 'cc', 'cpp', 'h', 'hpp', 'swift', 'scala', 'vue', 'svelte',
]);

const BRANCH_RE = /\b(if|else if|elif|for|while|case|catch|switch|&&|\|\||\?\?)\b|\?(?=[^.])/g;
const TODO_RE = /\b(TODO|FIXME|HACK|XXX)\b/g;

function isCodeFile(path: string): boolean {
  return CODE_EXT.has(path.split('.').pop()?.toLowerCase() ?? '');
}

/** Score a single file (0..100 risk). Returns null for non-code/empty files. */
export function analyzeFileQuality(path: string, content: string | undefined): QualityHotspot | null {
  if (!content || !isCodeFile(path)) return null;
  const lines = content.split('\n');
  const loc = lines.filter((l) => l.trim().length > 0).length;
  if (loc < 15) return null; // tiny files are never hotspots

  const complexity = (content.match(BRANCH_RE) ?? []).length;
  const todos = (content.match(TODO_RE) ?? []).length;

  // Nesting: running brace depth (for {}-langs) and indentation depth (Python
  // etc.), whichever is larger — a robust language-agnostic proxy.
  let braceDepth = 0;
  let maxBrace = 0;
  let maxIndent = 0;
  for (const line of lines) {
    for (const ch of line) {
      if (ch === '{') braceDepth++;
      else if (ch === '}') braceDepth = Math.max(0, braceDepth - 1);
    }
    maxBrace = Math.max(maxBrace, braceDepth);
    if (line.trim().length > 0) {
      const indent = (line.match(/^[\t ]*/)?.[0] ?? '').replace(/\t/g, '  ').length;
      maxIndent = Math.max(maxIndent, Math.floor(indent / 2));
    }
  }
  const maxNesting = Math.min(12, Math.max(maxBrace, maxIndent));

  const score = Math.min(
    100,
    Math.round(
      Math.min(40, loc / 15) + // size
        Math.min(30, complexity / 3) + // branching
        Math.min(20, Math.max(0, maxNesting - 3) * 4) + // nesting beyond 3
        Math.min(10, todos * 2), // unfinished work
    ),
  );

  const tags: string[] = [];
  if (loc > 400) tags.push('large-file');
  if (complexity > 60) tags.push('high-complexity');
  if (maxNesting > 5) tags.push('deep-nesting');
  if (todos > 0) tags.push('todos');

  return { file: path, loc, complexity, maxNesting, todos, score, tags };
}

/** Rank files into hotspots (top by score) over already-fetched contents. */
export function analyzeQuality(
  contents: Array<{ path: string; content: string | undefined }>,
  limit = 50,
): { hotspots: QualityHotspot[]; summary: QualitySummary } {
  const all = contents
    .map((c) => analyzeFileQuality(c.path, c.content))
    .filter((h): h is QualityHotspot => h !== null);

  const hotspots = [...all].sort((a, b) => b.score - a.score).slice(0, limit);
  const HOTSPOT_THRESHOLD = 40;
  const flagged = all.filter((h) => h.score >= HOTSPOT_THRESHOLD);
  const summary: QualitySummary = {
    filesAnalyzed: all.length,
    avgScore: flagged.length
      ? Math.round(flagged.reduce((s, h) => s + h.score, 0) / flagged.length)
      : 0,
    hotspotCount: flagged.length,
    totalTodos: all.reduce((s, h) => s + h.todos, 0),
    worstFile: hotspots[0]?.file,
  };
  return { hotspots, summary };
}
