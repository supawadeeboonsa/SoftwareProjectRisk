// Pure functions: ไม่พึ่ง Database / NestJS / Prisma
//
// ความหมายของ edge:  { taskId: 'Frontend', dependsOnTaskId: 'Backend' }
//   = Frontend "ขึ้นกับ" Backend (Backend ต้องเสร็จก่อน)

export interface DependencyEdge {
  taskId: string;
  dependsOnTaskId: string;
}

// task → รายการ task ที่มันขึ้นกับ
function buildAdjacency(edges: DependencyEdge[]): Map<string, string[]> {
  const adjacency = new Map<string, string[]>();
  for (const { taskId, dependsOnTaskId } of edges) {
    const list = adjacency.get(taskId);
    if (list) list.push(dependsOnTaskId);
    else adjacency.set(taskId, [dependsOnTaskId]);
  }
  return adjacency;
}

/**
 * หา Cycle ใน Graph ที่มีอยู่แล้ว
 * คืนเส้นทางของวงจร เช่น ['A','B','C','A'] (A ขึ้นกับ B, B ขึ้นกับ C, C ขึ้นกับ A)
 * คืน null ถ้าไม่มี Cycle  (self dependency A→A ก็ถือเป็น Cycle: ['A','A'])
 */
export function findCycle(edges: DependencyEdge[]): string[] | null {
  const adjacency = buildAdjacency(edges);
  const VISITING = 1;
  const DONE = 2;
  const state = new Map<string, number>();
  const path: string[] = [];

  const visit = (node: string): string[] | null => {
    state.set(node, VISITING);
    path.push(node);
    for (const next of adjacency.get(node) ?? []) {
      if (state.get(next) === VISITING) {
        // เจอ node ที่อยู่ใน path ปัจจุบัน = พบวงจร
        return [...path.slice(path.indexOf(next)), next];
      }
      if (!state.has(next)) {
        const cycle = visit(next);
        if (cycle) return cycle;
      }
    }
    path.pop();
    state.set(node, DONE);
    return null;
  };

  for (const node of adjacency.keys()) {
    if (!state.has(node)) {
      const cycle = visit(node);
      if (cycle) return cycle;
    }
  }
  return null;
}

export function hasCircularDependency(edges: DependencyEdge[]): boolean {
  return findCycle(edges) !== null;
}

/**
 * ตรวจก่อนเพิ่ม dependency ใหม่: ถ้าเพิ่ม newEdge แล้วเกิดวงจรหรือไม่
 * คืนเส้นทางวงจร (เริ่มและจบที่ newEdge.taskId) หรือ null ถ้าเพิ่มได้อย่างปลอดภัย
 *
 * หลักคิด: newEdge = "taskId ขึ้นกับ dependsOnTaskId" จะเกิดวงจรก็ต่อเมื่อ
 * dependsOnTaskId ขึ้นกับ taskId อยู่แล้ว (ทางตรงหรือทางอ้อม)
 * จึงเดินจาก dependsOnTaskId ตามเส้น "ขึ้นกับ" แล้วดูว่าถึง taskId หรือไม่
 * (ตรวจเฉพาะวงจรที่เกิดจาก edge ใหม่ ไม่สนวงจรเก่าที่อาจมีอยู่ก่อน)
 */
export function wouldCreateCycle(
  existing: DependencyEdge[],
  newEdge: DependencyEdge,
): string[] | null {
  const { taskId, dependsOnTaskId } = newEdge;
  const adjacency = buildAdjacency(existing);

  // BFS จาก dependsOnTaskId หา taskId พร้อมจำ parent เพื่อสร้างเส้นทางกลับ
  const parent = new Map<string, string | null>([[dependsOnTaskId, null]]);
  const queue: string[] = [dependsOnTaskId];

  while (queue.length > 0) {
    const current = queue.shift() as string;
    if (current === taskId) {
      const route: string[] = [];
      for (let n: string | null = current; n !== null; n = parent.get(n) ?? null) {
        route.unshift(n);
      }
      return [taskId, ...route]; // เช่น [A, B, ..., A]
    }
    for (const next of adjacency.get(current) ?? []) {
      if (!parent.has(next)) {
        parent.set(next, current);
        queue.push(next);
      }
    }
  }
  return null;
}
