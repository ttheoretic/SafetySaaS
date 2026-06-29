/** Shared navigation tree for the docs sidebar and prev/next links. */
export type DocLink = { title: string; href: string }
export type DocGroup = { title: string; links: DocLink[] }

export const DOCS_NAV: DocGroup[] = [
  {
    title: 'Get started',
    links: [
      { title: 'Introduction', href: '/docs' },
      { title: 'Quickstart', href: '/docs/quickstart' },
      { title: 'Authentication', href: '/docs/authentication' },
    ],
  },
  {
    title: 'Guides',
    links: [
      { title: 'Connect a repository', href: '/docs/guides/connect' },
      { title: 'Scanning & the map', href: '/docs/guides/scanning' },
      { title: 'Risks & one-click fixes', href: '/docs/guides/fixes' },
      { title: 'Reliability & simulation', href: '/docs/guides/reliability' },
    ],
  },
  {
    title: 'API reference',
    links: [
      { title: 'Overview', href: '/docs/api' },
      { title: 'Projects', href: '/docs/api/projects' },
      { title: 'Scans', href: '/docs/api/scans' },
      { title: 'Code & fixes', href: '/docs/api/code' },
      { title: 'Connections', href: '/docs/api/connections' },
      { title: 'Analysis', href: '/docs/api/analysis' },
      { title: 'Billing', href: '/docs/api/billing' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { title: 'Data & security', href: '/docs/security' },
      { title: 'FAQ', href: '/docs/faq' },
    ],
  },
]

/** Flattened order, used to compute previous/next page links. */
export const DOCS_FLAT: DocLink[] = DOCS_NAV.flatMap((g) => g.links)

export function adjacentDocs(href: string): { prev?: DocLink; next?: DocLink } {
  const i = DOCS_FLAT.findIndex((l) => l.href === href)
  if (i === -1) return {}
  return { prev: DOCS_FLAT[i - 1], next: DOCS_FLAT[i + 1] }
}
