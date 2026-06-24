import { ComingSoon } from '@/components/ui/coming-soon'

export default function AttackPathsPage() {
  return (
    <ComingSoon
      title="Attack Paths"
      subtitle="Kill-chains through your system graph"
      summary="Riscly's unique edge: not just a list of findings, but how an attacker chains them across your architecture to reach what matters."
      willInclude={[
        'End-to-end exploit chains across services and data stores',
        'Blast-radius ranking by what each path can reach',
        'Choke points where one fix breaks many paths',
        'Tied into the architecture graph and simulation',
      ]}
      phase="Builds on verified infra (Roadmap Phase 3)"
    />
  )
}
