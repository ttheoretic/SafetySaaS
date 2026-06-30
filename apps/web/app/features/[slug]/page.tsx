import { FeaturePage } from '@/components/features/feature-page'
import { FEATURES, PLATFORM_SLUGS } from '@/lib/features-content'

export function generateStaticParams() {
  return PLATFORM_SLUGS.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const f = FEATURES[slug]
  return { title: f ? `${f.title} — Riscly` : 'Riscly' }
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <FeaturePage slug={slug} />
}
