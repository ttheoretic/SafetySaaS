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

describe('FailSafe API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
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
