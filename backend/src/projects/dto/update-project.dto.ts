import { PartialType } from '@nestjs/mapped-types';
import { CreateProjectDto } from './create-project.dto';

// PATCH: ส่งเฉพาะ field ที่ต้องการแก้ (กฎ validation เหมือนตอนสร้าง)
export class UpdateProjectDto extends PartialType(CreateProjectDto) {}
