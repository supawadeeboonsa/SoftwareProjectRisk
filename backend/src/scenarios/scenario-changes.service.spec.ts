import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ScenarioChangesService } from './scenario-changes.service';
import { ScenariosService } from './scenarios.service';

jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));

const PROJECT_ID = 'p1';
const SCENARIO_ID = 's1';

describe('ScenarioChangesService', () => {
  let service: ScenarioChangesService;
  const prisma = {
    task: { findUnique: jest.fn() },
    risk: { findUnique: jest.fn() },
    scenarioChange: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), delete: jest.fn() },
  };
  const scenariosService = {
    getScenarioOrThrow: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    scenariosService.getScenarioOrThrow.mockResolvedValue({ id: SCENARIO_ID, projectId: PROJECT_ID });
    const moduleRef = await Test.createTestingModule({
      providers: [
        ScenarioChangesService,
        { provide: PrismaService, useValue: prisma },
        { provide: ScenariosService, useValue: scenariosService },
      ],
    }).compile();
    service = moduleRef.get(ScenarioChangesService);
  });

  it('scenario ไม่มีอยู่จริง → 404 ไม่เรียก create', async () => {
    scenariosService.getScenarioOrThrow.mockRejectedValue(new NotFoundException());
    await expect(service.create(SCENARIO_ID, { factor: 'TEAM_SIZE', newValue: 3 } as any)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.scenarioChange.create).not.toHaveBeenCalled();
  });

  describe('BUDGET', () => {
    it('สำเร็จ', async () => {
      prisma.scenarioChange.create.mockResolvedValue({ id: 'c1', factor: 'BUDGET', newValue: 120000 });
      await service.create(SCENARIO_ID, { factor: 'BUDGET', newValue: 120000 } as any);
      expect(prisma.scenarioChange.create).toHaveBeenCalledWith({
        data: { scenarioId: SCENARIO_ID, factor: 'BUDGET', taskId: undefined, riskId: undefined, newValue: 120000 },
      });
    });
    it('ติดลบ → 400', async () => {
      await expect(service.create(SCENARIO_ID, { factor: 'BUDGET', newValue: -1 } as any)).rejects.toBeInstanceOf(BadRequestException);
    });
    it('ส่ง taskId มาด้วย → 400', async () => {
      await expect(service.create(SCENARIO_ID, { factor: 'BUDGET', newValue: 1, taskId: 't1' } as any)).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('TEAM_SIZE', () => {
    it('สำเร็จ', async () => {
      prisma.scenarioChange.create.mockResolvedValue({ id: 'c1' });
      await service.create(SCENARIO_ID, { factor: 'TEAM_SIZE', newValue: 3 } as any);
      expect(prisma.scenarioChange.create).toHaveBeenCalled();
    });
    it.each([0, -1, 2.5])('ค่าไม่ถูกต้อง (%p) → 400', async (newValue) => {
      await expect(service.create(SCENARIO_ID, { factor: 'TEAM_SIZE', newValue } as any)).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('TASK_DURATION', () => {
    it('สำเร็จ (task อยู่ project เดียวกัน)', async () => {
      prisma.task.findUnique.mockResolvedValue({ id: 't1', projectId: PROJECT_ID });
      prisma.scenarioChange.create.mockResolvedValue({ id: 'c1' });
      await service.create(SCENARIO_ID, { factor: 'TASK_DURATION', taskId: 't1', newValue: 20 } as any);
      expect(prisma.scenarioChange.create).toHaveBeenCalledWith({
        data: { scenarioId: SCENARIO_ID, factor: 'TASK_DURATION', taskId: 't1', riskId: undefined, newValue: 20 },
      });
    });
    it('ไม่ส่ง taskId → 400', async () => {
      await expect(service.create(SCENARIO_ID, { factor: 'TASK_DURATION', newValue: 20 } as any)).rejects.toBeInstanceOf(BadRequestException);
    });
    it('task ไม่มีอยู่จริง → 404', async () => {
      prisma.task.findUnique.mockResolvedValue(null);
      await expect(service.create(SCENARIO_ID, { factor: 'TASK_DURATION', taskId: 'ghost', newValue: 20 } as any)).rejects.toBeInstanceOf(NotFoundException);
    });
    it('task อยู่คนละ project → 400', async () => {
      prisma.task.findUnique.mockResolvedValue({ id: 't1', projectId: 'other-project' });
      await expect(service.create(SCENARIO_ID, { factor: 'TASK_DURATION', taskId: 't1', newValue: 20 } as any)).rejects.toBeInstanceOf(BadRequestException);
    });
    it('duration ไม่ถูกต้อง → 400', async () => {
      prisma.task.findUnique.mockResolvedValue({ id: 't1', projectId: PROJECT_ID });
      await expect(service.create(SCENARIO_ID, { factor: 'TASK_DURATION', taskId: 't1', newValue: 0 } as any)).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe.each(['RISK_PROBABILITY', 'RISK_IMPACT'])('%s', (factor) => {
    it('สำเร็จ (risk อยู่ project เดียวกัน)', async () => {
      prisma.risk.findUnique.mockResolvedValue({ id: 'r1', projectId: PROJECT_ID });
      prisma.scenarioChange.create.mockResolvedValue({ id: 'c1' });
      await service.create(SCENARIO_ID, { factor, riskId: 'r1', newValue: 5 } as any);
      expect(prisma.scenarioChange.create).toHaveBeenCalled();
    });
    it('ไม่ส่ง riskId → 400', async () => {
      await expect(service.create(SCENARIO_ID, { factor, newValue: 5 } as any)).rejects.toBeInstanceOf(BadRequestException);
    });
    it('risk ไม่มีอยู่จริง → 404', async () => {
      prisma.risk.findUnique.mockResolvedValue(null);
      await expect(service.create(SCENARIO_ID, { factor, riskId: 'ghost', newValue: 5 } as any)).rejects.toBeInstanceOf(NotFoundException);
    });
    it('risk อยู่คนละ project → 400', async () => {
      prisma.risk.findUnique.mockResolvedValue({ id: 'r1', projectId: 'other-project' });
      await expect(service.create(SCENARIO_ID, { factor, riskId: 'r1', newValue: 5 } as any)).rejects.toBeInstanceOf(BadRequestException);
    });
    it.each([0, 6, 2.5])('ค่านอกช่วง 1-5 (%p) → 400', async (newValue) => {
      prisma.risk.findUnique.mockResolvedValue({ id: 'r1', projectId: PROJECT_ID });
      await expect(service.create(SCENARIO_ID, { factor, riskId: 'r1', newValue } as any)).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  it('findAllForScenario: คืนรายการ', async () => {
    prisma.scenarioChange.findMany.mockResolvedValue([{ id: 'c1' }]);
    const result = await service.findAllForScenario(SCENARIO_ID);
    expect(result).toHaveLength(1);
  });

  it('remove: สำเร็จ', async () => {
    prisma.scenarioChange.findUnique.mockResolvedValue({ id: 'c1' });
    prisma.scenarioChange.delete.mockResolvedValue({ id: 'c1' });
    await expect(service.remove('c1')).resolves.toBeUndefined();
  });

  it('remove: ไม่พบ → 404', async () => {
    prisma.scenarioChange.findUnique.mockResolvedValue(null);
    await expect(service.remove('c1')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.scenarioChange.delete).not.toHaveBeenCalled();
  });
});
