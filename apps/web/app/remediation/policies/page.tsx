import { ComingSoon } from '@/components/ui/coming-soon'

export default function PoliciesPage() {
  return (
    <ComingSoon
      title="Policies"
      subtitle="Guardrails and break-the-build rules"
      summary="Define what is and isn't allowed to ship. Riscly enforces it on every push and pull request."
      willInclude={[
        'Severity thresholds that block merges',
        'Required checks per repository or team',
        'Exceptions with expiry and approval',
        'CI/CD gate integration',
      ]}
      phase="Workflow layer (Roadmap Phase 6)"
    />
  )
}
