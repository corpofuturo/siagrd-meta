import type { Metadata, Viewport } from 'next';
import { Barlow_Condensed, IBM_Plex_Sans } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';

const fontDisplay = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-display',
  display: 'swap',
});

const fontBody = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'SIAGRD Meta — S.A.T. - A.M.',
  description: 'Sistema de Alertas Tempranas de Amenazas Múltiples — Departamento del Meta, Colombia',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${fontDisplay.variable} ${fontBody.variable}`}>
      <body className="bg-gray-50 text-gray-900 min-h-screen font-sans">
        {children}
        <Toaster theme="light" richColors position="top-right" />
      </body>
    </html>
  );
}
