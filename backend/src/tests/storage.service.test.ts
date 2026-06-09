import { describe, it, expect, vi } from 'vitest';

vi.mock('../lib/db.js', () => ({
  db: vi.fn().mockResolvedValue([]),
}));

// Mock de sharp — binarios nativos no disponibles en test
vi.mock('sharp', () => ({
  default: vi.fn().mockReturnValue({
    resize: vi.fn().mockReturnThis(),
    jpeg: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from('fake-image-data')),
  }),
}));

vi.mock('file-type', () => ({
  fromBuffer: vi.fn().mockResolvedValue({ mime: 'image/jpeg', ext: 'jpg' }),
}));

describe('storage.service', () => {
  it('exporta uploadFoto como función', async () => {
    const { uploadFoto } = await import('../services/storage.service.js');
    expect(typeof uploadFoto).toBe('function');
  });

  it('uploadFoto retorna url y miniatura_url para imagen JPEG válida', async () => {
    const { uploadFoto } = await import('../services/storage.service.js');
    const fakeBuffer = Buffer.from('fake-jpeg-data');
    const result = await uploadFoto(
      fakeBuffer,
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002',
    );
    expect(result).toHaveProperty('url');
    expect(result).toHaveProperty('miniatura_url');
    expect(result).toHaveProperty('tamano_bytes');
    expect(typeof result.url).toBe('string');
  });

  it('uploadFoto rechaza MIME no permitido', async () => {
    const { fromBuffer } = await import('file-type');
    vi.mocked(fromBuffer).mockResolvedValueOnce({ mime: 'application/pdf', ext: 'pdf' });

    const { uploadFoto } = await import('../services/storage.service.js');
    const fakeBuffer = Buffer.from('fake-pdf-data');
    await expect(
      uploadFoto(fakeBuffer, 'inc-id', 'user-id')
    ).rejects.toThrow(/no permitido/i);
  });
});
