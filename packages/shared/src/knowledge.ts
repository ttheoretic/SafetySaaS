/**
 * Knowledge base for recommendation grounding ("RAG" over a curated corpus).
 *
 * Instead of an external vector store, each finding category retrieves curated
 * references to recognized standards and best-practice guidance. This keeps
 * recommendations grounded and citable, deterministically and offline; a
 * production deployment can swap this for an embedding-backed retriever behind
 * the same `referencesFor` interface.
 */

import { FindingCategory } from './findings';

export interface KnowledgeRef {
  title: string;
  source: string; // e.g. "OWASP", "AWS Well-Architected", "Google SRE"
  url: string;
}

export const KNOWLEDGE: Record<FindingCategory, KnowledgeRef[]> = {
  spof: [
    { title: 'Reliability Pillar — eliminate single points of failure', source: 'AWS Well-Architected', url: 'https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/welcome.html' },
    { title: 'Redundancy & failover patterns', source: 'Google SRE Book', url: 'https://sre.google/sre-book/availability-table/' },
  ],
  database: [
    { title: 'Read replicas & connection pooling', source: 'AWS Well-Architected', url: 'https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/rel_planning_network_topology.html' },
    { title: 'Scaling a relational database', source: 'PostgreSQL Docs', url: 'https://www.postgresql.org/docs/current/high-availability.html' },
  ],
  backup: [
    { title: 'Backup & point-in-time recovery', source: 'AWS Well-Architected', url: 'https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/rel_backing_up_data.html' },
    { title: 'Test your restores', source: 'Google SRE Book', url: 'https://sre.google/sre-book/data-integrity/' },
  ],
  rate_limit: [
    { title: 'API4:2023 — Unrestricted Resource Consumption', source: 'OWASP API Security Top 10', url: 'https://owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/' },
    { title: 'Rate limiting strategies', source: 'Cloudflare Learning', url: 'https://www.cloudflare.com/learning/bots/what-is-rate-limiting/' },
  ],
  redundancy: [
    { title: 'Designing for redundancy', source: 'AWS Well-Architected', url: 'https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/rel_fault_isolation_multiaz_region_system.html' },
  ],
  security: [
    { title: 'OWASP Top 10', source: 'OWASP', url: 'https://owasp.org/www-project-top-ten/' },
    { title: 'CIS Critical Security Controls', source: 'CIS', url: 'https://www.cisecurity.org/controls' },
  ],
  api: [
    { title: 'API Security Best Practices', source: 'OWASP API Security', url: 'https://owasp.org/API-Security/' },
  ],
  vendor_lock_in: [
    { title: 'Avoiding vendor lock-in', source: 'CNCF', url: 'https://www.cncf.io/blog/2022/04/13/avoiding-vendor-lock-in/' },
  ],
};

export function referencesFor(category: FindingCategory): KnowledgeRef[] {
  return KNOWLEDGE[category] ?? [];
}
