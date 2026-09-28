import type { ProjectStatus, RiskLevel, TaskStatus } from '@/types/api';
import { PROJECT_STATUS_LABEL, RISK_LEVEL_LABEL, TASK_STATUS_LABEL } from '@/lib/labels';

const base = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-label-sm font-semibold';

// สีของระดับความเสี่ยง — ใช้ทั้งสีและข้อความ (ไม่พึ่งสีอย่างเดียวเพื่อ accessibility)
const LEVEL_STYLE: Record<RiskLevel, string> = {
  LOW: 'bg-emerald-100 text-emerald-800',
  MEDIUM: 'bg-amber-100 text-amber-800',
  HIGH: 'bg-orange-100 text-orange-800',
  CRITICAL: 'bg-error-container text-on-error-container',
};
const PROJECT_STYLE: Record<ProjectStatus, string> = {
  PLANNING: 'bg-primary-fixed text-primary',
  IN_PROGRESS: 'bg-emerald-100 text-emerald-800',
  ON_HOLD: 'bg-amber-100 text-amber-800',
  COMPLETED: 'bg-surface-variant text-on-surface-variant',
  CANCELLED: 'bg-error-container text-on-error-container',
};
const TASK_STYLE: Record<TaskStatus, string> = {
  TODO: 'bg-surface-variant text-on-surface-variant',
  IN_PROGRESS: 'bg-primary-fixed text-primary',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
};

export const RiskLevelBadge = ({ level }: { level: RiskLevel }) => (
  <span className={`${base} ${LEVEL_STYLE[level]}`}>{RISK_LEVEL_LABEL[level]} ({level})</span>
);
export const ProjectStatusBadge = ({ status }: { status: ProjectStatus }) => (
  <span className={`${base} ${PROJECT_STYLE[status]}`}>{PROJECT_STATUS_LABEL[status]}</span>
);
export const TaskStatusBadge = ({ status }: { status: TaskStatus }) => (
  <span className={`${base} ${TASK_STYLE[status]}`}>{TASK_STATUS_LABEL[status]}</span>
);
