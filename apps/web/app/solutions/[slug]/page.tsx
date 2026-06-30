import { SolutionPage } from '@/components/features/solution-page'
import { SOLUTIONS, SOLUTION_SLUGS } from '@/lib/solutions-content'

export function generateStaticParams() {
  return SOLUTION_SLUGS.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const s = SOLUTIONS[slug]
  return { title: s ? `${s.title} — Riscly` : 'Riscly' }
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <SolutionPage slug={slug} />
}
