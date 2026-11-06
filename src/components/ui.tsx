import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}

export function Modal({ open, onClose, title, subtitle, icon, children, footer, width = 'max-w-3xl' }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-[#02090f]/70 p-0 sm:items-center sm:p-6">
      <div
        className={`glass animate-float-up flex max-h-[92vh] w-full ${width} flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl`}
      >
        <header className="flex items-start gap-3 border-b-[3px] border-[#3c4686] bg-gradient-to-b from-[#2f3a7a] to-[#232a55] px-5 py-4 sm:px-6">
          {icon && <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-2 border-[#ffe9a0] bg-gradient-to-b from-[#ffd44d] to-[#ff9f1a] text-[#3a2200] shadow-[0_3px_0_#b25a00] [&_svg]:!text-[#3a2200]">{icon}</div>}
          <div className="min-w-0 flex-1">
            <h2 className="hud-title truncate text-xl text-white sm:text-2xl">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-slate-400">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="btn-ghost rounded-xl p-2 text-white transition"
          >
            <X size={18} strokeWidth={3} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">{children}</div>
        {footer && <footer className="border-t border-white/10 px-5 py-3 sm:px-6">{footer}</footer>}
      </div>
    </div>
  );
}

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'ghost';
  className?: string;
  icon?: ReactNode;
  type?: 'button' | 'submit';
}

export function Button({ children, onClick, disabled, variant = 'primary', className = '', icon, type = 'button' }: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-extrabold transition disabled:cursor-not-allowed ${
        variant === 'primary' ? 'btn-primary' : 'btn-ghost text-slate-200'
      } ${className}`}
    >
      {icon}
      {children}
    </button>
  );
}

export function Stat({ label, value, accent = 'text-white' }: { label: string; value: ReactNode; accent?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">{label}</p>
      <p className={`font-display mt-1 text-xl font-extrabold ${accent}`}>{value}</p>
    </div>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{children}</h3>
      {right}
    </div>
  );
}

export function Pill({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'good' | 'warn' | 'info' }) {
  const tones: Record<string, string> = {
    default: 'bg-white/10 text-slate-200 border-white/20',
    good: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/25',
    warn: 'bg-amber-400/10 text-amber-300 border-amber-400/25',
    info: 'bg-sky-400/10 text-sky-300 border-sky-400/25',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function ProgressBar({ value, tone = 'amber' }: { value: number; tone?: 'amber' | 'sky' | 'emerald' }) {
  const colors = { amber: 'bg-amber-400', sky: 'bg-sky-400', emerald: 'bg-emerald-400' };
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
      <div
        className={`h-full rounded-full ${colors[tone]} transition-[width] duration-200`}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

export function money(value: number) {
  return `X$ ${Math.max(0, Math.round(value)).toLocaleString('pt-PT')}`;
}

export function clockLabel(hour: number) {
  const h = Math.floor(hour) % 24;
  const m = Math.floor((hour % 1) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function timeUntil(timestamp: number) {
  const diff = Math.max(0, timestamp - Date.now());
  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
