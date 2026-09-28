import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import { setupApp } from '../app.setup';
import { PrismaService } from '../prisma/prisma.service';
import { ScenarioChangesController, ScenarioChangesNestedController } from '../scenarios/scenario-changes.controller';
import { ScenarioChangesService } from '../scenarios/scenario-changes.service';
import { ProjectScenariosController, ScenariosController } from '../scenarios/scenarios.controller';
import { ScenariosService } from '../scenarios/scenarios.service';
import { ScenarioSimulationsController, SimulationsController } from './simulations.controller';
import { SimulationsService } from './simulations.service';

jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));

// เตรียมข้อมูลจำลอง: Project + Task chain (57 วัน ตามตัวอย่าง Phase 2) + Risk เดียว
const PROJECT_ID = randomUUID();
const TASK_IDS = {
  Requirement: randomUUID(), UIUX: randomUUID(), Backend: randomUUID(),
  Frontend: randomUUID(), Integration: randomUUID(), Testing: randomUUID(),
};
const RISK_ID = randomUUID();

function createFakePrisma() {
  const scenarios = new Map<string, any>();
  const scenarioChanges = new Map<string, any>();
  const simulations = new Map<string, any>();

  const project = { id: PROJECT_ID, teamSize: 5, budget: '100000.00' };
  const tasks = [
    { id: TASK_IDS.Requirement, projectId: PROJECT_ID, duration: 7 },
    { id: TASK_IDS.UIUX, projectId: PROJECT_ID, duration: 5 },
    { id: TASK_IDS.Backend, projectId: PROJECT_ID, duration: 15 },
    { id: TASK_IDS.Frontend, projectId: PROJECT_ID, duration: 15 },
    { id: TASK_IDS.Integration, projectId: PROJECT_ID, duration: 5 },
    { id: TASK_IDS.Testing, projectId: PROJECT_ID, duration: 10 },
  ];
  const dependencies = [
    { taskId: TASK_IDS.UIUX, dependsOnTaskId: TASK_IDS.Requirement },
    { taskId: TASK_IDS.Backend, dependsOnTaskId: TASK_IDS.UIUX },
    { taskId: TASK_IDS.Frontend, dependsOnTaskId: TASK_IDS.Backend },
    { taskId: TASK_IDS.Integration, dependsOnTaskId: TASK_IDS.Frontend },
    { taskId: TASK_IDS.Testing, dependsOnTaskId: TASK_IDS.Integration },
  ];
  const risk = { id: RISK_ID, projectId: PROJECT_ID, name: 'Developer Shortage', probability: 3, impact: 4 };
  const clean = (o: any) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

  return {
    project: { findUnique: async ({ where }: any) => (where.id === PROJECT_ID ? project : null) },
    task: {
      findUnique: async ({ where }: any) => tasks.find((t) => t.id === where.id) ?? null,
      findMany: async ({ where }: any) => tasks.filter((t) => t.projectId === where.projectId),
    },
    taskDependency: {
      findMany: async ({ where }: any) =>
        where.task.projectId === PROJECT_ID ? dependencies : [],
    },
    risk: {
      findUnique: async ({ where }: any) => (where.id === RISK_ID ? risk : null),
      findMany: async ({ where }: any) =>
        [risk].filter((r) => (where.id.in as string[]).includes(r.id)),
    },
    scenario: {
      create: async ({ data }: any) => {
        const now = new Date();
        const row = { id: randomUUID(), description: null, createdAt: now, updatedAt: now, ...clean(data) };
        scenarios.set(row.id, row);
        return row;
      },
      findUnique: async ({ where, include }: any) => {
        const row = scenarios.get(where.id);
        if (!row) return null;
        if (include?.changes) {
          return { ...row, changes: [...scenarioChanges.values()].filter((c) => c.scenarioId === where.id) };
        }
        return row;
      },
      findMany: async ({ where }: any) => [...scenarios.values()].filter((s) => s.projectId === where.projectId),
      delete: async ({ where }: any) => {
        const row = scenarios.get(where.id);
        scenarios.delete(where.id);
        return row;
      },
    },
    scenarioChange: {
      create: async ({ data }: any) => {
        const row = { id: randomUUID(), createdAt: new Date(), ...clean(data) };
        scenarioChanges.set(row.id, row);
        return row;
      },
      findMany: async ({ where }: any) =>
        [...scenarioChanges.values()].filter((c) => c.scenarioId === where.scenarioId),
    },
    simulation: {
      create: async ({ data }: any) => {
        const row = { id: randomUUID(), executedAt: new Date(), ...clean(data) };
        simulations.set(row.id, row);
        return row;
      },
      findUnique: async ({ where }: any) => simulations.get(where.id) ?? null,
      findMany: async ({ where }: any) => [...simulations.values()].filter((s) => s.scenarioId === where.scenarioId),
    },
  };
}

