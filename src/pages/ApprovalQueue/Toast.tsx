import { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  onDismiss: () => void;
}

export default function Toast({ message, onDismiss }: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300);
    }, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      className={`fixed top-4 right-4 z-[100] bg-destructive text-on-error px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 overlay-bg ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <span className="material-symbols-outlined text-sm">error</span>
      <span className="text-body-sm">{message}</span>
      <button onClick={() => { setVisible(false); setTimeout(onDismiss, 300); }} className="ml-2 hover:opacity-80">
        <span className="material-symbols-outlined text-sm">close</span>
      </button>
    </div>
  );
}
