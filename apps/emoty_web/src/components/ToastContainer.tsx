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
    const element = toastRef.current;
    if (!element) return;

    // Wait for Bootstrap to be available
    const initToast = () => {
      if (typeof window === 'undefined' || !window.bootstrap) {
        return;
      }

      bsToastRef.current = new window.bootstrap.Toast(element, {
        autohide: true,
        delay: duration,
      });

      bsToastRef.current.show();

      const handleHidden = () => {
        // Dispose Bootstrap instance BEFORE removing from React state
        if (bsToastRef.current) {
          bsToastRef.current.dispose();
          bsToastRef.current = null;
        }
        onRemove(id);
      };

      element.addEventListener('hidden.bs.toast', handleHidden);

      return () => {
        element.removeEventListener('hidden.bs.toast', handleHidden);
        // Only dispose if not already disposed by handleHidden
        if (bsToastRef.current) {
          bsToastRef.current.dispose();
        }
      };
    };

    // Store cleanup function reference
    let cleanup: (() => void) | undefined;

    // If Bootstrap is already loaded, initialize immediately
    if (window.bootstrap) {
      return initToast();
    }

    // Otherwise wait for Bootstrap to load
    const checkBootstrap = setInterval(() => {
      if (window.bootstrap) {
        clearInterval(checkBootstrap);
        cleanup = initToast(); // Capture cleanup function
      }
    }, 100);

    return () => {
      clearInterval(checkBootstrap);
      if (cleanup) cleanup(); // Run captured cleanup
    };
  }, [id, duration, onRemove]);

  // Map type to Bootstrap class
  const typeClass = type === 'success' ? 'text-bg-success' : type === 'error' ? 'text-bg-danger' : 'text-bg-info';

  return (
    <div
      ref={toastRef}
      className={`toast ${typeClass}`}
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
    <div className={styles.toastContainer}>
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
