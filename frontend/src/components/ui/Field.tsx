import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

const control =
  'focus-ring w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface placeholder:text-outline disabled:opacity-60';

export function Field({ label, error, hint, children, htmlFor }: { label: string; error?: string; hint?: string; children: ReactNode; htmlFor: string }) {
  return (
    <div className="mb-4">
      <label htmlFor={htmlFor} className="mb-1 block text-label-md text-on-surface">{label}</label>
      {children}
      {hint && !error && <p className="mt-1 text-caption text-on-surface-variant">{hint}</p>}
      {error && <p role="alert" className="mt-1 text-caption text-error">{error}</p>}
    </div>
  );
}

export const TextInput = (p: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={`${control} ${p.className ?? ''}`} />;
export const TextArea = (p: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea rows={3} {...p} className={`${control} ${p.className ?? ''}`} />;
export const Select = (p: SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className={`${control} ${p.className ?? ''}`} />;
