import { ComingSoon } from '@/components/ui/coming-soon'

export default function FrameworksPage() {
  return (
    <ComingSoon
      title="Frameworks"
      subtitle="SOC 2 · ISO 27001 · PCI · EU-CRA"
      summary="Map your findings and controls to the frameworks auditors ask about, with continuous evidence instead of a once-a-year scramble."
      willInclude={[
        'Control mapping per framework',
        'Continuous coverage status',
        'Gap analysis with prioritized actions',
        'Auditor-ready evidence collection',
      ]}
      phase="Roadmap Phase 6 (compliance)"
    />
  )
}
