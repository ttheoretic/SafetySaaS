import * as ts from 'typescript';
import type { CodeIssue, Severity } from '@riscly/shared';

/**
 * AST-based static analysis for JavaScript / TypeScript. Unlike the line-regex
 * pass, this parses the file and reasons about structure, so it only flags
 * genuinely dynamic dangerous calls — `eval(userInput)`, not `eval("2+2")` — and
 * SQL built from interpolation, not any line that merely mentions SELECT. That
 * sharply cuts false positives, so its findings carry `confidence: 'high'`.
 *
 * Bounded and dependency-light (uses the TypeScript compiler already in the
 * toolchain); a parse failure yields no issues so it never breaks a scan.
 */

const SQL_SINKS = new Set(['query', 'execute', 'raw', 'prepare', 'exec']);
const SHELL_SINKS = new Set(['exec', 'execSync', 'spawn', 'spawnSync']);
const SQL_KEYWORD = /\b(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|DROP|UNION)\b/i;

const JS_EXT = new Set(['js', 'jsx', 'mjs', 'cjs', 'ts', 'tsx']);

export function isJsLike(path: string): boolean {
  return JS_EXT.has(path.split('.').pop()?.toLowerCase() ?? '');
}

/** Rule ids the AST pass owns — the regex pass should skip these for JS/TS to
 *  avoid duplicate, lower-confidence findings. */
export const AST_OWNED_RULES = new Set(['js/eval', 'js/new-function', 'js/sql-injection']);

function scriptKindFor(path: string): ts.ScriptKind {
  const ext = path.split('.').pop()?.toLowerCase();
  if (ext === 'tsx' || ext === 'jsx') return ts.ScriptKind.TSX;
  if (ext === 'ts') return ts.ScriptKind.TS;
  return ts.ScriptKind.JS;
}

/** A string literal or a template with no `${}` — i.e. a constant, safe value. */
function isConstantString(node: ts.Node): boolean {
  return ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node);
}

/** Does this argument look like attacker-influenced SQL (interpolation/concat
 *  involving SQL keywords)? */
function isDynamicSql(arg: ts.Node): boolean {
  if (ts.isTemplateExpression(arg)) {
    // Template with ${...} substitutions; flag when the static text is SQL.
    const text = arg.getText();
    return SQL_KEYWORD.test(text);
  }
  if (ts.isBinaryExpression(arg) && arg.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    return SQL_KEYWORD.test(arg.getText());
  }
  return false;
}

function calleeName(node: ts.CallExpression): string | undefined {
  const e = node.expression;
  if (ts.isIdentifier(e)) return e.text;
  if (ts.isPropertyAccessExpression(e)) return e.name.text;
  return undefined;
}

export function analyzeJsAst(path: string, content: string): CodeIssue[] {
  if (!isJsLike(path) || content.length === 0) return [];
  let sf: ts.SourceFile;
  try {
    sf = ts.createSourceFile(path, content, ts.ScriptTarget.Latest, true, scriptKindFor(path));
  } catch {
    return [];
  }
  const lines = content.split('\n');
  const issues: CodeIssue[] = [];
  const seen = new Set<string>();

  const add = (node: ts.Node, rule: string, severity: Severity, title: string, description: string) => {
    const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
    const id = `${rule}:${path}:${line}`;
    if (seen.has(id)) return;
    seen.add(id);
    issues.push({
      id,
      file: path,
      line,
      rule,
      severity,
      title,
      description,
      snippet: (lines[line - 1] ?? '').trim().slice(0, 200),
      confidence: 'high',
    });
  };

  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const name = calleeName(node);
      const arg0 = node.arguments[0];

      if (name === 'eval' && ts.isIdentifier(node.expression) && arg0 && !isConstantString(arg0)) {
        add(node, 'js/eval', 'high', 'Dynamic code execution via eval()', 'eval() is called with a non-constant argument, so attacker-controlled input could be executed as code. Replace it with explicit logic or a safe parser.');
      }

      if (name && SHELL_SINKS.has(name) && ts.isPropertyAccessExpression(node.expression) && arg0 && !isConstantString(arg0)) {
        add(node, 'js/command-injection', 'high', 'Possible command injection', `A shell command (${name}) is built from a non-constant value. Pass arguments as an array and never interpolate untrusted input into a shell string.`);
      }

      if (name && SQL_SINKS.has(name) && arg0 && isDynamicSql(arg0)) {
        add(node, 'js/sql-injection', 'high', 'Possible SQL injection', 'A SQL statement is assembled by string interpolation/concatenation. Use parameterized queries / prepared statements instead.');
      }
    }

    if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'Function') {
      const args = node.arguments ?? ([] as unknown as ts.NodeArray<ts.Expression>);
      if ([...args].some((a) => !isConstantString(a))) {
        add(node, 'js/new-function', 'high', 'Dynamic code via new Function()', 'new Function() builds a function from a non-constant string — equivalent to eval(). Avoid constructing functions from dynamic input.');
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sf);
  return issues;
}
