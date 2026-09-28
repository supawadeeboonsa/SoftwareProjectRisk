import type { ProjectStatus, RiskLevel, ScenarioChangeFactor, TaskStatus } from '@/types/api';

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  PLANNING: 'วางแผน', IN_PROGRESS: 'กำลังดำเนินการ', ON_HOLD: 'พักโครงการ',
  COMPLETED: 'เสร็จสิ้น', CANCELLED: 'ยกเลิก',
};
export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  TODO: 'รอดำเนินการ', IN_PROGRESS: 'กำลังทำ', COMPLETED: 'เสร็จแล้ว',
};
export const RISK_LEVEL_LABEL: Record<RiskLevel, string> = {
  LOW: 'ต่ำ', MEDIUM: 'ปานกลาง', HIGH: 'สูง', CRITICAL: 'วิกฤต',
};
export const FACTOR_LABEL: Record<ScenarioChangeFactor, string> = {
  BUDGET: 'งบประมาณ (บาท)',
  TEAM_SIZE: 'จำนวนคนในทีม',
  TASK_DURATION: 'ระยะเวลางาน (วัน)',
  RISK_PROBABILITY: 'โอกาสเกิดความเสี่ยง (1-5)',
  RISK_IMPACT: 'ผลกระทบความเสี่ยง (1-5)',
};
export const PROJECT_STATUSES = Object.keys(PROJECT_STATUS_LABEL) as ProjectStatus[];
export const TASK_STATUSES = Object.keys(TASK_STATUS_LABEL) as TaskStatus[];
export const FACTORS = Object.keys(FACTOR_LABEL) as ScenarioChangeFactor[];
