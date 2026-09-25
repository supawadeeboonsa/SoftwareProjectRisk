import { Transform } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

// หมายเหตุ: DTO นี้ "ไม่มี" field score/level โดยตั้งใจ
// ValidationPipe ตั้ง forbidNonWhitelisted (app.setup.ts) จึงถ้า client ส่ง score/level มา
// request จะถูกปฏิเสธด้วย 400 ทันที (ดู risks.api.spec.ts) ไม่ใช่แค่ "เพิกเฉย"
export class CreateRiskDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'name should not be empty' })
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsInt()
  @Min(1)
  @Max(5)
  probability!: number;

  @IsInt()
  @Min(1)
  @Max(5)
  impact!: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  mitigation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  contingency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  owner?: string;
}
