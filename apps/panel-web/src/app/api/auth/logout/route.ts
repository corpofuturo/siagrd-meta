import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://backend-production-60016.up.railway.app';

export async function POST(): Promise<NextResponse> {
  const cookieStore = await cookies();
  const token = cookieStore.get('siagrd_token')?.value;
  const refreshToken = cookieStore.get('siagrd_refresh')?.value;

  // Notificar al backend para revocar el refresh token
  if (token && refreshToken) {
    await fetch(`${API_URL}/api/v1/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    }).catch(() => {});
  }

  const response = NextResponse.json({ ok: true });

  // Limpiar cookies server-side
  response.cookies.set('siagrd_token', '', { maxAge: 0, path: '/' });
  response.cookies.set('siagrd_refresh', '', { maxAge: 0, path: '/' });

  return response;
}
