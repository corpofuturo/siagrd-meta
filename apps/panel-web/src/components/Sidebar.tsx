'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Map,
  Siren,
  Bell,
  MessageSquare,
  Shield,
  Landmark,
  Building2,
  School,
  Users,
  Settings,
  BarChart3,
  ClipboardList,
  LogOut,
  type LucideIcon,
} from 'lucide-react';

interface NavItem {
  href: string;
  icon: LucideIcon;
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
      { href: '/',              icon: Map,            label: 'Dashboard' },
      { href: '/incidentes',    icon: Siren,          label: 'Incidentes' },
      { href: '/alertas',       icon: Bell,           label: 'Alertas' },
      { href: '/chat',          icon: MessageSquare,  label: 'Comunicaciones' },
    ],
  },
  {
    title: 'Organizaciones',
    items: [
      { href: '/organismos',    icon: Shield,         label: 'Organismos de Socorro' },
      { href: '/comites',       icon: Landmark,       label: 'Comités GRD' },
      { href: '/jal',           icon: Building2,      label: 'Juntas de Acción Comunal' },
      { href: '/alcaldias',     icon: School,         label: 'Alcaldías' },
      { href: '/grupos',        icon: Users,          label: 'Grupos de Usuarios' },
    ],
  },
  {
    title: 'Administración',
    items: [
      { href: '/configuracion', icon: Settings,       label: 'Configuración del Sistema' },
      { href: '/estadisticas',  icon: BarChart3,      label: 'Estadísticas' },
      { href: '/reportes',      icon: ClipboardList,  label: 'Reportes' },
    ],
  },
];

function getUserFromToken(): { nombre: string; email: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const match = document.cookie.match(/siagrd_access=([^;]+)/);
    if (!match) return null;
    const payload = JSON.parse(atob(match[1].split('.')[1]));
    return {
      nombre: payload.nombre ?? payload.name ?? payload.sub ?? 'Usuario',
      email: payload.email ?? '',
    };
  } catch {
    return null;
  }
}

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ open = false, onClose }: SidebarProps): React.ReactElement {
  const pathname = usePathname();
  const router = useRouter();

  const user = getUserFromToken();

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
        fixed left-0 top-12 bottom-0 w-[220px] bg-[#0D1320] border-r border-[#1E2535]
        flex flex-col z-40 overflow-y-auto transition-transform duration-200
        ${open ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
      `}
    >
      <nav className="flex-1 py-4 px-2">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="mb-4">
            <p className="text-[#4B5563] text-[10px] font-bold uppercase tracking-widest px-3 mb-1">
              {section.title}
            </p>
            {section.items.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleNavClick}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors mb-0.5 relative ${
                    active
                      ? 'bg-[#1E2535] text-[#F0F4FF] font-semibold'
                      : 'text-[#6B7280] hover:bg-[#1E2535]/60 hover:text-[#D1D5DB]'
                  }`}
                >
                  {active && (
                    <span className="absolute left-0 top-1 bottom-1 w-0.5 bg-[#3B82F6] rounded-full" />
                  )}
                  <item.icon size={17} strokeWidth={2} className="shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer: usuario + logout */}
      <div className="border-t border-[#1E2535] p-3">
        {user && (
          <div className="mb-2 px-1">
            <p className="text-[#F0F4FF] text-xs font-semibold truncate">{user.nombre}</p>
            {user.email && (
              <p className="text-[#4B5563] text-[10px] truncate font-mono">{user.email}</p>
            )}
          </div>
        )}
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs text-[#6B7280] hover:bg-[#1E2535] hover:text-[#F87171] transition-colors"
        >
          <LogOut size={15} strokeWidth={2} />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
