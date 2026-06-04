import { describe, it, expect, vi } from 'vitest';

vi.mock('../lib/supabase.js', () => ({
  supabaseAdmin: {
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: { path: 'test/path.jpg' }, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/test.jpg' } }),
      }),
    },
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  },
}));

// Mock de sharp — no disponible en entorno test sin binarios nativos
vi.mock('sharp', () => ({
  default: vi.fn().mockReturnValue({
    resize: vi.fn().mockReturnThis(),
    jpeg: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from('fake-image-data')),
  }),
}));

// Mock de file-type
vi.mock('file-type', () => ({
  fileTypeFromBuffer: vi.fn().mockResolvedValue({ mime: 'image/jpeg', ext: 'jpg' }),
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
    const { fileTypeFromBuffer } = await import('file-type');
    vi.mocked(fileTypeFromBuffer).mockResolvedValueOnce({ mime: 'application/pdf', ext: 'pdf' });

    const { uploadFoto } = await import('../services/storage.service.js');
    const fakeBuffer = Buffer.from('fake-pdf-data');
    await expect(
      uploadFoto(fakeBuffer, 'inc-id', 'user-id')
    ).rejects.toThrow(/no permitido/i);
  });
});
