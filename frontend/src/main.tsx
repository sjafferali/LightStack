import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.tsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          // Themed from the same variables as the rest of the app.
          style: {
            background: 'var(--panel)',
            color: 'var(--tx)',
            border: '1px solid var(--line)',
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: 600,
            boxShadow: 'var(--shadow-lg)',
          },
          success: { iconTheme: { primary: 'var(--p4)', secondary: 'var(--panel)' } },
          error: { iconTheme: { primary: 'var(--p1)', secondary: 'var(--panel)' } },
        }}
      />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </StrictMode>,
)
