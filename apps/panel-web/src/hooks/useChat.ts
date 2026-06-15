'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getToken } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.satam.corpofuturo.org';
const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'wss://api.satam.corpofuturo.org';



export type TipoMensaje = 'NORMAL' | 'SISTEMA' | 'ALERTA_OFICIAL';

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
      const token = getToken();
      const res = await fetch(`${API_URL}/api/v1/chats/${id}/mensajes`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
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
    const token = getToken();
    const url = `${WS_URL}/ws/chats/${id}/${token ? `?token=${token}` : ''}`;

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
    async (contenido: string, tipo: TipoMensaje = 'NORMAL') => {
      if (!chatId || !contenido.trim()) return;
      const token = getToken();

      // Enviar via WS si está conectado, si no via HTTP
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ contenido, tipo }));
      } else {
        try {
          await fetch(`${API_URL}/api/v1/chats/${chatId}/mensajes`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ contenido, tipo }),
          });
          // refrescar historial para ver el mensaje enviado
          fetchHistorial(chatId);
        } catch {
          // ignorar
        }
      }
    },
    [chatId, fetchHistorial]
  );

  return { mensajes, loading, wsStatus, sendMessage };
}
