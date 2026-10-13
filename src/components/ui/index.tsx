"use client";
import * as React from "react";
import { X } from "lucide-react";
import { formatNaira, formatNairaFull } from "@/utils/format";

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success";
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
};

export function Button({ variant = "secondary", size = "md", icon, className, children, ...rest }: ButtonProps) {
  const base = "inline-flex items-center justify-center gap-1.5 rounded-md font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45 select-none";
  const variants = {
    primary: "bg-gold-500 text-ink-950 hover:bg-gold-400 active:bg-gold-300 [&_.text-naira]:text-ink-950",
    secondary: "bg-ink-700 text-ink-100 border border-ink-500 hover:bg-ink-600",
    ghost: "bg-transparent text-ink-200 hover:bg-ink-700",
    danger: "bg-danger-dim text-ink-100 border border-danger hover:bg-danger",
    success: "bg-growth-dim text-ink-100 border border-growth hover:bg-growth hover:text-ink-950 hover:[&_.text-naira]:text-ink-950",
  };
  const sizes = { sm: "px-2.5 py-1.5 text-xs", md: "px-3.5 py-2 text-sm", lg: "px-5 py-3 text-base" };
  return (
    <button className={cx(base, variants[variant], sizes[size], className)} {...rest}>
      {icon}
      {children}
    </button>
  );
}

export function Money({ amount, full = false, className, sign = false }: { amount: number; full?: boolean; className?: string; sign?: boolean }) {
  return (
    <span className={cx("font-pixel tabular-nums text-naira", className)} title={formatNairaFull(amount)}>
      {full ? formatNairaFull(amount) : formatNaira(amount, { sign })}
    </span>
  );
}

export function ProgressBar({ value, max, color = "bg-gold-500", className, label, height = "h-2" }: { value: number; max: number; color?: string; className?: string; label?: string; height?: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className={cx("w-full", className)}>
      {label && <div className="mb-1 flex justify-between text-[11px] text-ink-300"><span>{label}</span><span>{Math.round(pct)}%</span></div>}
      <div className={cx("w-full overflow-hidden rounded-sm bg-ink-950 border border-ink-700", height)} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className={cx("h-full transition-[width] duration-300", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function Panel({ title, children, className, actions, subtitle }: { title?: React.ReactNode; subtitle?: React.ReactNode; children: React.ReactNode; className?: string; actions?: React.ReactNode }) {
  return (
    <section className={cx("panel p-3 sm:p-4", className)}>
      {(title || actions) && (
        <header className="mb-3 flex items-start justify-between gap-2">
          <div>
            {title && <h3 className="font-pixel text-sm font-bold uppercase tracking-wide text-gold-400">{title}</h3>}
            {subtitle && <p className="text-xs text-ink-400">{subtitle}</p>}
          </div>
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}

export function Tag({ children, color = "bg-ink-700 text-ink-200", className }: { children: React.ReactNode; color?: string; className?: string }) {
  return <span className={cx("inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide", color, className)}>{children}</span>;
}

export function Stat({ label, value, hint, className }: { label: string; value: React.ReactNode; hint?: string; className?: string }) {
  return (
    <div className={cx("panel-raised px-3 py-2", className)} title={hint}>
      <div className="text-[10px] uppercase tracking-wide text-ink-400">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}

export function Modal({ title, onClose, children, size = "md", footer, closeLabel = "Close" }: { title: React.ReactNode; onClose?: () => void; children: React.ReactNode; size?: "sm" | "md" | "lg" | "xl"; footer?: React.ReactNode; closeLabel?: string }) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const el = ref.current;
    const focusable = el?.querySelector<HTMLElement>("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])");
    (focusable ?? el)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onClose) {
        e.stopPropagation();
        onClose();
      }
      if (e.key === "Tab" && el) {
        const items = Array.from(el.querySelectorAll<HTMLElement>("button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"));
        if (!items.length) return;
        const first = items[0]!;
        const last = items[items.length - 1]!;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, [onClose]);
  const sizes = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-3xl", xl: "max-w-5xl" };
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/70 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={typeof title === "string" ? title : undefined} className={cx("panel animate-slide-up flex max-h-[92vh] w-full flex-col rounded-b-none sm:rounded-b-xl", sizes[size])}>
        <header className="flex items-center justify-between gap-2 border-b border-ink-700 px-4 py-3">
          <h2 className="font-pixel text-base font-bold text-gold-400">{title}</h2>
          {onClose && (
            <button onClick={onClose} aria-label={closeLabel} className="touch-target flex items-center justify-center rounded-md text-ink-300 hover:bg-ink-700 hover:text-ink-100">
              <X size={20} />
            </button>
          )}
        </header>
        <div className="scrollbar-thin flex-1 overflow-y-auto px-4 py-3">{children}</div>
        {footer && <footer className="border-t border-ink-700 px-4 py-3">{footer}</footer>}
      </div>
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string; badge?: number }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div role="tablist" className="scrollbar-thin mb-3 flex gap-1 overflow-x-auto border-b border-ink-700">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={cx("relative whitespace-nowrap px-3 py-2 text-xs font-semibold uppercase tracking-wide transition-colors", value === t.id ? "border-b-2 border-gold-400 text-gold-300" : "text-ink-400 hover:text-ink-200")}
        >
          {t.label}
          {t.badge ? <span className="ml-1 rounded-full bg-danger px-1.5 text-[10px] text-white">{t.badge}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-md border border-dashed border-ink-600 p-4 text-center text-sm text-ink-400">{children}</div>;
}

export function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <span className="group relative inline-flex" tabIndex={0}>
      {children}
      <span role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-1 hidden w-max max-w-[220px] -translate-x-1/2 rounded bg-ink-950 px-2 py-1 text-[11px] text-ink-100 shadow-lg group-hover:block group-focus-within:block border border-ink-600">
        {text}
      </span>
    </span>
  );
}

export function Field({ label, children, hint, htmlFor }: { label: string; children: React.ReactNode; hint?: string; htmlFor?: string }) {
  return (
    <label className="block text-sm" htmlFor={htmlFor}>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-300">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-ink-400">{hint}</span>}
    </label>
  );
}
