import {
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

const DB_UNREACHABLE_CODES = ['P1000', 'P1001', 'P1002', 'P1008', 'P1017'];

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(projectId: string, dto: CreateTaskDto) {
    await this.assertProjectExists(projectId);
    return this.run(() =>
      this.prisma.task.create({
        data: {
          projectId,
          name: dto.name,
          description: dto.description,
          duration: dto.duration,
          status: dto.status, // ไม่ส่ง = default TODO
        },
      }),
    );
  }

  async findAllByProject(projectId: string) {
    await this.assertProjectExists(projectId);
    return this.run(() =>
      this.prisma.task.findMany({
        where: { projectId },
        orderBy: { createdAt: 'asc' },
      }),
    );
  }

  async findOne(id: string) {
    return this.getOrThrow(id);
  }

  async update(id: string, dto: UpdateTaskDto) {
    await this.getOrThrow(id);
    return this.run(() =>
      this.prisma.task.update({
        where: { id },
        data: {
          name: dto.name,
          description: dto.description,
          duration: dto.duration,
          status: dto.status,
        },
      }),
    );
  }

  async remove(id: string): Promise<void> {
    await this.getOrThrow(id);
    await this.run(() => this.prisma.task.delete({ where: { id } }));
    // หมายเหตุ: ลบ Task แล้ว TaskDependency ที่เกี่ยวข้องถูกลบตาม (onDelete: Cascade ใน schema)
  }

  // ---------- helpers ----------

  private async assertProjectExists(projectId: string) {
    const project = await this.run(() =>
      this.prisma.project.findUnique({ where: { id: projectId } }),
    );
    if (!project) {
      throw new NotFoundException(`Project with id ${projectId} not found`);
    }
  }

  private async getOrThrow(id: string) {
    const task = await this.run(() => this.prisma.task.findUnique({ where: { id } }));
    if (!task) {
      throw new NotFoundException(`Task with id ${id} not found`);
    }
    return task;
  }

  private async run<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const code = (error as { code?: string })?.code;
      if (code === 'P2025') throw new NotFoundException('Task not found');
      this.logger.error(`Database error: ${(error as Error)?.message}`);
      if (code && DB_UNREACHABLE_CODES.includes(code)) {
        throw new ServiceUnavailableException('Database is not reachable');
      }
      throw new InternalServerErrorException('Database error');
    }
  }
}
