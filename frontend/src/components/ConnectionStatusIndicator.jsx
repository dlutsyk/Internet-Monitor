import { cn } from '../utils/cn';
import { useTranslation } from 'react-i18next';

export default function ConnectionStatusIndicator({
  connectionState,
  reconnectAttempts = 0,
  onReconnect
}) {
  const { t } = useTranslation();

  const getConnectionText = () => {
    if (connectionState === 'open') return t('header.status.live');
    if (connectionState === 'connecting') {
      return reconnectAttempts > 0
        ? t('header.status.reconnecting', { count: reconnectAttempts })
        : t('header.status.connecting');
    }
    return t('header.status.disconnected');
  };

  const getIndicatorClasses = () => {
    if (connectionState === 'open') {
      return 'bg-green-500 animate-pulse';
    }
    if (connectionState === 'connecting') {
      return 'bg-orange-500 animate-pulse';
    }
    return 'bg-red-500';
  };

  return (
    <div className={cn("flex items-center gap-2")}>
      <div className={cn(`rounded-full h-3 w-3 ${getIndicatorClasses()}`)} />
      <p className={cn("font-normal text-sm text-neutral-600")}>
        {getConnectionText()}
      </p>
      {(connectionState === 'closed' || connectionState === 'error') && onReconnect && (
        <button
          onClick={onReconnect}
          className={cn("text-xs text-blue-600 hover:text-blue-700 underline ml-1")}
        >
          {t('header.status.retryNow')}
        </button>
      )}
    </div>
  );
}
