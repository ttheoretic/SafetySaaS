import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { exampleGraph, exampleBusiness } from '@failsafe/shared';
import { AppModule } from './app.module';

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

  it('rejects an unknown simulation type', async () => {
    const res = await request(app.getHttpServer())
      .post('/analyze/simulate')
      .send({ graph: exampleGraph, type: 'meteor_strike' });
    expect(res.status).toBe(400);
  });

  it('runs a project scan end-to-end', async () => {
    const create = await request(app.getHttpServer())
      .post('/projects')
      .send({ name: 'Acme SaaS' });
    expect(create.status).toBe(201);
    const projectId = create.body.id;

    const scan = await request(app.getHttpServer())
      .post(`/projects/${projectId}/scans`)
      .send({});
    expect(scan.status).toBe(201);
    expect(scan.body.status).toBe('succeeded');
    expect(scan.body.reliabilityScore).toBeGreaterThanOrEqual(0);
  });

  it('scans from connected providers (no token, provided signals)', async () => {
    const project = (
      await request(app.getHttpServer())
        .post('/projects')
        .send({ name: 'Connected SaaS' })
    ).body;

    const conn = await request(app.getHttpServer())
      .post(`/projects/${project.id}/connections`)
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
      .send({});
    expect(scan.status).toBe(201);
    expect(scan.body.status).toBe('succeeded');
    const ids = (scan.body.graph.nodes as Array<{ id: string }>).map((n) => n.id);
    expect(ids).toContain('postgres');
    expect(ids).toContain('stripe');
  });
});
