'use client';

import { useCallback, useEffect, useState } from 'react';

type ServiceStatus = 'ok' | 'degraded' | 'down' | 'unknown';

interface ServiceHealth {
  name: string;
  label: string;
  status: ServiceStatus;
  latency_ms?: number;
  message?: string;
  last_checked: string;
}

const STATUS_STYLES: Record<ServiceStatus, string> = {
  ok: 'bg-[#16A34A] text-white',
  degraded: 'bg-[#D97706] text-white',
  down: 'bg-[#DC2626] text-white',
  unknown: 'bg-[#1E2535] text-[#8B9CC8]',
};

const STATUS_DOT: Record<ServiceStatus, string> = {
  ok: 'text-[#16A34A]',
  degraded: 'text-[#D97706]',
  down: 'text-[#DC2626]',
  unknown: 'text-[#8B9CC8]',
};

const STATUS_LABELS: Record<ServiceStatus, string> = {
  ok: 'OPERACIONAL',
  degraded: 'DEGRADADO',
  down: 'CAÍDO',
  unknown: 'DESCONOCIDO',
};

const SERVICES_CONFIG = [
  { name: 'db', label: 'Base de Datos (PostgreSQL)' },
  { name: 'ideam', label: 'API IDEAM' },
  { name: 'sgc', label: 'API SGC (Sismología)' },
];

const POLL_INTERVAL = 30_000;

export default function SaludPage() {
  const [services, setServices] = useState<ServiceHealth[]>(() =>
    SERVICES_CONFIG.map((s) => ({
      name: s.name,
      label: s.label,
      status: 'unknown',
      last_checked: new Date().toISOString(),
    }))
  );
  const [loading, setLoading] = useState(true);
  const [lastPoll, setLastPoll] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(POLL_INTERVAL / 1000);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/health', {
        headers: { 'Cache-Control': 'no-cache' },
      });

      if (response.ok) {
        const data = await response.json() as {
          services?: Record<string, Partial<ServiceHealth>>;
        };

        setServices(
          SERVICES_CONFIG.map((cfg) => {
            const srv = data.services?.[cfg.name];
            return {
              name: cfg.name,
              label: cfg.label,
              status: (srv?.status as ServiceStatus) ?? 'unknown',
              latency_ms: srv?.latency_ms,
              message: srv?.message,
              last_checked: new Date().toISOString(),
            };
          })
        );
      } else {
        // Si el endpoint falla, marcar todos como degraded
        setServices((prev) =>
          prev.map((s) => ({
            ...s,
            status: 'degraded' as ServiceStatus,
            message: `HTTP ${response.status}`,
            last_checked: new Date().toISOString(),
          }))
        );
      }
    } catch (err) {
      setServices((prev) =>
        prev.map((s) => ({
          ...s,
          status: 'down' as ServiceStatus,
          message: 'Sin respuesta del servidor',
          last_checked: new Date().toISOString(),
        }))
      );
    } finally {
      setLoading(false);
      setLastPoll(new Date());
      setCountdown(POLL_INTERVAL / 1000);
    }
  }, []);

  // Poll cada 30s
  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  // Countdown visual
  useEffect(() => {
    const tick = setInterval(() => {
      setCountdown((c) => (c <= 1 ? POLL_INTERVAL / 1000 : c - 1));
    }, 1000);
    return () => clearInterval(tick);
  }, [lastPoll]);

  const allOk = services.every((s) => s.status === 'ok');
  const anyDown = services.some((s) => s.status === 'down');

  return (
    <div className="flex-1">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold text-[#F0F4FF] uppercase tracking-wider">
              Estado del Sistema
            </h1>
            {lastPoll && (
              <p className="text-[#8B9CC8] text-xs mt-1 font-mono">
                Última verificación:{' '}
                {lastPoll.toLocaleTimeString('es-CO', { timeZone: 'America/Bogota' })} ·
                próxima en {countdown}s
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1.5 rounded font-display font-bold text-sm uppercase tracking-wider ${
                anyDown
                  ? 'bg-[#DC2626] text-white'
                  : allOk
                  ? 'bg-[#16A34A] text-white'
                  : 'bg-[#D97706] text-white'
              }`}
            >
              {anyDown ? 'INCIDENTE' : allOk ? 'OPERACIONAL' : 'DEGRADADO'}
            </span>
            <button
              onClick={fetchHealth}
              disabled={loading}
              className="px-3 py-1.5 bg-[#1E2535] border border-[#2D3748] rounded text-sm text-[#F0F4FF] hover:bg-[#2D3748] transition-colors disabled:opacity-40"
            >
              {loading ? 'Verificando...' : 'Verificar ahora'}
            </button>
          </div>
        </div>

        {/* Cards de servicios */}
        <div className="space-y-3">
          {services.map((service) => (
            <div
              key={service.name}
              className={`bg-[#111827] border rounded-lg p-4 flex items-center justify-between transition-colors ${
                service.status === 'down'
                  ? 'border-[#DC2626]/50'
                  : service.status === 'degraded'
                  ? 'border-[#D97706]/50'
                  : 'border-[#2D3748]'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`text-lg ${STATUS_DOT[service.status]}`}>●</span>
                <div>
                  <p className="text-[#F0F4FF] text-sm font-medium">{service.label}</p>
                  {service.message && (
                    <p className="text-[#8B9CC8] text-xs mt-0.5">{service.message}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 text-right">
                {service.latency_ms !== undefined && (
                  <span className="font-mono text-xs text-[#8B9CC8]">
                    {service.latency_ms}ms
                  </span>
                )}
                <span
                  className={`px-2.5 py-1 rounded text-[10px] font-bold font-display tracking-wider ${STATUS_STYLES[service.status]}`}
                >
                  {STATUS_LABELS[service.status]}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Leyenda */}
        <div className="mt-6 flex flex-wrap gap-4 text-xs text-[#8B9CC8]">
          <span className="flex items-center gap-1.5">
            <span className="text-[#16A34A]">●</span> Operacional
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-[#D97706]">●</span> Degradado
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-[#DC2626]">●</span> Caído
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-[#8B9CC8]">●</span> Desconocido
          </span>
        </div>
      </div>
    </div>
  );
}
