'use client';

import { useState } from 'react';
import TopBar from './TopBar';
import Sidebar from './Sidebar';
import { useRealtimeAlertas } from '@/hooks/useRealtimeAlertas';

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { nivelMaximo, alertas } = useRealtimeAlertas();

  return (
    <div className="min-h-screen bg-[#0A0E1A] flex flex-col">
      <TopBar
        onMenuClick={() => setSidebarOpen((o) => !o)}
        nivelAlerta={nivelMaximo}
        alertasActivas={alertas.length}
      />

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-1 pt-12 md:ml-[220px] overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
