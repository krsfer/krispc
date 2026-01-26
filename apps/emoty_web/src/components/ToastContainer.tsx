'use client';

import React, { useEffect, useRef } from 'react';
import { useToast } from '@/contexts/ToastContext';
import styles from './ToastContainer.module.css';

declare global {
  interface Window {
    bootstrap: {
      Toast: {
        new (element: HTMLElement, options?: { autohide?: boolean; delay?: number }): {
          show: () => void;
          hide: () => void;
          dispose: () => void;
        };
      };
    };
  }
}

type BootstrapToastInstance = {
  show: () => void;
  hide: () => void;
  dispose: () => void;
};

interface ToastItemProps {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  duration: number;
  onRemove: (id: string) => void;
}

function ToastItem({ id, message, type, duration, onRemove }: ToastItemProps) {
  const toastRef = useRef<HTMLDivElement>(null);
  const bsToastRef = useRef<BootstrapToastInstance | null>(null);

  useEffect(() => {
    if (toastRef.current && typeof window !== 'undefined' && window.bootstrap) {
      // Initialize Bootstrap toast
      bsToastRef.current = new window.bootstrap.Toast(toastRef.current, {
        autohide: true,
        delay: duration,
      });

      // Show the toast
      bsToastRef.current.show();

      // Listen for hidden event to remove from state
      const handleHidden = () => {
        onRemove(id);
      };

      toastRef.current.addEventListener('hidden.bs.toast', handleHidden);

      return () => {
        if (toastRef.current) {
          toastRef.current.removeEventListener('hidden.bs.toast', handleHidden);
        }
        if (bsToastRef.current) {
          bsToastRef.current.dispose();
        }
      };
    }
  }, [id, duration, onRemove]);

  // Map type to Bootstrap class
  const typeClass = type === 'success' ? 'text-bg-success' : type === 'error' ? 'text-bg-danger' : 'text-bg-info';

  return (
    <div
      ref={toastRef}
      className={`toast ${typeClass}`}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div className="toast-body d-flex align-items-center">
        {message}
      </div>
    </div>
  );
}

export default function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div className={styles.toastContainer} aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          id={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onRemove={removeToast}
        />
      ))}
    </div>
  );
}
