import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ApiError } from '@/api/client';
import { AppRoutes } from '@/AppRoutes';
import { AuthProvider } from '@/auth/AuthContext';
import { ToastProvider } from '@/ui';

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 15_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) =>
          failureCount < 1 &&
          !(error instanceof ApiError && error.status < 500 && error.status > 0),
      },
    },
  });
}

export function App() {
  const [queryClient] = useState(createQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
