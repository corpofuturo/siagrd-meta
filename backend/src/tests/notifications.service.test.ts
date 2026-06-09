import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/db.js', () => ({
  db: vi.fn().mockResolvedValue([]),
}));

const { mockCreate } = vi.hoisted(() => {
  const mockCreate = vi.fn().mockResolvedValue({ sid: 'SM123' });
  return { mockCreate };
});

vi.mock('twilio', () => ({ default: vi.fn(() => ({ messages: { create: mockCreate } })) }));

describe('notifications.service', () => {
  it('initFCM no lanza si FIREBASE_PROJECT_ID no está configurado', async () => {
    const { initFCM } = await import('../services/notifications.service.js');
    expect(() => initFCM()).not.toThrow();
  });

  it('enviarAlertaPush no lanza si no hay tokens (sin perfiles en municipios)', async () => {
    const { enviarAlertaPush } = await import('../services/notifications.service.js');
    await expect(
      enviarAlertaPush(
        '00000000-0000-0000-0000-000000000001',
        'AMARILLO',
        'Alerta de prueba',
        ['00000000-0000-0000-0000-000000000002'],
      )
    ).resolves.not.toThrow();
  });

  it('exporta initFCM y enviarAlertaPush', async () => {
    const mod = await import('../services/notifications.service.js');
    expect(typeof mod.initFCM).toBe('function');
    expect(typeof mod.enviarAlertaPush).toBe('function');
  });
});

describe('enviarSMS', () => {
  beforeEach(() => {
    mockCreate.mockClear();
  });

  it('llama twilio.messages.create cuando las credenciales están configuradas', async () => {
    vi.stubEnv('TWILIO_ACCOUNT_SID', 'ACtest');
    vi.stubEnv('TWILIO_AUTH_TOKEN', 'token_test');
    vi.stubEnv('TWILIO_PHONE_NUMBER', '+15550000000');

    const { enviarSMS } = await import('../services/notifications.service.js');
    const result = await enviarSMS('+573001234567', 'Test mensaje');

    expect(mockCreate).toHaveBeenCalledOnce();
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ to: '+573001234567', body: 'Test mensaje' }),
    );
    expect(result).toBe(true);

    vi.unstubAllEnvs();
  });

  it('retorna false sin crash si TWILIO_ACCOUNT_SID no está configurado', async () => {
    vi.stubEnv('TWILIO_ACCOUNT_SID', '');
    vi.stubEnv('TWILIO_AUTH_TOKEN', '');

    const { enviarSMS } = await import('../services/notifications.service.js');
    const result = await enviarSMS('+573001234567', 'Test mensaje');

    expect(mockCreate).not.toHaveBeenCalled();
    expect(result).toBe(false);

    vi.unstubAllEnvs();
  });
});

describe('enviarSMSAlerta', () => {
  beforeEach(() => {
    mockCreate.mockClear();
    mockCreate.mockResolvedValue({ sid: 'SM123' });
  });

  it('envía SMS a todos los teléfonos del array', async () => {
    vi.stubEnv('TWILIO_ACCOUNT_SID', 'ACtest');
    vi.stubEnv('TWILIO_AUTH_TOKEN', 'token_test');
    vi.stubEnv('TWILIO_PHONE_NUMBER', '+15550000000');

    const { enviarSMSAlerta } = await import('../services/notifications.service.js');
    const telefonos = ['+573001111111', '+573002222222', '+573003333333'];

    await enviarSMSAlerta(
      { tipo: 'INUNDACION', nivel: 'ROJO', instrucciones: 'Evacúe inmediatamente a zonas altas.' },
      telefonos,
    );

    expect(mockCreate).toHaveBeenCalledTimes(telefonos.length);
    for (const tel of telefonos) {
      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ to: tel }));
    }

    vi.unstubAllEnvs();
  });
});
