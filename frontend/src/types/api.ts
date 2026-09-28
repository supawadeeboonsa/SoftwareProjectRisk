// Type ตรงกับ Backend DTO/Model จริง (D:\software-project-risk-backend)
// หมายเหตุ: Backend ปัจจุบันคืนค่าเป็น raw object (ไม่ใช่ envelope {success,data} ตาม
// CSMJU2030 api-conventions.md) — โปรเจกต์นี้เชื่อม Backend ที่มีอยู่จริงตามที่ตกลงกันไว้

export type ProjectStatus = 'PLANNING' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'COMPLETED';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ScenarioChangeFactor =
  | 'BUDGET'
  | 'TEAM_SIZE'
  | 'TASK_DURATION'
  | 'RISK_PROBABILITY'
  | 'RISK_IMPACT';

export interface Project {
  id: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  budget: number;
  teamSize: number;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  budget: number;
  teamSize: number;
  status?: ProjectStatus;
}

export type UpdateProjectInput = Partial<CreateProjectInput>;

export interface Task {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  duration: number;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskInput {
  name: string;
  description?: string;
  duration: number;
  status?: TaskStatus;
}

export type UpdateTaskInput = Partial<CreateTaskInput>;

export interface TaskDependency {
  id: string;
  taskId: string;
  dependsOnTaskId: string;
  createdAt: string;
}

export interface Risk {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  probability: number;
  impact: number;
  score: number;
  level: RiskLevel;
  mitigation: string | null;
  contingency: string | null;
  owner: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRiskInput {
  name: string;
  description?: string;
  probability: number;
  impact: number;
  mitigation?: string;
  contingency?: string;
  owner?: string;
}

export type UpdateRiskInput = Partial<CreateRiskInput>;

export interface Scenario {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  changes?: ScenarioChange[]; // แนบมาเฉพาะ GET /scenarios/:id
}

export interface CreateScenarioInput {
  name: string;
  description?: string;
}

export interface ScenarioChange {
  id: string;
  scenarioId: string;
  factor: ScenarioChangeFactor;
  taskId: string | null;
  riskId: string | null;
  newValue: number;
  createdAt: string;
}

export interface CreateScenarioChangeInput {
  factor: ScenarioChangeFactor;
  taskId?: string;
  riskId?: string;
  newValue: number;
}

export interface SimulationRiskChange {
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

export interface Simulation {
  id: string;
  scenarioId: string;
  executedAt: string;
  formulaVersion: string;
  beforeDuration: number;
  afterDuration: number;
  durationChange: number;
  beforeBudget: number;
  afterBudget: number;
  budgetChange: number;
  budgetChangePercent: number | null;
  beforeTeamSize: number;
  afterTeamSize: number;
  riskChanges: SimulationRiskChange[];
  impactSummary: string[];
  recommendation: string[];
}
