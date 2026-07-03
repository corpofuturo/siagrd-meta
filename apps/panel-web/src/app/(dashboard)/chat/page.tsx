'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useChat, TipoMensaje, ChatMensaje, WsStatus } from '@/hooks/useChat';
import { API_URL } from '@/lib/api';
import { useCurrentUser } from '@/hooks/useCurrentUser';

// Roles autorizados para ALERTA_OFICIAL
const ROLES_ALERTA = ['CMGRD', 'CDGRD', 'ADMIN'];

interface Canal {
  id: string;
  nombre: string;
  tipo: 'general' | 'incidente';
  incidente_id?: string;
}

function rolInitial(rol: string): string {
  const map: Record<string, string> = {
    CMGRD: 'C', CDGRD: 'D', ADMIN: 'A', COORDINADOR: 'CO',
    OPERADOR: 'OP', BOMBERO: 'B', POLICIA: 'PO', MEDICO: 'M',
  };
  return map[rol] ?? rol.slice(0, 2).toUpperCase();
}

function rolColor(rol: string): string {
  const map: Record<string, string> = {
    CMGRD: 'bg-[#DC2626]',
    CDGRD: 'bg-[#EA580C]',
    ADMIN: 'bg-[#7C3AED]',
    COORDINADOR: 'bg-[#2563EB]',
    OPERADOR: 'bg-[#16A34A]',
    BOMBERO: 'bg-[#D97706]',
    POLICIA: 'bg-[#0891B2]',
    MEDICO: 'bg-[#BE185D]',
  };
  return map[rol] ?? 'bg-[#4B5563]';
}

function formatTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat('es-CO', {
      timeZone: 'America/Bogota',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(iso));
  } catch {
    return '';
  }
}

function WsIndicator({ status }: { status: WsStatus }) {
  const map = {
    conectado: { color: 'text-[#16A34A]', dot: '●', label: 'WS' },
    conectando: { color: 'text-[#D97706]', dot: '◌', label: 'WS' },
    desconectado: { color: 'text-[#DC2626]', dot: '○', label: 'WS' },
  };
  const { color, dot, label } = map[status];
  return (
    <span className={`flex items-center gap-1 text-xs font-mono ${color}`} title={status}>
      <span>{dot}</span>
      <span>{label}</span>
    </span>
  );
}

