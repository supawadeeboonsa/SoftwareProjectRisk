import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateScenarioChangeDto } from './create-scenario-change.dto';
import { CreateScenarioDto } from './create-scenario.dto';

const opts = { whitelist: true, forbidNonWhitelisted: true };
async function errorsOf<T extends object>(cls: new () => T, body: unknown) {
  return (await validate(plainToInstance(cls, body) as object, opts)).map((e) => e.property);
}

describe('CreateScenarioDto', () => {
  it('ข้อมูลถูกต้อง → ผ่าน', async () => {
    expect(await errorsOf(CreateScenarioDto, { name: 'Reduce Development Team' })).toEqual([]);
  });
  it('name ห้ามว่าง', async () => {
    expect(await errorsOf(CreateScenarioDto, { name: '' })).toContain('name');
    expect(await errorsOf(CreateScenarioDto, {})).toContain('name');
  });
});

describe('CreateScenarioChangeDto', () => {
  it('รูปแบบพื้นฐานถูกต้อง → ผ่าน (ตรวจ business rule แยกที่ Service)', async () => {
    expect(await errorsOf(CreateScenarioChangeDto, { factor: 'TEAM_SIZE', newValue: 3 })).toEqual([]);
    expect(
      await errorsOf(CreateScenarioChangeDto, {
        factor: 'TASK_DURATION', taskId: '11111111-1111-4111-8111-111111111111', newValue: 20,
      }),
    ).toEqual([]);
  });

  it('factor ต้องเป็นค่าที่กำหนดเท่านั้น', async () => {
    expect(await errorsOf(CreateScenarioChangeDto, { factor: 'INVALID', newValue: 1 })).toContain('factor');
  });

  it('newValue ต้องเป็นตัวเลข', async () => {
    expect(await errorsOf(CreateScenarioChangeDto, { factor: 'TEAM_SIZE', newValue: 'x' })).toContain('newValue');
  });

  it('taskId/riskId ต้องเป็น UUID ถ้าส่งมา', async () => {
    expect(await errorsOf(CreateScenarioChangeDto, { factor: 'TASK_DURATION', taskId: 'not-a-uuid', newValue: 1 })).toContain('taskId');
    expect(await errorsOf(CreateScenarioChangeDto, { factor: 'RISK_PROBABILITY', riskId: 'not-a-uuid', newValue: 1 })).toContain('riskId');
  });
});
