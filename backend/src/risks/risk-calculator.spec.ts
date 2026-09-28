import { calculateRisk, calculateRiskLevel, calculateRiskScore } from './risk-calculator';

describe('calculateRiskScore', () => {
  it.each([
    [1, 1, 1],
    [3, 4, 12],
    [5, 5, 25],
  ])('%i x %i = %i', (probability, impact, expected) => {
    expect(calculateRiskScore(probability, impact)).toBe(expected);
  });

  it.each([0, -1, 6, 1.5])('probability ไม่ถูกต้อง (%p) → throw', (probability) => {
    expect(() => calculateRiskScore(probability, 3)).toThrow(RangeError);
  });

  it.each([0, -1, 6, 1.5])('impact ไม่ถูกต้อง (%p) → throw', (impact) => {
    expect(() => calculateRiskScore(3, impact)).toThrow(RangeError);
  });

  it('ปฏิเสธ string ที่ผ่าน type check มาได้ (defense in depth)', () => {
    expect(() => calculateRiskScore('3' as unknown as number, 4)).toThrow(RangeError);
  });
});

describe('calculateRiskLevel', () => {
  it.each([
    [1, 'LOW'],
    [4, 'LOW'],
    [5, 'MEDIUM'],
    [9, 'MEDIUM'],
    [10, 'HIGH'],
    [16, 'HIGH'],
    [17, 'CRITICAL'],
    [25, 'CRITICAL'],
  ])('score %i → %s', (score, expected) => {
    expect(calculateRiskLevel(score)).toBe(expected);
  });

  it('score นอกช่วง 1-25 → throw', () => {
    expect(() => calculateRiskLevel(0)).toThrow(RangeError);
    expect(() => calculateRiskLevel(26)).toThrow(RangeError);
  });
});

describe('calculateRisk', () => {
  it('ตัวอย่างจาก Spec: probability=3, impact=4 → score=12, level=HIGH (ไม่ hardcode)', () => {
    const result = calculateRisk(3, 4);
    expect(result).toEqual({ score: 12, level: 'HIGH' });
  });

  it('ครอบคลุมทุกระดับผ่านฟังก์ชันรวม', () => {
    expect(calculateRisk(1, 1)).toEqual({ score: 1, level: 'LOW' });
    expect(calculateRisk(3, 3)).toEqual({ score: 9, level: 'MEDIUM' });
    expect(calculateRisk(5, 4)).toEqual({ score: 20, level: 'CRITICAL' });
  });
});