function MensajeItem({ msg }: { msg: ChatMensaje }) {
  const esAlerta = msg.tipo === 'ALERTA_OFICIAL';
  const esSistema = msg.tipo === 'SISTEMA';

  if (esSistema) {
    return (
      <div className="flex justify-center my-2">
        <span className="text-[10px] text-[#4B5563] font-mono px-3 py-1 bg-[#1E2535] rounded-full">
          {msg.contenido}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex gap-3 px-4 py-2 ${esAlerta ? 'bg-[#DC2626]/10 border-l-2 border-[#DC2626]' : 'hover:bg-[#0D1220]/50'}`}>
      {/* Avatar */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold font-display ${rolColor(msg.autor_rol)}`}>
        {rolInitial(msg.autor_rol)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-0.5">
          <span className="text-[#F0F4FF] text-sm font-semibold">{msg.autor_nombre}</span>
          <span className="text-[#4B5563] text-[10px] font-mono">{msg.autor_rol}</span>
          {esAlerta && (
            <span className="px-1.5 py-0.5 bg-[#DC2626] text-white text-[9px] font-bold font-display rounded uppercase tracking-wider">
              ALERTA OFICIAL
            </span>
          )}
          <span className="text-[#4B5563] text-[10px] font-mono ml-auto">{formatTime(msg.created_at)}</span>
        </div>
        <p className={`text-sm leading-relaxed break-words ${esAlerta ? 'text-[#FCA5A5] font-medium' : 'text-[#CBD5E1]'}`}>
          {msg.contenido}
        </p>
      </div>
    </div>
  );
}

function ChatWindow({
  canal,
  userRol,
}: {
  canal: Canal;
  userRol: string;
}) {
  const { mensajes, loading, wsStatus, sendMessage } = useChat(canal.id);
  const [texto, setTexto] = useState('');
  const [tipo, setTipo] = useState<TipoMensaje>('TEXTO');
  const bottomRef = useRef<HTMLDivElement>(null);
  const puedeSendAlerta = ROLES_ALERTA.includes(userRol);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes]);

  const handleSend = useCallback(async () => {
    const contenido = texto.trim();
    if (!contenido) return;
    setTexto('');
    await sendMessage(contenido, tipo);
  }, [texto, tipo, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden">
      {/* Header del canal */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#2D3748] bg-[#111827] flex-shrink-0">
        <span className="text-[#F0F4FF] font-semibold font-display uppercase tracking-wider text-sm">
          #{canal.nombre}
        </span>
        {canal.tipo === 'incidente' && (
          <span className="px-1.5 py-0.5 bg-[#EA580C]/20 text-[#EA580C] text-[9px] font-bold rounded uppercase tracking-wider">
            INCIDENTE
          </span>
        )}
        <div className="ml-auto">
          <WsIndicator status={wsStatus} />
        </div>
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto py-2">
        {loading && (
          <div className="text-center py-8 text-[#4B5563] text-sm">Cargando mensajes...</div>
        )}
        {!loading && mensajes.length === 0 && (
          <div className="text-center py-8 text-[#4B5563] text-sm">Sin mensajes aún</div>
        )}
        {mensajes.map((msg) => (
          <MensajeItem key={msg.id} msg={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-[#2D3748] p-3 bg-[#0A0E1A]">
        {puedeSendAlerta && (
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => setTipo('TEXTO')}
              className={`px-2 py-1 text-[10px] font-bold rounded uppercase tracking-wider transition-colors ${tipo === 'TEXTO' ? 'bg-[#2563EB] text-white' : 'bg-[#1E2535] text-[#8B9CC8] hover:text-[#F0F4FF]'}`}
            >
              Normal
            </button>
            <button
              onClick={() => setTipo('ALERTA_OFICIAL')}
              className={`px-2 py-1 text-[10px] font-bold rounded uppercase tracking-wider transition-colors ${tipo === 'ALERTA_OFICIAL' ? 'bg-[#DC2626] text-white' : 'bg-[#1E2535] text-[#8B9CC8] hover:text-[#F0F4FF]'}`}
            >
              Alerta Oficial
            </button>
          </div>
        )}

        <div className={`flex gap-2 items-end rounded border ${tipo === 'ALERTA_OFICIAL' ? 'border-[#DC2626]/60' : 'border-[#2D3748]'} bg-[#111827] px-3 py-2`}>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={tipo === 'ALERTA_OFICIAL' ? 'Redactar alerta oficial...' : 'Escribe un mensaje... (Enter para enviar)'}
            rows={1}
            className="flex-1 bg-transparent text-[#F0F4FF] text-sm resize-none focus:outline-none placeholder-[#4B5563] max-h-32 overflow-y-auto"
            style={{ fieldSizing: 'content' } as React.CSSProperties}
          />
          <button
            onClick={handleSend}
            disabled={!texto.trim()}
            className={`flex-shrink-0 px-3 py-1.5 text-xs font-bold rounded uppercase tracking-wider transition-colors ${
              tipo === 'ALERTA_OFICIAL'
                ? 'bg-[#DC2626] hover:bg-[#B91C1C] text-white disabled:opacity-40'
                : 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white disabled:opacity-40'
            }`}
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [canales, setCanales] = useState<Canal[]>([
    { id: 'general', nombre: 'General', tipo: 'general' },
  ]);
  const [canalActivo, setCanalActivo] = useState<Canal>(canales[0]);
  const { user } = useCurrentUser();
  const userRol = user?.rol ?? '';

  // Cargar incidentes activos para crear canales
  useEffect(() => {
    fetch(`${API_URL}/api/v1/incidentes?estado=ACTIVO`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data) return;
        const lista: { id: string; codigo?: string; tipo?: string }[] = Array.isArray(data)
          ? data
          : (data.data ?? data.results ?? []);
        const nuevos: Canal[] = lista.slice(0, 10).map((i) => ({
          id: `incidente-${i.id}`,
          nombre: i.codigo ?? `INC-${i.id.slice(0, 6)}`,
          tipo: 'incidente' as const,
          incidente_id: i.id,
        }));
        setCanales([{ id: 'general', nombre: 'General', tipo: 'general' }, ...nuevos]);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="flex flex-1 h-full overflow-hidden">
      {/* Sidebar de canales */}
      <aside className="w-56 flex-shrink-0 bg-[#0D1220] border-r border-[#2D3748] flex flex-col overflow-hidden">
        <div className="px-3 pt-4 pb-2 flex-shrink-0">
          <p className="text-[10px] text-[#4B5563] uppercase tracking-widest font-display mb-2">
            Comunicaciones
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-4">
          <p className="text-[9px] text-[#4B5563] uppercase tracking-widest px-2 mb-1 mt-1">
            Canales
          </p>
          {canales.map((c) => (
            <button
              key={c.id}
              onClick={() => setCanalActivo(c)}
              className={`w-full text-left px-2 py-1.5 rounded text-sm flex items-center gap-2 transition-colors mb-0.5 ${
                canalActivo.id === c.id
                  ? 'bg-[#1E2535] text-[#F0F4FF]'
                  : 'text-[#8B9CC8] hover:bg-[#1E2535]/60 hover:text-[#F0F4FF]'
              }`}
            >
              <span className="text-[#4B5563]">#</span>
              <span className="truncate">{c.nombre.toLowerCase()}</span>
              {c.tipo === 'incidente' && (
                <span className="ml-auto flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[#EA580C]" />
              )}
            </button>
          ))}
        </div>

        {/* Identidad del usuario */}
        {user && (
          <div className="border-t border-[#2D3748] px-3 py-2 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${rolColor(userRol)}`}>
                {rolInitial(userRol)}
              </div>
              <div className="min-w-0">
                <p className="text-[#F0F4FF] text-xs font-medium truncate">{user.nombre}</p>
                <p className="text-[#4B5563] text-[9px] uppercase">{userRol}</p>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Ventana de chat */}
      <ChatWindow canal={canalActivo} userRol={userRol} />
    </div>
  );
}
