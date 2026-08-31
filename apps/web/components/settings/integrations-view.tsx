'use client'

import { ScreenHeader } from '@/components/layout/screen-header'
import { IntegrationsPanel } from './settings-view'

/**
 * Integrations as a destination of its own.
 *
 * Connecting a source is how the risk model gets more accurate, so it belongs
 * in the main navigation rather than buried in Settings. The panel itself is
 * the one Settings already renders — same component, no second copy.
 */
export function IntegrationsView() {
  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        title="Integrations"
        subtitle="Every connected source makes the architecture and risk model more accurate"
      />
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-3xl">
          <IntegrationsPanel />
        </div>
      </div>
    </div>
  )
}
