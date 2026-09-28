import {
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRiskDto } from './dto/create-risk.dto';
import { UpdateRiskDto } from './dto/update-risk.dto';
import { calculateRisk } from './risk-calculator';

const DB_UNREACHABLE_CODES = ['P1000', 'P1001', 'P1002', 'P1008', 'P1017'];

@Injectable()
export class RisksService {
  private readonly logger = new Logger(RisksService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(projectId: string, dto: CreateRiskDto) {
    await this.assertProjectExists(projectId);

    // Backend คำนวณ score/level เสมอ — DTO ไม่มี field เหล่านี้ให้ client ส่งมาได้อยู่แล้ว
    const { score, level } = calculateRisk(dto.probability, dto.impact);

    return this.run(() =>
      this.prisma.risk.create({
        data: {
          projectId,
          name: dto.name,
          description: dto.description,
          probability: dto.probability,
          impact: dto.impact,
          score,
          level,
          mitigation: dto.mitigation,
          contingency: dto.contingency,
          owner: dto.owner,
        },
      }),
    );
  }

  async findAllByProject(projectId: string) {
    await this.assertProjectExists(projectId);
    return this.run(() =>
      this.prisma.risk.findMany({
        where: { projectId },
        orderBy: { createdAt: 'asc' },
      }),
    );
  }

  async findOne(id: string) {
    return this.getOrThrow(id);
  }

  async update(id: string, dto: UpdateRiskDto) {
    const existing = await this.getOrThrow(id);

    // recalculate ทุกครั้งที่ probability หรือ impact เปลี่ยน โดยใช้ค่าใหม่ถ้าส่งมา ไม่งั้นใช้ค่าเดิม
    // (เขียนแบบนี้เพื่อให้ recalculate ทุกครั้งเสมอ ไม่ใช่แค่ตอนที่ทั้งคู่เปลี่ยน — กันกรณีแก้แค่ค่าเดียว)
    const probability = dto.probability ?? existing.probability;
    const impact = dto.impact ?? existing.impact;
    const { score, level } = calculateRisk(probability, impact);

    return this.run(() =>
      this.prisma.risk.update({
        where: { id },
        data: {
          name: dto.name,
          description: dto.description,
          probability,
          impact,
          score,
          level,
          mitigation: dto.mitigation,
          contingency: dto.contingency,
          owner: dto.owner,
        },
      }),
    );
  }

  async remove(id: string): Promise<void> {
    await this.getOrThrow(id);
    await this.run(() => this.prisma.risk.delete({ where: { id } }));
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
    const risk = await this.run(() => this.prisma.risk.findUnique({ where: { id } }));
    if (!risk) {
      throw new NotFoundException(`Risk with id ${id} not found`);
    }
    return risk;
  }

  private async run<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const code = (error as { code?: string })?.code;
      if (code === 'P2025') throw new NotFoundException('Risk not found');
      this.logger.error(`Database error: ${(error as Error)?.message}`);
      if (code && DB_UNREACHABLE_CODES.includes(code)) {
        throw new ServiceUnavailableException('Database is not reachable');
      }
      throw new InternalServerErrorException('Database error');
    }
  }
}
