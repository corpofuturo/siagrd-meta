'use client';

import { useEffect, useState } from 'react';

type Tab = 'general' | 'notificaciones' | 'integraciones' | 'seguridad';

function Toast({ mensaje, onClose }: { mensaje: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 2500);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className="fixed bottom-6 right-6 z-50 bg-[#1E2535] border border-[#2D3748] rounded-lg px-4 py-3 text-[#F0F4FF] text-sm shadow-lg">
      {mensaje}
    </div>
  );
}

function CampoReadonly({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="block text-xs text-[#8B9CC8] uppercase tracking-wider mb-1">{label}</label>
      <p className="bg-[#0A0E1A] border border-[#2D3748] rounded px-3 py-2 text-[#F0F4FF] text-sm font-mono">
        {value}
      </p>
    </div>
  );
}

function ToggleReadonly({ label, activo }: { label: string; activo: boolean }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[#2D3748] last:border-0">
      <span className="text-[#F0F4FF] text-sm">{label}</span>
      <span className={`px-2 py-0.5 rounded text-xs font-bold font-mono ${activo ? 'bg-[#16A34A]/20 text-[#16A34A] border border-[#16A34A]/40' : 'bg-[#1E2535] text-[#8B9CC8] border border-[#2D3748]'}`}>
        {activo ? 'ACTIVO' : 'INACTIVO'}
      </span>
    </div>
  );
}

export default function ConfiguracionPage() {
  const [tab, setTab] = useState<Tab>('general');
  const [toast, setToast] = useState<string | null>(null);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'general', label: 'General' },
    { key: 'notificaciones', label: 'Notificaciones' },
    { key: 'integraciones', label: 'Integraciones' },
    { key: 'seguridad', label: 'Seguridad' },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {toast && <Toast mensaje={toast} onClose={() => setToast(null)} />}

      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-[#F0F4FF] uppercase tracking-wider">
          Configuración del Sistema
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-[#111827] border border-[#2D3748] rounded-lg p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded text-sm font-display uppercase tracking-wider transition-colors ${
              tab === t.key
                ? 'bg-[#1E2535] text-[#F0F4FF] font-bold'
                : 'text-[#8B9CC8] hover:text-[#F0F4FF]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-[#111827] border border-[#2D3748] rounded-lg p-5 max-w-xl space-y-4">
        {tab === 'general' && (
          <>
            <CampoReadonly label="Nombre del sistema" value="SIAGRD META" />
            <CampoReadonly label="Versión" value="1.0.0-beta" />
            <CampoReadonly label="Municipio CDGRD principal" value="Villavicencio" />
            <CampoReadonly label="Departamento" value="Meta, Colombia" />
            <CampoReadonly label="Zona horaria" value="America/Bogota (UTC-5)" />
          </>
        )}

        {tab === 'notificaciones' && (
          <>
            <ToggleReadonly label="Firebase Cloud Messaging (FCM)" activo={true} />
            <ToggleReadonly label="SMS (Twilio)" activo={false} />
            <CampoReadonly label="Número Twilio configurado" value="+57 *** *** 42" />
            <ToggleReadonly label="Notificaciones por email" activo={true} />
          </>
        )}

        {tab === 'integraciones' && (
          <>
            <div className="flex items-center justify-between py-3 border-b border-[#2D3748]">
              <div>
                <p className="text-[#F0F4FF] text-sm">IDEAM — Instituto de Hidrología</p>
                <p className="text-[#8B9CC8] text-xs font-mono">Datos meteorológicos e hidrológicos</p>
              </div>
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-[#D97706]/20 text-[#D97706] border border-[#D97706]/40">
                SIMULADO
              </span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-[#2D3748]">
              <div>
                <p className="text-[#F0F4FF] text-sm">SGC — Servicio Geológico Colombiano</p>
                <p className="text-[#8B9CC8] text-xs font-mono">Monitoreo sísmico y volcánico</p>
              </div>
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-[#D97706]/20 text-[#D97706] border border-[#D97706]/40">
                SIMULADO
              </span>
            </div>
            <div className="pt-2 space-y-1">
              <p className="text-xs text-[#8B9CC8] uppercase tracking-wider">Documentación técnica</p>
              <a href="#" onClick={(e) => e.preventDefault()} className="block text-[#8B9CC8] hover:text-[#F0F4FF] text-sm transition-colors">
                → DT-001: Especificación API IDEAM
              </a>
              <a href="#" onClick={(e) => e.preventDefault()} className="block text-[#8B9CC8] hover:text-[#F0F4FF] text-sm transition-colors">
                → DT-002: Protocolo integración SGC
              </a>
            </div>
          </>
        )}

        {tab === 'seguridad' && (
          <>
            <CampoReadonly label="Política de contraseñas" value="Mínimo 8 caracteres, 1 mayúscula, 1 número" />
            <CampoReadonly label="Tiempo de sesión" value="8 horas (con renovación automática)" />
            <CampoReadonly label="Sesiones activas" value="Ver sesiones activas — Próximamente" />
            <CampoReadonly label="Autenticación 2FA" value="Próximamente" />
          </>
        )}

        <div className="pt-2 border-t border-[#2D3748]">
          <button
            onClick={() => setToast('Edición de configuración: Próximamente')}
            className="px-4 py-2 bg-[#1E2535] border border-[#2D3748] rounded text-[#F0F4FF] text-sm hover:bg-[#2D3748] transition-colors"
          >
            Editar
          </button>
        </div>
      </div>
    </div>
  );
}
