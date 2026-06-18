import { describe, it, expect } from 'vitest';
import { vulnerabilitiesToFindings, maxVulnSeverity, DependencyVulnerability } from './vulnerabilities';
import { buildSystemGraph } from './scanner';

const vuln: DependencyVulnerability = {
  id: 'GHSA-aaa', package: 'lodash', version: '4.17.20', ecosystem: 'npm',
  severity: 'high', summary: 'Prototype pollution', fixedVersion: '4.17.21', repo: 'acme/web',
};

describe('vulnerabilitiesToFindings', () => {
  it('maps a vulnerability to a security finding with severity-weighted penalty', () => {
    const [f] = vulnerabilitiesToFindings([vuln]);
    expect(f.category).toBe('security');
    expect(f.severity).toBe('high');
    expect(f.title).toContain('lodash@4.17.20');
    expect(f.description).toContain('Fixed in 4.17.21');
    expect(f.weight).toBeGreaterThan(0);
  });

  it('reports the most severe level present', () => {
    expect(maxVulnSeverity([{ ...vuln, severity: 'low' }, vuln])).toBe('high');
    expect(maxVulnSeverity([])).toBeUndefined();
  });
});

describe('buildSystemGraph carries repo vulnerabilities', () => {
  it('aggregates per-repo vulnerabilities onto the graph', () => {
    const graph = buildSystemGraph({
      repos: [{ provider: 'github', repo: 'acme/web', dependencies: ['lodash'], vulnerabilities: [vuln] }],
    });
    expect(graph.vulnerabilities).toEqual([vuln]);
  });

  it('omits the field entirely when there are no vulnerabilities', () => {
    const graph = buildSystemGraph({
      repos: [{ provider: 'github', repo: 'acme/web', dependencies: ['lodash'] }],
    });
    expect(graph.vulnerabilities).toBeUndefined();
  });
});
