import { AlertCircle, CheckCircle, X } from 'lucide-react';
import type { Toast } from '../types';

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="fixed top-6 right-6 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-start gap-3 p-4 rounded-lg shadow-lg border text-sm pointer-events-auto transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${
            t.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : t.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}
        >
          {t.type === 'success' ? (
            <CheckCircle className="h-5 w-5 shrink-0 text-green-600" />
          ) : t.type === 'error' ? (
            <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0 text-blue-600" />
          )}
          <div className="flex-1 font-medium">{t.message}</div>
          <button
            onClick={() => onDismiss(t.id)}
            className="text-on-surface-variant hover:text-on-surface hover:opacity-100 transition-opacity"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
