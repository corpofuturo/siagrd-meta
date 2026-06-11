import { createHmac } from 'crypto';
import { db } from '../lib/db.js';

const RETRY_DELAYS_MS = [5_000, 30_000, 120_000];
const TIMEOUT_MS = 10_000;

interface Subscription {
  id: string;
  url: string;
  secret: string | null;
}

function signPayload(payload: string, secret: string): string {
  return 'sha256=' + createHmac('sha256', secret).update(payload).digest('hex');
}

async function attemptDelivery(
  sub: Subscription,
  payload: string,
  evento: string,
  attempt: number
): Promise<{ ok: boolean; status_code?: number; error?: string; duration_ms: number }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-SATAM-Event': evento,
    'X-SATAM-Attempt': String(attempt),
  };

  if (sub.secret) {
    headers['X-SATAM-Signature'] = signPayload(payload, sub.secret);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const start = Date.now();

  try {
    const res = await fetch(sub.url, {
      method: 'POST',
      headers,
      body: payload,
      signal: controller.signal,
    });
    const duration_ms = Date.now() - start;
    return { ok: res.ok, status_code: res.status, duration_ms };
  } catch (err: any) {
    const duration_ms = Date.now() - start;
    const isTimeout = err?.name === 'AbortError';
    return {
      ok: false,
      error: isTimeout ? 'timeout' : (err?.message ?? 'unknown error'),
      duration_ms,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function logDelivery(
  subscription_id: string,
  evento: string,
  payload: string,
  attempt: number,
  result: { ok: boolean; status_code?: number; error?: string; duration_ms: number }
): Promise<void> {
  const status = result.ok ? 'success' : result.error === 'timeout' ? 'timeout' : 'failed';
  await db`
    INSERT INTO webhook_deliveries
      (subscription_id, evento, payload, attempt, status, status_code, error_message, duration_ms)
    VALUES (
      ${ subscription_id },
      ${ evento },
      ${ db.json(JSON.parse(payload)) },
      ${ attempt },
      ${ status },
      ${ result.status_code ?? null },
      ${ result.error ?? null },
      ${ result.duration_ms }
    )
  `;
}

async function deliverWithRetry(
  sub: Subscription,
  payload: string,
  evento: string
): Promise<void> {
  for (let i = 0; i < RETRY_DELAYS_MS.length; i++) {
    const attempt = i + 1;
    const result = await attemptDelivery(sub, payload, evento, attempt);

    await logDelivery(sub.id, evento, payload, attempt, result);

    if (result.ok) return;

    if (attempt < RETRY_DELAYS_MS.length) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS_MS[i]));
    }
  }
}

export async function dispararWebhook(
  evento: string,
  datos: Record<string, unknown>,
  municipio_id?: string
): Promise<void> {
  let subs: Subscription[];

  try {
    if (municipio_id) {
      subs = await db<Subscription[]>`
        SELECT id, url, secret FROM webhook_subscriptions
        WHERE activo = true
          AND ${ evento } = ANY(eventos)
          AND (municipio_id = ${ municipio_id } OR municipio_id IS NULL)
      `;
    } else {
      subs = await db<Subscription[]>`
        SELECT id, url, secret FROM webhook_subscriptions
        WHERE activo = true
          AND ${ evento } = ANY(eventos)
      `;
    }
  } catch {
    return;
  }

  if (subs.length === 0) return;

  const payload = JSON.stringify({ tipo: evento, datos, timestamp: new Date().toISOString() });

  // Disparar todas las entregas en paralelo, sin bloquear el caller
  void Promise.allSettled(subs.map(sub => deliverWithRetry(sub, payload, evento)));
}
