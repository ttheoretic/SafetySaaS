import { describe, it, expect } from 'vitest';
import { analyzeJsAst } from './ast-audit';

const rules = (code: string, file = 'a.ts') => analyzeJsAst(file, code).map((i) => i.rule);

describe('analyzeJsAst', () => {
  it('flags eval with a dynamic argument', () => {
    expect(rules('const x = req.query.code; eval(x);')).toContain('js/eval');
  });

  it('does NOT flag eval with a constant string (regex would)', () => {
    expect(rules('eval("2 + 2");')).not.toContain('js/eval');
  });

  it('flags command execution built from a non-constant', () => {
    const code = 'import cp from "child_process"; cp.exec("ls " + userInput);';
    expect(rules(code)).toContain('js/command-injection');
  });

  it('does not flag a constant shell command', () => {
    expect(rules('cp.execSync("ls -la");')).not.toContain('js/command-injection');
  });

  it('flags SQL built by template interpolation', () => {
    const code = 'db.query(`SELECT * FROM users WHERE id = ${id}`);';
    expect(rules(code)).toContain('js/sql-injection');
  });

  it('does not flag a parameterized query', () => {
    const code = 'db.query("SELECT * FROM users WHERE id = $1", [id]);';
    expect(rules(code)).not.toContain('js/sql-injection');
  });

  it('flags new Function() from a dynamic string', () => {
    expect(rules('const f = new Function(body);')).toContain('js/new-function');
  });

  it('tags findings with high confidence and a line', () => {
    const issues = analyzeJsAst('a.ts', '\nconst x = a; eval(x);');
    expect(issues[0].confidence).toBe('high');
    expect(issues[0].line).toBe(2);
  });

  it('returns nothing for non-JS files', () => {
    expect(analyzeJsAst('main.py', 'eval(x)')).toHaveLength(0);
  });
});
