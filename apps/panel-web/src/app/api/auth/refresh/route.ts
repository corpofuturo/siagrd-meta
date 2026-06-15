import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.satam.corpofuturo.org';
const IS_PROD = process.env.NODE_ENV === 'production';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

export async function POST(request: NextRequest): Promise<NextResponse> {
  const refreshToken = request.cookies.get('siagrd_refresh')?.value;
  if (!refreshToken) {
    return NextResponse.json({ message: 'No refresh token' }, { status: 401 });
  }

  const backendRes = await fetch(`${API_URL}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  }).catch(() => null);

  if (!backendRes?.ok) {
    return NextResponse.json({ message: 'refresh_token inválido o expirado' }, { status: 401 });
  }

  const data = await backendRes.json().catch(() => null);
  if (!data?.access_token) {
    return NextResponse.json({ message: 'Respuesta inválida del servidor' }, { status: 502 });
  }

  const response = NextResponse.json({ access_token: data.access_token });

  response.cookies.set('siagrd_token', data.access_token, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'strict',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
  response.cookies.set('siagrd_access', data.access_token, {
    httpOnly: false,
    secure: IS_PROD,
    sameSite: 'strict',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
  if (data.refresh_token) {
    response.cookies.set('siagrd_refresh', data.refresh_token, {
      httpOnly: true,
      secure: IS_PROD,
      sameSite: 'strict',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    });
  }

  return response;
}
