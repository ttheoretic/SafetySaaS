import { FeatureIndex } from '@/components/features/feature-index'

export const metadata = { title: 'Platform — Riscly' }

export default function FeaturesPage() {
  return (
    <FeatureIndex
      category="platform"
      base="/features"
      title="Platform"
      lead="Everything Riscly does, in one place."
    />
  )
}
