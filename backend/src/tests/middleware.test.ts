import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetUser = vi.fn();
const mockFromSelect = vi.fn().mockReturnThis();
const mockFromEq = vi.fn().mockReturnThis();
const mockFromSingle = vi.fn();
const mockFrom = vi.fn().mockReturnValue({
  select: mockFromSelect,
  eq: mockFromEq,
  single: mockFromSingle,
});

vi.mock('../lib/supabase.js', () => ({
  supabaseAnon: {
    auth: { getUser: mockGetUser },
    from: mockFrom,
  },
  supabaseAdmin: { from: vi.fn() },
}));

import { authMiddleware } from '../middleware/auth.js';
import { UnauthorizedError } from '../utils/errors.js';

function makeRequest(overrides: Record<string, unknown> = {}): any {
  return {
    headers: { authorization: 'Bearer valid-token' },
    user: undefined,
    ...overrides,
  };
}

function makeReply(): any {
  return {};
}

describe('authMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lanza UnauthorizedError cuando no hay header Authorization', async () => {
    const req = makeRequest({ headers: {} });
    await expect(authMiddleware(req, makeReply())).rejects.toThrow(UnauthorizedError);
  });

  it('lanza UnauthorizedError cuando el header no empieza con "Bearer "', async () => {
    const req = makeRequest({ headers: { authorization: 'Basic dXNlcjpwYXNz' } });
    await expect(authMiddleware(req, makeReply())).rejects.toThrow(UnauthorizedError);
  });

  it('lanza UnauthorizedError cuando supabase devuelve error en getUser', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'JWT expired' },
    });

    const req = makeRequest();
    await expect(authMiddleware(req, makeReply())).rejects.toThrow(UnauthorizedError);
  });

  it('lanza UnauthorizedError cuando supabase devuelve user null sin error', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    });

    const req = makeRequest();
    await expect(authMiddleware(req, makeReply())).rejects.toThrow(UnauthorizedError);
  });

  it('popula request.user con datos del perfil cuando token es válido', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: 'user-abc', email: 'test@test.com' } },
      error: null,
    });
    mockFromSingle.mockResolvedValueOnce({
      data: { rol: 'CDGRD', municipio_id: 'muni-50001', organismo_id: 'org-1' },
      error: null,
    });

    const req = makeRequest();
    await authMiddleware(req, makeReply());

    expect(req.user).toBeDefined();
    expect(req.user.id).toBe('user-abc');
    expect(req.user.email).toBe('test@test.com');
    expect(req.user.rol).toBe('CDGRD');
    expect(req.user.municipio_id).toBe('muni-50001');
    expect(req.user.organismo_id).toBe('org-1');
  });

  it('asigna rol CIUDADANO por defecto cuando el perfil no existe', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: 'user-xyz', email: 'nuevo@test.com' } },
      error: null,
    });
    mockFromSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'Row not found' },
    });

    const req = makeRequest();
    await authMiddleware(req, makeReply());

    expect(req.user).toBeDefined();
    expect(req.user.id).toBe('user-xyz');
    expect(req.user.rol).toBe('CIUDADANO');
    expect(req.user.municipio_id).toBeUndefined();
    expect(req.user.organismo_id).toBeUndefined();
  });

  it('asigna rol CIUDADANO cuando el perfil devuelve rol null', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: 'user-norole', email: 'norole@test.com' } },
      error: null,
    });
    mockFromSingle.mockResolvedValueOnce({
      data: { rol: null, municipio_id: null, organismo_id: null },
      error: null,
    });

    const req = makeRequest();
    await authMiddleware(req, makeReply());

    expect(req.user.rol).toBe('CIUDADANO');
  });

  it('extrae el token correctamente del header Bearer', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: 'u1', email: 'u@t.com' } },
      error: null,
    });
    mockFromSingle.mockResolvedValueOnce({
      data: { rol: 'SOCORRO', municipio_id: null, organismo_id: null },
      error: null,
    });

    const req = makeRequest({ headers: { authorization: 'Bearer my-jwt-token-123' } });
    await authMiddleware(req, makeReply());

    expect(mockGetUser).toHaveBeenCalledWith('my-jwt-token-123');
  });
});
