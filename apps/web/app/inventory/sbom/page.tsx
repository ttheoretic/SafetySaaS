import { ComingSoon } from '@/components/ui/coming-soon'

export default function SbomPage() {
  return (
    <ComingSoon
      title="Dependencies / SBOM"
      subtitle="Full software bill of materials"
      summary="A complete, exportable inventory of every dependency — direct and transitive — resolved from your real lockfiles."
      willInclude={[
        'Transitive dependency resolution per ecosystem',
        'CycloneDX / SPDX SBOM export',
        'License inventory and policy flags',
        'Reachability: is the vulnerable code actually called?',
      ]}
      phase="Roadmap Phase 2 (SCA + SBOM)"
    />
  )
}
