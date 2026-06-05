'use client';

interface RealtimeIndicatorProps {
  conectado: boolean;
  ultimo_evento?: Date;
}

export default function RealtimeIndicator({ conectado, ultimo_evento }: RealtimeIndicatorProps) {
  const color = conectado ? 'text-[#16A34A]' : 'text-[#DC2626]';

  return (
    <div className={`flex items-center gap-1.5 font-mono text-xs ${color}`}>
      {conectado ? (
        <span className="inline-block w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
      ) : (
        <span className="inline-block w-2 h-2 rounded-full bg-[#DC2626]" />
      )}
      <span>{conectado ? 'ONLINE' : 'OFFLINE'}</span>
      {ultimo_evento && (
        <span className="text-[#8B9CC8] ml-1">
          {new Intl.DateTimeFormat('es-CO', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZone: 'America/Bogota',
          }).format(ultimo_evento)}
        </span>
      )}
    </div>
  );
}
