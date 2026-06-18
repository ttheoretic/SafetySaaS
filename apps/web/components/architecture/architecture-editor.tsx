'use client';

import { useState } from 'react';
import { Plus, X, RotateCcw, Check, Loader2, Undo2 } from 'lucide-react';
import { applyOverlay, GraphOverlay, NodeKind, SystemNode } from '@riscly/shared';
import { useDashboardStore } from '@/lib/dashboard-store';
import { api } from '@/lib/api';

const KINDS: NodeKind[] = [
  'frontend', 'api', 'service', 'database', 'cache', 'queue', 'external_api', 'cdn', 'dns', 'storage',
];

/**
 * Review & correct the auto-detected architecture. Edits are stored as an
 * overlay (removed / added nodes) that survives re-scans, so a fresh scan
 * refreshes detection without discarding the customer's corrections.
 */
export function ArchitectureEditor() {
  const baseGraph = useDashboardStore((s) => s.baseGraph);
  const overlay = useDashboardStore((s) => s.overlay);
  const projectId = useDashboardStore((s) => s.projectId);
  const setOverlay = useDashboardStore((s) => s.setOverlay);

  const [name, setName] = useState('');
  const [kind, setKind] = useState<NodeKind>('external_api');
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved'>('idle');

  const effective = applyOverlay(baseGraph, overlay);
  const baseIds = new Set(baseGraph.nodes.map((n) => n.id));
  const removedNodes = baseGraph.nodes.filter((n) => (overlay.removedNodeIds ?? []).includes(n.id));

  function persist(next: GraphOverlay) {
    setOverlay(next);
    if (!projectId) return; // demo / no project — local only
    setSaving('saving');
    api.updateArchitectureOverlay(projectId, next)
      .then(() => setSaving('saved'))
      .catch(() => setSaving('idle'));
  }

  function removeNode(id: string) {
    if (baseIds.has(id)) {
      persist({ ...overlay, removedNodeIds: [...new Set([...(overlay.removedNodeIds ?? []), id])] });
    } else {
      persist({ ...overlay, addedNodes: (overlay.addedNodes ?? []).filter((n) => n.id !== id) });
    }
  }

  function restoreNode(id: string) {
    persist({ ...overlay, removedNodeIds: (overlay.removedNodeIds ?? []).filter((x) => x !== id) });
  }

  function addNode() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const id = `custom-${trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Math.random().toString(36).slice(2, 6)}`;
    const node: SystemNode = { id, kind, name: trimmed };
    persist({ ...overlay, addedNodes: [...(overlay.addedNodes ?? []), node] });
    setName('');
  }

  const dirty =
    (overlay.removedNodeIds?.length ?? 0) > 0 || (overlay.addedNodes?.length ?? 0) > 0;
  const addedIds = new Set((overlay.addedNodes ?? []).map((n) => n.id));

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Review detected architecture</h3>
          <p className="text-xs text-muted-foreground">
            Remove anything detected wrongly, or add what we missed. Saved per project; re-scans keep your edits.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saving === 'saving' && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
          {saving === 'saved' && <span className="inline-flex items-center gap-1 text-xs text-success"><Check className="size-3.5" /> Saved</span>}
          {dirty && (
            <button
              onClick={() => persist({})}
              className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="size-3.5" /> Reset to detected
            </button>
          )}
        </div>
      </div>

      {!projectId && (
        <p className="border-b border-border bg-warning/5 px-4 py-2 text-xs text-warning">
          You’re viewing demo data — select your project in the top bar to save edits.
        </p>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <ul className="space-y-1.5">
          {effective.nodes.map((n) => (
            <li key={n.id} className="flex items-center justify-between gap-2 rounded-md border border-border bg-surface px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-foreground">{n.name}</span>
                <span className="rounded bg-elevated px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                  {n.kind.replace(/_/g, ' ')}
                </span>
                {addedIds.has(n.id) && (
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">added</span>
                )}
              </div>
              <button
                onClick={() => removeNode(n.id)}
                title="Remove"
                className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>

        {removedNodes.length > 0 && (
          <div className="mt-3">
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Removed</p>
            <ul className="space-y-1.5">
              {removedNodes.map((n) => (
                <li key={n.id} className="flex items-center justify-between gap-2 rounded-md border border-dashed border-border px-3 py-2 opacity-70">
                  <span className="text-sm text-muted-foreground line-through">{n.name}</span>
                  <button
                    onClick={() => restoreNode(n.id)}
                    title="Restore"
                    className="inline-flex items-center gap-1 rounded p-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Undo2 className="size-3.5" /> Restore
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Add a missing module/tool */}
      <div className="border-t border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addNode(); }}
            placeholder="Add a missing module or tool…"
            className="h-9 flex-1 rounded-md border border-border bg-secondary px-3 text-sm text-foreground outline-none focus:border-primary"
          />
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as NodeKind)}
            className="h-9 rounded-md border border-border bg-secondary px-2 text-sm text-foreground outline-none focus:border-primary"
          >
            {KINDS.map((k) => <option key={k} value={k}>{k.replace(/_/g, ' ')}</option>)}
          </select>
          <button
            onClick={addNode}
            disabled={!name.trim()}
            className="inline-flex h-9 items-center gap-1 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            <Plus className="size-4" /> Add
          </button>
        </div>
      </div>
    </div>
  );
}
