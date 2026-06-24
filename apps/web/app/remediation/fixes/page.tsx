import { ComingSoon } from '@/components/ui/coming-soon'

export default function FixesPage() {
  return (
    <ComingSoon
      title="Fixes & PRs"
      subtitle="AI remediation, tracked end-to-end"
      summary="Every AI-proposed fix and remediation PR in one place, with status from suggested to merged."
      willInclude={[
        'Generated code fixes with before/after diff',
        'One-click remediation pull requests',
        'PR status tracking through to merge',
        'Verification that the fix closed the finding',
      ]}
      phase="Extends the existing AI fix + remediation-PR engine"
    />
  )
}
