import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { PrismaService } from '../prisma/prisma.service';
import { TaskDependenciesService } from './task-dependencies.service';

jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));

const task = (id: string, projectId = 'p1') => ({ id, projectId });

describe('TaskDependenciesService', () => {
  let service: TaskDependenciesService;
  const prisma = {
    task: { findUnique: jest.fn<(...args: any[]) => any>() },
    taskDependency: {
      findMany: jest.fn<(...args: any[]) => any>(),
      findUnique: jest.fn<(...args: any[]) => any>(),
      create: jest.fn<(...args: any[]) => any>(),
      delete: jest.fn<(...args: any[]) => any>(),
    },
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [TaskDependenciesService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(TaskDependenciesService);
  });

  // Frontend (A) depends on Backend (B) — ตัวอย่างจาก Spec
  const A = 'frontend';
  const B = 'backend';

  it('create dependency: สำเร็จ', async () => {
    prisma.task.findUnique.mockImplementation(({ where: { id } }: any) =>
      Promise.resolve(id === A ? task(A) : id === B ? task(B) : null),
    );
    prisma.taskDependency.findMany.mockResolvedValue([]);
    prisma.taskDependency.create.mockResolvedValue({ id: 'd1', taskId: A, dependsOnTaskId: B, createdAt: new Date() });

    const result = await service.create(A, { dependsOnTaskId: B });
    expect(prisma.taskDependency.create).toHaveBeenCalledWith({ data: { taskId: A, dependsOnTaskId: B } });
    expect(result.taskId).toBe(A);
  });

  it('taskId ไม่มีอยู่จริง → 404', async () => {
    prisma.task.findUnique.mockResolvedValue(null);
    await expect(service.create(A, { dependsOnTaskId: B })).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.taskDependency.create).not.toHaveBeenCalled();
  });

  it('dependsOnTaskId ไม่มีอยู่จริง → 404', async () => {
    prisma.task.findUnique.mockImplementation(({ where: { id } }: any) =>
      Promise.resolve(id === A ? task(A) : null),
    );
    await expect(service.create(A, { dependsOnTaskId: 'ghost' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('self dependency → 400', async () => {
    prisma.task.findUnique.mockResolvedValue(task(A));
    await expect(service.create(A, { dependsOnTaskId: A })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.taskDependency.create).not.toHaveBeenCalled();
  });

  it('cross-project dependency → 400', async () => {
    prisma.task.findUnique.mockImplementation(({ where: { id } }: any) =>
      Promise.resolve(id === A ? task(A, 'p1') : id === B ? task(B, 'p2') : null),
    );
    await expect(service.create(A, { dependsOnTaskId: B })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.taskDependency.create).not.toHaveBeenCalled();
  });

  it('duplicate dependency → 409', async () => {
    prisma.task.findUnique.mockImplementation(({ where: { id } }: any) =>
      Promise.resolve(id === A ? task(A) : id === B ? task(B) : null),
    );
    prisma.taskDependency.findMany.mockResolvedValue([{ taskId: A, dependsOnTaskId: B }]);
    await expect(service.create(A, { dependsOnTaskId: B })).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.taskDependency.create).not.toHaveBeenCalled();
  });

  it('direct cycle: มี B depends on A อยู่แล้ว แล้วจะสร้าง A depends on B → 409', async () => {
    prisma.task.findUnique.mockImplementation(({ where: { id } }: any) =>
      Promise.resolve(id === A ? task(A) : id === B ? task(B) : null),
    );
    prisma.taskDependency.findMany.mockResolvedValue([{ taskId: B, dependsOnTaskId: A }]);
    await expect(service.create(A, { dependsOnTaskId: B })).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.taskDependency.create).not.toHaveBeenCalled();
  });

  it('indirect cycle: A→B, B→C อยู่แล้ว แล้วจะสร้าง C→A → 409', async () => {
    const C = 'c';
    prisma.task.findUnique.mockImplementation(({ where: { id } }: any) =>
      Promise.resolve([A, B, C].includes(id) ? task(id) : null),
    );
    prisma.taskDependency.findMany.mockResolvedValue([
      { taskId: A, dependsOnTaskId: B },
      { taskId: B, dependsOnTaskId: C },
    ]);
    await expect(service.create(C, { dependsOnTaskId: A })).rejects.toBeInstanceOf(ConflictException);
  });

  it('get dependencies: task ไม่มีอยู่จริง → 404', async () => {
    prisma.task.findUnique.mockResolvedValue(null);
    await expect(service.findAllForTask(A)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('get dependencies: คืนรายการของ task นั้น', async () => {
    prisma.task.findUnique.mockResolvedValue(task(A));
    prisma.taskDependency.findMany.mockResolvedValue([{ id: 'd1', taskId: A, dependsOnTaskId: B }]);
    const result = await service.findAllForTask(A);
    expect(prisma.taskDependency.findMany).toHaveBeenCalledWith({ where: { taskId: A }, orderBy: { createdAt: 'asc' } });
    expect(result).toHaveLength(1);
  });

  it('remove: สำเร็จ', async () => {
    prisma.taskDependency.findUnique.mockResolvedValue({ id: 'd1' });
    prisma.taskDependency.delete.mockResolvedValue({ id: 'd1' });
    await expect(service.remove('d1')).resolves.toBeUndefined();
  });

  it('remove: ไม่พบ → 404', async () => {
    prisma.taskDependency.findUnique.mockResolvedValue(null);
    await expect(service.remove('d1')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.taskDependency.delete).not.toHaveBeenCalled();
  });
});
