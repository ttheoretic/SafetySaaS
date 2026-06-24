import { ComingSoon } from '@/components/ui/coming-soon'

export default function CloudResourcesPage() {
  return (
    <ComingSoon
      title="Cloud Resources"
      subtitle="Verified infrastructure inventory"
      summary="Read your real cloud configuration — not guessed from code. Every resource, its exposure and its true settings."
      willInclude={[
        'AWS / GCP / Azure resources via read-only roles',
        'Security groups, public exposure, encryption status',
        'Supabase / Postgres schema, RLS and roles',
        'Drift detection when config changes',
      ]}
      phase="Roadmap Phase 3 (verified infra collectors)"
    />
  )
}
