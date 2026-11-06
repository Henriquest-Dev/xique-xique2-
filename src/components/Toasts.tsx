import { AlertTriangle, CheckCircle2, Coins, Info, XCircle } from 'lucide-react';
import { Toast } from '../types/game';

const icons = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
  reward: Coins,
};

const tones = {
  info: 'border-sky-400/30 text-sky-100',
  success: 'border-emerald-400/30 text-emerald-100',
  warning: 'border-amber-400/30 text-amber-100',
  error: 'border-rose-400/30 text-rose-100',
  reward: 'border-amber-300/40 text-amber-100',
};

export function Toasts({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-20 z-30 flex flex-col items-center gap-2 sm:inset-x-auto sm:left-5 sm:bottom-24 sm:items-start">
      {toasts.map((toast) => {
        const Icon = icons[toast.tone] ?? Info;
        return (
          <button
            key={toast.id}
            onClick={() => onDismiss(toast.id)}
            className={`animate-float-up pointer-events-auto flex max-w-sm items-start gap-2 rounded-xl border bg-[#08131f]/90 px-3 py-2 text-left text-xs font-semibold backdrop-blur ${tones[toast.tone]}`}
          >
            <Icon size={15} className="mt-0.5 shrink-0" />
            <span>{toast.text}</span>
          </button>
        );
      })}
    </div>
  );
}
