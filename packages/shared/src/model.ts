/**
 * The system model the engines reason over.
 *
 * A scanned system is a directed dependency graph. The richer the scanner
 * populates these attributes, the better the analysis. Everything is plain
 * data — no I/O — so the engines stay pure and deterministic.
 */

export type NodeKind =
  | 'frontend'
  | 'api'
  | 'service'
  | 'database'
  | 'cache'
  | 'queue'
  | 'external_api'
  | 'cdn'
  | 'dns'
  | 'storage';

export type ProviderId =
  | 'github'
  | 'gitlab'
  | 'bitbucket'
  | 'aws'
  | 'azure'
  | 'gcp'
  | 'vercel'
  | 'railway'
  | 'render'
  | 'supabase'
  | 'neon'
  | 'stripe'
  | 'openai'
  | 'cloudflare'
  | 'self';

export interface SystemNode {
  id: string;
  kind: NodeKind;
  name: string;
  provider?: ProviderId;
  region?: string;
  /** Has more than one instance / replica. */
  redundant?: boolean;
  /** Backups configured (mainly relevant for databases / storage). */
  hasBackup?: boolean;
  /** Rate limiting in place (mainly relevant for api / external_api). */
  hasRateLimit?: boolean;
  /** Auth / abuse protection in place. */
  hasAuth?: boolean;
  /** Estimated steady-state load. */
  requestsPerMinute?: number;
  /** Whether failure of this node takes the whole system down. Usually
   *  derived by the scanner, but may be provided explicitly. */
  isSinglePointOfFailure?: boolean;
}

export interface SystemEdge {
  from: string;
  to: string;
  /** 0..1 — how critical this dependency is to the source node. */
  criticality?: number;
}

/** A resolved dependency component (for the SBOM). */
export interface ComponentRef {
  name: string;
  version: string;
  ecosystem: string;
}

export interface SystemGraph {
  nodes: SystemNode[];
  edges: SystemEdge[];
  /** Known dependency vulnerabilities (SCA), when the scanner read the code.
   *  Optional so topology-only graphs and the demo remain unaffected. */
  vulnerabilities?: import('./vulnerabilities').DependencyVulnerability[];
  /** Full resolved dependency set (SBOM) — every direct & transitive package. */
  components?: ComponentRef[];
  /** Code-level security findings (committed secrets, insecure config, …). */
  codeFindings?: import('./findings').Finding[];
  /** Line-located code issues for the code view (file + line + rule + snippet). */
  codeIssues?: import('./findings').CodeIssue[];
}

/** Business context used by the revenue engine. */
export interface BusinessContext {
  /** Monthly recurring revenue, in the smallest reporting currency unit's
   *  base (we use whole currency units, e.g. euros). */
  monthlyRevenue: number;
  /** Active paying users. */
  activeUsers: number;
  /** Fraction of revenue flowing through checkout per hour at peak (0..1). */
  peakCheckoutShare?: number;
  /** SLA credit rate: fraction of monthly bill refunded per hour of breach. */
  slaCreditRatePerHour?: number;
  currency?: string;
}

/** Lookup helpers shared by the engines. */
export function indexNodes(graph: SystemGraph): Map<string, SystemNode> {
  return new Map(graph.nodes.map((n) => [n.id, n]));
}

export function outgoingEdges(graph: SystemGraph, nodeId: string): SystemEdge[] {
  return graph.edges.filter((e) => e.from === nodeId);
}

export function incomingEdges(graph: SystemGraph, nodeId: string): SystemEdge[] {
  return graph.edges.filter((e) => e.to === nodeId);
}
