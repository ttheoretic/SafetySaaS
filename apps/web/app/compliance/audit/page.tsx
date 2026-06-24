import { ComingSoon } from '@/components/ui/coming-soon'

export default function AuditLogPage() {
  return (
    <ComingSoon
      title="Audit Log"
      subtitle="Who did what, when"
      summary="An immutable trail of every action — required for enterprise governance and compliance reviews."
      willInclude={[
        'User and system actions with timestamps',
        'Scan, connection and remediation events',
        'Filter and export for auditors',
        'Retention controls',
      ]}
      phase="Roadmap Phase 6 (governance)"
    />
  )
}
