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
import { ScenariosService } from '../scenarios/scenarios.service';
import { runSimulation, SimulationChangeInput } from '../simulation-engine/simulation-engine';
import { Prisma } from '../generated/prisma/client';

const DB_UNREACHABLE_CODES = ['P1000', 'P1001', 'P1002', 'P1008', 'P1017'];

@Injectable()
export class SimulationsService {
  private readonly logger = new Logger(SimulationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scenariosService: ScenariosService,
  ) {}

  async simulate(scenarioId: string) {
    const scenario = await this.scenariosService.getScenarioOrThrow(scenarioId);

    const changeRows = await this.run(() =>
      this.prisma.scenarioChange.findMany({ where: { scenarioId } }),
    );
    if (changeRows.length === 0) {
      throw new BadRequestException('Scenario has no changes to simulate');
    }

    // Current Project state — "before" มาจากฐานข้อมูลเสมอ ไม่รับจาก client (Freeze ข้อ 2, 16)
    const project = await this.run(() =>
      this.prisma.project.findUnique({ where: { id: scenario.projectId } }),
    );
    if (!project) {
      // ไม่ควรเกิดขึ้นได้ (Scenario ผูกกับ Project ผ่าน FK) แต่กันไว้เผื่อข้อมูลไม่สมบูรณ์
      throw new NotFoundException(`Project with id ${scenario.projectId} not found`);
    }

    const [taskRows, dependencyRows] = await Promise.all([
      this.run(() => this.prisma.task.findMany({ where: { projectId: scenario.projectId } })),
      this.run(() =>
        this.prisma.taskDependency.findMany({ where: { task: { projectId: scenario.projectId } } }),
      ),
    ]);

    const riskIds = [...new Set(changeRows.map((c) => c.riskId).filter((id): id is string => !!id))];
    const riskRows = riskIds.length
      ? await this.run(() => this.prisma.risk.findMany({ where: { id: { in: riskIds } } }))
      : [];

    const changes: SimulationChangeInput[] = changeRows.map((c) => ({
      factor: c.factor,
      taskId: c.taskId ?? undefined,
      riskId: c.riskId ?? undefined,
      newValue: Number(c.newValue),
    }));

    let outcome;
    try {
      outcome = runSimulation(
        { teamSize: project.teamSize, budget: Number(project.budget) },
        taskRows.map((t) => ({ id: t.id, duration: t.duration })),
        dependencyRows.map((d) => ({ taskId: d.taskId, dependsOnTaskId: d.dependsOnTaskId })),
        riskRows.map((r) => ({ id: r.id, name: r.name, probability: r.probability, impact: r.impact })),
        changes,
      );
    } catch (error) {
      // Engine throw เมื่อ: อ้างถึง Task/Risk ที่ถูกลบไปหลังสร้าง ScenarioChange, หรือ Task graph
      // กลายเป็น invalid (ไม่ควรเกิดถ้า Phase 2 ตรวจ circular dependency ถูกต้องตั้งแต่แรก)
      // ทั้งสองกรณีคือ "สถานะข้อมูลไม่สอดคล้องกัน ณ เวลารัน" จึงตอบ 409 ไม่ใช่ 500
      throw new ConflictException((error as Error).message);
    }

    const created = await this.run(() =>
      this.prisma.simulation.create({
        data: {
          scenarioId,
          formulaVersion: outcome.formulaVersion,
          beforeDuration: outcome.beforeDuration,
          afterDuration: outcome.afterDuration,
          durationChange: outcome.durationChange,
          beforeBudget: outcome.beforeBudget,
          afterBudget: outcome.afterBudget,
          budgetChange: outcome.budgetChange,
          budgetChangePercent: outcome.budgetChangePercent,
          beforeTeamSize: outcome.beforeTeamSize,
          afterTeamSize: outcome.afterTeamSize,
          riskChanges: outcome.riskChanges as unknown as Prisma.InputJsonValue,
          impactSummary: outcome.impactSummary,
          recommendation: outcome.recommendation,
        },
      }),
    );
    return this.toResponse(created);
  }

  async findOne(id: string) {
    const simulation = await this.run(() =>
      this.prisma.simulation.findUnique({ where: { id } }),
    );
    if (!simulation) {
      throw new NotFoundException(`Simulation with id ${id} not found`);
    }
    return this.toResponse(simulation);
  }

  async findAllForScenario(scenarioId: string) {
    await this.scenariosService.getScenarioOrThrow(scenarioId);
    const simulations = await this.run(() =>
      this.prisma.simulation.findMany({
        where: { scenarioId },
        orderBy: { executedAt: 'desc' },
      }),
    );
    return simulations.map((s) => this.toResponse(s));
  }

  // ---------- helpers ----------

  // Prisma Decimal → number เพื่อให้ JSON เป็นตัวเลข (เหมือน ProjectsService.toResponse)
  private toResponse<
    T extends { beforeBudget: unknown; afterBudget: unknown; budgetChange: unknown; budgetChangePercent: unknown },
  >(simulation: T) {
    return {
      ...simulation,
      beforeBudget: Number(simulation.beforeBudget),
      afterBudget: Number(simulation.afterBudget),
      budgetChange: Number(simulation.budgetChange),
      budgetChangePercent:
        simulation.budgetChangePercent === null ? null : Number(simulation.budgetChangePercent),
    };
  }

  private async run<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const code = (error as { code?: string })?.code;
      if (code === 'P2025') throw new NotFoundException('Simulation not found');
      this.logger.error(`Database error: ${(error as Error)?.message}`);
      if (code && DB_UNREACHABLE_CODES.includes(code)) {
        throw new ServiceUnavailableException('Database is not reachable');
      }
      throw new InternalServerErrorException('Database error');
    }
  }
}
