import { calculateBudgetChange } from './budget-change';

describe('calculateBudgetChange', () => {
  it('ตัวอย่างจาก Spec: 100,000 → 120,000 = +20,000 (+20%)', () => {
    expect(calculateBudgetChange(100000, 120000)).toEqual({ change: 20000, changePercent: 20 });
  });

  it('budget ลดลง', () => {
    expect(calculateBudgetChange(100000, 80000)).toEqual({ change: -20000, changePercent: -20 });
  });

  it('budget ไม่เปลี่ยน', () => {
    expect(calculateBudgetChange(100000, 100000)).toEqual({ change: 0, changePercent: 0 });
  });

  it('before = 0 → changePercent เป็น null (กันหารด้วยศูนย์)', () => {
    expect(calculateBudgetChange(0, 500)).toEqual({ change: 500, changePercent: null });
    expect(calculateBudgetChange(0, 0)).toEqual({ change: 0, changePercent: null });
  });

  it('ค่าติดลบ → throw', () => {
    expect(() => calculateBudgetChange(-1, 100)).toThrow(RangeError);
    expect(() => calculateBudgetChange(100, -1)).toThrow(RangeError);
  });
});
