import { applyTeamSizeElasticity } from './team-size-elasticity';

describe('applyTeamSizeElasticity', () => {
  it('ตัวอย่างจาก Business Logic Freeze: duration=57, team 5→3, p=0.5 → 76 วัน (ไม่ใช่ 67)', () => {
    // 57 * ((1-0.5) + 0.5*(5/3)) = 57 * (4/3) = 76 พอดี — คำนวณจากสูตรจริงตามที่ freeze ไว้
    expect(applyTeamSizeElasticity(57, 5, 3, 0.5)).toBe(76);
  });

  it('team ไม่เปลี่ยน (old = new) → duration ไม่เปลี่ยน ไม่ว่า p จะเป็นเท่าไร', () => {
    expect(applyTeamSizeElasticity(57, 5, 5, 0.5)).toBe(57);
    expect(applyTeamSizeElasticity(20, 3, 3, 1)).toBe(20);
    expect(applyTeamSizeElasticity(20, 3, 3, 0)).toBe(20);
  });

  it('เพิ่มทีม (new > old) → duration ลดลง', () => {
    // 57 * (0.5 + 0.5*(3/5)) = 57 * 0.8 = 45.6 → round 46
    expect(applyTeamSizeElasticity(57, 3, 5, 0.5)).toBe(46);
  });

  it('p = 0 → ไม่มีผลจาก team size เลย (duration คงเดิมเสมอ)', () => {
    expect(applyTeamSizeElasticity(60, 5, 1, 0)).toBe(60);
  });

  it('p = 1 → ผลเป็นเส้นตรงเต็มที่ (duration * old/new)', () => {
    expect(applyTeamSizeElasticity(60, 5, 3, 1)).toBe(100); // 60*5/3=100
  });

  it.each([-1, 1.5])('duration ไม่ถูกต้อง (%p) → throw', (duration) => {
    expect(() => applyTeamSizeElasticity(duration, 5, 3)).toThrow(RangeError);
  });

  it.each([0, -1, 1.5])('oldTeamSize ไม่ถูกต้อง (%p) → throw', (team) => {
    expect(() => applyTeamSizeElasticity(57, team, 3)).toThrow(RangeError);
  });

  it.each([0, -1, 1.5])('newTeamSize ไม่ถูกต้อง (%p) → throw', (team) => {
    expect(() => applyTeamSizeElasticity(57, 5, team)).toThrow(RangeError);
  });

  it.each([-0.1, 1.1])('p นอกช่วง 0-1 (%p) → throw', (p) => {
    expect(() => applyTeamSizeElasticity(57, 5, 3, p)).toThrow(RangeError);
  });
});
