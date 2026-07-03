'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { API_URL } from '@/lib/api';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'wss://api.satam.corpofuturo.org';



// Debe coincidir exactamente con el enum tipo_mensaje del backend (chat.ts)
export type TipoMensaje = 'TEXTO' | 'IMAGEN' | 'SISTEMA' | 'ALERTA_OFICIAL';

export interface ChatMensaje {
  id: string;
  chat_id: string;
  autor_id: string;
  autor_nombre: string;
  autor_rol: string;
  contenido: string;
  tipo: TipoMensaje;
  created_at: string;
}

export type WsStatus = 'conectando' | 'conectado' | 'desconectado';

export function useChat(chatId: string | null) {
  const [mensajes, setMensajes] = useState<ChatMensaje[]>([]);
  const [loading, setLoading] = useState(false);
  const [wsStatus, setWsStatus] = useState<WsStatus>('desconectado');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  // Cargar historial
  const fetchHistorial = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/chats/${id}/mensajes`);
      if (res.ok) {
        const data = await res.json();
        const lista = Array.isArray(data) ? data : (data.data ?? data.results ?? []);
        setMensajes(lista);
      }
    } catch {
      // mantener estado anterior
    } finally {
      setLoading(false);
    }
  }, []);

  // Conectar WebSocket
  const connectWs = useCallback((id: string) => {
    if (!mountedRef.current) return;
    // La cookie httpOnly siagrd_token viaja sola en el handshake WS — no hace
    // falta exponer el token via JS (DT-006). El backend la lee como fallback.
    const url = `${WS_URL}/api/v1/chats/${id}/ws`;

    setWsStatus('conectando');
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (mountedRef.current) setWsStatus('conectado');
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
    };

    ws.onmessage = (event) => {
      if (!mountedRef.current) return;
      try {
        const msg: ChatMensaje = JSON.parse(event.data);
        setMensajes((prev) => {
          // evitar duplicados
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      } catch {
        // ignorar mensajes mal formados
      }
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      setWsStatus('desconectado');
      // reconexión automática en 3s
      reconnectTimer.current = setTimeout(() => {
        if (mountedRef.current) connectWs(id);
      }, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    if (!chatId) return;

    fetchHistorial(chatId);
    connectWs(chatId);

    return () => {
      mountedRef.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [chatId, fetchHistorial, connectWs]);

  const sendMessage = useCallback(
    async (contenido: string, tipo: TipoMensaje = 'TEXTO') => {
      if (!chatId || !contenido.trim()) return;

      // El envio canonico es siempre via POST — el backend hace broadcast por
      // WS a todos los conectados (incluido este cliente). El WS es solo de
      // recepcion, el servidor ignora mensajes entrantes por ese canal.
      try {
        await fetch(`${API_URL}/api/v1/chats/${chatId}/mensajes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contenido, tipo }),
        });
      } catch {
        // ignorar — el usuario puede reintentar
      }
    },
    [chatId]
  );

  return { mensajes, loading, wsStatus, sendMessage };
}