describe('Scenario + Simulation API (HTTP, in-memory fake DB, reproduces Spec section 14 demo)', () => {
  let app: INestApplication;
  let base: string;

  beforeAll(async () => {
    const fakePrisma = createFakePrisma(); // สร้างครั้งเดียว — useMocker เรียก factory แยกกันต่อ Service ที่ inject
    const moduleRef = await Test.createTestingModule({
      controllers: [
        ProjectScenariosController, ScenariosController,
        ScenarioChangesNestedController, ScenarioChangesController,
        ScenarioSimulationsController, SimulationsController,
      ],
      providers: [ScenariosService, ScenarioChangesService, SimulationsService],
    })
      .useMocker((token) => (token === PrismaService ? fakePrisma : undefined))
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

  it('Full flow ตาม Spec section 14: create scenario → add changes → simulate → ผลตรงกับสูตรจริง', async () => {
    const scenario = await (
      await send('POST', `/projects/${PROJECT_ID}/scenarios`, { name: 'Reduce Development Team' })
    ).json();
    expect(scenario.name).toBe('Reduce Development Team');

    const c1 = await send('POST', `/scenarios/${scenario.id}/changes`, { factor: 'TEAM_SIZE', newValue: 3 });
    expect(c1.status).toBe(201);
    const c2 = await send('POST', `/scenarios/${scenario.id}/changes`, {
      factor: 'RISK_PROBABILITY', riskId: RISK_ID, newValue: 4,
    });
    expect(c2.status).toBe(201);
    const c3 = await send('POST', `/scenarios/${scenario.id}/changes`, {
      factor: 'RISK_IMPACT', riskId: RISK_ID, newValue: 5,
    });
    expect(c3.status).toBe(201);

    const listChanges = await send('GET', `/scenarios/${scenario.id}/changes`);
    expect((await listChanges.json())).toHaveLength(3);

    const simRes = await send('POST', `/scenarios/${scenario.id}/simulate`);
    expect(simRes.status).toBe(201);
    const sim = await simRes.json();

    // ตัวเลขต้องมาจากสูตรจริง ไม่ hardcode: 57→76 (ไม่ใช่ ~67 ตามเอกสารที่คำนวณผิด), risk 12 HIGH→20 CRITICAL
    expect(sim).toMatchObject({
      formulaVersion: '1.0',
      beforeDuration: 57, afterDuration: 76, durationChange: 19,
      beforeBudget: 100000, afterBudget: 100000, budgetChange: 0,
      beforeTeamSize: 5, afterTeamSize: 3,
    });
    expect(sim.riskChanges).toEqual([
      expect.objectContaining({ riskId: RISK_ID, beforeScore: 12, beforeLevel: 'HIGH', afterScore: 20, afterLevel: 'CRITICAL' }),
    ]);
    expect(sim.impactSummary.length).toBeGreaterThan(0);
    expect(sim.recommendation).toContain('Review high-impact risks.');

    // GET /simulations/:id และ GET /scenarios/:id/simulations ต้องเห็นผลเดียวกัน
    const got = await (await send('GET', `/simulations/${sim.id}`)).json();
    expect(got.afterDuration).toBe(76);
    const history = await (await send('GET', `/scenarios/${scenario.id}/simulations`)).json();
    expect(history).toHaveLength(1);

    // GET /scenarios/:id ต้องเห็น changes แนบมาด้วย
    const scenarioDetail = await (await send('GET', `/scenarios/${scenario.id}`)).json();
    expect(scenarioDetail.changes).toHaveLength(3);
  });

  it('POST /scenarios/:id/changes ด้วย factor ผิดเงื่อนไข → 400', async () => {
    const scenario = await (
      await send('POST', `/projects/${PROJECT_ID}/scenarios`, { name: 'Bad Change Test' })
    ).json();

    // BUDGET ติดลบ
    expect((await send('POST', `/scenarios/${scenario.id}/changes`, { factor: 'BUDGET', newValue: -1 })).status).toBe(400);
    // TASK_DURATION ไม่ส่ง taskId
    expect((await send('POST', `/scenarios/${scenario.id}/changes`, { factor: 'TASK_DURATION', newValue: 10 })).status).toBe(400);
    // RISK_PROBABILITY เกินช่วง 1-5
    expect(
      (await send('POST', `/scenarios/${scenario.id}/changes`, { factor: 'RISK_PROBABILITY', riskId: RISK_ID, newValue: 9 })).status,
    ).toBe(400);
  });

  it('simulate scenario ที่ไม่มี change เลย → 400', async () => {
    const scenario = await (
      await send('POST', `/projects/${PROJECT_ID}/scenarios`, { name: 'Empty Scenario' })
    ).json();
    expect((await send('POST', `/scenarios/${scenario.id}/simulate`)).status).toBe(400);
  });

  it('project ไม่มีอยู่จริง → 404 ตอนสร้าง scenario', async () => {
    expect((await send('POST', `/projects/${randomUUID()}/scenarios`, { name: 'X' })).status).toBe(404);
  });

  it('scenario ไม่มีอยู่จริง → 404 ทั้ง GET/DELETE/simulate', async () => {
    const ghost = randomUUID();
    expect((await send('GET', `/scenarios/${ghost}`)).status).toBe(404);
    expect((await send('DELETE', `/scenarios/${ghost}`)).status).toBe(404);
    expect((await send('POST', `/scenarios/${ghost}/simulate`)).status).toBe(404);
  });

  it('DELETE scenario → 204', async () => {
    const scenario = await (
      await send('POST', `/projects/${PROJECT_ID}/scenarios`, { name: 'To Delete' })
    ).json();
    expect((await send('DELETE', `/scenarios/${scenario.id}`)).status).toBe(204);
    expect((await send('GET', `/scenarios/${scenario.id}`)).status).toBe(404);
  });
});
