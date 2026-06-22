'use client'

import { useRouter } from 'next/navigation'
import { ScanLine, FlaskConical, Loader2 } from 'lucide-react'
import { ScreenHeader, ActionButton } from '@/components/layout/screen-header'
import {
  useActiveProject,
  useRunScan,
  useScanMeta,
} from '@/lib/use-project-data'

/** Overview header with a live "last scan" subtitle and working actions. */
export function OverviewHeader() {
  const router = useRouter()
  const { project } = useActiveProject()
  const { lastScanLabel } = useScanMeta()
  const { run, isScanning, canScan } = useRunScan()

  const subtitle = project
    ? `${project.name} · last scan ${lastScanLabel}`
    : 'No repository connected — finish onboarding to scan your stack'

  return (
    <ScreenHeader
      title="Overview"
      subtitle={subtitle}
      actions={
        <>
          <ActionButton onClick={run} disabled={!canScan || isScanning}>
            {isScanning ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <ScanLine className="size-3.5" />
            )}
            {isScanning ? 'Scanning…' : 'Run scan'}
          </ActionButton>
          <ActionButton variant="primary" onClick={() => router.push('/simulation')}>
            <FlaskConical className="size-3.5" />
            Run simulation
          </ActionButton>
        </>
      }
    />
  )
}
