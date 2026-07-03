'use client';

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
        fixed left-0 top-14 bottom-0 w-64 bg-sidebar-bg
        flex flex-col z-40 overflow-y-auto transition-transform duration-200
        md:translate-x-0
        ${open ? 'translate-x-0' : '-translate-x-full'}
      `}
    >
      <nav className="flex-1 py-4 px-3 space-y-1">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="mb-4">
            <p className="text-sidebar-label text-[10px] font-bold uppercase tracking-widest px-3 mb-2">
              {section.title}
            </p>
            {section.items.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleNavClick}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                    transition-colors mb-0.5
                    ${active
                      ? 'bg-sidebar-active text-white border-l-4 border-blue-400 pl-2'
                      : 'text-sidebar-muted hover:bg-sidebar-hover hover:text-white'
                    }
                  `}
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
      <div className="border-t border-sidebar-border p-4">
        {user && (
          <div className="mb-3">
            <p className="text-white text-sm font-semibold truncate">{user.nombre}</p>
            <p className="text-sidebar-muted text-xs truncate">{user.email}</p>
            <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] bg-brand-light text-brand-text font-bold uppercase">
              {user.rol}
            </span>
          </div>
        )}
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm
                     text-sidebar-muted hover:bg-red-900/30 hover:text-red-300 transition-colors"
        >
          <span>🚪</span>
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
