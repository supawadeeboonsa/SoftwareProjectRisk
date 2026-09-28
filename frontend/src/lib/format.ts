// รูปแบบวันที่/เงิน/ตัวเลขตาม ui-design-system.md §11: ไทย, พ.ศ., Asia/Bangkok
const TZ = 'Asia/Bangkok';

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  return new Intl.DateTimeFormat('th-TH-u-ca-buddhist', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ,
  }).format(new Date(iso));
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '-';
  return new Intl.DateTimeFormat('th-TH-u-ca-buddhist', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: TZ,
  }).format(new Date(iso));
}

// budget ของ Backend นี้เป็นหน่วย "บาท" (ทศนิยม 2 ตำแหน่ง) ไม่ใช่สตางค์
export function formatBaht(v: number | null | undefined): string {
  if (v === null || v === undefined) return '-';
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 2 }).format(v);
}

export function formatNumber(v: number | null | undefined): string {
  if (v === null || v === undefined) return '-';
  return new Intl.NumberFormat('th-TH').format(v);
}

export function formatSigned(v: number, unit = ''): string {
  const s = formatNumber(Math.abs(v));
  return `${v > 0 ? '+' : v < 0 ? '-' : ''}${s}${unit ? ' ' + unit : ''}`;
}

// ค่าจาก <input type="date"> → ต้องเป็น YYYY-MM-DD ที่ Backend ต้องการ
export function toDateInput(iso: string): string {
  return iso.slice(0, 10);
}
