'use client';

import React, { useState } from 'react';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthSessionProvider } from './providers/session-provider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

interface ClientProvidersProps {
  children: React.ReactNode;
}

export function ClientProviders({ children }: ClientProvidersProps) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <AuthSessionProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </QueryClientProvider>
    </AuthSessionProvider>
  );
}