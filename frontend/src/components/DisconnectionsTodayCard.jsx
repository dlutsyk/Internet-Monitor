import { cn } from '../utils/cn';
import useAnimatedNumber from '../hooks/useAnimatedNumber';

// Asset URL from Figma
const imgGroup = "https://www.figma.com/api/mcp/asset/2c9b85be-6937-485a-8c5e-d51deb9dfdef";

export default function DisconnectionsTodayCard({ todayStats }) {
  const animatedDisconnections = useAnimatedNumber(
    todayStats?.disconnectionEvents ?? 0,
    600,
    0
  );
  const animatedUptime = useAnimatedNumber(
    todayStats?.uptimePercent ?? 0,
    800,
    1
  );

  return (
    <div className={cn("bg-white border border-neutral-200 rounded-lg p-6 transition-all duration-300 hover:shadow-md")}>
      <div className={cn("flex justify-between items-start mb-2")}>
        <p className={cn("text-sm text-neutral-600 transition-colors duration-200")}>
          Disconnections Today
        </p>
        <div className={cn("h-4 w-4 transition-transform duration-200 hover:scale-110")}>
          <img alt="" className={cn("block h-full w-full")} src={imgGroup} />
        </div>
      </div>
      <p className={cn(`text-2xl mb-2 transition-all duration-500 ${
        (todayStats?.disconnectionEvents ?? 0) > 5 ? 'text-red-600' :
        (todayStats?.disconnectionEvents ?? 0) > 2 ? 'text-orange-600' :
        'text-neutral-900'
      }`)}>
        {todayStats?.disconnectionEvents !== null && todayStats?.disconnectionEvents !== undefined
          ? Math.round(animatedDisconnections)
          : '—'}
      </p>
      <p className={cn("text-sm text-neutral-600 transition-opacity duration-300")}>
        {todayStats && todayStats.uptimePercent !== null
          ? `Uptime: ${animatedUptime.toFixed(1)}%`
          : 'Loading...'}
      </p>
    </div>
  );
}
