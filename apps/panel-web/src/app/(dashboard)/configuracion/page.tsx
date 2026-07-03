'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { API_URL } from '@/lib/api';
import { useCurrentUser } from '@/hooks/useCurrentUser';

interface Configuracion {
  nombre_sistema: string;
  nombre_departamento: string;
  codigo_dane: string;
  correo_ungrd: string;
  url_ungrd: string;
}



function authHeaders(): Record<string, string> {
  return { 'Content-Type': 'application/json' };
}

function Toast({ msg, onClose }: { msg: string; onClose: () => void }): React.ReactElement {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  const isErr = msg.startsWith('Error');
  return (
    <div className={`fixed bottom-6 right-6 z-50 rounded-lg px-4 py-3 text-sm shadow-xl border backdrop-blur-sm ${isErr ? 'bg-[#fef2f2] border-[#DC2626]/40 text-[#b91c1c]' : 'bg-[#f0fdf4] border-[#16A34A]/40 text-[#166534]'}`}>
      {isErr ? '✕ ' : '✓ '}{msg}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }): React.ReactElement {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#ffffff] border border-[#e5e7eb] rounded-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e7eb]">
          <h3 className="text-[#111827] font-bold text-sm uppercase tracking-wider">{title}</h3>
          <button onClick={onClose} className="text-[#6B7280] hover:text-[#111827] text-2xl leading-none w-8 h-8 flex items-center justify-center rounded hover:bg-[#f3f4f6] transition-colors">×</button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }): React.ReactElement {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[#6b7280] text-xs font-semibold uppercase tracking-wider">{label}</label>
      {children}
      {hint && <p className="text-[#9ca3af] text-xs">{hint}</p>}
    </div>
  );
}

const inputCls = 'bg-[#f9fafb] border border-[#e5e7eb] text-[#111827] text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]/20 w-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors placeholder:text-[#9ca3af]';

// ─── Card wrapper ─────────────────────────────────────────────────────────────

function Card({ children, className = '' }: { children: ReactNode; className?: string }): React.ReactElement {
  return (
    <div className={`bg-[#ffffff] border border-[#e5e7eb] rounded-xl p-6 ${className}`}>
      {children}
    </div>
  );
}

