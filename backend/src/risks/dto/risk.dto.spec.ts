import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateRiskDto } from './create-risk.dto';
import { UpdateRiskDto } from './update-risk.dto';

const opts = { whitelist: true, forbidNonWhitelisted: true };
const valid = { name: 'Developer Shortage', probability: 3, impact: 4 };

async function errorsOf<T extends object>(cls: new () => T, body: unknown) {
  return (await validate(plainToInstance(cls, body) as object, opts)).map((e) => e.property);
}

describe('CreateRiskDto', () => {
  it('ข้อมูลถูกต้อง → ผ่าน', async () => {
    expect(await errorsOf(CreateRiskDto, valid)).toEqual([]);
    expect(
      await errorsOf(CreateRiskDto, {
        ...valid, description: 'x', mitigation: 'y', contingency: 'z', owner: 'PM',
      }),
    ).toEqual([]);
  });

  it('name: ห้ามขาด/ว่าง/มีแต่ช่องว่าง', async () => {
    const { name, ...noName } = valid;
    expect(await errorsOf(CreateRiskDto, noName)).toContain('name');
    expect(await errorsOf(CreateRiskDto, { ...valid, name: '' })).toContain('name');
    expect(await errorsOf(CreateRiskDto, { ...valid, name: '   ' })).toContain('name');
  });

  it.each([0, -1, 6, 1.5])('probability ผิด (%p) → error', async (probability) => {
    expect(await errorsOf(CreateRiskDto, { ...valid, probability })).toContain('probability');
  });
  it('probability เป็น string → error', async () => {
    expect(await errorsOf(CreateRiskDto, { ...valid, probability: '3' })).toContain('probability');
  });

  it.each([0, -1, 6, 1.5])('impact ผิด (%p) → error', async (impact) => {
    expect(await errorsOf(CreateRiskDto, { ...valid, impact })).toContain('impact');
  });

  it.each([1, 2, 3, 4, 5])('probability/impact = %i ผ่านได้ทุกค่าใน 1-5', async (n) => {
    expect(await errorsOf(CreateRiskDto, { ...valid, probability: n, impact: n })).toEqual([]);
  });

  it('ปฏิเสธ score/level ที่ client ส่งมาเอง (whitelist)', async () => {
    expect(await errorsOf(CreateRiskDto, { ...valid, score: 999 })).toContain('score');
    expect(await errorsOf(CreateRiskDto, { ...valid, level: 'LOW' })).toContain('level');
  });
});

describe('UpdateRiskDto', () => {
  it('ส่งบางส่วนได้', async () => {
    expect(await errorsOf(UpdateRiskDto, {})).toEqual([]);
    expect(await errorsOf(UpdateRiskDto, { probability: 5 })).toEqual([]);
  });

  it('ค่าที่ส่งต้องถูกต้องเหมือนตอนสร้าง', async () => {
    expect(await errorsOf(UpdateRiskDto, { probability: 0 })).toContain('probability');
    expect(await errorsOf(UpdateRiskDto, { impact: 6 })).toContain('impact');
    expect(await errorsOf(UpdateRiskDto, { score: 1 })).toContain('score');
  });
});
