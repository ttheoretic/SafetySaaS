/**
 * Turning a SystemGraph into the architecture canvas.
 *
 * Kept out of the page component because two very different surfaces draw
 * the same picture: the signed-in Architecture view and the public preview.
 * They must agree — the graph a visitor sees before signing up is the graph
 * they get afterwards.
 */

import type { NodeKind, SystemGraph } from '@riscly/shared'
import type { Edge, ServiceNode, Severity } from './riscly-data'

/** A finding as the API returns it — only the fields the layout needs. */
export interface LayoutFinding {
  severity?: string
  nodeId?: string
}

/** Maps an API NodeKind onto the graph's visual type + a human tech label. */
const KIND_MAP: Record<
  NodeKind,
  { type: ServiceNode['type']; tech: string }
> = {
  frontend: { type: 'external', tech: 'Web client' },
  api: { type: 'gateway', tech: 'API' },
  service: { type: 'service', tech: 'Service' },
  database: { type: 'database', tech: 'Database' },
  cache: { type: 'database', tech: 'Cache' },
  queue: { type: 'queue', tech: 'Queue' },
  external_api: { type: 'external', tech: 'External API' },
  cdn: { type: 'external', tech: 'CDN' },
  dns: { type: 'external', tech: 'DNS' },
  storage: { type: 'database', tech: 'Storage' },
  ai_model: { type: 'ai', tech: 'AI model' },
  ai_agent: { type: 'ai', tech: 'AI agent' },
  vector_store: { type: 'ai', tech: 'Vector store' },
}

/** Which layout column a kind belongs to: 0=edge/clients, 1=services,
 *  2=dependencies (datastores + external APIs the services call). */
const KIND_COLUMN: Record<NodeKind, number> = {
  frontend: 0,
  cdn: 0,
  dns: 0,
  api: 1,
  service: 1,
  database: 2,
  cache: 2,
  queue: 2,
  storage: 2,
  // External third-party APIs (Stripe, Anthropic, …) are dependencies the
  // services call — place them with the data tier, not next to the API node.
  external_api: 2,
  // Agents sit in the service tier (they run your code); models and vector
  // stores are dependencies those agents call.
  ai_agent: 1,
  ai_model: 2,
  vector_store: 2,
}

const SEV_RANK: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

function worstSeverity(findings: LayoutFinding[]): Severity | 'ok' {
  let best: Severity | 'ok' = 'ok'
  for (const f of findings) {
    const s = (f.severity ?? '').toLowerCase() as Severity
    if (!(s in SEV_RANK)) continue
    if (best === 'ok' || SEV_RANK[s] < SEV_RANK[best]) best = s
  }
  return best
}

// Layout constants matching the graph's coordinate space (W=150, H=56).
const COL_X = [80, 460, 840]
const ROW_TOP = 60
const ROW_GAP = 100

/** Transform the real API graph + findings into ServiceNode[] + Edge[] with a
 *  deterministic layered layout (columns by kind, rows stacked within column). */
export function buildGraphData(
  graph: SystemGraph,
  findings: LayoutFinding[],
): { nodes: ServiceNode[]; edges: Edge[] } {
  // Group findings per node id for severity / riskCount.
  const byNode = new Map<string, LayoutFinding[]>()
  for (const f of findings) {
    if (!f.nodeId) continue
    const arr = byNode.get(f.nodeId) ?? []
    arr.push(f)
    byNode.set(f.nodeId, arr)
  }

  // Assign each node to a column, then stack them within the column.
  const colCounts = [0, 0, 0]
  const nodes: ServiceNode[] = graph.nodes.map((n) => {
    const map = KIND_MAP[n.kind] ?? {
      type: 'service' as const,
      tech: String(n.kind),
    }
    const col = KIND_COLUMN[n.kind] ?? 1
    const row = colCounts[col]++
    const nodeFindings = byNode.get(n.id) ?? []
    return {
      id: n.id,
      label: n.name,
      type: map.type,
      tech: map.tech,
      x: COL_X[col],
      y: ROW_TOP + row * ROW_GAP,
      severity: worstSeverity(nodeFindings),
      riskCount: nodeFindings.length,
    }
  })

  // Vertically center each column so the layout looks balanced.
  const maxRows = Math.max(1, ...colCounts)
  const byCol: Record<number, ServiceNode[]> = { 0: [], 1: [], 2: [] }
  nodes.forEach((node, i) => byCol[KIND_COLUMN[graph.nodes[i].kind] ?? 1].push(node))
  for (const col of [0, 1, 2]) {
    const list = byCol[col]
    const offset = ((maxRows - list.length) * ROW_GAP) / 2
    list.forEach((node) => (node.y += offset))
  }

  // Severity of an edge = worst of its two endpoints' severities.
  const sevById = new Map(nodes.map((n) => [n.id, n.severity]))
  const edgeSev = (a: string, b: string): Severity | 'ok' => {
    const sa = sevById.get(a) ?? 'ok'
    const sb = sevById.get(b) ?? 'ok'
    if (sa === 'ok') return sb
    if (sb === 'ok') return sa
    return SEV_RANK[sa] <= SEV_RANK[sb] ? sa : sb
  }
  const edges: Edge[] = graph.edges.map((e) => ({
    from: e.from,
    to: e.to,
    severity: edgeSev(e.from, e.to),
  }))

  return { nodes, edges }
}
