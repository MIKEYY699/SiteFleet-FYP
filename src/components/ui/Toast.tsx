'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, X, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={18} className="text-success" />,
  error: <AlertCircle size={18} className="text-danger" />,
  info: <Info size={18} className="text-primary" />,
};

const BG: Record<ToastType, string> = {
  success: 'border-success/30 bg-white',
  error: 'border-danger/30 bg-white',
  info: 'border-primary/30 bg-white',
};

function ToastItem({ toast, onRemove }: { toast: ToastMessage; onRemove: (id: string) => void }) {
  useEffect(() => {
    // Errors stay up longer: they usually carry a message the user needs to read.
    const t = setTimeout(() => onRemove(toast.id), toast.type === 'error' ? 7000 : 3500);
    return () => clearTimeout(t);
  }, [toast.id, toast.type, onRemove]);

  return (
    <div role={toast.type === 'error' ? 'alert' : 'status'} className={`flex items-start gap-3 p-4 rounded-lg border card-shadow-md slide-up min-w-[280px] max-w-sm ${BG[toast.type]}`}>
      <div className="flex-shrink-0 mt-0.5">{ICONS[toast.type]}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-600 text-foreground">{toast.title}</p>
        {toast.message && <p className="text-xs text-muted-foreground mt-0.5">{toast.message}</p>}
      </div>
      <button onClick={() => onRemove(toast.id)} aria-label="Dismiss notification" className="p-0.5 text-muted-foreground hover:text-foreground flex-shrink-0">
        <X size={14} />
      </button>
    </div>
  );
}

export function ToastContainer({ toasts, onRemove }: ToastProps) {
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  );
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Stable identities: ToastItem's dismiss timer depends on onRemove, so a new
  // function on every render would restart the timer and the toast would never close.
  const addToast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = `toast-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    setToasts(prev => [...prev, { id, type, title, message }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
}