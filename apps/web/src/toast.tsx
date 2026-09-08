import { createContext, type ReactNode, useCallback, useContext, useState } from 'react';
import { useTranslation } from './i18n';

type Toast = { id: number; message: string; variant: 'info' | 'error' | 'success' };
type ToastContextValue = { notify: (message: string, variant?: Toast['variant']) => void };

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const { t } = useTranslation();
  const dismiss = useCallback(
    (id: number) => setToasts((items) => items.filter((item) => item.id !== id)),
    [],
  );
  const notify = useCallback(
    (message: string, variant: Toast['variant'] = 'info') => {
      const id = Date.now();
      setToasts((items) => [...items, { id, message, variant }]);
      window.setTimeout(() => dismiss(id), 5000);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div className="toast-viewport" aria-live="polite" aria-label={t('notifications')}>
        {toasts.map((toast) => (
          <div className={`toast toast-${toast.variant}`} key={toast.id} role="status">
            <span>{toast.message}</span>
            <button type="button" onClick={() => dismiss(toast.id)} aria-label={t('close')}>
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }

  return context;
}
