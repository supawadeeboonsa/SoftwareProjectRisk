import { findCycle, hasCircularDependency, wouldCreateCycle } from './circular-dependency';

describe('findCycle / hasCircularDependency', () => {
  it('graph ว่าง → ไม่มี cycle', () => {
    expect(findCycle([])).toBeNull();
    expect(hasCircularDependency([])).toBe(false);
  });

  it('chain ปกติ ไม่มี cycle', () => {
    const edges = [
      { taskId: 'B', dependsOnTaskId: 'A' },
      { taskId: 'C', dependsOnTaskId: 'B' },
    ];
    expect(findCycle(edges)).toBeNull();
  });

  it('self dependency: A → A ถือเป็น cycle', () => {
    const cycle = findCycle([{ taskId: 'A', dependsOnTaskId: 'A' }]);
    expect(cycle).toEqual(['A', 'A']);
    expect(hasCircularDependency([{ taskId: 'A', dependsOnTaskId: 'A' }])).toBe(true);
  });

  it('direct cycle: A→B, B→A', () => {
    const edges = [
      { taskId: 'A', dependsOnTaskId: 'B' },
      { taskId: 'B', dependsOnTaskId: 'A' },
    ];
    expect(hasCircularDependency(edges)).toBe(true);
    expect(findCycle(edges)).not.toBeNull();
  });

  it('indirect cycle: A→B, B→C, C→A', () => {
    const edges = [
      { taskId: 'A', dependsOnTaskId: 'B' },
      { taskId: 'B', dependsOnTaskId: 'C' },
      { taskId: 'C', dependsOnTaskId: 'A' },
    ];
    expect(hasCircularDependency(edges)).toBe(true);
  });

  it('diamond (ไม่มี cycle): A→B, A→C, B→D, C→D', () => {
    const edges = [
      { taskId: 'B', dependsOnTaskId: 'A' },
      { taskId: 'C', dependsOnTaskId: 'A' },
      { taskId: 'D', dependsOnTaskId: 'B' },
      { taskId: 'D', dependsOnTaskId: 'C' },
    ];
    expect(hasCircularDependency(edges)).toBe(false);
  });
});

describe('wouldCreateCycle (ตรวจก่อนเพิ่ม edge ใหม่)', () => {
  it('เพิ่ม edge แรกในกราฟว่าง → ไม่มี cycle', () => {
    expect(wouldCreateCycle([], { taskId: 'B', dependsOnTaskId: 'A' })).toBeNull();
  });

  it('self dependency ใหม่ → คือ cycle เสมอ', () => {
    expect(wouldCreateCycle([], { taskId: 'A', dependsOnTaskId: 'A' })).toEqual(['A', 'A']);
  });

  it('direct cycle: มี A→B อยู่แล้ว แล้วจะเพิ่ม B→A', () => {
    const existing = [{ taskId: 'A', dependsOnTaskId: 'B' }];
    const cycle = wouldCreateCycle(existing, { taskId: 'B', dependsOnTaskId: 'A' });
    expect(cycle).toEqual(['B', 'A', 'B']);
  });

  it('indirect cycle: มี A→B, B→C อยู่แล้ว แล้วจะเพิ่ม C→A', () => {
    const existing = [
      { taskId: 'A', dependsOnTaskId: 'B' },
      { taskId: 'B', dependsOnTaskId: 'C' },
    ];
    const cycle = wouldCreateCycle(existing, { taskId: 'C', dependsOnTaskId: 'A' });
    expect(cycle).not.toBeNull();
    expect(cycle).toEqual(['C', 'A', 'B', 'C']);
  });

  it('diamond: มี A→B, A→C, B→D อยู่แล้ว แล้วจะเพิ่ม C→D → ไม่เกิด cycle', () => {
    const existing = [
      { taskId: 'B', dependsOnTaskId: 'A' },
      { taskId: 'C', dependsOnTaskId: 'A' },
      { taskId: 'D', dependsOnTaskId: 'B' },
    ];
    expect(wouldCreateCycle(existing, { taskId: 'D', dependsOnTaskId: 'C' })).toBeNull();
  });

  it('เพิ่ม edge ที่ไม่เกี่ยวข้องกับ node เดิมเลย → ไม่เกิด cycle', () => {
    const existing = [{ taskId: 'B', dependsOnTaskId: 'A' }];
    expect(wouldCreateCycle(existing, { taskId: 'X', dependsOnTaskId: 'Y' })).toBeNull();
  });
});
