'use client';
import React, { useId } from 'react';
import { useEscapeKey } from '@/lib/useEscapeKey';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  loading?: boolean;
}

export default function ConfirmModal({
  open, onClose, onConfirm, title, message, confirmLabel = 'Delete', loading = false,
}: ConfirmModalProps) {
  const titleId = useId();
  // Esc or a click outside cancels — except while the action is running.
  useEscapeKey(onClose, open && !loading);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay fade-in" onClick={() => { if (!loading) onClose(); }}>
      <div
        className="w-full max-w-sm bg-card rounded-xl border border-border card-shadow-md scale-in"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-danger/10 flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={20} className="text-danger" />
            </div>
            <div>
              <h3 id={titleId} className="text-sm font-700 text-foreground">{title}</h3>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{message}</p>
            </div>
          </div>
        </div>
        <div className="px-6 pb-5 flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-600 text-muted-foreground bg-muted rounded-md hover:bg-border transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 text-sm font-600 text-primary-foreground bg-danger rounded-md hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading && (
              <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}