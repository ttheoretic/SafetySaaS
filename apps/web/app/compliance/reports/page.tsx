import { ComingSoon } from '@/components/ui/coming-soon'

export default function ReportsPage() {
  return (
    <ComingSoon
      title="Reports & Export"
      subtitle="Share posture with anyone"
      summary="Generate the artifacts stakeholders and auditors need — in the formats their tools expect."
      willInclude={[
        'Executive PDF posture reports',
        'SARIF export (GitHub Security tab compatible)',
        'CycloneDX / SPDX SBOM export',
        'Scheduled reports to email / Slack',
      ]}
      phase="Roadmap Phase 6 (reporting)"
    />
  )
}
