import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { PrismaService } from '../prisma/prisma.service';
import { RisksService } from './risks.service';

jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));

const PROJECT_ID = 'p1';
const RISK_ID = 'r1';
const dbRisk = (over: Record<string, unknown> = {}) => ({
  id: RISK_ID, projectId: PROJECT_ID, name: 'Developer Shortage', description: null,
  probability: 3, impact: 4, score: 12, level: 'HIGH',
  mitigation: null, contingency: null, owner: null,
  createdAt: new Date(), updatedAt: new Date(), ...over,
});

describe('RisksService', () => {
  let service: RisksService;
  type AsyncMock = jest.MockedFunction<(...args: any[]) => Promise<any>>;
  const prisma = {
    project: { findUnique: jest.fn() as AsyncMock },
    risk: {
      create: jest.fn() as AsyncMock,
      findMany: jest.fn() as AsyncMock,
      findUnique: jest.fn() as AsyncMock,
      update: jest.fn() as AsyncMock,
      delete: jest.fn() as AsyncMock,
    },
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [RisksService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(RisksService);
  });

  const createDto = { name: 'Developer Shortage', probability: 3, impact: 4 };

  it('create risk: คำนวณ score/level อัตโนมัติ (3x4=12=HIGH) แล้วส่งให้ Prisma', async () => {
    prisma.project.findUnique.mockResolvedValue({ id: PROJECT_ID });
    prisma.risk.create.mockResolvedValue(dbRisk());

    const result = await service.create(PROJECT_ID, createDto);

    expect(prisma.risk.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ projectId: PROJECT_ID, probability: 3, impact: 4, score: 12, level: 'HIGH' }),
    });
    expect((result as { score: number }).score).toBe(12);
    expect((result as { level: string }).level).toBe('HIGH');
  });

  it('create risk: client ส่ง score/level มาด้วย → ต้องถูกละเลย ใช้ค่าที่คำนวณเองเท่านั้น', async () => {
    prisma.project.findUnique.mockResolvedValue({ id: PROJECT_ID });
    prisma.risk.create.mockResolvedValue(dbRisk());

    // จำลองว่า DTO หลุดมาได้ (ในความเป็นจริง ValidationPipe จะปฏิเสธ request นี้ไปแล้วที่ชั้น HTTP)
    const spoofedDto = { ...createDto, score: 999, level: 'LOW' } as typeof createDto;
    await service.create(PROJECT_ID, spoofedDto);

    expect(prisma.risk.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ score: 12, level: 'HIGH' }),
    });
  });

  it('create risk: project ไม่มีอยู่จริง → 404 ไม่เรียก create', async () => {
    prisma.project.findUnique.mockResolvedValue(null);
    await expect(service.create(PROJECT_ID, createDto)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.risk.create).not.toHaveBeenCalled();
  });

  it('get risks by project: project ไม่มีอยู่จริง → 404', async () => {
    prisma.project.findUnique.mockResolvedValue(null);
    await expect(service.findAllByProject(PROJECT_ID)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('get risks by project: สำเร็จ', async () => {
    prisma.project.findUnique.mockResolvedValue({ id: PROJECT_ID });
    prisma.risk.findMany.mockResolvedValue([dbRisk(), dbRisk({ id: 'r2' })]);
    const result = await service.findAllByProject(PROJECT_ID);
    expect(result).toHaveLength(2);
  });

  it('get risk by id: สำเร็จ', async () => {
    prisma.risk.findUnique.mockResolvedValue(dbRisk());
    const result = await service.findOne(RISK_ID);
    expect((result as { id: string }).id).toBe(RISK_ID);
  });

  it('get risk by id: ไม่พบ → 404', async () => {
    prisma.risk.findUnique.mockResolvedValue(null);
    await expect(service.findOne(RISK_ID)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('update risk: เปลี่ยน probability → recalculate score/level ใหม่', async () => {
    prisma.risk.findUnique.mockResolvedValue(dbRisk({ probability: 3, impact: 4, score: 12, level: 'HIGH' }));
    prisma.risk.update.mockResolvedValue(dbRisk({ probability: 5, score: 20, level: 'CRITICAL' }));

    await service.update(RISK_ID, { probability: 5 });

    expect(prisma.risk.update).toHaveBeenCalledWith({
      where: { id: RISK_ID },
      data: expect.objectContaining({ probability: 5, impact: 4, score: 20, level: 'CRITICAL' }),
    });
  });

  it('update risk: เปลี่ยน impact → recalculate score/level ใหม่', async () => {
    prisma.risk.findUnique.mockResolvedValue(dbRisk({ probability: 3, impact: 4, score: 12, level: 'HIGH' }));
    prisma.risk.update.mockResolvedValue(dbRisk({ impact: 1, score: 3, level: 'LOW' }));

    await service.update(RISK_ID, { impact: 1 });

    expect(prisma.risk.update).toHaveBeenCalledWith({
      where: { id: RISK_ID },
      data: expect.objectContaining({ probability: 3, impact: 1, score: 3, level: 'LOW' }),
    });
  });

  it('update risk: ไม่แก้ probability/impact เลย → score/level ยังคงถูกคำนวณซ้ำจากค่าเดิม (deterministic)', async () => {
    prisma.risk.findUnique.mockResolvedValue(dbRisk({ probability: 3, impact: 4, score: 12, level: 'HIGH' }));
    prisma.risk.update.mockResolvedValue(dbRisk({ name: 'Updated name' }));

    await service.update(RISK_ID, { name: 'Updated name' });

    expect(prisma.risk.update).toHaveBeenCalledWith({
      where: { id: RISK_ID },
      data: expect.objectContaining({ score: 12, level: 'HIGH' }),
    });
  });

  it('update risk: client ส่ง score/level มาด้วย → ต้องถูกละเลย', async () => {
    prisma.risk.findUnique.mockResolvedValue(dbRisk({ probability: 3, impact: 4 }));
    prisma.risk.update.mockResolvedValue(dbRisk());

    const spoofedDto = { score: 1, level: 'LOW' } as unknown as { probability?: number; impact?: number };
    await service.update(RISK_ID, spoofedDto);

    expect(prisma.risk.update).toHaveBeenCalledWith({
      where: { id: RISK_ID },
      data: expect.objectContaining({ score: 12, level: 'HIGH' }),
    });
  });

  it('update risk: ไม่พบ → 404 ไม่เรียก update', async () => {
    prisma.risk.findUnique.mockResolvedValue(null);
    await expect(service.update(RISK_ID, { name: 'x' })).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.risk.update).not.toHaveBeenCalled();
  });

  it('delete risk: สำเร็จ', async () => {
    prisma.risk.findUnique.mockResolvedValue(dbRisk());
    prisma.risk.delete.mockResolvedValue(dbRisk());
    await expect(service.remove(RISK_ID)).resolves.toBeUndefined();
    expect(prisma.risk.delete).toHaveBeenCalledWith({ where: { id: RISK_ID } });
  });

  it('delete risk: ไม่พบ → 404 ไม่เรียก delete', async () => {
    prisma.risk.findUnique.mockResolvedValue(null);
    await expect(service.remove(RISK_ID)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.risk.delete).not.toHaveBeenCalled();
  });
});
