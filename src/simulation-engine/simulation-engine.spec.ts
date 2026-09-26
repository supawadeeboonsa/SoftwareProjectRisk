import { runSimulation } from './simulation-engine';

// Chain ตัวอย่างจาก Phase 2: 7+5+15+15+5+10 = 57 วัน
const chainTasks = [
  { id: 'Requirement', duration: 7 },
  { id: 'UIUX', duration: 5 },
  { id: 'Backend', duration: 15 },
  { id: 'Frontend', duration: 15 },
  { id: 'Integration', duration: 5 },
  { id: 'Testing', duration: 10 },
];
const chainDeps = [
  { taskId: 'UIUX', dependsOnTaskId: 'Requirement' },
  { taskId: 'Backend', dependsOnTaskId: 'UIUX' },
  { taskId: 'Frontend', dependsOnTaskId: 'Backend' },
  { taskId: 'Integration', dependsOnTaskId: 'Frontend' },
  { taskId: 'Testing', dependsOnTaskId: 'Integration' },
];

describe('runSimulation', () => {
  it('ตัวอย่าง Demo จาก Spec (section 14): team 5→3, risk 3→4 / 4→5, ไม่แก้ budget/task duration', () => {
    const result = runSimulation(
      { teamSize: 5, budget: 100000 },
      chainTasks,
      chainDeps,
      [{ id: 'risk-1', name: 'Developer Shortage', probability: 3, impact: 4 }],
      [
        { factor: 'TEAM_SIZE', newValue: 3 },
        { factor: 'RISK_PROBABILITY', riskId: 'risk-1', newValue: 4 },
        { factor: 'RISK_IMPACT', riskId: 'risk-1', newValue: 5 },
      ],
    );

    // Duration: 57 → 76 คำนวณจากสูตรจริง (เอกสาร Demo เขียนผิดเป็น ~67; freeze ยืนยัน p=0.5 ตามสูตรนี้)
    expect(result.beforeDuration).toBe(57);
    expect(result.afterDuration).toBe(76);
    expect(result.durationChange).toBe(19);

    // Budget ไม่เปลี่ยนเพราะ Scenario นี้ไม่มี BUDGET change
    expect(result.beforeBudget).toBe(100000);
    expect(result.afterBudget).toBe(100000);
    expect(result.budgetChange).toBe(0);

    // Risk: 3x4=12 HIGH → 4x5=20 CRITICAL (ตรงกับ Demo เป๊ะ)
    expect(result.riskChanges).toEqual([
      expect.objectContaining({
        riskId: 'risk-1', name: 'Developer Shortage',
        beforeScore: 12, beforeLevel: 'HIGH', afterScore: 20, afterLevel: 'CRITICAL',
      }),
    ]);

    expect(result.formulaVersion).toBe('1.0');
    expect(result.impactSummary).toEqual(
      expect.arrayContaining([
        'Project duration increased by 19 day(s).',
        'Budget is unchanged.',
        'Risk score for Developer Shortage increased from 12 (HIGH) to 20 (CRITICAL).',
      ]),
    );
    expect(result.recommendation).toEqual(
      expect.arrayContaining([
        'Consider increasing the team size.',
        'Re-evaluate the project schedule.',
        'Review high-impact risks.',
      ]),
    );
  });

  it('TASK_DURATION ต้องรัน CPM ใหม่ ไม่ใช่บวกตรงๆ (parallel graph จาก Phase 2)', () => {
    // A(10) → B(5) | C(7)  ; duration เดิม = 10+max(5,7)=17
    const tasks = [{ id: 'A', duration: 10 }, { id: 'B', duration: 5 }, { id: 'C', duration: 7 }];
    const deps = [{ taskId: 'B', dependsOnTaskId: 'A' }, { taskId: 'C', dependsOnTaskId: 'A' }];

    // เปลี่ยน B จาก 5 → 12: เส้น B กลายเป็น 10+12=22 (ยาวกว่าเส้น C=17) → duration ใหม่ = 22
    // ถ้าบวกตรงๆ (ผิด) จะได้ 17 + (12-5) = 24 ซึ่งไม่ถูกต้อง
    const result = runSimulation(
      { teamSize: 4, budget: 0 },
      tasks,
      deps,
      [],
      [{ factor: 'TASK_DURATION', taskId: 'B', newValue: 12 }],
    );

    expect(result.beforeDuration).toBe(17);
    expect(result.afterDuration).toBe(22);
    expect(result.afterDuration).not.toBe(24); // พิสูจน์ว่าไม่ได้บวกตรงๆ
  });

  it('TASK_DURATION + TEAM_SIZE พร้อมกัน: รัน CPM ก่อน แล้วค่อยคูณ elasticity', () => {
    const tasks = [{ id: 'A', duration: 10 }, { id: 'B', duration: 5 }, { id: 'C', duration: 7 }];
    const deps = [{ taskId: 'B', dependsOnTaskId: 'A' }, { taskId: 'C', dependsOnTaskId: 'A' }];

    const result = runSimulation(
      { teamSize: 4, budget: 0 },
      tasks, deps, [],
      [
        { factor: 'TASK_DURATION', taskId: 'B', newValue: 12 }, // → CPM ใหม่ = 22
        { factor: 'TEAM_SIZE', newValue: 2 }, // elasticity บน 22, ไม่ใช่บน 17 เดิม
      ],
    );
    // 22 * ((1-0.5) + 0.5*(4/2)) = 22 * 1.5 = 33
    expect(result.afterDuration).toBe(33);
  });

  it('BUDGET change: คำนวณ change/percent ถูกต้อง', () => {
    const result = runSimulation(
      { teamSize: 5, budget: 100000 },
      chainTasks, chainDeps, [],
      [{ factor: 'BUDGET', newValue: 120000 }],
    );
    expect(result.beforeBudget).toBe(100000);
    expect(result.afterBudget).toBe(120000);
    expect(result.budgetChange).toBe(20000);
  });

  it('BUDGET before = 0: ไม่ throw, ไม่มีค่า percent (null ถูกจัดการใน budget-change.ts)', () => {
    const result = runSimulation(
      { teamSize: 5, budget: 0 },
      chainTasks, chainDeps, [],
      [{ factor: 'BUDGET', newValue: 500 }],
    );
    expect(result.budgetChange).toBe(500);
    expect(result.budgetChangePercent).toBeNull();
  });

  it('หลาย Risk เปลี่ยนพร้อมกันใน Scenario เดียว', () => {
    const risks = [
      { id: 'r1', name: 'Developer Shortage', probability: 3, impact: 4 },
      { id: 'r2', name: 'Scope Creep', probability: 2, impact: 3 },
    ];
    const result = runSimulation(
      { teamSize: 5, budget: 0 }, chainTasks, chainDeps, risks,
      [
        { factor: 'RISK_PROBABILITY', riskId: 'r1', newValue: 5 },
        { factor: 'RISK_IMPACT', riskId: 'r2', newValue: 5 },
      ],
    );
    expect(result.riskChanges).toHaveLength(2);
    const r1 = result.riskChanges.find((r) => r.riskId === 'r1');
    const r2 = result.riskChanges.find((r) => r.riskId === 'r2');
    expect(r1).toMatchObject({ beforeScore: 12, afterScore: 20 }); // 3x4=12 → 5x4=20
    expect(r2).toMatchObject({ beforeScore: 6, afterScore: 10 }); // 2x3=6 → 2x5=10
  });

  it('ไม่มี change ใดๆ เลย: ทุกอย่างเท่าเดิม, ไม่มี recommendation', () => {
    const result = runSimulation({ teamSize: 5, budget: 100000 }, chainTasks, chainDeps, [], []);
    expect(result.durationChange).toBe(0);
    expect(result.budgetChange).toBe(0);
    expect(result.riskChanges).toEqual([]);
    expect(result.recommendation).toEqual([]);
    expect(result.impactSummary).toEqual([
      'Project duration is unchanged.',
      'Budget is unchanged.',
    ]);
  });

  it('TEAM_SIZE เพิ่มขึ้น (ลด duration) → ไม่มี recommendation เรื่องเพิ่มทีม/ทบทวนตาราง', () => {
    const result = runSimulation(
      { teamSize: 3, budget: 0 }, chainTasks, chainDeps, [],
      [{ factor: 'TEAM_SIZE', newValue: 6 }],
    );
    expect(result.durationChange).toBeLessThan(0);
    expect(result.recommendation).toEqual([]);
  });

  it('riskId ที่ไม่มีข้อมูลส่งมาให้ (ไม่อยู่ใน risks[]) → throw', () => {
    expect(() =>
      runSimulation(
        { teamSize: 5, budget: 0 }, chainTasks, chainDeps, [],
        [{ factor: 'RISK_PROBABILITY', riskId: 'ghost', newValue: 5 }],
      ),
    ).toThrow(/riskId ghost/);
  });

  it('taskId ที่ไม่มีข้อมูลส่งมาให้ (ไม่อยู่ใน tasks[]) → throw', () => {
    expect(() =>
      runSimulation(
        { teamSize: 5, budget: 0 }, chainTasks, chainDeps, [],
        [{ factor: 'TASK_DURATION', taskId: 'ghost', newValue: 5 }],
      ),
    ).toThrow(/taskId ghost/);
  });

  it('Task graph เดิมมี cycle (สถานการณ์ผิดปกติ ไม่ควรเกิดถ้า Phase 2 ตรวจถูกต้อง) → throw ไม่คำนวณต่อ', () => {
    const cyclicDeps = [
      { taskId: 'A', dependsOnTaskId: 'B' },
      { taskId: 'B', dependsOnTaskId: 'A' },
    ];
    expect(() =>
      runSimulation(
        { teamSize: 5, budget: 0 },
        [{ id: 'A', duration: 1 }, { id: 'B', duration: 1 }],
        cyclicDeps, [], [],
      ),
    ).toThrow(/CIRCULAR_DEPENDENCY/);
  });
});
