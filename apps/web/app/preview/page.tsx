import type { Metadata } from 'next'
import { Navbar } from '@/components/landing-v2/navbar'
import { Footer } from '@/components/landing-v2/footer'
import { PreviewView } from '@/components/preview/preview-view'

export const metadata: Metadata = {
  title: 'Map your architecture — Riscly',
  description:
    'Paste a public GitHub repository and see its architecture mapped in seconds. No account needed.',
}

export default function PreviewPage() {
  return (
    <>
      <Navbar />
      <PreviewView />
      <Footer />
    </>
  )
}
