// ต้องตรงกับ enum ScenarioChangeFactor ใน prisma/schema.prisma
export const ScenarioChangeFactor = {
  BUDGET: 'BUDGET',
  TEAM_SIZE: 'TEAM_SIZE',
  TASK_DURATION: 'TASK_DURATION',
  RISK_PROBABILITY: 'RISK_PROBABILITY',
  RISK_IMPACT: 'RISK_IMPACT',
} as const;

export type ScenarioChangeFactor =
  (typeof ScenarioChangeFactor)[keyof typeof ScenarioChangeFactor];

export const TASK_FACTORS: ScenarioChangeFactor[] = ['TASK_DURATION'];
export const RISK_FACTORS: ScenarioChangeFactor[] = ['RISK_PROBABILITY', 'RISK_IMPACT'];
export const PROJECT_LEVEL_FACTORS: ScenarioChangeFactor[] = ['BUDGET', 'TEAM_SIZE'];
