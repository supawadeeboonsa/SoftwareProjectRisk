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
import { CreateScenarioChangeDto } from './dto/create-scenario-change.dto';
import { ScenarioChangeFactor } from './scenario-factor';
import { ScenariosService } from './scenarios.service';

const DB_UNREACHABLE_CODES = ['P1000', 'P1001', 'P1002', 'P1008', 'P1017'];

@Injectable()
export class ScenarioChangesService {
  private readonly logger = new Logger(ScenarioChangesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scenariosService: ScenariosService,
  ) {}

  async create(scenarioId: string, dto: CreateScenarioChangeDto) {
    const scenario = await this.scenariosService.getScenarioOrThrow(scenarioId);
    await this.validateChange(scenario.projectId, dto);

    return this.run(() =>
      this.prisma.scenarioChange.create({
        data: {
          scenarioId,
          factor: dto.factor,
          taskId: dto.taskId,
          riskId: dto.riskId,
          newValue: dto.newValue,
        },
      }),
    );
  }

  async findAllForScenario(scenarioId: string) {
    await this.scenariosService.getScenarioOrThrow(scenarioId);
    return this.run(() =>
      this.prisma.scenarioChange.findMany({
        where: { scenarioId },
        orderBy: { createdAt: 'asc' },
      }),
    );
  }

  async remove(id: string): Promise<void> {
    const exists = await this.run(() =>
      this.prisma.scenarioChange.findUnique({ where: { id } }),
    );
    if (!exists) {
      throw new NotFoundException(`Scenario change with id ${id} not found`);
    }
    await this.run(() => this.prisma.scenarioChange.delete({ where: { id } }));
  }

  // ---------- validation ตาม factor (PHASE 4 BUSINESS LOGIC FREEZE ข้อ 14) ----------

  private async validateChange(scenarioProjectId: string, dto: CreateScenarioChangeDto) {
    switch (dto.factor) {
      case ScenarioChangeFactor.BUDGET:
        this.rejectExtraTargets(dto, 'BUDGET');
        if (dto.newValue < 0) throw new BadRequestException('budget must be >= 0');
        return;

      case ScenarioChangeFactor.TEAM_SIZE:
        this.rejectExtraTargets(dto, 'TEAM_SIZE');
        this.assertPositiveInteger(dto.newValue, 'teamSize');
        return;

      case ScenarioChangeFactor.TASK_DURATION: {
        if (!dto.taskId) {
          throw new BadRequestException('taskId is required when factor is TASK_DURATION');
        }
        if (dto.riskId) {
          throw new BadRequestException('riskId must not be set when factor is TASK_DURATION');
        }
        const taskId = dto.taskId; // capture ค่าที่ narrow แล้ว ก่อนใช้ใน closure ของ this.run()
        this.assertPositiveInteger(dto.newValue, 'task duration');
        const task = await this.run(() => this.prisma.task.findUnique({ where: { id: taskId } }));
        if (!task) {
          throw new NotFoundException(`Task not found (taskId: ${taskId})`);
        }
        if (task.projectId !== scenarioProjectId) {
          throw new BadRequestException('taskId must belong to the same project as the scenario');
        }
        return;
      }

      case ScenarioChangeFactor.RISK_PROBABILITY:
      case ScenarioChangeFactor.RISK_IMPACT: {
        if (!dto.riskId) {
          throw new BadRequestException(`riskId is required when factor is ${dto.factor}`);
        }
        if (dto.taskId) {
          throw new BadRequestException(`taskId must not be set when factor is ${dto.factor}`);
        }
        const riskId = dto.riskId; // capture ค่าที่ narrow แล้ว ก่อนใช้ใน closure ของ this.run()
        this.assertIntegerInRange(dto.newValue, 1, 5, dto.factor === 'RISK_PROBABILITY' ? 'probability' : 'impact');
        const risk = await this.run(() => this.prisma.risk.findUnique({ where: { id: riskId } }));
        if (!risk) {
          throw new NotFoundException(`Risk not found (riskId: ${riskId})`);
        }
        if (risk.projectId !== scenarioProjectId) {
          throw new BadRequestException('riskId must belong to the same project as the scenario');
        }
        return;
      }
    }
  }

  private rejectExtraTargets(dto: CreateScenarioChangeDto, factor: string) {
    if (dto.taskId) throw new BadRequestException(`taskId must not be set when factor is ${factor}`);
    if (dto.riskId) throw new BadRequestException(`riskId must not be set when factor is ${factor}`);
  }

  private assertPositiveInteger(value: number, label: string) {
    if (!Number.isInteger(value) || value < 1) {
      throw new BadRequestException(`${label} must be an integer >= 1 (got ${value})`);
    }
  }

  private assertIntegerInRange(value: number, min: number, max: number, label: string) {
    if (!Number.isInteger(value) || value < min || value > max) {
      throw new BadRequestException(`${label} must be an integer between ${min} and ${max} (got ${value})`);
    }
  }

  private async run<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const code = (error as { code?: string })?.code;
      if (code === 'P2025') throw new NotFoundException('Scenario change not found');
      this.logger.error(`Database error: ${(error as Error)?.message}`);
      if (code && DB_UNREACHABLE_CODES.includes(code)) {
        throw new ServiceUnavailableException('Database is not reachable');
      }
      throw new InternalServerErrorException('Database error');
    }
  }
}
