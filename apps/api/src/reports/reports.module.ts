import {
  Controller, Get, Module, NotFoundException, Param, Query, Res, BadRequestException,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  buildReport,
  renderReportText,
  renderReportCsv,
  renderReportXls,
  exampleGraph,
  exampleBusiness,
  Report,
  ReportType,
  SystemGraph,
} from '@riscly/shared';
import { Store, StoreModule } from '../store/store.module';
import { Auth, AuthContext, RequirePermission } from '../auth/auth-context';
import { AuditService } from '../auth/audit.service';
import { renderReportPdf } from './pdf';

const REPORT_TYPES: ReportType[] = [
  'executive', 'cto', 'security', 'full', 'board', 'compliance',
];

@Controller('projects/:projectId/reports')
class ReportsController {
  constructor(
    private readonly store: Store,
    private readonly audit: AuditService,
  ) {}

  /**
   * Generate a report for the project's latest scan.
   * `format` = json (default) | html | pdf.
   */
  @Get(':type')
  @RequirePermission('project:read')
  async generate(
    @Auth() auth: AuthContext,
    @Param('projectId') projectId: string,
    @Param('type') type: string,
    @Query('format') format = 'json',
    @Res() res: Response,
  ) {
    const project = await this.store.getProject(projectId);
    if (!project || project.orgId !== auth.org.id) {
      throw new NotFoundException('Project not found');
    }
    if (!REPORT_TYPES.includes(type as ReportType)) {
      throw new BadRequestException(`Unknown report type: ${type}`);
    }

    const graph = await this.latestGraph(projectId);
    const report = buildReport(graph, exampleBusiness, type as ReportType);
    void this.audit.record(auth, 'report.generate', { type: 'report', id: projectId }, {
      reportType: type,
      format,
    });

    const filename = `${project.slug}-${type}-report`;
    switch (format) {
      case 'pdf': {
        const pdf = renderReportPdf(report);
        res
          .setHeader('Content-Type', 'application/pdf')
          .setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`)
          .send(pdf);
        return;
      }
      case 'html':
        res.setHeader('Content-Type', 'text/html; charset=utf-8').send(renderHtml(report));
        return;
      case 'csv':
        res
          .setHeader('Content-Type', 'text/csv; charset=utf-8')
          .setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`)
          .send(renderReportCsv(report));
        return;
      case 'xls':
      case 'excel':
        res
          .setHeader('Content-Type', 'application/vnd.ms-excel')
          .setHeader('Content-Disposition', `attachment; filename="${filename}.xls"`)
          .send(renderReportXls(report));
        return;
      default:
        res.json(report);
    }
  }

  private async latestGraph(projectId: string): Promise<SystemGraph> {
    const scans = await this.store.listScans(projectId);
    const latest = scans.find((s) => s.status === 'succeeded' && s.graph);
    return (latest?.graph as SystemGraph) ?? exampleGraph;
  }
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const SEVERITY_COLOR: Record<string, string> = {
  critical: '#ef4444',
  high: '#f59e0b',
  medium: '#eab308',
  low: '#94a3b8',
};

function renderHtml(report: Report): string {
  const sections = report.sections
    .map(
      (s) => `
      <section>
        <h2>${esc(s.heading)}</h2>
        <ul>
          ${s.lines
            .map((l) => {
              const color = l.severity ? SEVERITY_COLOR[l.severity] ?? '#334155' : '#334155';
              const label = l.label
                ? `<span style="color:${color};font-weight:600">${esc(l.label)}</span> `
                : '';
              return `<li>${label}${esc(l.text)}</li>`;
            })
            .join('')}
        </ul>
      </section>`,
    )
    .join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(report.title)}</title>
<style>
  body{font:14px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a;max-width:820px;margin:40px auto;padding:0 20px}
  h1{font-size:26px;margin-bottom:4px} .meta{color:#64748b;margin-bottom:8px}
  .scores{display:flex;gap:16px;margin:16px 0}
  .score{border:1px solid #e2e8f0;border-radius:10px;padding:10px 16px}
  .score b{font-size:22px;display:block}
  h2{font-size:16px;border-bottom:1px solid #e2e8f0;padding-bottom:6px;margin-top:28px}
  ul{padding-left:18px} li{margin:4px 0}
  @media print{body{margin:0}}
</style></head><body>
  <h1>${esc(report.title)}</h1>
  <div class="meta">Generated: ${esc(report.generatedAt)}</div>
  <div class="scores">
    <div class="score">Reliability<b>${report.reliabilityScore}/100</b></div>
    <div class="score">Security<b>${report.securityScore}/100</b></div>
  </div>
  ${sections}
  <p style="color:#94a3b8;margin-top:40px">Riscly — find problems before they happen.</p>
</body></html>`;
}

// Exported for tests.
export { renderHtml };
export const _renderReportText = renderReportText;

@Module({
  imports: [StoreModule],
  controllers: [ReportsController],
})
export class ReportsModule {}
