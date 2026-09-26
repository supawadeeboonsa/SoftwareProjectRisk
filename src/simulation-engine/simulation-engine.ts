// Pure function: ไม่พึ่ง Database / NestJS / Prisma
// ประกอบ Logic จาก 3 Phase ก่อนหน้าเข้าด้วยกัน (ไม่สร้างสูตรใหม่ซ้ำซ้อน):
//   - CPM (src/scheduling/cpm.ts)               → Duration
//   - Risk Calculator (src/risks/risk-calculator.ts) → Score/Level
//   - Team Size Elasticity + Budget Change (ไฟล์ในโฟลเดอร์นี้)
//
// ลำดับการคำนวณ Duration (ข้อกำหนดที่เราเลือกเอง ไม่ได้ระบุละเอียดใน Business Logic Freeze):
//   1) Apply TASK_DURATION changes เข้ากับ Task ที่เกี่ยวข้อง
//   2) รัน CPM ใหม่ (ตาม Freeze ข้อ 5 — ห้ามบวกตรงๆ)
//   3) ถ้ามี TEAM_SIZE change: ใช้ผลจากข้อ 2 เป็น D_old แล้วคูณ elasticity อีกที
//   วิธีนี้ทำให้เปลี่ยน TASK_DURATION และ TEAM_SIZE พร้อมกันใน Scenario เดียวได้ถูกต้อง
//   และให้ผลเหมือนกับคูณที่ Project Duration ตรงๆ ทุกกรณีที่ไม่มี TASK_DURATION change

import { DependencyEdge } from '../scheduling/circular-dependency';
import { calculateCPM, CpmTaskInput } from '../scheduling/cpm';
import { calculateRisk, RiskLevel } from '../risks/risk-calculator';
import { calculateBudgetChange } from './budget-change';
import { applyTeamSizeElasticity, DEFAULT_PARALLELIZATION_FACTOR } from './team-size-elasticity';

export type ScenarioChangeFactor =
  | 'BUDGET'
  | 'TEAM_SIZE'
  | 'TASK_DURATION'
  | 'RISK_PROBABILITY'
  | 'RISK_IMPACT';

export interface SimulationChangeInput {
  factor: ScenarioChangeFactor;
  taskId?: string;
  riskId?: string;
  newValue: number;
}

export interface SimulationProjectInput {
  teamSize: number;
  budget: number;
}

export interface SimulationRiskInput {
  id: string;
  name: string;
  probability: number;
  impact: number;
}

export interface SimulationRiskChangeResult {
  riskId: string;
  name: string;
  beforeProbability: number;
  beforeImpact: number;
  beforeScore: number;
  beforeLevel: RiskLevel;
  afterProbability: number;
  afterImpact: number;
  afterScore: number;
  afterLevel: RiskLevel;
}

export interface SimulationOutcome {
  formulaVersion: '1.0';
  beforeDuration: number;
  afterDuration: number;
  durationChange: number;
  beforeBudget: number;
  afterBudget: number;
  budgetChange: number;
  budgetChangePercent: number | null;
  beforeTeamSize: number;
  afterTeamSize: number;
  riskChanges: SimulationRiskChangeResult[];
  impactSummary: string[];
  recommendation: string[];
}

export const FORMULA_VERSION = '1.0';

const LEVEL_RANK: Record<RiskLevel, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };

function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

