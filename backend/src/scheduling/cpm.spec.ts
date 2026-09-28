import { calculateCPM } from './cpm';

describe('calculateCPM', () => {
  it('empty tasks → projectDuration 0, criticalPath ว่าง', () => {
    const result = calculateCPM([], []);
    expect(result).toEqual({ status: 'OK', projectDuration: 0, criticalPath: [], tasks: [] });
  });

  it('single task ไม่มี dependency', () => {
    const result = calculateCPM([{ id: 'A', duration: 10 }], []);
    expect(result.status).toBe('OK');
    if (result.status !== 'OK') return;
    expect(result.projectDuration).toBe(10);
    expect(result.criticalPath).toEqual(['A']);
    expect(result.tasks).toEqual([
      { taskId: 'A', duration: 10, earliestStart: 0, earliestFinish: 10, latestStart: 0, latestFinish: 10, slack: 0, isCritical: true },
    ]);
  });

  it('simple chain: 6 tasks ตามตัวอย่าง = 57 วัน (ไม่ hardcode)', () => {
    const tasks = [
      { id: 'Requirement', duration: 7 },
      { id: 'UIUX', duration: 5 },
      { id: 'Backend', duration: 15 },
      { id: 'Frontend', duration: 15 },
      { id: 'Integration', duration: 5 },
      { id: 'Testing', duration: 10 },
    ];
    const dependencies = [
      { taskId: 'UIUX', dependsOnTaskId: 'Requirement' },
      { taskId: 'Backend', dependsOnTaskId: 'UIUX' },
      { taskId: 'Frontend', dependsOnTaskId: 'Backend' },
      { taskId: 'Integration', dependsOnTaskId: 'Frontend' },
      { taskId: 'Testing', dependsOnTaskId: 'Integration' },
    ];
    const expectedDuration = tasks.reduce((sum, t) => sum + t.duration, 0); // 57 คำนวณจาก input ไม่ใช่ตัวเลขคงที่

    const result = calculateCPM(tasks, dependencies);
    expect(result.status).toBe('OK');
    if (result.status !== 'OK') return;
    expect(result.projectDuration).toBe(expectedDuration);
    expect(result.projectDuration).toBe(57);
    expect(result.criticalPath).toEqual([
      'Requirement', 'UIUX', 'Backend', 'Frontend', 'Integration', 'Testing',
    ]);
    expect(result.tasks.every((t) => t.isCritical)).toBe(true);
  });

  it('parallel tasks: A(10) → B(5)|C(7) → duration = 10 + max(5,7) = 17 (ไม่ใช่ 22)', () => {
    const tasks = [
      { id: 'A', duration: 10 },
      { id: 'B', duration: 5 },
      { id: 'C', duration: 7 },
    ];
    const dependencies = [
      { taskId: 'B', dependsOnTaskId: 'A' },
      { taskId: 'C', dependsOnTaskId: 'A' },
    ];
    const result = calculateCPM(tasks, dependencies);
    expect(result.status).toBe('OK');
    if (result.status !== 'OK') return;

    expect(result.projectDuration).toBe(17);
    expect(result.projectDuration).not.toBe(22);

    const byId = Object.fromEntries(result.tasks.map((t) => [t.taskId, t]));
    expect(byId.A).toMatchObject({ earliestStart: 0, earliestFinish: 10, slack: 0, isCritical: true });
    // C อยู่บน critical path (7 วัน, ยาวกว่า B), B มี slack = 17-15 = 2
    expect(byId.C).toMatchObject({ earliestStart: 10, earliestFinish: 17, slack: 0, isCritical: true });
    expect(byId.B).toMatchObject({ earliestStart: 10, earliestFinish: 15, slack: 2, isCritical: false });
    expect(result.criticalPath).toEqual(['A', 'C']);
  });

  it('slack: task ที่ไม่ critical ต้องมี slack > 0 และ latestStart > earliestStart', () => {
    const result = calculateCPM(
      [{ id: 'A', duration: 10 }, { id: 'B', duration: 3 }, { id: 'C', duration: 10 }, { id: 'D', duration: 1 }],
      [
        { taskId: 'B', dependsOnTaskId: 'A' },
        { taskId: 'C', dependsOnTaskId: 'A' },
        { taskId: 'D', dependsOnTaskId: 'B' },
        { taskId: 'D', dependsOnTaskId: 'C' },
      ],
    );
    expect(result.status).toBe('OK');
    if (result.status !== 'OK') return;
    const byId = Object.fromEntries(result.tasks.map((t) => [t.taskId, t]));
    expect(byId.B.slack).toBe(7); // C(10) ยาวกว่า B(3) อยู่ 7 วัน
    expect(byId.B.isCritical).toBe(false);
    expect(byId.B.latestStart).toBeGreaterThan(byId.B.earliestStart);
    expect(result.projectDuration).toBe(21); // 10 + max(3,10) + 1
  });

  it('cycle detection: A→B→C→A ต้อง return error ไม่ใช่คำนวณผิดๆ', () => {
    const result = calculateCPM(
      [{ id: 'A', duration: 1 }, { id: 'B', duration: 1 }, { id: 'C', duration: 1 }],
      [
        { taskId: 'A', dependsOnTaskId: 'B' },
        { taskId: 'B', dependsOnTaskId: 'C' },
        { taskId: 'C', dependsOnTaskId: 'A' },
      ],
    );
    expect(result).toMatchObject({ status: 'ERROR', code: 'CIRCULAR_DEPENDENCY' });
    if (result.status === 'ERROR') {
      expect(result.cycle?.length).toBeGreaterThan(0);
    }
  });

  it('dependency อ้างถึง task ที่ไม่มีอยู่ → error UNKNOWN_TASK', () => {
    const result = calculateCPM(
      [{ id: 'A', duration: 1 }],
      [{ taskId: 'A', dependsOnTaskId: 'GHOST' }],
    );
    expect(result).toMatchObject({ status: 'ERROR', code: 'UNKNOWN_TASK' });
  });

  it('duration ติดลบหรือไม่ใช่จำนวนเต็ม → error INVALID_DURATION', () => {
    expect(calculateCPM([{ id: 'A', duration: -1 }], [])).toMatchObject({
      status: 'ERROR', code: 'INVALID_DURATION',
    });
    expect(calculateCPM([{ id: 'A', duration: 2.5 }], [])).toMatchObject({
      status: 'ERROR', code: 'INVALID_DURATION',
    });
  });

  it('task id ซ้ำใน input → error DUPLICATE_TASK_ID', () => {
    const result = calculateCPM([{ id: 'A', duration: 1 }, { id: 'A', duration: 2 }], []);
    expect(result).toMatchObject({ status: 'ERROR', code: 'DUPLICATE_TASK_ID' });
  });

  it('งานขนานล้วน ไม่มี dependency เลย → duration = max ของทุก task', () => {
    const result = calculateCPM(
      [{ id: 'A', duration: 4 }, { id: 'B', duration: 9 }, { id: 'C', duration: 2 }],
      [],
    );
    expect(result.status).toBe('OK');
    if (result.status !== 'OK') return;
    expect(result.projectDuration).toBe(9);
  });
});
