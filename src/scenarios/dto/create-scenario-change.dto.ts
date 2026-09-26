import { IsIn, IsNumber, IsOptional, IsUUID } from 'class-validator';
import { ScenarioChangeFactor } from '../scenario-factor';

// หมายเหตุ: taskId/riskId "จำเป็นหรือไม่" ขึ้นกับ factor (เช่น TASK_DURATION ต้องมี taskId)
// ตรวจแบบมีเงื่อนไขนี้ไว้ที่ ScenarioChangesService (readable กว่าใช้ custom decorator ซับซ้อน)
export class CreateScenarioChangeDto {
  @IsIn(Object.values(ScenarioChangeFactor), {
    message: `factor must be one of: ${Object.values(ScenarioChangeFactor).join(', ')}`,
  })
  factor!: ScenarioChangeFactor;

  @IsOptional()
  @IsUUID()
  taskId?: string;

  @IsOptional()
  @IsUUID()
  riskId?: string;

  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 })
  newValue!: number;
}
