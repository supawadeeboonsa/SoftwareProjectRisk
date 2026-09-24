import { INestApplication, ValidationPipe } from '@nestjs/common';

// ใช้ร่วมกันระหว่าง main.ts และ test เพื่อให้ตั้งค่าตรงกัน
export function setupApp(app: INestApplication) {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // ตัด field ที่ไม่รู้จัก
      forbidNonWhitelisted: true, // ...และปฏิเสธ (400) แทนการเงียบ
      transform: true, // แปลง body เป็น DTO (ไม่แปลงชนิดข้อมูลให้เอง)
    }),
  );
}
