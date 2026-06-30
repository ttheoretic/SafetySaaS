import { FeaturePage } from '@/components/features/feature-page'
import { FEATURES, SOLUTION_SLUGS } from '@/lib/features-content'

export function generateStaticParams() {
  return SOLUTION_SLUGS.map((slug) => ({ slug }))
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const f = FEATURES[params.slug]
  return { title: f ? `${f.title} — Riscly` : 'Riscly' }
}

export default function Page({ params }: { params: { slug: string } }) {
  return <FeaturePage slug={params.slug} />
}
