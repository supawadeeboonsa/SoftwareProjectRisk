'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';

// โครงหน้าแบบเดียวกับ CsmjuAppShell (sidebar + topbar) — ทำเองในเครื่องเพราะติดตั้ง
// @csmju2030/design-system จริงไม่ได้ (ต้อง auth GitHub Packages ของ Organization)
const NAV = [
  { href: '/', label: 'ภาพรวม' },
  { href: '/projects', label: 'โครงการ' },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <div className="min-h-screen md:flex">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-2">ข้ามไปยังเนื้อหาหลัก</a>

      <aside className={`${open ? 'block' : 'hidden'} brand-gradient text-white md:block md:w-64 md:shrink-0`}>
        <div className="p-6">
          <p className="font-display text-headline-md">Software Project Risk</p>
          <p className="mt-1 text-caption text-on-primary-container">ระบบวิเคราะห์ความเสี่ยงโครงการซอฟต์แวร์</p>
        </div>
        <nav aria-label="เมนูหลัก" className="px-3 pb-6">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} onClick={() => setOpen(false)}
              aria-current={isActive(n.href) ? 'page' : undefined}
              className={`focus-ring mb-1 block rounded-lg px-3 py-2 text-label-md ${isActive(n.href) ? 'bg-white/20 font-bold' : 'hover:bg-white/10'}`}>
              {n.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex items-center gap-3 border-b border-outline-variant bg-surface-container-lowest px-4 py-3 md:hidden">
          <button type="button" aria-label="เปิด/ปิดเมนู" aria-expanded={open} onClick={() => setOpen(!open)}
            className="focus-ring rounded-lg border border-outline-variant px-3 py-1 text-label-md">เมนู</button>
          <span className="font-display text-label-md">Software Project Risk</span>
        </header>
        <main id="main" className="mx-auto max-w-6xl p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
