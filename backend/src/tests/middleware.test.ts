import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.hoisted(() => {
  process.env.JWT_SECRET = 'test-secret-for-middleware-tests';
});

const { mockDbFn } = vi.hoisted(() => {
  const mockDbFn = vi.fn().mockResolvedValue([]);
  (mockDbFn as any).array = vi.fn().mockImplementation((arr: any[]) => arr);
  return { mockDbFn };
});

vi.mock('../lib/db.js', () => ({ db: mockDbFn }));

vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn().mockReturnValue({ sub: 'user-abc', email: 'test@test.com' }),
    sign: vi.fn().mockReturnValue('mock-token'),
  },
  verify: vi.fn().mockReturnValue({ sub: 'user-abc', email: 'test@test.com' }),
  sign: vi.fn().mockReturnValue('mock-token'),
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

describe('authMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbFn.mockResolvedValue([]);
    (mockDbFn as any).array = vi.fn().mockImplementation((arr: any[]) => arr);
  });

  it('lanza UnauthorizedError cuando no hay header Authorization', async () => {
    const req = makeRequest({ headers: {} });
    await expect(authMiddleware(req, {} as any)).rejects.toThrow(UnauthorizedError);
  });

  it('lanza UnauthorizedError cuando el header no empieza con "Bearer "', async () => {
    const req = makeRequest({ headers: { authorization: 'Basic dXNlcjpwYXNz' } });
    await expect(authMiddleware(req, {} as any)).rejects.toThrow(UnauthorizedError);
  });

  it('lanza UnauthorizedError cuando jwt.verify falla', async () => {
    const jwt = await import('jsonwebtoken');
    (jwt.default.verify as any).mockImplementationOnce(() => { throw new Error('jwt expired'); });

    const req = makeRequest();
    await expect(authMiddleware(req, {} as any)).rejects.toThrow(UnauthorizedError);
  });

  it('lanza UnauthorizedError cuando el perfil no existe en la BD', async () => {
    mockDbFn.mockResolvedValueOnce([]);

    const req = makeRequest();
    await expect(authMiddleware(req, {} as any)).rejects.toThrow(UnauthorizedError);
  });

  it('popula request.user con datos del perfil cuando token es válido', async () => {
    mockDbFn.mockResolvedValueOnce([{
      id: 'user-abc',
      email: 'test@test.com',
      rol: 'CDGRD',
      municipio_id: 'muni-50001',
      organismo_id: 'org-1',
    }]);

    const req = makeRequest();
    await authMiddleware(req, {} as any);

    expect(req.user).toBeDefined();
    expect(req.user.id).toBe('user-abc');
    expect(req.user.email).toBe('test@test.com');
    expect(req.user.rol).toBe('CDGRD');
    expect(req.user.municipio_id).toBe('muni-50001');
    expect(req.user.organismo_id).toBe('org-1');
  });

  it('popula request.user con rol SOCORRO', async () => {
    const jwt = await import('jsonwebtoken');
    (jwt.default.verify as any).mockReturnValueOnce({ sub: 'u1', email: 'u@t.com' });
    mockDbFn.mockResolvedValueOnce([{
      id: 'u1', email: 'u@t.com', rol: 'SOCORRO', municipio_id: null, organismo_id: null,
    }]);

    const req = makeRequest({ headers: { authorization: 'Bearer my-jwt-token-123' } });
    await authMiddleware(req, {} as any);

    expect(req.user.rol).toBe('SOCORRO');
  });
});
