import { cn } from '../utils/cn';
import SignalIcon from './SignalIcon';
import useAnimatedNumber from '../hooks/useAnimatedNumber';

export default function ConnectionStatusCard({ connectionQuality, stats, recent }) {
  const uptimePercent = stats
    ? ((recent.length - stats.offlineCount) / recent.length) * 100
    : 0;
  const animatedUptime = useAnimatedNumber(uptimePercent, 800, 1);

  return (
    <div className={cn("bg-white border border-neutral-200 rounded-lg p-6 transition-all duration-300 hover:shadow-md")}>
      <div className={cn("flex justify-between items-start mb-2")}>
        <p className={cn("text-sm text-neutral-600 transition-colors duration-200")}>
          Connection Status
        </p>
        <div className={cn("h-4 w-5 flex items-center justify-center transition-transform duration-300 hover:scale-110")}>
          <SignalIcon level={connectionQuality.level} status={connectionQuality.status} />
        </div>
      </div>
      <p className={cn(`text-2xl mb-2 transition-all duration-500 ${
        connectionQuality.status === 'offline' ? 'text-red-600' :
        connectionQuality.status === 'critical' ? 'text-orange-600' :
        connectionQuality.status === 'warning' ? 'text-yellow-600' :
        'text-green-600'
      }`)}>
        {connectionQuality.label}
      </p>
      <p className={cn("text-sm text-neutral-600 transition-opacity duration-300")}>
        {stats ? `Uptime: ${animatedUptime.toFixed(1)}%` : 'Loading...'}
      </p>
    </div>
  );
}
