import { Fragment } from 'react'

/**
 * Tiny, dependency-free Markdown renderer for chat answers. Supports headings,
 * unordered/ordered lists, fenced + inline code, bold/italics and paragraphs —
 * enough to make AI replies read cleanly without pulling in a full MD library.
 */

function renderInline(text: string, keyBase: string) {
  // Split on `code`, **bold**, *italic* while keeping the delimiters.
  const tokens = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean)
  return tokens.map((t, i) => {
    const key = `${keyBase}-${i}`
    if (t.startsWith('`') && t.endsWith('`')) {
      return (
        <code key={key} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">
          {t.slice(1, -1)}
        </code>
      )
    }
    if (t.startsWith('**') && t.endsWith('**')) {
      return <strong key={key}>{t.slice(2, -2)}</strong>
    }
    if (t.startsWith('*') && t.endsWith('*')) {
      return <em key={key}>{t.slice(1, -1)}</em>
    }
    return <Fragment key={key}>{t}</Fragment>
  })
}

export function Markdown({ content }: { content: string }) {
  const lines = content.replace(/\r\n/g, '\n').split('\n')
  const blocks: React.ReactNode[] = []
  let list: { ordered: boolean; items: string[] } | null = null
  let code: string[] | null = null
  let para: string[] = []
  let k = 0

  const flushPara = () => {
    if (para.length) {
      blocks.push(
        <p key={`p-${k++}`} className="leading-relaxed">
          {renderInline(para.join(' '), `p-${k}`)}
        </p>,
      )
      para = []
    }
  }
  const flushList = () => {
    if (list) {
      const Tag = list.ordered ? 'ol' : 'ul'
      blocks.push(
        <Tag key={`l-${k++}`} className={list.ordered ? 'list-decimal pl-5' : 'list-disc pl-5'}>
          {list.items.map((it, i) => (
            <li key={i} className="my-0.5 leading-relaxed">
              {renderInline(it, `li-${k}-${i}`)}
            </li>
          ))}
        </Tag>,
      )
      list = null
    }
  }

  for (const raw of lines) {
    const line = raw

    if (line.trim().startsWith('```')) {
      if (code) {
        blocks.push(
          <pre key={`c-${k++}`} className="overflow-x-auto rounded-md bg-muted p-3 font-mono text-[12px]">
            <code>{code.join('\n')}</code>
          </pre>,
        )
        code = null
      } else {
        flushPara()
        flushList()
        code = []
      }
      continue
    }
    if (code) {
      code.push(line)
      continue
    }

    const heading = line.match(/^(#{1,3})\s+(.*)$/)
    if (heading) {
      flushPara()
      flushList()
      const level = heading[1].length
      const cls = level === 1 ? 'text-base font-semibold' : 'text-sm font-semibold'
      blocks.push(
        <p key={`h-${k++}`} className={`${cls} mt-1`}>
          {renderInline(heading[2], `h-${k}`)}
        </p>,
      )
      continue
    }

    const ol = line.match(/^\s*\d+\.\s+(.*)$/)
    const ul = line.match(/^\s*[-*]\s+(.*)$/)
    if (ol || ul) {
      flushPara()
      const ordered = Boolean(ol)
      if (!list || list.ordered !== ordered) {
        flushList()
        list = { ordered, items: [] }
      }
      list.items.push((ol ?? ul)![1])
      continue
    }

    if (line.trim() === '') {
      flushPara()
      flushList()
      continue
    }
    para.push(line.trim())
  }
  flushPara()
  flushList()
  if (code) {
    blocks.push(
      <pre key={`c-${k++}`} className="overflow-x-auto rounded-md bg-muted p-3 font-mono text-[12px]">
        <code>{code.join('\n')}</code>
      </pre>,
    )
  }

  return <div className="flex flex-col gap-2 text-sm">{blocks}</div>
}
