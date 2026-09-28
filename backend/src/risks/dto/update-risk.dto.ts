import { PartialType } from '@nestjs/mapped-types';
import { CreateRiskDto } from './create-risk.dto';

// PATCH: ส่งเฉพาะ field ที่ต้องการแก้; ไม่มี score/level ให้แก้ตรงๆ เช่นเดียวกับตอนสร้าง
export class UpdateRiskDto extends PartialType(CreateRiskDto) {}
