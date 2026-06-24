import { ComingSoon } from '@/components/ui/coming-soon'

export default function TriagePage() {
  return (
    <ComingSoon
      title="Triage Queue"
      subtitle="Own, assign and resolve findings"
      summary="The workflow layer that turns a list of findings into managed work — the difference between a scanner and a platform a team lives in."
      willInclude={[
        'Assign owners, set status and due dates',
        'Suppress false positives with a recorded reason',
        'SLA timers by severity',
        'Sync to Jira / ServiceNow / Linear',
      ]}
      phase="Workflow layer (Roadmap Phase 6)"
    />
  )
}
