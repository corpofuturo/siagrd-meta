import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.satam.corpofuturo.org';
const IS_PROD = process.env.NODE_ENV === 'production';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 días
// En producción el panel (panel.satam.corpofuturo.org) y el backend
// (api.satam.corpofuturo.org) comparten dominio raíz — la cookie con
// Domain=.corpofuturo.org viaja automáticamente a ambos. En dev (localhost)
// no se fija Domain: el navegador ya envía cookies de "localhost" sin
// importar el puerto.
const COOKIE_DOMAIN = IS_PROD ? '.corpofuturo.org' : undefined;

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json().catch(() => null);
  if (!body?.email || !body?.password) {
    return NextResponse.json({ message: 'email y password son requeridos' }, { status: 400 });
  }

  const backendRes = await fetch(`${API_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: body.email, password: body.password }),
  }).catch(() => null);

  if (!backendRes) {
    return NextResponse.json({ message: 'Error de conexión con el servidor' }, { status: 502 });
  }

  const data = await backendRes.json().catch(() => null);

  if (!backendRes.ok) {
    return NextResponse.json(
      { message: data?.message ?? `Error ${backendRes.status}` },
      { status: backendRes.status },
    );
  }

  const response = NextResponse.json({ user: data.user });

  // Cookie httpOnly — usada por el middleware SSR del panel Y por el backend
  // (Authorization: cookie siagrd_token) para autenticar al panel-web (DT-006).
  // Nunca es legible por JS — elimina la exposición XSS del token.
  response.cookies.set('siagrd_token', data.access_token, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'strict',
    domain: COOKIE_DOMAIN,
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
  response.cookies.set('siagrd_refresh', data.refresh_token, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'strict',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
  // TODO(DT-006): restaurada temporalmente — 30+ vistas del dashboard y el
  // WS de chat leen esta cookie por JS via getToken(). Migrarlas a
  // credentials:'include' + siagrd_token es el siguiente paso, pendiente
  // de decisión por su alcance (ver docs/DEUDA_TECNICA.md).
  response.cookies.set('siagrd_access', data.access_token, {
    httpOnly: false,
    secure: IS_PROD,
    sameSite: 'strict',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });

  return response;
}
