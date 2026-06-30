import { FeatureIndex } from '@/components/features/feature-index'

export const metadata = { title: 'Solutions — Riscly' }

export default function SolutionsPage() {
  return (
    <FeatureIndex
      category="solutions"
      base="/solutions"
      title="Solutions"
      lead="Riscly for your team and your goals."
    />
  )
}
