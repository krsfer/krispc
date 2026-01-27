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

    let isMounted = true;
    let checkInterval: NodeJS.Timeout;

    const cleanupToast = () => {
      if (bsToastRef.current) {
        try {
          bsToastRef.current.dispose();
        } catch (error) {
          // Ignore dispose errors if element is already gone
        }
        bsToastRef.current = null;
      }
    };

    const initToast = () => {
      if (!isMounted) return;
      if (typeof window === 'undefined' || !window.bootstrap) return;
      if (!element.isConnected) return; // Critical check: Ensure element is in DOM

      // Clean up any existing instance
      cleanupToast();

      try {
        const toastInstance = new window.bootstrap.Toast(element, {
          autohide: true,
          delay: duration,
        });
        bsToastRef.current = toastInstance;

        const handleHidden = () => {
          if (isMounted) {
            onRemove(id);
          }
        };

        element.addEventListener('hidden.bs.toast', handleHidden);
        
        // Show the toast
        // Wrap in requestAnimationFrame to ensure DOM is ready
        requestAnimationFrame(() => {
          if (isMounted && element.isConnected) {
             try {
               toastInstance.show();
             } catch (e) {
               console.warn('Bootstrap toast show failed', e);
             }
          }
        });

        // Cleanup listener on unmount (or re-init)
        return () => {
          element.removeEventListener('hidden.bs.toast', handleHidden);
        };
      } catch (error) {
        console.warn('Bootstrap toast init failed:', error);
      }
    };

    // Initialize or wait for Bootstrap
    if (window.bootstrap) {
      const removeListener = initToast();
      return () => {
        isMounted = false;
        if (removeListener) removeListener();
        cleanupToast();
      };
    } else {
      checkInterval = setInterval(() => {
        if (window.bootstrap) {
          clearInterval(checkInterval);
          initToast();
        }
      }, 100);
    }

    return () => {
      isMounted = false;
      clearInterval(checkInterval);
      cleanupToast();
    };
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
    <div className={`toast-container ${styles.toastContainer}`}>
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