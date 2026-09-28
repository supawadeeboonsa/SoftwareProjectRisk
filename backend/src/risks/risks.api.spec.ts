import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import { setupApp } from '../app.setup';
import { PrismaService } from '../prisma/prisma.service';
import { RisksModule } from './risks.module';

jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));

const PROJECT_ID = randomUUID();

function createFakePrisma() {
  const rows = new Map<string, any>();
  return {
    project: {
      findUnique: async ({ where }: any) => (where.id === PROJECT_ID ? { id: PROJECT_ID } : null),
    },
    risk: {
      create: async ({ data }: any) => {
        const now = new Date();
        const row = { id: randomUUID(), description: null, mitigation: null, contingency: null, owner: null, createdAt: now, updatedAt: now, ...clean(data) };
        rows.set(row.id, row);
        return row;
      },
      findMany: async ({ where }: any) => [...rows.values()].filter((r) => r.projectId === where.projectId),
      findUnique: async ({ where }: any) => rows.get(where.id) ?? null,
      update: async ({ where, data }: any) => {
        const row = { ...rows.get(where.id), ...clean(data), updatedAt: new Date() };
        rows.set(where.id, row);
        return row;
      },
      delete: async ({ where }: any) => {
        const row = rows.get(where.id);
        rows.delete(where.id);
        return row;
      },
    },
  };
}
const clean = (o: any) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

describe('Risks API (HTTP, in-memory fake DB)', () => {
  let app: INestApplication;
  let base: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [RisksModule] })
      .useMocker((token) => (token === PrismaService ? createFakePrisma() : undefined))
      .compile();
    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.listen(0);
    base = await app.getUrl();
  });
  afterAll(() => app.close());

  const send = (method: string, path: string, body?: unknown) =>
    fetch(base + path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  const valid = { name: 'Developer Shortage', probability: 3, impact: 4 };

  it('POST /projects/:projectId/risks → 201, backend คำนวณ score=12, level=HIGH', async () => {
    const res = await send('POST', `/projects/${PROJECT_ID}/risks`, valid);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toMatchObject({ name: 'Developer Shortage', probability: 3, impact: 4, score: 12, level: 'HIGH' });
  });

  it('POST project ไม่มีอยู่จริง → 404', async () => {
    const res = await send('POST', `/projects/${randomUUID()}/risks`, valid);
    expect(res.status).toBe(404);
  });

  it('POST projectId ไม่ใช่ UUID → 400', async () => {
    expect((await send('POST', '/projects/not-a-uuid/risks', valid)).status).toBe(400);
  });

  it('POST client พยายามยัด score/level เอง → 400 (ถูกปฏิเสธที่ validation ไม่ใช่แค่เพิกเฉย)', async () => {
    const res = await send('POST', `/projects/${PROJECT_ID}/risks`, { ...valid, score: 999, level: 'LOW' });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message.join(' ')).toMatch(/score/i);
  });

  it('POST probability/impact ผิด → 400', async () => {
    const res = await send('POST', `/projects/${PROJECT_ID}/risks`, { ...valid, probability: 0, impact: 6 });
    expect(res.status).toBe(400);
    const msg = (await res.json()).message.join(' ');
    expect(msg).toMatch(/probability/);
    expect(msg).toMatch(/impact/);
  });

  it('GET /projects/:projectId/risks → 200 array', async () => {
    const res = await send('GET', `/projects/${PROJECT_ID}/risks`);
    expect(res.status).toBe(200);
    expect(Array.isArray(await res.json())).toBe(true);
  });

  it('GET /risks/:id ไม่ใช่ UUID → 400', async () => {
    expect((await send('GET', '/risks/123')).status).toBe(400);
  });

  it('GET /risks/:id ไม่มีอยู่จริง → 404', async () => {
    expect((await send('GET', `/risks/${randomUUID()}`)).status).toBe(404);
  });

  it('full flow: POST → GET → PATCH (recalculate) → PATCH spoof score (400) → DELETE → GET (404)', async () => {
    const created = await (await send('POST', `/projects/${PROJECT_ID}/risks`, valid)).json();
    expect(created.score).toBe(12);

    const got = await send('GET', `/risks/${created.id}`);
    expect(got.status).toBe(200);

    const patched = await send('PATCH', `/risks/${created.id}`, { probability: 5 });
    expect(patched.status).toBe(200);
    const patchedBody = await patched.json();
    expect(patchedBody).toMatchObject({ probability: 5, impact: 4, score: 20, level: 'CRITICAL' });

    const spoofed = await send('PATCH', `/risks/${created.id}`, { score: 1 });
    expect(spoofed.status).toBe(400);

    expect((await send('DELETE', `/risks/${created.id}`)).status).toBe(204);
    expect((await send('GET', `/risks/${created.id}`)).status).toBe(404);
  });

  it('PATCH /risks/:id ไม่มีอยู่จริง → 404', async () => {
    expect((await send('PATCH', `/risks/${randomUUID()}`, { name: 'x' })).status).toBe(404);
  });

  it('DELETE /risks/:id ไม่มีอยู่จริง → 404', async () => {
    expect((await send('DELETE', `/risks/${randomUUID()}`)).status).toBe(404);
  });
});
