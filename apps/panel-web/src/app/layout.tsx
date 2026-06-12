import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SIAGRD Meta — S.A.T. - A.M.',
  description: 'Sistema de Alertas Tempranas de Amenazas Múltiples — Departamento del Meta, Colombia',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-[#0A0E1A] text-[#F0F4FF] min-h-screen">{children}</body>
    </html>
  );
}
