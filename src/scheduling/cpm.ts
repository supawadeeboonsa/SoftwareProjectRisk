// Critical Path Method (CPM) — Pure function, ไม่พึ่ง Database / NestJS / Prisma
//
// หน่วยเวลา = วันปฏิทิน นับเป็น offset จากวันเริ่มโปรเจกต์ (day 0)
// Task ใช้เวลาช่วง [earliestStart, earliestFinish)  โดย EF = ES + duration
// ค่านี้เป็น "Calculated Schedule" ไม่เกี่ยวกับ Project.startDate/endDate (Planned Schedule)

import { DependencyEdge, findCycle } from './circular-dependency';

export interface CpmTaskInput {
  id: string;
  duration: number; // จำนวนเต็ม >= 0 (API บังคับ >= 1)
}

export interface CpmTaskResult {
  taskId: string;
  duration: number;
  earliestStart: number;
  earliestFinish: number;
  latestStart: number;
  latestFinish: number;
  slack: number;
  isCritical: boolean;
}

export type CpmErrorCode =
  | 'CIRCULAR_DEPENDENCY'
  | 'UNKNOWN_TASK'
  | 'DUPLICATE_TASK_ID'
  | 'INVALID_DURATION';

export type CpmResult =
  | {
      status: 'OK';
      projectDuration: number;
      /** Critical Path 1 เส้น เรียงจากต้นทางถึงปลายทาง (ถ้ามีหลายเส้นที่ยาวเท่ากัน เลือกเส้นแรกตามลำดับ input; ดู isCritical เพื่อดู task วิกฤตทั้งหมด) */
      criticalPath: string[];
      tasks: CpmTaskResult[]; // เรียงตามลำดับ input
    }
  | {
      status: 'ERROR';
      code: CpmErrorCode;
      message: string;
      cycle?: string[]; // มีเมื่อ code = CIRCULAR_DEPENDENCY
    };

const error = (code: CpmErrorCode, message: string, cycle?: string[]): CpmResult => ({
  status: 'ERROR',
  code,
  message,
  ...(cycle ? { cycle } : {}),
});

export function calculateCPM(
  tasks: CpmTaskInput[],
  dependencies: DependencyEdge[],
): CpmResult {
  // ---------- 1) ตรวจ input ----------
  const durationOf = new Map<string, number>();
  for (const task of tasks) {
    if (durationOf.has(task.id)) {
      return error('DUPLICATE_TASK_ID', `Duplicate task id: ${task.id}`);
    }
    if (!Number.isInteger(task.duration) || task.duration < 0) {
      return error(
        'INVALID_DURATION',
        `Task ${task.id}: duration must be a non-negative integer (got ${task.duration})`,
      );
    }
    durationOf.set(task.id, task.duration);
  }
  for (const { taskId, dependsOnTaskId } of dependencies) {
    for (const id of [taskId, dependsOnTaskId]) {
      if (!durationOf.has(id)) {
        return error('UNKNOWN_TASK', `Dependency refers to unknown task: ${id}`);
      }
    }
  }

  // ---------- 2) ห้ามคำนวณต่อถ้ามี Cycle ----------
  const cycle = findCycle(dependencies);
  if (cycle) {
    return error(
      'CIRCULAR_DEPENDENCY',
      `Circular dependency detected: ${cycle.join(' -> ')} (each task depends on the next)`,
      cycle,
    );
  }

  // ---------- 3) predecessor / successor (ตัด edge ซ้ำ) ----------
  const predecessors = new Map<string, Set<string>>();
  const successors = new Map<string, string[]>();
  for (const task of tasks) {
    predecessors.set(task.id, new Set());
    successors.set(task.id, []);
  }
  for (const { taskId, dependsOnTaskId } of dependencies) {
    const preds = predecessors.get(taskId) as Set<string>;
    if (!preds.has(dependsOnTaskId)) {
      preds.add(dependsOnTaskId);
      (successors.get(dependsOnTaskId) as string[]).push(taskId);
    }
  }

  // ---------- 4) เรียงลำดับ topological (Kahn) ----------
  const remaining = new Map<string, number>();
  for (const task of tasks) {
    remaining.set(task.id, (predecessors.get(task.id) as Set<string>).size);
  }
  const queue = tasks.filter((t) => remaining.get(t.id) === 0).map((t) => t.id);
  const order: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift() as string;
    order.push(id);
    for (const next of successors.get(id) as string[]) {
      const left = (remaining.get(next) as number) - 1;
      remaining.set(next, left);
      if (left === 0) queue.push(next);
    }
  }

  // ---------- 5) Forward pass: ES = max(EF ของ predecessors), EF = ES + duration ----------
  const es = new Map<string, number>();
  const ef = new Map<string, number>();
  for (const id of order) {
    let start = 0; // ไม่มี predecessor → เริ่ม day 0 (งานขนานเริ่มพร้อมกันได้)
    for (const p of predecessors.get(id) as Set<string>) {
      start = Math.max(start, ef.get(p) as number);
    }
    es.set(id, start);
    ef.set(id, start + (durationOf.get(id) as number));
  }
  const projectDuration = tasks.reduce((max, t) => Math.max(max, ef.get(t.id) as number), 0);

  // ---------- 6) Backward pass: LF = min(LS ของ successors), LS = LF - duration ----------
  const ls = new Map<string, number>();
  const lf = new Map<string, number>();
  for (const id of [...order].reverse()) {
    let finish = projectDuration; // ไม่มี successor → จบพร้อมโปรเจกต์
    for (const s of successors.get(id) as string[]) {
      finish = Math.min(finish, ls.get(s) as number);
    }
    lf.set(id, finish);
    ls.set(id, finish - (durationOf.get(id) as number));
  }

  // ---------- 7) slack / critical ----------
  const results: CpmTaskResult[] = tasks.map((t) => {
    const slack = (ls.get(t.id) as number) - (es.get(t.id) as number);
    return {
      taskId: t.id,
      duration: t.duration,
      earliestStart: es.get(t.id) as number,
      earliestFinish: ef.get(t.id) as number,
      latestStart: ls.get(t.id) as number,
      latestFinish: lf.get(t.id) as number,
      slack,
      isCritical: slack === 0,
    };
  });

  return {
    status: 'OK',
    projectDuration,
    criticalPath: buildCriticalPath(results, successors),
    tasks: results,
  };
}

// เดินตาม task วิกฤตจากต้นทาง (ES = 0) ไปปลายทาง:
// ถัดไปคือ successor ที่วิกฤตและเริ่มทันทีที่ task ปัจจุบันจบ
function buildCriticalPath(
  results: CpmTaskResult[],
  successors: Map<string, string[]>,
): string[] {
  const byId = new Map(results.map((r) => [r.taskId, r]));
  const start = results.find((r) => r.isCritical && r.earliestStart === 0);
  if (!start) return [];

  const path = [start.taskId];
  let current = start;
  for (;;) {
    const next = (successors.get(current.taskId) as string[])
      .map((id) => byId.get(id) as CpmTaskResult)
      .find((s) => s.isCritical && s.earliestStart === current.earliestFinish);
    if (!next) break;
    path.push(next.taskId);
    current = next;
  }
  return path;
}
