interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info';
  children: React.ReactNode;
  onDismiss?: () => void;
}

const ALERT_STYLES = {
  success: 'bg-green-50 border-green-300 text-green-800',
  error: 'bg-red-50 border-red-300 text-red-700',
  warning: 'bg-yellow-50 border-yellow-300 text-yellow-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
};
const ALERT_ICONS = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };

export function Alert({ type, children, onDismiss }: AlertProps) {
  return (
    <div className={`flex items-start gap-3 p-4 rounded-lg border ${ALERT_STYLES[type]}`}>
      <span className="text-lg shrink-0">{ALERT_ICONS[type]}</span>
      <div className="flex-1 text-sm">{children}</div>
      {onDismiss && (
        <button onClick={onDismiss} className="shrink-0 text-current opacity-60 hover:opacity-100">
          ✕
        </button>
      )}
    </div>
  );
}
