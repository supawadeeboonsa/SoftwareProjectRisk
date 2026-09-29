import type { ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-outline-variant/80 bg-surface-container-lowest p-5 shadow-[0_1px_3px_rgba(25,28,29,0.04)] md:p-6 ${className}`}>
      {children}
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <p className="mb-1 text-label-sm font-semibold uppercase tracking-wide text-primary-container">Software Project Risk</p>
        <h1 className="font-display text-headline-lg font-bold tracking-tight text-on-surface">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-body-md text-on-surface-variant">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