export function runSimulation(
  project: SimulationProjectInput,
  tasks: CpmTaskInput[],
  dependencies: DependencyEdge[],
  risks: SimulationRiskInput[],
  changes: SimulationChangeInput[],
  parallelizationFactor: number = DEFAULT_PARALLELIZATION_FACTOR,
): SimulationOutcome {
  // ----- Before: snapshot จาก CPM บน Task/Dependency ปัจจุบัน (ไม่แก้ไขอะไร) -----
  const beforeCpm = calculateCPM(tasks, dependencies);
  if (beforeCpm.status !== 'OK') {
    throw new Error(
      `Cannot simulate: current task graph is invalid (${beforeCpm.code}): ${beforeCpm.message}`,
    );
  }
  const beforeDuration = beforeCpm.projectDuration;
  const beforeBudget = project.budget;
  const beforeTeamSize = project.teamSize;

  // ----- 1) Apply TASK_DURATION changes -----
  const durationOverrides = new Map<string, number>();
  for (const c of changes) {
    if (c.factor === 'TASK_DURATION') {
      if (!c.taskId) throw new Error('TASK_DURATION change requires taskId');
      durationOverrides.set(c.taskId, c.newValue);
    }
  }
  for (const taskId of durationOverrides.keys()) {
    if (!tasks.some((t) => t.id === taskId)) {
      throw new Error(`Simulation input is missing task data for taskId ${taskId}`);
    }
  }
  const tasksAfterDurationChanges: CpmTaskInput[] = tasks.map((t) =>
    durationOverrides.has(t.id) ? { ...t, duration: durationOverrides.get(t.id) as number } : t,
  );

  // ----- 2) รัน CPM ใหม่เสมอ (ไม่บวก duration ตรงๆ) -----
  const afterTaskCpm = calculateCPM(tasksAfterDurationChanges, dependencies);
  if (afterTaskCpm.status !== 'OK') {
    throw new Error(
      `Cannot simulate: modified task graph is invalid (${afterTaskCpm.code}): ${afterTaskCpm.message}`,
    );
  }
  const durationAfterTaskChanges = afterTaskCpm.projectDuration;

  // ----- 3) Apply TEAM_SIZE change ทับผลจาก CPM ข้างบน -----
  const teamSizeChange = changes.find((c) => c.factor === 'TEAM_SIZE');
  const afterTeamSize = teamSizeChange ? teamSizeChange.newValue : beforeTeamSize;
  // เมื่อ team ไม่เปลี่ยน สูตรจะคูณด้วย 1 เสมอ (no-op) จึงเรียกฟังก์ชันเดียวกันได้โดยไม่ต้องแยกเงื่อนไข
  const afterDuration = applyTeamSizeElasticity(
    durationAfterTaskChanges,
    beforeTeamSize,
    afterTeamSize,
    parallelizationFactor,
  );
  const durationChange = afterDuration - beforeDuration;

  // ----- Budget -----
  const budgetChangeInput = changes.find((c) => c.factor === 'BUDGET');
  const afterBudget = budgetChangeInput ? budgetChangeInput.newValue : beforeBudget;
  const { change: budgetChange, changePercent: budgetChangePercent } = calculateBudgetChange(
    beforeBudget,
    afterBudget,
  );

  // ----- Risk: ใช้ Risk Calculator ตัวเดียวกับ Phase 3 เท่านั้น -----
  const riskById = new Map(risks.map((r) => [r.id, r]));
  const probabilityOverrides = new Map<string, number>();
  const impactOverrides = new Map<string, number>();
  for (const c of changes) {
    if (c.factor === 'RISK_PROBABILITY') {
      if (!c.riskId) throw new Error('RISK_PROBABILITY change requires riskId');
      probabilityOverrides.set(c.riskId, c.newValue);
    }
    if (c.factor === 'RISK_IMPACT') {
      if (!c.riskId) throw new Error('RISK_IMPACT change requires riskId');
      impactOverrides.set(c.riskId, c.newValue);
    }
  }
  const affectedRiskIds = [...new Set([...probabilityOverrides.keys(), ...impactOverrides.keys()])];
  const riskChanges: SimulationRiskChangeResult[] = affectedRiskIds.map((riskId) => {
    const risk = riskById.get(riskId);
    if (!risk) throw new Error(`Simulation input is missing risk data for riskId ${riskId}`);

    const before = calculateRisk(risk.probability, risk.impact);
    const afterProbability = probabilityOverrides.get(riskId) ?? risk.probability;
    const afterImpact = impactOverrides.get(riskId) ?? risk.impact;
    const after = calculateRisk(afterProbability, afterImpact);

    return {
      riskId,
      name: risk.name,
      beforeProbability: risk.probability,
      beforeImpact: risk.impact,
      beforeScore: before.score,
      beforeLevel: before.level,
      afterProbability,
      afterImpact,
      afterScore: after.score,
      afterLevel: after.level,
    };
  });

  // ----- Impact Summary: สร้างจากตัวเลขจริงที่คำนวณได้ ไม่ hardcode ข้อความ -----
  const impactSummary: string[] = [];
  if (durationChange > 0) impactSummary.push(`Project duration increased by ${durationChange} day(s).`);
  else if (durationChange < 0) impactSummary.push(`Project duration decreased by ${Math.abs(durationChange)} day(s).`);
  else impactSummary.push('Project duration is unchanged.');

  if (budgetChange > 0) impactSummary.push(`Budget increased by ${formatNumber(budgetChange)} THB.`);
  else if (budgetChange < 0) impactSummary.push(`Budget decreased by ${formatNumber(Math.abs(budgetChange))} THB.`);
  else impactSummary.push('Budget is unchanged.');

  for (const rc of riskChanges) {
    if (rc.afterScore > rc.beforeScore) {
      impactSummary.push(
        `Risk score for ${rc.name} increased from ${rc.beforeScore} (${rc.beforeLevel}) to ${rc.afterScore} (${rc.afterLevel}).`,
      );
    } else if (rc.afterScore < rc.beforeScore) {
      impactSummary.push(
        `Risk score for ${rc.name} decreased from ${rc.beforeScore} (${rc.beforeLevel}) to ${rc.afterScore} (${rc.afterLevel}).`,
      );
    }
  }

  // ----- Recommendation: Rule-based เท่านั้น (ไม่ใช้ AI) -----
  const recommendation: string[] = [];
  if (durationChange > 0) {
    recommendation.push('Consider increasing the team size.');
    recommendation.push('Re-evaluate the project schedule.');
  }
  if (riskChanges.some((rc) => LEVEL_RANK[rc.afterLevel] > LEVEL_RANK[rc.beforeLevel])) {
    recommendation.push('Review high-impact risks.');
  }

  return {
    formulaVersion: FORMULA_VERSION,
    beforeDuration,
    afterDuration,
    durationChange,
    beforeBudget,
    afterBudget,
    budgetChange,
    budgetChangePercent,
    beforeTeamSize,
    afterTeamSize,
    riskChanges,
    impactSummary,
    recommendation,
  };
}
