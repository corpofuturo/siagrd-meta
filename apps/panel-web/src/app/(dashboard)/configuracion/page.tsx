'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://backend-production-60016.up.railway.app';

interface Configuracion {
  nombre_sistema: string;
  nombre_departamento: string;
  codigo_dane: string;
  correo_ungrd: string;
  url_ungrd: string;
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  const match = document.cookie.match(/siagrd_token=([^;]+)/);
  return match ? match[1] : null;
}

function authHeaders(): Record<string, string> {
  const t = getToken();
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (t) h['Authorization'] = `Bearer ${t}`;
  return h;
}

function getRole(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const t = getToken();
    if (!t) return null;
    const payload = JSON.parse(atob(t.split('.')[1]));
    return payload.rol ?? payload.role ?? null;
  } catch { return null; }
}

function Toast({ msg, onClose }: { msg: string; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  const isErr = msg.startsWith('Error');
  return (
    <div className={`fixed bottom-6 right-6 z-50 rounded-lg px-4 py-3 text-sm shadow-lg border ${isErr ? 'bg-[#DC2626]/10 border-[#DC2626]/40 text-[#FCA5A5]' : 'bg-[#1E2535] border-[#2D3748] text-[#F0F4FF]'}`}>
      {msg}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
      <div className="bg-[#111827] border border-[#2D3748] rounded-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2D3748]">
          <h3 className="text-[#F0F4FF] font-bold text-sm uppercase tracking-wider">{title}</h3>
          <button onClick={onClose} className="text-[#6B7280] hover:text-[#F0F4FF] text-xl leading-none">×</button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[#8B9CC8] text-xs uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

const inputCls = 'bg-[#0A0E1A] border border-[#2D3748] text-[#F0F4FF] text-sm rounded px-3 py-2 focus:outline-none focus:border-[#3B82F6] w-full disabled:opacity-50 disabled:cursor-not-allowed';
const btnPrimary = 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold rounded px-4 py-2 transition-colors disabled:opacity-50';
const btnSecondary = 'bg-[#1E2535] hover:bg-[#2D3748] text-[#F0F4FF] text-sm font-semibold rounded px-4 py-2 transition-colors border border-[#2D3748]';

export default function ConfiguracionPage() {
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
  const [isAdmin, setIsAdmin] = useState(false);

  const set = (k: keyof Configuracion, v: string) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    setIsAdmin(getRole() === 'ADMIN');
  }, []);

  const fetchConfig = useCallback(async () => {
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

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormErr('');
    setSaving(true);
    try {
      const r = await fetch(`${API_URL}/api/v1/configuracion`, {
        method: 'PATCH', headers: authHeaders(),
        body: JSON.stringify(form),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.message ?? `HTTP ${r.status}`); }
      setToast('Configuración guardada');
    } catch (ex: unknown) {
      setFormErr(ex instanceof Error ? ex.message : 'Error al guardar');
    } finally { setSaving(false); }
  }

  async function generarInforme() {
    setSendingInforme(true);
    try {
      const r = await fetch(`${API_URL}/api/v1/configuracion/informe-ungrd`, {
        method: 'POST', headers: authHeaders(),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.message ?? `HTTP ${r.status}`); }
      const d = await r.json();
      setInformeData(d);
      setShowInforme(true);
    } catch (ex: unknown) {
      setToast(`Error: ${ex instanceof Error ? ex.message : 'Error al generar informe'}`);
    } finally { setSendingInforme(false); }
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {toast && <Toast msg={toast} onClose={() => setToast('')} />}

      {showInforme && informeData !== null && (
        <Modal title="Informe UNGRD" onClose={() => setShowInforme(false)}>
          <pre className="bg-[#0A0E1A] border border-[#2D3748] rounded p-4 text-[#8B9CC8] text-xs overflow-x-auto whitespace-pre-wrap font-mono max-h-96">
            {JSON.stringify(informeData, null, 2)}
          </pre>
          <div className="flex justify-end pt-4">
            <button className={btnSecondary} onClick={() => setShowInforme(false)}>Cerrar</button>
          </div>
        </Modal>
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-[#F0F4FF] uppercase tracking-wider">
          Configuración del Sistema
        </h1>
        <p className="text-[#8B9CC8] text-sm mt-1">
          {isAdmin ? 'Edición habilitada' : 'Solo lectura — se requiere rol ADMIN para editar'}
        </p>
      </div>

      {loading && <p className="text-[#8B9CC8] text-sm font-mono animate-pulse">Cargando configuración...</p>}
      {error && <p className="text-[#DC2626] text-sm bg-[#DC2626]/10 border border-[#DC2626]/30 rounded px-3 py-2 mb-4">{error}</p>}

      {!loading && (
        <div className="flex flex-col gap-6 max-w-2xl">
          {/* Formulario principal */}
          <div className="bg-[#111827] border border-[#2D3748] rounded-lg p-5">
            <h2 className="text-[#F0F4FF] font-bold text-sm uppercase tracking-wider mb-4">
              Datos del Sistema
            </h2>
            <form onSubmit={submit} className="flex flex-col gap-4">
              <Field label="Nombre del sistema">
                <input
                  className={inputCls}
                  value={form.nombre_sistema}
                  onChange={e => set('nombre_sistema', e.target.value)}
                  disabled={!isAdmin}
                />
              </Field>
              <Field label="Nombre del departamento">
                <input
                  className={inputCls}
                  value={form.nombre_departamento}
                  onChange={e => set('nombre_departamento', e.target.value)}
                  placeholder="Ej: Meta"
                  disabled={!isAdmin}
                />
              </Field>
              <Field label="Código DANE">
                <input
                  className={inputCls}
                  value={form.codigo_dane}
                  onChange={e => set('codigo_dane', e.target.value)}
                  placeholder="Ej: 50"
                  disabled={!isAdmin}
                />
              </Field>
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
              {formErr && <p className="text-[#FCA5A5] text-xs">{formErr}</p>}
              {isAdmin && (
                <div className="flex justify-end pt-2">
                  <button type="submit" className={btnPrimary} disabled={saving}>
                    {saving ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Sección Informe UNGRD */}
          <div className="bg-[#111827] border border-[#2D3748] rounded-lg p-5">
            <h2 className="text-[#F0F4FF] font-bold text-sm uppercase tracking-wider mb-1">
              Informe UNGRD
            </h2>
            <p className="text-[#8B9CC8] text-xs mb-4">
              Genera y envía el informe consolidado de gestión del riesgo a la UNGRD.
            </p>
            <button
              className={btnPrimary}
              onClick={generarInforme}
              disabled={sendingInforme}
            >
              {sendingInforme ? 'Generando...' : 'Generar y Enviar Informe'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
