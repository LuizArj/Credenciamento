import { AppProps } from 'next/app';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { SessionProvider } from 'next-auth/react';
import { queryClient } from '@/lib/queryClient';
import '@/styles/globals.css';

export default function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  return (
    <SessionProvider session={session}>
      <QueryClientProvider client={queryClient}>
        <Component {...pageProps} />
        {process.env.NODE_ENV === 'development' && <ReactQueryDevtools />}
      </QueryClientProvider>
    </SessionProvider>
  );
}