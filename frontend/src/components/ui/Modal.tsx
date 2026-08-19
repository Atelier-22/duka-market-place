import { ReactNode, useEffect } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  maxWidth?: string;
}

export function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg' }: ModalProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-brand-green-deep/30 backdrop-blur-sm animate-fade-up"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`glass relative w-full ${maxWidth} animate-fade-up rounded-xl3 p-6 shadow-glass-lg`}
      >
        {title && (
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-xl font-medium text-brand-green-deep">{title}</h3>
            <button
              onClick={onClose}
              aria-label="Close"
              className="rounded-full p-1.5 text-brand-ink/50 hover:bg-brand-green-mist hover:text-brand-green-deep"
            >
              ✕
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
