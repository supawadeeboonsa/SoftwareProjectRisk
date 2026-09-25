import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DependencyEdge, wouldCreateCycle } from '../scheduling/circular-dependency';
import { CreateTaskDependencyDto } from './dto/create-task-dependency.dto';

const DB_UNREACHABLE_CODES = ['P1000', 'P1001', 'P1002', 'P1008', 'P1017'];

@Injectable()
export class TaskDependenciesService {
  private readonly logger = new Logger(TaskDependenciesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(taskId: string, dto: CreateTaskDependencyDto) {
    const task = await this.getTaskOrThrow(taskId, 'taskId');

    if (taskId === dto.dependsOnTaskId) {
      throw new BadRequestException('A task cannot depend on itself');
    }

    const dependsOnTask = await this.getTaskOrThrow(dto.dependsOnTaskId, 'dependsOnTaskId');

    if (dependsOnTask.projectId !== task.projectId) {
      throw new BadRequestException(
        'taskId and dependsOnTaskId must belong to the same project',
      );
    }

    const projectEdges = await this.getProjectEdges(task.projectId);

    const isDuplicate = projectEdges.some(
      (e) => e.taskId === taskId && e.dependsOnTaskId === dto.dependsOnTaskId,
    );
    if (isDuplicate) {
      throw new ConflictException('This dependency already exists');
    }

    const cycle = wouldCreateCycle(projectEdges, {
      taskId,
      dependsOnTaskId: dto.dependsOnTaskId,
    });
    if (cycle) {
      throw new ConflictException(
        `Creating this dependency would introduce a circular dependency: ${cycle.join(' -> ')}`,
      );
    }

    return this.run(() =>
      this.prisma.taskDependency.create({
        data: { taskId, dependsOnTaskId: dto.dependsOnTaskId },
      }),
    );
  }

  async findAllForTask(taskId: string) {
    await this.getTaskOrThrow(taskId, 'taskId');
    return this.run(() =>
      this.prisma.taskDependency.findMany({
        where: { taskId },
        orderBy: { createdAt: 'asc' },
      }),
    );
  }

  async remove(id: string): Promise<void> {
    const existing = await this.run(() =>
      this.prisma.taskDependency.findUnique({ where: { id } }),
    );
    if (!existing) {
      throw new NotFoundException(`Task dependency with id ${id} not found`);
    }
    await this.run(() => this.prisma.taskDependency.delete({ where: { id } }));
  }

  // ---------- helpers ----------

  private async getTaskOrThrow(id: string, fieldLabel: string) {
    const task = await this.run(() => this.prisma.task.findUnique({ where: { id } }));
    if (!task) {
      throw new NotFoundException(`Task not found (${fieldLabel}: ${id})`);
    }
    return task;
  }

  // Cycle เกิดขึ้นได้เฉพาะภายใน Project เดียวกัน (สร้าง dependency ข้าม Project ไม่ได้อยู่แล้ว)
  // จึงดึงเฉพาะ dependency ของ Task ในโปรเจกต์นี้มาตรวจ ไม่ดึงทั้งฐานข้อมูล
  private async getProjectEdges(projectId: string): Promise<DependencyEdge[]> {
    const rows = await this.run(() =>
      this.prisma.taskDependency.findMany({
        where: { task: { projectId } },
        select: { taskId: true, dependsOnTaskId: true },
      }),
    );
    return rows;
  }

  private async run<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const code = (error as { code?: string })?.code;
      if (code === 'P2025') throw new NotFoundException('Task dependency not found');
      if (code === 'P2002') throw new ConflictException('This dependency already exists');
      this.logger.error(`Database error: ${(error as Error)?.message}`);
      if (code && DB_UNREACHABLE_CODES.includes(code)) {
        throw new ServiceUnavailableException('Database is not reachable');
      }
      throw new InternalServerErrorException('Database error');
    }
  }
}
