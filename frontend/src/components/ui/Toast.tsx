import { createContext, useCallback, useContext, useState, ReactNode } from 'react';
import { CheckCircle2, CircleAlert, Info, X } from 'lucide-react';

interface Toast {
  id: number;
  message: string;
  variant: 'success' | 'error' | 'info';
}

interface ToastContextValue {
  push: (message: string, variant?: Toast['variant']) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const TOAST_MS = 3200;

const ICON: Record<Toast['variant'], { Icon: typeof Info; color: string }> = {
  success: { Icon: CheckCircle2, color: 'text-brand-green-fresh' },
  error: { Icon: CircleAlert, color: 'text-brand-red' },
  info: { Icon: Info, color: 'text-info' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const push = useCallback((message: string, variant: Toast['variant'] = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, variant }]);
    setTimeout(() => dismiss(id), TOAST_MS);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-3 bottom-24 z-[70] flex flex-col items-center gap-2 sm:inset-x-auto sm:bottom-4 sm:right-4 sm:items-end lg:bottom-6"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((t) => {
          const { Icon, color } = ICON[t.variant];
          return (
            <div
              key={t.id}
              role="status"
              className="surface pointer-events-auto flex w-full max-w-sm animate-fade-up items-start gap-3 rounded-xl px-4 py-3 text-sm font-medium text-ink shadow-raised"
            >
              <Icon size={18} strokeWidth={2} className={`mt-px shrink-0 ${color}`} aria-hidden />
              <span className="min-w-0 flex-1">{t.message}</span>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss"
                className="-mr-1 -mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-ink"
              >
                <X size={15} strokeWidth={2} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
