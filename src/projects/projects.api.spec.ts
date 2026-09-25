import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import { randomUUID } from 'crypto';
import { setupApp } from '../app.setup';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsModule } from './projects.module';

// ทดสอบผ่าน HTTP จริงของ Nest (routing, ValidationPipe, status code)
// แต่ "ฐานข้อมูลเป็นของจำลองในหน่วยความจำ" ไม่ใช่ PostgreSQL/Prisma จริง
jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));

function createFakePrisma() {
  const rows = new Map<string, any>();
  const state = { failWith: null as Error | null };
  return {
    state,
    project: {
      create: async ({ data }: any) => {
        if (state.failWith) throw state.failWith;
        const now = new Date();
        const row = { id: randomUUID(), description: null, status: 'PLANNING', createdAt: now, updatedAt: now, ...clean(data) };
        rows.set(row.id, row);
        return row;
      },
      findMany: async () => [...rows.values()],
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

describe('Projects API (HTTP, in-memory fake DB)', () => {
  let app: INestApplication;
  let base: string;
  let fake: ReturnType<typeof createFakePrisma>;

  beforeAll(async () => {
    fake = createFakePrisma();
    const moduleRef = await Test.createTestingModule({ imports: [ProjectsModule] })
      .useMocker((token) => (token === PrismaService ? fake : undefined))
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

  const valid = { name: 'E-Commerce Platform', startDate: '2026-01-01', endDate: '2026-03-01', budget: 100000, teamSize: 5 };

  it('POST /projects → 201 และ status default = PLANNING', async () => {
    const res = await send('POST', '/projects', valid);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toMatchObject({ name: 'E-Commerce Platform', budget: 100000, teamSize: 5, status: 'PLANNING' });
    expect(body.id).toBeDefined();
  });

  it('POST invalid data → 400 พร้อมข้อความที่อ่านเข้าใจ', async () => {
    const res = await send('POST', '/projects', { name: '', budget: -1, teamSize: 0, startDate: 'x', endDate: '2026-03-01', status: 'DONE' });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message.join(' ')).toMatch(/name should not be empty/);
    expect(body.message.join(' ')).toMatch(/budget must not be less than 0/);
    expect(body.message.join(' ')).toMatch(/teamSize must not be less than 1/);
    expect(body.message.join(' ')).toMatch(/status must be one of/);
  });

  it('POST invalid date range → 400', async () => {
    const res = await send('POST', '/projects', { ...valid, startDate: '2026-05-01' });
    expect(res.status).toBe(400);
    expect((await res.json()).message).toMatch(/Invalid date range/);
  });

  it('POST field ที่ไม่รู้จัก → 400', async () => {
    expect((await send('POST', '/projects', { ...valid, foo: 1 })).status).toBe(400);
  });

  it('GET /projects → 200 เป็น array', async () => {
    const res = await send('GET', '/projects');
    expect(res.status).toBe(200);
    expect(Array.isArray(await res.json())).toBe(true);
  });

  it('GET /projects/:id ที่ไม่ใช่ UUID → 400', async () => {
    expect((await send('GET', '/projects/123')).status).toBe(400);
  });

  it('GET /projects/:id ที่ไม่มี → 404', async () => {
    expect((await send('GET', `/projects/${randomUUID()}`)).status).toBe(404);
  });

  it('PATCH → 200, แล้ว invalid range ตอน PATCH → 400, DELETE → 204, หลังลบ GET → 404', async () => {
    const created = await (await send('POST', '/projects', valid)).json();

    const patched = await send('PATCH', `/projects/${created.id}`, { teamSize: 3, status: 'IN_PROGRESS' });
    expect(patched.status).toBe(200);
    expect(await patched.json()).toMatchObject({ teamSize: 3, status: 'IN_PROGRESS', name: valid.name });

    const bad = await send('PATCH', `/projects/${created.id}`, { endDate: '2025-01-01' });
    expect(bad.status).toBe(400);

    expect((await send('DELETE', `/projects/${created.id}`)).status).toBe(204);
    expect((await send('GET', `/projects/${created.id}`)).status).toBe(404);
  });

  it('DB ต่อไม่ได้ (จำลอง P1001) → 503', async () => {
    fake.state.failWith = Object.assign(new Error('down'), { code: 'P1001' });
    const res = await send('POST', '/projects', valid);
    fake.state.failWith = null;
    expect(res.status).toBe(503);
  });
});
