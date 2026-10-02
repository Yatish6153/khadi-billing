import type { Metadata, Viewport } from 'next';
import { Inter, Noto_Sans_Devanagari } from 'next/font/google';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
/** Hindi text on the printed bill (क्रमांक, विवरण, terms …) */
const hindi = Noto_Sans_Devanagari({ subsets: ['devanagari'], weight: ['400', '600', '700'], variable: '--font-hindi', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Khadi Billing', template: '%s · Khadi Billing' },
  description: 'GST billing, inventory and reports for Khadi shops',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#12151c' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${hindi.variable} font-sans`}>
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