function CardHeader({ icon, title, description }: { icon: string; title: string; description?: string }): React.ReactElement {
  return (
    <div className="flex items-start gap-3 mb-5">
      <div className="w-9 h-9 rounded-lg bg-[#f3f4f6] flex items-center justify-center text-lg flex-shrink-0">
        {icon}
      </div>
      <div>
        <h2 className="text-[#111827] font-bold text-sm uppercase tracking-wider">{title}</h2>
        {description && <p className="text-[#6B7280] text-xs mt-0.5">{description}</p>}
      </div>
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function ConfiguracionPage(): React.ReactElement {
  const [form, setForm] = useState<Configuracion>({
    nombre_sistema: '',
    nombre_departamento: '',
    codigo_dane: '',
    correo_ungrd: '',
    url_ungrd: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formErr, setFormErr] = useState('');
  const [toast, setToast] = useState('');
  const [showInforme, setShowInforme] = useState(false);
  const [informeData, setInformeData] = useState<unknown>(null);
  const [sendingInforme, setSendingInforme] = useState(false);
  const [copied, setCopied] = useState(false);
  const { user } = useCurrentUser();
  const isAdmin = user?.rol === 'ADMIN';

  const set = (k: keyof Configuracion, v: string): void => setForm(f => ({ ...f, [k]: v }));

  const fetchConfig = useCallback(async (): Promise<void> => {
    setLoading(true); setError(null);
    try {
      const r = await fetch(`${API_URL}/api/v1/configuracion`, { headers: authHeaders() });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      setForm({
        nombre_sistema: d.nombre_sistema ?? '',
        nombre_departamento: d.nombre_departamento ?? '',
        codigo_dane: d.codigo_dane ?? '',
        correo_ungrd: d.correo_ungrd ?? '',
        url_ungrd: d.url_ungrd ?? '',
      });
    } catch (ex: unknown) {
      setError(ex instanceof Error ? ex.message : 'Error al cargar');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  async function submitSistema(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setFormErr('');
    setSaving(true);
    try {
      const r = await fetch(`${API_URL}/api/v1/configuracion`, {
        method: 'PATCH', headers: authHeaders(),
        body: JSON.stringify({
          nombre_sistema: form.nombre_sistema,
          nombre_departamento: form.nombre_departamento,
          codigo_dane: form.codigo_dane,
        }),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.message ?? `HTTP ${r.status}`); }
      setToast('Configuración guardada');
    } catch (ex: unknown) {
      setFormErr(ex instanceof Error ? ex.message : 'Error al guardar');
    } finally { setSaving(false); }
  }

  async function submitContacto(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await fetch(`${API_URL}/api/v1/configuracion`, {
        method: 'PATCH', headers: authHeaders(),
        body: JSON.stringify({
          correo_ungrd: form.correo_ungrd,
          url_ungrd: form.url_ungrd,
        }),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.message ?? `HTTP ${r.status}`); }
      setToast('Contacto UNGRD guardado');
    } catch (ex: unknown) {
      setToast(`Error: ${ex instanceof Error ? ex.message : 'Error al guardar'}`);
    } finally { setSaving(false); }
  }

  async function generarInforme(): Promise<void> {
    setSendingInforme(true);
    try {
      const r = await fetch(`${API_URL}/api/v1/configuracion/informe-ungrd`, {
        method: 'POST', headers: authHeaders(),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.message ?? `HTTP ${r.status}`); }
      setInformeData(await r.json());
      setShowInforme(true);
    } catch (ex: unknown) {
      setToast(`Error: ${ex instanceof Error ? ex.message : 'Error al generar informe'}`);
    } finally { setSendingInforme(false); }
  }

  function copyInforme(): void {
    if (!informeData) return;
    navigator.clipboard.writeText(JSON.stringify(informeData, null, 2)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  return (
    <div className="flex-1">
      {toast && <Toast msg={toast} onClose={() => setToast('')} />}

      {/* Modal informe */}
      {showInforme && informeData !== null && (
        <Modal title="📤 Informe UNGRD generado" onClose={() => setShowInforme(false)}>
          <p className="text-[#6b7280] text-xs mb-3">
            El informe fue generado exitosamente. Revisa el contenido antes de enviarlo.
          </p>
          <pre className="bg-[#f9fafb] border border-[#e5e7eb] rounded-lg p-4 text-[#6b7280] text-xs overflow-x-auto whitespace-pre-wrap font-mono max-h-80">
            {JSON.stringify(informeData, null, 2)}
          </pre>
          <div className="flex gap-3 justify-end pt-4">
            <button
              onClick={copyInforme}
              className="bg-[#f3f4f6] hover:bg-[#e5e7eb] text-[#111827] text-sm font-semibold rounded-lg px-4 py-2 transition-colors border border-[#e5e7eb]"
            >
              {copied ? '✓ Copiado' : '📋 Copiar JSON'}
            </button>
            <button
              onClick={() => setShowInforme(false)}
              className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold rounded-lg px-4 py-2 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </Modal>
      )}

      {/* Header */}
      <div className="mb-7">
        <h1 className="text-[#111827] text-2xl font-bold tracking-tight">
          ⚙️ Configuración del Sistema
        </h1>
        <p className="text-[#6B7280] text-sm mt-1">
          {isAdmin ? 'Edición habilitada — rol ADMIN activo' : 'Vista de solo lectura — se requiere rol ADMIN para editar'}
        </p>
      </div>

      {loading && (
        <div className="flex items-center gap-3 text-[#6b7280] text-sm">
          <span className="animate-spin">⟳</span>
          Cargando configuración...
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 text-[#b91c1c] text-sm bg-[#DC2626]/10 border border-[#DC2626]/30 rounded-lg px-4 py-3 mb-6">
          <span>⚠️</span> {error}
        </div>
      )}

      {!loading && (
        <div className="flex flex-col gap-5 max-w-2xl">

          {/* Card 1: Información del Sistema */}
          <Card>
            <CardHeader
              icon="🏢"
              title="Información del Sistema"
              description="Datos de identificación del sistema a nivel territorial"
            />
            <form onSubmit={submitSistema} className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Field label="Nombre del sistema">
                  <input
                    className={inputCls}
                    value={form.nombre_sistema}
                    onChange={e => set('nombre_sistema', e.target.value)}
                    placeholder="Ej: SIAGRD META"
                    disabled={!isAdmin}
                  />
                </Field>
              </div>
              <Field label="Departamento">
                <input
                  className={inputCls}
                  value={form.nombre_departamento}
                  onChange={e => set('nombre_departamento', e.target.value)}
                  placeholder="Ej: Meta"
                  disabled={!isAdmin}
                />
              </Field>
              <Field label="Código DANE" hint="Código numérico del departamento">
                <input
                  className={inputCls}
                  value={form.codigo_dane}
                  onChange={e => set('codigo_dane', e.target.value)}
                  placeholder="Ej: 50"
                  disabled={!isAdmin}
                />
              </Field>
              {formErr && <p className="col-span-2 text-[#b91c1c] text-xs">⚠️ {formErr}</p>}
              {isAdmin && (
                <div className="col-span-2 flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold rounded-lg px-5 py-2 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Guardando...' : '💾 Guardar'}
                  </button>
                </div>
              )}
            </form>
          </Card>

          {/* Card 2: Contacto UNGRD */}
          <Card>
            <CardHeader
              icon="🏛️"
              title="Contacto UNGRD"
              description="Destino para informes al nivel nacional"
            />
            <form onSubmit={submitContacto} className="grid grid-cols-1 gap-4">
              <Field label="Correo UNGRD">
                <input
                  className={inputCls}
                  type="email"
                  value={form.correo_ungrd}
                  onChange={e => set('correo_ungrd', e.target.value)}
                  placeholder="correo@ungrd.gov.co"
                  disabled={!isAdmin}
                />
              </Field>
              <Field label="URL UNGRD">
                <input
                  className={inputCls}
                  value={form.url_ungrd}
                  onChange={e => set('url_ungrd', e.target.value)}
                  placeholder="https://ungrd.gov.co"
                  disabled={!isAdmin}
                />
              </Field>
              {isAdmin && (
                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold rounded-lg px-5 py-2 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Guardando...' : '💾 Guardar contacto'}
                  </button>
                </div>
              )}
            </form>
          </Card>

          {/* Card 3: Generar Informe UNGRD */}
          <Card className="border-[#1E3A5F]">
            <CardHeader
              icon="📤"
              title="Generar Informe UNGRD"
              description="Consolida los eventos de los últimos 30 días y envía el informe al nivel nacional"
            />
            <div className="bg-[#f9fafb] border border-[#f3f4f6] rounded-lg p-4 mb-5">
              <p className="text-[#6b7280] text-xs leading-relaxed">
                El informe incluye todos los incidentes, alertas emitidas y acciones de respuesta
                registradas en los últimos <span className="text-[#111827] font-semibold">30 días</span>.
                El resultado se envía automáticamente al correo UNGRD configurado arriba y se
                muestra aquí para revisión.
              </p>
            </div>
            <button
              onClick={generarInforme}
              disabled={sendingInforme}
              className="w-full bg-[#0D4F8C] hover:bg-[#1565A8] border border-[#1E5FA0] text-white text-sm font-bold rounded-lg px-6 py-3.5 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {sendingInforme ? (
                <>
                  <span className="animate-spin">⟳</span>
                  Generando informe...
                </>
              ) : (
                <>
                  📤 Generar y Enviar Informe
                </>
              )}
            </button>
          </Card>

        </div>
      )}
    </div>
  );
}
