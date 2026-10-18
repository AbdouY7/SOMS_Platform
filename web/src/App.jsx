// src/App.jsx
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { router } from './app/router.jsx';

// Initialize i18n (AR default, sets dir=rtl on html)
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

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* System 1 will wrap RouterProvider with <AuthProvider> */}
      <RouterProvider router={router} />
      <Toaster
        position="top-center"
        reverseOrder={false}
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: '0.75rem',
            fontSize: '0.875rem',
          },
        }}
      />
    </QueryClientProvider>
  );
}
