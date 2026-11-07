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
    <div className="pointer-events-none fixed inset-x-0 top-2 z-[60] flex flex-col items-center gap-1.5 px-3" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {toasts.slice(-3).map((toast) => {
        const Icon = icons[toast.tone] ?? Info;
        return (
          <button
            key={toast.id}
            onClick={() => onDismiss(toast.id)}
            className="animate-float-up pointer-events-auto flex w-full max-w-sm items-center gap-2.5 rounded-2xl border border-white/15 bg-[#171c3d]/95 px-3 py-2 text-left shadow-[0_6px_18px_rgba(0,0,0,.45)] backdrop-blur"
          >
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#232a55] ${tones[toast.tone].split(' ')[1]}`}><Icon size={16} /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-[9px] font-extrabold uppercase tracking-widest text-slate-400">XiquePhone · agora</span>
              <span className="block truncate text-xs font-bold text-white">{toast.text}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
