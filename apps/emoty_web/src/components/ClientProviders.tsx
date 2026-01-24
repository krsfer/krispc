'use client';

import React from 'react';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthSessionProvider } from './providers/session-provider';

interface ClientProvidersProps {
  children: React.ReactNode;
}

export function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <AuthSessionProvider>
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </AuthSessionProvider>
  );
}