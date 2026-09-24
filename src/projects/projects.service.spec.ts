import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from './projects.service';

// ไม่โหลดไฟล์จริง เพราะต้องใช้ Prisma client ที่ generate แล้ว (Unit test ใช้ mock)
jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));

const ID = '3f0c1c1e-6a53-4b7a-9c58-2b1f0d6f9a10';

// Prisma Decimal serialize เป็น string ตัวเลข → ทดสอบว่า service แปลงเป็น number
const dbProject = (over: Record<string, unknown> = {}) => ({
  id: ID,
  name: 'E-Commerce Platform',
  description: null,
  startDate: new Date('2026-01-01'),
  endDate: new Date('2026-03-01'),
  budget: '100000.00',
  teamSize: 5,
  status: 'PLANNING',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  ...over,
});

describe('ProjectsService', () => {
  let service: ProjectsService;
  const prisma = {
    project: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [ProjectsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(ProjectsService);
  });

  const createDto = {
    name: 'E-Commerce Platform',
    startDate: '2026-01-01',
    endDate: '2026-03-01',
    budget: 100000,
    teamSize: 5,
  };

  it('create project: บันทึกและคืนค่า budget เป็น number', async () => {
    prisma.project.create.mockResolvedValue(dbProject());
    const result = await service.create(createDto);

    expect(prisma.project.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'E-Commerce Platform',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-03-01'),
        budget: 100000,
        teamSize: 5,
      }),
    });
    expect(result.budget).toBe(100000);
    expect(result.id).toBe(ID);
  });

  it('create project: invalid date range → 400 และไม่เรียก DB', async () => {
    await expect(
      service.create({ ...createDto, startDate: '2026-04-01', endDate: '2026-03-01' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.project.create).not.toHaveBeenCalled();
  });

  it('create project: startDate เท่ากับ endDate ได้', async () => {
    prisma.project.create.mockResolvedValue(dbProject());
    await expect(
      service.create({ ...createDto, startDate: '2026-01-01', endDate: '2026-01-01' }),
    ).resolves.toBeDefined();
  });

  it('get all projects', async () => {
    prisma.project.findMany.mockResolvedValue([dbProject(), dbProject({ id: 'x' })]);
    const result = await service.findAll();
    expect(result).toHaveLength(2);
    expect(result[0].budget).toBe(100000);
  });

  it('get project', async () => {
    prisma.project.findUnique.mockResolvedValue(dbProject());
    const result = await service.findOne(ID);
    expect(prisma.project.findUnique).toHaveBeenCalledWith({ where: { id: ID } });
    expect(result.name).toBe('E-Commerce Platform');
  });

  it('project not found → 404', async () => {
    prisma.project.findUnique.mockResolvedValue(null);
    await expect(service.findOne(ID)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('update project', async () => {
    prisma.project.findUnique.mockResolvedValue(dbProject());
    prisma.project.update.mockResolvedValue(dbProject({ name: 'New', teamSize: 3 }));
    const result = await service.update(ID, { name: 'New', teamSize: 3 });

    expect(prisma.project.update).toHaveBeenCalledWith({
      where: { id: ID },
      data: expect.objectContaining({ name: 'New', teamSize: 3, startDate: undefined }),
    });
    expect(result.teamSize).toBe(3);
  });

  it('update project not found → 404 และไม่เรียก update', async () => {
    prisma.project.findUnique.mockResolvedValue(null);
    await expect(service.update(ID, { name: 'x' })).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.project.update).not.toHaveBeenCalled();
  });

  it('update: invalid date range เมื่อส่งแค่ endDate ที่ก่อน startDate เดิม', async () => {
    prisma.project.findUnique.mockResolvedValue(dbProject()); // start = 2026-01-01
    await expect(service.update(ID, { endDate: '2025-12-31' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.project.update).not.toHaveBeenCalled();
  });

  it('update: invalid date range เมื่อส่งแค่ startDate ที่หลัง endDate เดิม', async () => {
    prisma.project.findUnique.mockResolvedValue(dbProject()); // end = 2026-03-01
    await expect(service.update(ID, { startDate: '2026-03-02' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('delete project', async () => {
    prisma.project.findUnique.mockResolvedValue(dbProject());
    prisma.project.delete.mockResolvedValue(dbProject());
    await expect(service.remove(ID)).resolves.toBeUndefined();
    expect(prisma.project.delete).toHaveBeenCalledWith({ where: { id: ID } });
  });

  it('delete project not found → 404 และไม่เรียก delete', async () => {
    prisma.project.findUnique.mockResolvedValue(null);
    await expect(service.remove(ID)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.project.delete).not.toHaveBeenCalled();
  });

  describe('database error', () => {
    it('ต่อ DB ไม่ได้ (P1001) → 503', async () => {
      prisma.project.findMany.mockRejectedValue(
        Object.assign(new Error("Can't reach database"), { code: 'P1001' }),
      );
      await expect(service.findAll()).rejects.toBeInstanceOf(ServiceUnavailableException);
    });

    it('error อื่นจาก DB → 500', async () => {
      prisma.project.findMany.mockRejectedValue(new Error('boom'));
      await expect(service.findAll()).rejects.toBeInstanceOf(InternalServerErrorException);
    });

    it('record หายระหว่าง update (P2025) → 404', async () => {
      prisma.project.findUnique.mockResolvedValue(dbProject());
      prisma.project.update.mockRejectedValue(
        Object.assign(new Error('not found'), { code: 'P2025' }),
      );
      await expect(service.update(ID, { name: 'x' })).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
