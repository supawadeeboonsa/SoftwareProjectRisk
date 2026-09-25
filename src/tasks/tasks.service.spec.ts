import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { TasksService } from './tasks.service';

jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));

const PROJECT_ID = 'p1';
const TASK_ID = 't1';
const dbTask = (over: Record<string, unknown> = {}) => ({
  id: TASK_ID, projectId: PROJECT_ID, name: 'Backend Development', description: null,
  duration: 15, status: 'TODO', createdAt: new Date(), updatedAt: new Date(), ...over,
});

describe('TasksService', () => {
  let service: TasksService;
  const prisma = {
    project: { findUnique: jest.fn() },
    task: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [TasksService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(TasksService);
  });

  it('create task: project ไม่มีอยู่จริง → 404 ไม่เรียก create', async () => {
    prisma.project.findUnique.mockResolvedValue(null);
    await expect(service.create(PROJECT_ID, { name: 'X', duration: 5 })).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.task.create).not.toHaveBeenCalled();
  });

  it('create task: สำเร็จ', async () => {
    prisma.project.findUnique.mockResolvedValue({ id: PROJECT_ID });
    prisma.task.create.mockResolvedValue(dbTask());
    const result = await service.create(PROJECT_ID, { name: 'Backend Development', duration: 15 });
    expect(prisma.task.create).toHaveBeenCalledWith({
      data: { projectId: PROJECT_ID, name: 'Backend Development', description: undefined, duration: 15, status: undefined },
    });
    expect(result.id).toBe(TASK_ID);
  });

  it('get tasks: project ไม่มีอยู่จริง → 404', async () => {
    prisma.project.findUnique.mockResolvedValue(null);
    await expect(service.findAllByProject(PROJECT_ID)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('get tasks: คืน list ของ project นั้น', async () => {
    prisma.project.findUnique.mockResolvedValue({ id: PROJECT_ID });
    prisma.task.findMany.mockResolvedValue([dbTask(), dbTask({ id: 't2' })]);
    const result = await service.findAllByProject(PROJECT_ID);
    expect(prisma.task.findMany).toHaveBeenCalledWith({ where: { projectId: PROJECT_ID }, orderBy: { createdAt: 'asc' } });
    expect(result).toHaveLength(2);
  });

  it('update task: สำเร็จ', async () => {
    prisma.task.findUnique.mockResolvedValue(dbTask());
    prisma.task.update.mockResolvedValue(dbTask({ status: 'IN_PROGRESS' }));
    const result = await service.update(TASK_ID, { status: 'IN_PROGRESS' as any });
    expect(result.status).toBe('IN_PROGRESS');
  });

  it('update task: ไม่พบ → 404', async () => {
    prisma.task.findUnique.mockResolvedValue(null);
    await expect(service.update(TASK_ID, { name: 'x' })).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.task.update).not.toHaveBeenCalled();
  });

  it('delete task: สำเร็จ', async () => {
    prisma.task.findUnique.mockResolvedValue(dbTask());
    prisma.task.delete.mockResolvedValue(dbTask());
    await expect(service.remove(TASK_ID)).resolves.toBeUndefined();
    expect(prisma.task.delete).toHaveBeenCalledWith({ where: { id: TASK_ID } });
  });

  it('delete task: ไม่พบ → 404 ไม่เรียก delete', async () => {
    prisma.task.findUnique.mockResolvedValue(null);
    await expect(service.remove(TASK_ID)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.task.delete).not.toHaveBeenCalled();
  });
});
