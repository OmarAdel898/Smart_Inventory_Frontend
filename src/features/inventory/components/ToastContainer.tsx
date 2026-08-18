import { AlertCircle, CheckCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Toast } from '../types';

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="fixed top-6 right-6 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, x: 60, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60, scale: 0.95 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className={`flex items-start gap-3 p-4 rounded-lg shadow-sm border text-sm pointer-events-auto ${
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
              className="text-gray-500 hover:text-gray-900 hover:opacity-100 transition-opacity"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
