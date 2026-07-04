'use client';

import { useState } from 'react';
import TopBar from './TopBar';
import Sidebar from './Sidebar';
import { useRealtimeAlertas } from '@/hooks/useRealtimeAlertas';

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { nivelMaximo, alertas } = useRealtimeAlertas();

  return (
    <div className="flex h-screen overflow-hidden font-sans" style={{ backgroundColor: '#eef2ff' }}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col md:pl-64 overflow-hidden">
        <TopBar
          onMenuClick={() => setSidebarOpen((o) => !o)}
          nivelAlerta={nivelMaximo}
          alertasActivas={alertas.length}
        />

        <main className="flex-1 overflow-y-auto pt-14 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
