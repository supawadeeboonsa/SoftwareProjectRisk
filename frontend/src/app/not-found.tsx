import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="py-16 text-center">
      <h1 className="font-display text-headline-lg">ไม่พบหน้าที่ต้องการ</h1>
      <Link href="/" className="mt-4 inline-block text-primary-container underline">กลับหน้าภาพรวม</Link>
    </div>
  );
}
