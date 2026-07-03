'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCurrentUser } from '@/hooks/useCurrentUser';

interface NavItem {
  href: string;
  emoji: string;
  label: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Operaciones',
    items: [
      { href: '/',              emoji: '🗺️', label: 'Dashboard' },
      { href: '/incidentes',    emoji: '🚨', label: 'Incidentes' },
      { href: '/alertas',       emoji: '🔔', label: 'Alertas' },
      { href: '/chat',          emoji: '💬', label: 'Comunicaciones' },
    ],
  },
  {
    title: 'Organizaciones',
    items: [
      { href: '/organismos',    emoji: '🛡️', label: 'Organismos de Socorro' },
      { href: '/comites',       emoji: '🏛️', label: 'Comités GRD' },
      { href: '/jal',           emoji: '🏘️', label: 'Juntas de Acción Comunal' },
      { href: '/alcaldias',     emoji: '🏫', label: 'Alcaldías' },
      { href: '/grupos',        emoji: '👥', label: 'Grupos de Usuarios' },
    ],
  },
  {
    title: 'Administración',
    items: [
      { href: '/usuarios',      emoji: '👤', label: 'Usuarios del Sistema' },
      { href: '/configuracion', emoji: '⚙️', label: 'Configuración del Sistema' },
      { href: '/estadisticas',  emoji: '📊', label: 'Estadísticas' },
      { href: '/reportes',      emoji: '📋', label: 'Reportes' },
    ],
  },
];

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ open = false, onClose }: SidebarProps): React.ReactElement {
  const pathname = usePathname();
  const router = useRouter();
  const [hoveredHref, setHoveredHref] = useState<string | null>(null);
  const [logoutHover, setLogoutHover] = useState(false);

  const { user } = useCurrentUser();

  function isActive(href: string): boolean {
    if (href === '/') return pathname === '/';
    return pathname?.startsWith(href) ?? false;
  }

  async function logout(): Promise<void> {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    router.push('/login');
  }

  function handleNavClick() {
    onClose?.();
  }

  return (
    <aside
      className={`
        fixed left-0 top-14 bottom-0 w-64
        flex flex-col z-40 overflow-y-auto transition-transform duration-200
        md:translate-x-0
        ${open ? 'translate-x-0' : '-translate-x-full'}
      `}
      style={{ backgroundColor: '#ffffff', borderRight: '1px solid #c7d2fe' }}
    >
      <nav className="flex-1 py-4 px-3 space-y-1">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="mb-4">
            <p
              className="text-[10px] font-bold uppercase tracking-widest px-3 mb-2"
              style={{ color: 'rgba(71,85,105,0.5)' }}
            >
              {section.title}
            </p>
            {section.items.map((item) => {
              const active = isActive(item.href);
              const hovered = hoveredHref === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleNavClick}
                  onMouseEnter={() => setHoveredHref(item.href)}
                  onMouseLeave={() => setHoveredHref(null)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-0.5"
                  style={
                    active
                      ? {
                          backgroundColor: '#e0e7ff',
                          color: '#312e81',
                          borderLeft: '3px solid #4f46e5',
                          paddingLeft: 'calc(0.75rem - 3px)',
                        }
                      : {
                          color: '#475569',
                          backgroundColor: hovered ? 'rgba(79,70,229,0.06)' : 'transparent',
                          ...(hovered ? { color: '#4f46e5' } : {}),
                        }
                  }
                >
                  <span className="text-base w-5 text-center shrink-0">{item.emoji}</span>
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer usuario */}
      <div className="p-4" style={{ borderTop: '1px solid #c7d2fe' }}>
        {user && (
          <div className="mb-3">
            <p className="text-sm font-semibold truncate" style={{ color: '#0f0a2e' }}>{user.nombre}</p>
            <p className="text-xs truncate" style={{ color: '#6b7280' }}>{user.email}</p>
            <span
              className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase"
              style={{ backgroundColor: 'rgba(79,70,229,0.15)', color: '#4f46e5' }}
            >
              {user.rol}
            </span>
          </div>
        )}
        <button
          onClick={logout}
          onMouseEnter={() => setLogoutHover(true)}
          onMouseLeave={() => setLogoutHover(false)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
          style={
            logoutHover
              ? { backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444' }
              : { color: '#475569', backgroundColor: 'transparent' }
          }
        >
          <span>🚪</span>
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
