import { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  variant?: 'success' | 'error';
  onDismiss: () => void;
  children?: React.ReactNode;
}

export default function Toast({ message, variant = 'error', onDismiss, children }: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300);
    }, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 overlay-bg ${
        variant === 'success' ? 'bg-green-600 text-white' : 'bg-destructive text-white'
      } ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      <span className="material-symbols-outlined text-sm">
        {variant === 'success' ? 'check_circle' : 'error'}
      </span>
      <div className="flex flex-col gap-1">
        <span className="text-body-sm">{message}</span>
        {children}
      </div>
      <button onClick={() => { setVisible(false); setTimeout(onDismiss, 300); }} className="ml-2 hover:opacity-80 shrink-0">
        <span className="material-symbols-outlined text-sm">close</span>
      </button>
    </div>
  );
}