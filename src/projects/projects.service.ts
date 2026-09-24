import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

// รหัส error ของ Prisma ที่แปลว่า "ต่อฐานข้อมูลไม่ได้"
const DB_UNREACHABLE_CODES = ['P1000', 'P1001', 'P1002', 'P1008', 'P1017'];

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProjectDto) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    this.assertDateRange(startDate, endDate);

    const project = await this.run(() =>
      this.prisma.project.create({
        data: {
          name: dto.name,
          description: dto.description,
          startDate,
          endDate,
          budget: dto.budget,
          teamSize: dto.teamSize,
          status: dto.status, // ถ้าไม่ส่ง ฐานข้อมูลใช้ค่า default = PLANNING
        },
      }),
    );
    return this.toResponse(project);
  }

  async findAll() {
    const projects = await this.run(() =>
      this.prisma.project.findMany({ orderBy: { createdAt: 'desc' } }),
    );
    return projects.map((p) => this.toResponse(p));
  }

  async findOne(id: string) {
    return this.toResponse(await this.getOrThrow(id));
  }

  async update(id: string, dto: UpdateProjectDto) {
    const existing = await this.getOrThrow(id);

    // ตรวจช่วงวันที่จากค่าที่จะเป็นหลังแก้ (ค่าใหม่ ถ้าไม่ส่งใช้ค่าเดิม)
    const startDate = dto.startDate ? new Date(dto.startDate) : existing.startDate;
    const endDate = dto.endDate ? new Date(dto.endDate) : existing.endDate;
    this.assertDateRange(startDate, endDate);

    const project = await this.run(() =>
      this.prisma.project.update({
        where: { id },
        data: {
          name: dto.name,
          description: dto.description,
          startDate: dto.startDate ? startDate : undefined,
          endDate: dto.endDate ? endDate : undefined,
          budget: dto.budget,
          teamSize: dto.teamSize,
          status: dto.status,
        },
      }),
    );
    return this.toResponse(project);
  }

  async remove(id: string): Promise<void> {
    await this.getOrThrow(id);
    await this.run(() => this.prisma.project.delete({ where: { id } }));
  }

  // ---------- helpers ----------

  private async getOrThrow(id: string) {
    const project = await this.run(() =>
      this.prisma.project.findUnique({ where: { id } }),
    );
    if (!project) {
      throw new NotFoundException(`Project with id ${id} not found`);
    }
    return project;
  }

  private assertDateRange(startDate: Date, endDate: Date) {
    if (startDate.getTime() > endDate.getTime()) {
      throw new BadRequestException(
        'Invalid date range: startDate must not be later than endDate',
      );
    }
  }

  // Prisma Decimal → number เพื่อให้ JSON เป็นตัวเลข (ไม่ใช่ string)
  private toResponse<T extends { budget: unknown }>(
    project: T,
  ): Omit<T, 'budget'> & { budget: number } {
    return { ...project, budget: Number(project.budget) };
  }

  // ครอบการเรียกฐานข้อมูล แล้วแปลง error ของ DB เป็น HTTP error ที่อ่านเข้าใจ
  private async run<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof HttpException) throw error;

      const code = (error as { code?: string })?.code;
      if (code === 'P2025') {
        // record ที่จะแก้/ลบหายไประหว่างทาง
        throw new NotFoundException('Project not found');
      }

      this.logger.error(`Database error: ${(error as Error)?.message}`);
      if (code && DB_UNREACHABLE_CODES.includes(code)) {
        throw new ServiceUnavailableException('Database is not reachable');
      }
      throw new InternalServerErrorException('Database error');
    }
  }
}
