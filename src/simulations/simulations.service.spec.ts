import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { PrismaService } from '../prisma/prisma.service';
import { ScenariosService } from '../scenarios/scenarios.service';
import { SimulationsService } from './simulations.service';

jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));

const PROJECT_ID = 'p1';
const SCENARIO_ID = 's1';

// Chain ตัวอย่างจาก Phase 2: 7+5+15+15+5+10 = 57 วัน
const chainTasks = [
  { id: 'Requirement', duration: 7 }, { id: 'UIUX', duration: 5 }, { id: 'Backend', duration: 15 },
  { id: 'Frontend', duration: 15 }, { id: 'Integration', duration: 5 }, { id: 'Testing', duration: 10 },
];
const chainDeps = [
  { taskId: 'UIUX', dependsOnTaskId: 'Requirement' }, { taskId: 'Backend', dependsOnTaskId: 'UIUX' },
  { taskId: 'Frontend', dependsOnTaskId: 'Backend' }, { taskId: 'Integration', dependsOnTaskId: 'Frontend' },
  { taskId: 'Testing', dependsOnTaskId: 'Integration' },
];

describe('SimulationsService', () => {
  let service: SimulationsService;
  const prisma: any = {
    project: { findUnique: jest.fn() },
    task: { findMany: jest.fn() },
    taskDependency: { findMany: jest.fn() },
    risk: { findMany: jest.fn() },
    scenarioChange: { findMany: jest.fn() },
    simulation: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn() },
  };
  const scenariosService: any = { getScenarioOrThrow: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    scenariosService.getScenarioOrThrow.mockResolvedValue({ id: SCENARIO_ID, projectId: PROJECT_ID });
    const moduleRef = await Test.createTestingModule({
      providers: [
        SimulationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ScenariosService, useValue: scenariosService },
      ],
    }).compile();
    service = moduleRef.get(SimulationsService);
  });

  it('scenario ไม่มีอยู่จริง → 404 ไม่เรียกอะไรต่อ', async () => {
    scenariosService.getScenarioOrThrow.mockRejectedValue(new NotFoundException());
    await expect(service.simulate(SCENARIO_ID)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.scenarioChange.findMany).not.toHaveBeenCalled();
  });

  it('ไม่มี change เลย → 400 ไม่เรียกดึงข้อมูล project/task ต่อ', async () => {
    prisma.scenarioChange.findMany.mockResolvedValue([]);
    await expect(service.simulate(SCENARIO_ID)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.project.findUnique).not.toHaveBeenCalled();
  });

  it('เคส Demo เต็มรูปแบบ: team 5→3, risk 3→4/4→5 → 57→76, 12 HIGH→20 CRITICAL, persist และแปลง Decimal→number ถูกต้อง', async () => {
    prisma.scenarioChange.findMany.mockResolvedValue([
      { id: 'c1', factor: 'TEAM_SIZE', taskId: null, riskId: null, newValue: '3' },
      { id: 'c2', factor: 'RISK_PROBABILITY', taskId: null, riskId: 'r1', newValue: '4' },
      { id: 'c3', factor: 'RISK_IMPACT', taskId: null, riskId: 'r1', newValue: '5' },
    ]);
    prisma.project.findUnique.mockResolvedValue({ id: PROJECT_ID, teamSize: 5, budget: '100000.00' });
    prisma.task.findMany.mockResolvedValue(chainTasks.map((t) => ({ ...t, projectId: PROJECT_ID })));
    prisma.taskDependency.findMany.mockResolvedValue(chainDeps);
    prisma.risk.findMany.mockResolvedValue([
      { id: 'r1', projectId: PROJECT_ID, name: 'Developer Shortage', probability: 3, impact: 4 },
    ]);
    prisma.simulation.create.mockImplementation(({ data }: { data: any }) => Promise.resolve({ id: 'sim1', ...data }));

    const result = await service.simulate(SCENARIO_ID);

    expect(prisma.risk.findMany).toHaveBeenCalledWith({ where: { id: { in: ['r1'] } } });
    expect(prisma.simulation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        scenarioId: SCENARIO_ID,
        formulaVersion: '1.0',
        beforeDuration: 57,
        afterDuration: 76,
        durationChange: 19,
        beforeBudget: 100000,
        afterBudget: 100000,
        budgetChange: 0,
        budgetChangePercent: 0,
        beforeTeamSize: 5,
        afterTeamSize: 3,
        riskChanges: [expect.objectContaining({ beforeScore: 12, afterScore: 20 })],
      }),
    });
    expect(result.beforeBudget).toBe(100000); // number ไม่ใช่ string (แปลงจาก Decimal แล้ว)
    expect(typeof result.afterBudget).toBe('number');
  });

  it('ไม่มี RISK change เลย → ไม่เรียก prisma.risk.findMany (ไม่ query โดยไม่จำเป็น)', async () => {
    prisma.scenarioChange.findMany.mockResolvedValue([
      { id: 'c1', factor: 'BUDGET', taskId: null, riskId: null, newValue: '120000' },
    ]);
    prisma.project.findUnique.mockResolvedValue({ id: PROJECT_ID, teamSize: 5, budget: '100000.00' });
    prisma.task.findMany.mockResolvedValue(chainTasks.map((t) => ({ ...t, projectId: PROJECT_ID })));
    prisma.taskDependency.findMany.mockResolvedValue(chainDeps);
    prisma.simulation.create.mockImplementation(({ data }: { data: any }) => Promise.resolve({ id: 'sim1', ...data }));

    await service.simulate(SCENARIO_ID);
    expect(prisma.risk.findMany).not.toHaveBeenCalled();
  });

  it('riskId ที่ ScenarioChange อ้างถึงถูกลบไปแล้ว (ไม่พบใน DB ตอน simulate) → 409', async () => {
    prisma.scenarioChange.findMany.mockResolvedValue([
      { id: 'c1', factor: 'RISK_PROBABILITY', taskId: null, riskId: 'deleted-risk', newValue: '4' },
    ]);
    prisma.project.findUnique.mockResolvedValue({ id: PROJECT_ID, teamSize: 5, budget: '100000.00' });
    prisma.task.findMany.mockResolvedValue(chainTasks.map((t) => ({ ...t, projectId: PROJECT_ID })));
    prisma.taskDependency.findMany.mockResolvedValue(chainDeps);
    prisma.risk.findMany.mockResolvedValue([]); // risk ถูกลบไปแล้ว ไม่เจอ

    await expect(service.simulate(SCENARIO_ID)).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.simulation.create).not.toHaveBeenCalled();
  });

  it('taskId ที่ ScenarioChange อ้างถึงถูกลบไปแล้ว → 409', async () => {
    prisma.scenarioChange.findMany.mockResolvedValue([
      { id: 'c1', factor: 'TASK_DURATION', taskId: 'deleted-task', riskId: null, newValue: '20' },
    ]);
    prisma.project.findUnique.mockResolvedValue({ id: PROJECT_ID, teamSize: 5, budget: '100000.00' });
    prisma.task.findMany.mockResolvedValue(chainTasks.map((t) => ({ ...t, projectId: PROJECT_ID }))); // ไม่มี 'deleted-task'
    prisma.taskDependency.findMany.mockResolvedValue(chainDeps);

    await expect(service.simulate(SCENARIO_ID)).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.simulation.create).not.toHaveBeenCalled();
  });

  it('findOne: แปลง Decimal→number, ไม่พบ → 404', async () => {
    prisma.simulation.findUnique.mockResolvedValue({
      id: 'sim1', beforeBudget: '100000', afterBudget: '120000', budgetChange: '20000', budgetChangePercent: '20',
    });
    const result = await service.findOne('sim1');
    expect(result).toMatchObject({ beforeBudget: 100000, afterBudget: 120000, budgetChange: 20000, budgetChangePercent: 20 });

    prisma.simulation.findUnique.mockResolvedValue(null);
    await expect(service.findOne('ghost')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('findOne: budgetChangePercent เป็น null ต้องคงเป็น null (ไม่ใช่ 0 หรือ NaN)', async () => {
    prisma.simulation.findUnique.mockResolvedValue({
      id: 'sim1', beforeBudget: '0', afterBudget: '500', budgetChange: '500', budgetChangePercent: null,
    });
    const result = await service.findOne('sim1');
    expect(result.budgetChangePercent).toBeNull();
  });

  it('findAllForScenario: ตรวจ scenario มีอยู่จริงก่อน แล้วคืนรายการที่แปลงแล้ว', async () => {
    prisma.simulation.findMany.mockResolvedValue([
      { id: 'sim1', beforeBudget: '100000', afterBudget: '100000', budgetChange: '0', budgetChangePercent: '0' },
    ]);
    const result = await service.findAllForScenario(SCENARIO_ID);
    expect(scenariosService.getScenarioOrThrow).toHaveBeenCalledWith(SCENARIO_ID);
    expect(result[0].beforeBudget).toBe(100000);
  });
});
