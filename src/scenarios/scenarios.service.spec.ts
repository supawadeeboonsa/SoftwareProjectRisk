import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ScenariosService } from './scenarios.service';

jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));

const PROJECT_ID = 'p1';
const SCENARIO_ID = 's1';
const dbScenario = (over: Record<string, unknown> = {}) => ({
  id: SCENARIO_ID, projectId: PROJECT_ID, name: 'Reduce Development Team', description: null,
  createdAt: new Date(), updatedAt: new Date(), ...over,
});

describe('ScenariosService', () => {
  let service: ScenariosService;
  const prisma = {
    project: { findUnique: jest.fn() },
    scenario: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), delete: jest.fn() },
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [ScenariosService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(ScenariosService);
  });

  it('create: project ไม่มีอยู่จริง → 404', async () => {
    prisma.project.findUnique.mockResolvedValue(null);
    await expect(service.create(PROJECT_ID, { name: 'X' })).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.scenario.create).not.toHaveBeenCalled();
  });

  it('create: สำเร็จ', async () => {
    prisma.project.findUnique.mockResolvedValue({ id: PROJECT_ID });
    prisma.scenario.create.mockResolvedValue(dbScenario());
    const result = await service.create(PROJECT_ID, { name: 'Reduce Development Team' });
    expect(result.id).toBe(SCENARIO_ID);
  });

  it('findAllByProject: project ไม่มีอยู่จริง → 404', async () => {
    prisma.project.findUnique.mockResolvedValue(null);
    await expect(service.findAllByProject(PROJECT_ID)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('findAllByProject: สำเร็จ', async () => {
    prisma.project.findUnique.mockResolvedValue({ id: PROJECT_ID });
    prisma.scenario.findMany.mockResolvedValue([dbScenario()]);
    const result = await service.findAllByProject(PROJECT_ID);
    expect(result).toHaveLength(1);
  });

  it('findOne: รวม changes มาด้วย', async () => {
    prisma.scenario.findUnique.mockResolvedValue({ ...dbScenario(), changes: [] });
    const result = await service.findOne(SCENARIO_ID);
    expect(prisma.scenario.findUnique).toHaveBeenCalledWith({
      where: { id: SCENARIO_ID },
      include: { changes: { orderBy: { createdAt: 'asc' } } },
    });
    expect((result as unknown as { changes: unknown[] }).changes).toEqual([]);
  });

  it('findOne: ไม่พบ → 404', async () => {
    prisma.scenario.findUnique.mockResolvedValue(null);
    await expect(service.findOne(SCENARIO_ID)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('remove: สำเร็จ', async () => {
    prisma.scenario.findUnique.mockResolvedValue(dbScenario());
    prisma.scenario.delete.mockResolvedValue(dbScenario());
    await expect(service.remove(SCENARIO_ID)).resolves.toBeUndefined();
    expect(prisma.scenario.delete).toHaveBeenCalledWith({ where: { id: SCENARIO_ID } });
  });

  it('remove: ไม่พบ → 404 ไม่เรียก delete', async () => {
    prisma.scenario.findUnique.mockResolvedValue(null);
    await expect(service.remove(SCENARIO_ID)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.scenario.delete).not.toHaveBeenCalled();
  });

  it('getScenarioOrThrow: ไม่พบ → 404 (ใช้โดย ScenarioChangesService/SimulationsService)', async () => {
    prisma.scenario.findUnique.mockResolvedValue(null);
    await expect(service.getScenarioOrThrow(SCENARIO_ID)).rejects.toBeInstanceOf(NotFoundException);
  });
});
