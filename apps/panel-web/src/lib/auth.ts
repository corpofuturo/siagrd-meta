import { cookies } from 'next/headers';

const TOKEN_KEY = 'siagrd_token';
const REFRESH_KEY = 'siagrd_refresh';

export function getTokenFromCookies(): string | undefined {
  const cookieStore = cookies();
  return cookieStore.get(TOKEN_KEY)?.value;
}

export function getTokenFromHeader(req: Request): string | undefined {
  const auth = req.headers.get('authorization');
  return auth?.startsWith('Bearer ') ? auth.slice(7) : undefined;
}
