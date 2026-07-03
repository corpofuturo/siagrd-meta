'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

export interface CurrentUser {
  id: string;
  email: string;
  nombre: string;
  apellido?: string;
  rol: string;
  municipio_id?: string | null;
  organismo_id?: string | null;
}

/**
 * Reemplaza la decodificacion local del JWT (getUserFromToken) — desde DT-006
 * el token ya no es legible por JS, asi que el usuario actual se obtiene de
 * GET /api/v1/auth/me (autenticado por la cookie httpOnly siagrd_token).
 */
export function useCurrentUser(): { user: CurrentUser | null; loading: boolean } {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    apiFetch<{ data: CurrentUser }>('/auth/me').then((res) => {
      if (mounted) {
        setUser(res?.data ?? null);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  return { user, loading };
}
