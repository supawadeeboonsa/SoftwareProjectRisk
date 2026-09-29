'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';

const NAV = [
  { href: '/', label: 'แดชบอร์ด', icon: '⌂' },
  { href: '/projects', label: 'โครงการทั้งหมด', icon: '▣' },
];

function currentLabel(pathname: string) {
  if (pathname === '/') return 'แดชบอร์ด';
  if (pathname.startsWith('/projects')) return 'โครงการทั้งหมด';
  if (pathname.startsWith('/scenarios')) return 'สถานการณ์จำลอง';
  if (pathname.startsWith('/simulations')) return 'ผลการจำลอง';
  return 'Software Project Risk';
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <div className="min-h-screen bg-background text-on-surface">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-2">
        ข้ามไปยังเนื้อหาหลัก
      </a>

      <header className="sticky top-0 z-30 border-b border-outline-variant bg-surface-container-lowest/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center gap-6 px-4 md:px-8">
          <Link href="/" className="focus-ring flex min-w-0 shrink-0 items-center gap-3 rounded-lg">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-container font-display text-base font-bold text-on-primary">
              SP
            </div>
            <div className="min-w-0">
              <p className="truncate font-display text-label-md font-bold text-on-surface">Software Project Risk</p>
              <p className="truncate text-caption text-on-surface-variant">Risk &amp; What-if Simulation</p>
            </div>
          </Link>

          <nav aria-label="เมนูหลัก" className="hidden flex-1 items-center justify-center gap-1 md:flex">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                aria-current={isActive(n.href) ? 'page' : undefined}
                className={`focus-ring flex min-h-10 items-center gap-2 rounded-lg px-4 text-label-md transition-colors ${isActive(n.href) ? 'bg-primary-fixed font-bold text-primary' : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'}`}
              >
                <span aria-hidden className="grid w-5 place-items-center text-base">{n.icon}</span>
                <span>{n.label}</span>
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <span className="hidden rounded-full bg-surface-container-low px-3 py-1.5 text-caption text-on-surface-variant lg:inline-flex">
              {currentLabel(pathname)}
            </span>
            <button
              type="button"
              aria-label="เปิด/ปิดเมนู"
              aria-expanded={open}
              onClick={() => setOpen(!open)}
              className="focus-ring rounded-lg border border-outline-variant px-3 py-2 text-label-md md:hidden"
            >
              เมนู
            </button>
          </div>
        </div>

        {open && (
          <nav aria-label="เมนูหลักบนมือถือ" className="border-t border-outline-variant bg-surface-container-lowest px-4 py-3 md:hidden">
            <div className="mx-auto flex w-full max-w-7xl gap-2">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive(n.href) ? 'page' : undefined}
                  className={`focus-ring flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg px-3 text-label-md ${isActive(n.href) ? 'bg-primary-fixed font-bold text-primary' : 'text-on-surface-variant hover:bg-surface-container-low'}`}
                >
                  <span aria-hidden>{n.icon}</span>
                  <span>{n.label}</span>
                </Link>
              ))}
            </div>
          </nav>
        )}
      </header>

      <main id="main" className="mx-auto w-full max-w-7xl p-4 md:p-8">{children}</main>
    </div>
  );
}
