import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { exampleGraph, exampleBusiness } from '@failsafe/shared';
import { AppModule } from './app.module';
import { devToken } from './auth/jwt';

// Two distinct tenants (each provisioned a personal org on first request).
const ALICE = `Bearer ${devToken({ sub: 'alice-1', email: 'alice@acme.io', name: 'Alice' })}`;
const BOB = `Bearer ${devToken({ sub: 'bob-1', email: 'bob@globex.io', name: 'Bob' })}`;
const CAROL = `Bearer ${devToken({ sub: 'carol-1', email: 'carol@initech.io', name: 'Carol' })}`;

describe('FailSafe API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    // Provision Alice & Bob and upgrade them to enterprise (no project limit)
    // via the dev billing webhook, so the multi-project tests below aren't
    // constrained by the starter plan.
    for (const token of [ALICE, BOB]) {
      const me = await request(app.getHttpServer()).get('/me').set('Authorization', token);
      await request(app.getHttpServer())
        .post('/billing/webhook')
        .send({ orgId: me.body.activeOrg.id, plan: 'enterprise' });
    }
  });

  afterAll(async () => {
    await app?.close();
  });

  it('GET /health returns ok', async () => {
    const res = await request(app.getHttpServer()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('POST /analyze/reliability scores a graph with recommendations', async () => {
    const res = await request(app.getHttpServer())
      .post('/analyze/reliability')
      .send({ graph: exampleGraph });
    expect(res.status).toBe(201);
    expect(res.body.score).toBeGreaterThanOrEqual(0);
    expect(res.body.score).toBeLessThanOrEqual(100);
    expect(Array.isArray(res.body.recommendations)).toBe(true);
  });

  it('POST /analyze/simulate computes Stripe revenue impact', async () => {
    const res = await request(app.getHttpServer())
      .post('/analyze/simulate')
      .send({
        graph: exampleGraph,
        type: 'stripe_down',
        durationHours: 4,
        business: exampleBusiness,
      });
    expect(res.status).toBe(201);
    expect(res.body.result.impact).toBe('partial_outage');
    expect(res.body.revenue.totalImpact).toBeGreaterThan(0);
  });

  it('POST /analyze/predict returns failure predictions (heuristics)', async () => {
    const res = await request(app.getHttpServer())
      .post('/analyze/predict')
      .send({ graph: exampleGraph, currentUsers: 4000 });
    expect(res.status).toBe(201);
    // No ANTHROPIC_API_KEY in tests → heuristics only, gracefully degraded.
    expect(res.body.aiEnabled).toBe(false);
    expect(Array.isArray(res.body.predictions)).toBe(true);
    expect(res.body.predictions.length).toBeGreaterThan(0);
    expect(
      res.body.predictions.some((p: { category: string }) => p.category === 'bottleneck'),
    ).toBe(true);
  });

  it('rejects an unknown simulation type', async () => {
    const res = await request(app.getHttpServer())
      .post('/analyze/simulate')
      .send({ graph: exampleGraph, type: 'meteor_strike' });
    expect(res.status).toBe(400);
  });

  it('requires authentication for tenant routes', async () => {
    const res = await request(app.getHttpServer()).get('/projects');
    expect(res.status).toBe(401);
  });

  it('GET /me provisions a personal org on first login', async () => {
    const res = await request(app.getHttpServer())
      .get('/me')
      .set('Authorization', ALICE);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('alice@acme.io');
    expect(res.body.role).toBe('owner');
    expect(res.body.activeOrg).toBeDefined();
  });

  it('runs a project scan end-to-end', async () => {
    const create = await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', ALICE)
      .send({ name: 'Acme SaaS' });
    expect(create.status).toBe(201);
    const projectId = create.body.id;

    const scan = await request(app.getHttpServer())
      .post(`/projects/${projectId}/scans`)
      .set('Authorization', ALICE)
      .send({});
    expect(scan.status).toBe(201);
    expect(scan.body.status).toBe('succeeded');
    expect(scan.body.reliabilityScore).toBeGreaterThanOrEqual(0);
  });

  it('isolates tenants: Bob cannot see Alice\'s project', async () => {
    const created = await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', ALICE)
      .send({ name: 'Alice Secret Project' });
    const projectId = created.body.id;

    const asBob = await request(app.getHttpServer())
      .get(`/projects/${projectId}`)
      .set('Authorization', BOB);
    expect(asBob.status).toBe(404);

    const bobList = await request(app.getHttpServer())
      .get('/projects')
      .set('Authorization', BOB);
    expect(bobList.body.find((p: { id: string }) => p.id === projectId)).toBeUndefined();
  });

  it('records an audit log for mutating actions', async () => {
    await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', ALICE)
      .send({ name: 'Audited Project' });
    const logs = await request(app.getHttpServer())
      .get('/orgs/audit-logs')
      .set('Authorization', ALICE);
    expect(logs.status).toBe(200);
    expect(logs.body.some((l: { action: string }) => l.action === 'project.create')).toBe(true);
  });

  it('creates and runs a custom scenario (Scenario Laboratory)', async () => {
    const project = (
      await request(app.getHttpServer())
        .post('/projects')
        .set('Authorization', ALICE)
        .send({ name: 'Scenario Project' })
    ).body;

    const created = await request(app.getHttpServer())
      .post(`/projects/${project.id}/scenarios`)
      .set('Authorization', ALICE)
      .send({
        name: 'AWS outage during a traffic spike',
        prompt: 'What if AWS us-east-1 fails while we get 100x traffic?',
        steps: [
          { type: 'aws_down', durationHours: 3 },
          { type: 'traffic_100x' },
        ],
        business: exampleBusiness,
      });
    expect(created.status).toBe(201);

    const run = await request(app.getHttpServer())
      .post(`/projects/${project.id}/scenarios/${created.body.id}/run`)
      .set('Authorization', ALICE)
      .send({});
    expect(run.status).toBe(201);
    expect(run.body.steps).toHaveLength(2);
    expect(run.body.worstImpact).toBeDefined();
    expect(run.body.totalRevenueImpact).toBeGreaterThanOrEqual(0);
  });

  it('enforces plan limits and lifts them on upgrade', async () => {
    // Carol starts on the starter plan (1 project).
    const summary = await request(app.getHttpServer())
      .get('/billing')
      .set('Authorization', CAROL);
    expect(summary.status).toBe(200);
    expect(summary.body.plan).toBe('starter');
    expect(summary.body.limits.maxProjects).toBe(1);

    const first = await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', CAROL)
      .send({ name: 'Carol Project 1' });
    expect(first.status).toBe(201);

    // Second project exceeds the starter limit.
    const second = await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', CAROL)
      .send({ name: 'Carol Project 2' });
    expect(second.status).toBe(403);

    // Upgrade via the webhook, then it's allowed.
    const me = await request(app.getHttpServer()).get('/me').set('Authorization', CAROL);
    await request(app.getHttpServer())
      .post('/billing/webhook')
      .send({ orgId: me.body.activeOrg.id, plan: 'pro' });

    const afterUpgrade = await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', CAROL)
      .send({ name: 'Carol Project 2' });
    expect(afterUpgrade.status).toBe(201);
  });

  it('checkout requires billing:manage and returns a URL', async () => {
    const res = await request(app.getHttpServer())
      .post('/billing/checkout')
      .set('Authorization', ALICE)
      .send({ plan: 'pro' });
    expect(res.status).toBe(201);
    expect(typeof res.body.url).toBe('string');
  });

  it('invites a member who then joins the org (Team)', async () => {
    // Alice (enterprise, owner) invites a brand-new user as a member.
    const invite = await request(app.getHttpServer())
      .post('/orgs/invitations')
      .set('Authorization', ALICE)
      .send({ email: 'dave@acme.io', role: 'member' });
    expect(invite.status).toBe(201);
    expect(invite.body.token).toBeDefined();

    const DAVE = `Bearer ${devToken({ sub: 'dave-1', email: 'dave@acme.io', name: 'Dave' })}`;
    // Dave provisions his own org on first login...
    const before = await request(app.getHttpServer()).get('/me').set('Authorization', DAVE);
    expect(before.body.organizations).toHaveLength(1);

    // ...then accepts the invitation and joins Alice's org as a member.
    const accept = await request(app.getHttpServer())
      .post('/invitations/accept')
      .set('Authorization', DAVE)
      .send({ token: invite.body.token });
    expect(accept.status).toBe(201);
    expect(accept.body.role).toBe('member');

    const after = await request(app.getHttpServer()).get('/me').set('Authorization', DAVE);
    expect(after.body.organizations).toHaveLength(2);
  });

  it('rejects an invalid invitation token', async () => {
    const DAVE = `Bearer ${devToken({ sub: 'dave-1', email: 'dave@acme.io' })}`;
    const res = await request(app.getHttpServer())
      .post('/invitations/accept')
      .set('Authorization', DAVE)
      .send({ token: 'nope' });
    expect(res.status).toBe(400);
  });

  it('generates reports as JSON, HTML and PDF', async () => {
    const project = (
      await request(app.getHttpServer())
        .post('/projects')
        .set('Authorization', ALICE)
        .send({ name: 'Report Project' })
    ).body;
    const base = `/projects/${project.id}/reports`;

    const json = await request(app.getHttpServer())
      .get(`${base}/executive`)
      .set('Authorization', ALICE);
    expect(json.status).toBe(200);
    expect(json.body.title).toContain('Executive');
    expect(json.body.reliabilityScore).toBeGreaterThanOrEqual(0);

    const html = await request(app.getHttpServer())
      .get(`${base}/security?format=html`)
      .set('Authorization', ALICE);
    expect(html.status).toBe(200);
    expect(html.headers['content-type']).toContain('text/html');
    expect(html.text).toContain('<h1>');

    const pdf = await request(app.getHttpServer())
      .get(`${base}/full?format=pdf`)
      .set('Authorization', ALICE)
      .buffer()
      .parse((res, cb) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => cb(null, Buffer.concat(chunks)));
      });
    expect(pdf.status).toBe(200);
    expect(pdf.headers['content-type']).toContain('application/pdf');
    expect((pdf.body as Buffer).subarray(0, 5).toString('latin1')).toBe('%PDF-');
  });

  it('rejects an unknown report type', async () => {
    const project = (
      await request(app.getHttpServer())
        .post('/projects')
        .set('Authorization', ALICE)
        .send({ name: 'Report Project 2' })
    ).body;
    const res = await request(app.getHttpServer())
      .get(`/projects/${project.id}/reports/bogus`)
      .set('Authorization', ALICE);
    expect(res.status).toBe(400);
  });

  it('scans from connected providers (no token, provided signals)', async () => {
    const project = (
      await request(app.getHttpServer())
        .post('/projects')
        .set('Authorization', ALICE)
        .send({ name: 'Connected SaaS' })
    ).body;

    const conn = await request(app.getHttpServer())
      .post(`/projects/${project.id}/connections`)
      .set('Authorization', ALICE)
      .send({
        provider: 'github',
        metadata: {
          signals: [
            {
              provider: 'github',
              repo: 'acme/connected',
              frameworks: ['nextjs', 'nestjs'],
              dependencies: ['next', '@nestjs/core', 'pg', 'stripe'],
            },
          ],
        },
      });
    expect(conn.status).toBe(201);
    // Secrets / tokens are never returned.
    expect(conn.body.token).toBeUndefined();

    const scan = await request(app.getHttpServer())
      .post(`/projects/${project.id}/scans`)
      .set('Authorization', ALICE)
      .send({});
    expect(scan.status).toBe(201);
    expect(scan.body.status).toBe('succeeded');
    const ids = (scan.body.graph.nodes as Array<{ id: string }>).map((n) => n.id);
    expect(ids).toContain('postgres');
    expect(ids).toContain('stripe');
  });
});
