import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ProjectStatus } from '../project-status';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateProjectDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'name should not be empty' })
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  // รับเฉพาะรูปแบบ YYYY-MM-DD และต้องเป็นวันที่จริง (เช่น 2026-02-30 ไม่ผ่าน)
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'startDate must be in YYYY-MM-DD format' })
  @IsDateString({ strict: true }, { message: 'startDate must be a valid date' })
  startDate!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'endDate must be in YYYY-MM-DD format' })
  @IsDateString({ strict: true }, { message: 'endDate must be a valid date' })
  endDate!: string;

  // Decimal(14,2) ในฐานข้อมูล → สูงสุด 999,999,999,999.99
  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999999999999.99)
  budget!: number;

  @IsInt()
  @Min(1)
  @Max(2147483647) // ขีดจำกัดของ Int ในฐานข้อมูล
  teamSize!: number;

  @IsOptional()
  @IsIn(Object.values(ProjectStatus), {
    message: `status must be one of: ${Object.values(ProjectStatus).join(', ')}`,
  })
  status?: ProjectStatus;
}
