import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/components/theme-provider';
import { CommandPalette } from '@/components/command/command-palette';
import { PUBLIC_ENV } from '@/lib/env';
import './globals.css';

// Enforce env vars at startup - app will fail fast if missing
void PUBLIC_ENV;

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'Depo-Pro - Court Reporter & Scopist Management',
  description: 'Professional deposition and transcription management for court reporters and scopists',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster position="top-right" richColors />
          <CommandPalette />
        </ThemeProvider>
      </body>
    </html>
  );
}
