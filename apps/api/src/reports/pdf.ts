/**
 * Minimal, dependency-free PDF writer for reports.
 *
 * Lays out a FailSafe AI `Report` as a paginated A4 document using the
 * standard Helvetica fonts (no embedding needed), and emits valid PDF bytes.
 * This keeps the report pipeline self-contained; a production build can swap in
 * a headless-Chrome renderer for richer styling without changing the report
 * content model.
 */

import type { Report } from '@failsafe/shared';

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 56;
const BODY_SIZE = 10;
const HEADING_SIZE = 14;
const TITLE_SIZE = 20;

interface Op {
  text: string;
  x: number;
  y: number;
  size: number;
  bold: boolean;
}

export function renderReportPdf(report: Report): Buffer {
  const pages: Op[][] = [];
  let current: Op[] = [];
  let y = PAGE_H - MARGIN;

  const newPage = () => {
    pages.push(current);
    current = [];
    y = PAGE_H - MARGIN;
  };
  const ensure = (lineHeight: number) => {
    if (y - lineHeight < MARGIN) newPage();
  };
  const write = (text: string, size: number, bold: boolean, indent = 0) => {
    const maxChars = Math.floor((PAGE_W - 2 * MARGIN - indent) / (size * 0.5));
    for (const line of wrap(sanitize(text), maxChars)) {
      const lh = size * 1.5;
      ensure(lh);
      current.push({ text: line, x: MARGIN + indent, y, size, bold });
      y -= lh;
    }
  };

  write(report.title, TITLE_SIZE, true);
  write(`Generated: ${report.generatedAt}`, BODY_SIZE, false);
  write(
    `Reliability ${report.reliabilityScore}/100   ·   Security ${report.securityScore}/100`,
    BODY_SIZE,
    false,
  );
  y -= 8;

  for (const section of report.sections) {
    y -= 6;
    write(section.heading, HEADING_SIZE, true);
    for (const line of section.lines) {
      const text = line.label ? `[${line.label}] ${line.text}` : line.text;
      write(text, BODY_SIZE, false, 12);
    }
  }
  pages.push(current);

  return assemble(pages);
}

function wrap(text: string, maxChars: number): string[] {
  if (maxChars < 8) maxChars = 8;
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    if (line.length + word.length + 1 > maxChars) {
      if (line) lines.push(line);
      line = word.length > maxChars ? word.slice(0, maxChars) : word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

/** PDF text-string escaping + drop non-Latin1 so the standard font renders. */
function sanitize(text: string): string {
  return text
    .replace(/€/g, 'EUR')
    .replace(/[^\x20-\x7e]/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function assemble(pages: Op[][]): Buffer {
  const objects: string[] = [];
  const fontRegular = '/F1';
  const fontBold = '/F2';

  // Object numbering: 1 catalog, 2 pages, 3 regular font, 4 bold font,
  // then per page: content stream + page object.
  const pageObjNums: number[] = [];
  const contentObjs: string[] = [];
  let nextNum = 5;

  for (const ops of pages) {
    const streamNum = nextNum++;
    const pageNum = nextNum++;
    pageObjNums.push(pageNum);
    const stream = ops
      .map(
        (op) =>
          `BT ${op.bold ? fontBold : fontRegular} ${op.size} Tf ` +
          `${op.x.toFixed(2)} ${op.y.toFixed(2)} Td (${op.text}) Tj ET`,
      )
      .join('\n');
    contentObjs.push(
      `${streamNum} 0 obj\n<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream\nendobj\n`,
    );
    contentObjs.push(
      `${pageNum} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
        `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${streamNum} 0 R >>\nendobj\n`,
    );
  }

  objects.push(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`);
  objects.push(
    `2 0 obj\n<< /Type /Pages /Kids [${pageObjNums
      .map((n) => `${n} 0 R`)
      .join(' ')}] /Count ${pageObjNums.length} >>\nendobj\n`,
  );
  objects.push(
    `3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n`,
  );
  objects.push(
    `4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n`,
  );
  objects.push(...contentObjs);

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += obj;
  }
  const xrefStart = Buffer.byteLength(pdf);
  const count = objects.length + 1;
  pdf += `xref\n0 ${count}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    pdf += `${String(off).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return Buffer.from(pdf, 'latin1');
}
