import { useMemo } from 'react';
import { cn } from '../utils/cn';
import { formatMbps } from '../utils/format';
import useAnimatedNumber from '../hooks/useAnimatedNumber';

// Asset URL from Figma
const imgFrame9 = "https://www.figma.com/api/mcp/asset/65cf4bd3-e813-4881-8ea3-82e9631fadae";

export default function AvgSpeedCard({ stats, recent }) {
  const MAX_REALISTIC_DOWNLOAD = 1000; // Filter out unrealistic values

  const { minSpeed, maxSpeed, hasData } = useMemo(() => {
    const onlineWithSpeed = recent.filter(
      r => r.status === 'online' &&
      r.downloadMbps != null &&
      r.downloadMbps > 0 &&
      r.downloadMbps <= MAX_REALISTIC_DOWNLOAD
    );
    if (onlineWithSpeed.length === 0) {
      return { minSpeed: 0, maxSpeed: 0, hasData: false };
    }
    const speeds = onlineWithSpeed.map(r => r.downloadMbps);
    return {
      minSpeed: Math.min(...speeds),
      maxSpeed: Math.max(...speeds),
      hasData: true
    };
  }, [recent]);

  const animatedAvg = useAnimatedNumber(stats?.avgDownload ?? 0, 800, 2);
  const animatedMin = useAnimatedNumber(minSpeed, 600, 2);
  const animatedMax = useAnimatedNumber(maxSpeed, 600, 2);

  const minMaxText = hasData
    ? `Min: ${formatMbps(animatedMin)} | Max: ${formatMbps(animatedMax)}`
    : 'No data yet';

  return (
    <div className={cn("bg-white border border-neutral-200 rounded-lg p-6 transition-all duration-300 hover:shadow-md")}>
      <div className={cn("flex justify-between items-start mb-2")}>
        <p className={cn("text-sm text-neutral-600 transition-colors duration-200")}>
          Avg Speed (24h)
        </p>
        <div className={cn("h-4 w-4 transition-transform duration-200 hover:scale-110")}>
          <img alt="" className={cn("block h-full w-full")} src={imgFrame9} />
        </div>
      </div>
      <p className={cn("text-2xl text-neutral-900 mb-2 transition-all duration-500 transform")}>
        {stats ? formatMbps(animatedAvg) : '—'}
      </p>
      <p className={cn("text-sm text-neutral-600 transition-opacity duration-300")}>
        {minMaxText}
      </p>
    </div>
  );
}
