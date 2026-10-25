// src/App.jsx
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import { router } from './app/router.jsx';
import { AuthProvider, useAuth } from './features/auth/AuthProvider.jsx';
import './i18n/index.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Listen for the 401 session-expired event dispatched by the axios interceptor
function SessionGuard() {
  const { logout } = useAuth();
  useEffect(() => {
    const handler = () => {
      logout();
    };
    window.addEventListener('auth:session-expired', handler);
    return () => window.removeEventListener('auth:session-expired', handler);
  }, [logout]);
  return null;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SessionGuard />
        <RouterProvider router={router} />
        <Toaster
          position="top-center"
          reverseOrder={false}
          toastOptions={{
            duration: 4000,
            style: { borderRadius: '0.75rem', fontSize: '0.875rem' },
          }}
        />
      </AuthProvider>
    </QueryClientProvider>
  );
}
