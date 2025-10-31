import { useState, useEffect, useRef } from 'react';
import { cn } from '../utils/cn';
import useRealtimeMetrics from '../hooks/useRealtimeMetrics.js';

export default function DetailedStatistics() {
  const { sendMessage, subscribeToMessages, connectionState } = useRealtimeMetrics();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('24h');
  const timeRangeRef = useRef(timeRange);
  const isInitialMount = useRef(true);

  // Keep timeRange ref up to date
  useEffect(() => {
    timeRangeRef.current = timeRange;
  }, [timeRange]);

  // Convert time range string to hours
  const getTimeRangeHours = (range) => {
    switch (range) {
      case '1h': return 1;
      case '6h': return 6;
      case '24h': return 24;
      case '7d': return 168; // 7 * 24
      default: return 24;
    }
  };

  // Subscribe to WebSocket messages for detailed stats and events
  useEffect(() => {
    if (!subscribeToMessages || !sendMessage) return;

    const handleMessage = (message) => {
      if (message.type === 'detailed-stats' && message.payload) {
        // Only update if it's for the current time range
        const expectedHours = getTimeRangeHours(timeRangeRef.current);
        if (message.payload.period?.hours === expectedHours) {
          setStats(message.payload);
          setLoading(false);
          setError(null);
        }
      } else if (message.type === 'event') {
        // When an event occurs, request fresh detailed stats
        console.log('[DetailedStatistics] Event received, requesting fresh stats');
        if (connectionState === 'open') {
          const hours = getTimeRangeHours(timeRangeRef.current);
          sendMessage({
            type: 'request-detailed-stats',
            payload: { hours }
          });
        }
      }
    };

    const unsubscribe = subscribeToMessages(handleMessage);
    return unsubscribe;
  }, [subscribeToMessages, sendMessage, connectionState]); // Add dependencies

  // Request detailed stats when time range changes (but not on initial mount for 24h)
  useEffect(() => {
    // Skip initial mount for 24h since backend sends it automatically on connection
    if (isInitialMount.current && timeRange === '24h') {
      isInitialMount.current = false;
      return;
    }
    isInitialMount.current = false;

    if (!sendMessage) return;

    // Only send if WebSocket is connected
    if (connectionState !== 'open') {
      console.log('[DetailedStatistics] Waiting for WebSocket connection...');
      return;
    }

    setLoading(true);
    setError(null);

    const hours = getTimeRangeHours(timeRange);
    const success = sendMessage({
      type: 'request-detailed-stats',
      payload: { hours }
    });

    if (!success) {
      setError('WebSocket not connected');
      setLoading(false);
    }
  }, [timeRange]); // Only depend on timeRange - sendMessage is stable via useCallback

  const formatDuration = (ms) => {
    if (!ms) return '—';
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (loading && !stats) {
    return (
      <div className={cn("bg-white border border-neutral-200 rounded-lg p-6")}>
        <div className={cn("flex items-center justify-center h-64")}>
          <div className={cn("flex flex-col items-center gap-3")}>
            <div className={cn("animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent")} />
            <p className={cn("text-sm text-neutral-500")}>Loading statistics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("bg-white border border-neutral-200 rounded-lg p-6")}>
        <div className={cn("flex items-center justify-center h-64")}>
          <p className={cn("text-sm text-red-500")}>Error loading statistics: {error}</p>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const { summary, events, dbStats } = stats;

  return (
    <div className={cn("bg-white border border-neutral-200 rounded-lg p-6")}>
      {/* Header */}
      <div className={cn("flex justify-between items-center mb-6")}>
        <div>
          <p className={cn("text-lg text-neutral-900 font-semibold")}>
            Detailed Statistics
          </p>
          <p className={cn("text-sm text-neutral-600 mt-1")}>
            Comprehensive analysis of your internet connection
          </p>
        </div>

        {/* Time Range Selector */}
        <div className={cn("flex gap-2")}>
          {['1h', '6h', '24h', '7d'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={cn(
                "px-3 py-1.5 text-sm rounded transition-colors",
                timeRange === range
                  ? "bg-blue-500 text-white"
                  : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
              )}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Statistics Grid */}
      <div className={cn("grid grid-cols-3 gap-6 mb-6")}>
        {/* Overall Performance */}
        <div className={cn("border border-neutral-200 rounded-lg p-4")}>
          <p className={cn("text-sm text-neutral-600 mb-3")}>Overall Performance</p>
          <div className={cn("space-y-2")}>
            <div className={cn("flex justify-between")}>
              <span className={cn("text-xs text-neutral-500")}>Avg Download:</span>
              <span className={cn("text-sm font-medium text-neutral-900")}>
                {summary?.download?.avg ? `${summary.download.avg} Mbps` : '—'}
              </span>
            </div>
            <div className={cn("flex justify-between")}>
              <span className={cn("text-xs text-neutral-500")}>Min Download:</span>
              <span className={cn("text-sm font-medium text-neutral-900")}>
                {summary?.download?.min ? `${summary.download.min} Mbps` : '—'}
              </span>
            </div>
            <div className={cn("flex justify-between")}>
              <span className={cn("text-xs text-neutral-500")}>Max Download:</span>
              <span className={cn("text-sm font-medium text-neutral-900")}>
                {summary?.download?.max ? `${summary.download.max} Mbps` : '—'}
              </span>
            </div>
            {summary?.upload?.avg && (
              <div className={cn("flex justify-between")}>
                <span className={cn("text-xs text-neutral-500")}>Avg Upload:</span>
                <span className={cn("text-sm font-medium text-neutral-900")}>
                  {summary.upload.avg} Mbps
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Connection Stability */}
        <div className={cn("border border-neutral-200 rounded-lg p-4")}>
          <p className={cn("text-sm text-neutral-600 mb-3")}>Connection Stability</p>
          <div className={cn("space-y-2")}>
            <div className={cn("flex justify-between")}>
              <span className={cn("text-xs text-neutral-500")}>Uptime:</span>
              <span className={cn("text-sm font-medium text-neutral-900")}>
                {summary?.uptimePercent !== null ? `${summary.uptimePercent}%` : '—'}
              </span>
            </div>
            <div className={cn("flex justify-between")}>
              <span className={cn("text-xs text-neutral-500")}>Total Samples:</span>
              <span className={cn("text-sm font-medium text-neutral-900")}>
                {summary?.totalSamples ?? '—'}
              </span>
            </div>
            <div className={cn("flex justify-between")}>
              <span className={cn("text-xs text-neutral-500")}>Online:</span>
              <span className={cn("text-sm font-medium text-green-600")}>
                {summary?.onlineSamples ?? '—'}
              </span>
            </div>
            <div className={cn("flex justify-between")}>
              <span className={cn("text-xs text-neutral-500")}>Offline:</span>
              <span className={cn("text-sm font-medium text-red-600")}>
                {summary?.offlineSamples ?? '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Downtime */}
        <div className={cn("border border-neutral-200 rounded-lg p-4")}>
          <p className={cn("text-sm text-neutral-600 mb-3")}>Downtime Analysis</p>
          <div className={cn("space-y-2")}>
            <div className={cn("flex justify-between")}>
              <span className={cn("text-xs text-neutral-500")}>Events:</span>
              <span className={cn("text-sm font-medium text-neutral-900")}>
                {summary?.downtime?.events ?? '—'}
              </span>
            </div>
            <div className={cn("flex justify-between")}>
              <span className={cn("text-xs text-neutral-500")}>Total Duration:</span>
              <span className={cn("text-sm font-medium text-neutral-900")}>
                {formatDuration(summary?.downtime?.durationMs)}
              </span>
            </div>
            <div className={cn("flex justify-between")}>
              <span className={cn("text-xs text-neutral-500")}>Avg per Event:</span>
              <span className={cn("text-sm font-medium text-neutral-900")}>
                {summary?.downtime?.events > 0
                  ? formatDuration(summary.downtime.durationMs / summary.downtime.events)
                  : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Events Summary */}
      <div className={cn("grid grid-cols-2 gap-6 mb-6")}>
        <div className={cn("border border-neutral-200 rounded-lg p-4")}>
          <p className={cn("text-sm text-neutral-600 mb-3")}>Connection Events</p>
          <div className={cn("space-y-2")}>
            <div className={cn("flex justify-between")}>
              <span className={cn("text-xs text-neutral-500")}>Connection Lost:</span>
              <span className={cn("text-sm font-medium text-red-600")}>
                {events?.['connection-lost']?.length ?? 0}
              </span>
            </div>
            <div className={cn("flex justify-between")}>
              <span className={cn("text-xs text-neutral-500")}>Connection Restored:</span>
              <span className={cn("text-sm font-medium text-green-600")}>
                {events?.['connection-restored']?.length ?? 0}
              </span>
            </div>
          </div>
        </div>

        <div className={cn("border border-neutral-200 rounded-lg p-4")}>
          <p className={cn("text-sm text-neutral-600 mb-3")}>Speed Changes</p>
          <div className={cn("space-y-2")}>
            <div className={cn("flex justify-between")}>
              <span className={cn("text-xs text-neutral-500")}>Speed Drops:</span>
              <span className={cn("text-sm font-medium text-orange-600")}>
                {summary?.speedDrops?.count ?? 0}
              </span>
            </div>
            <div className={cn("flex justify-between")}>
              <span className={cn("text-xs text-neutral-500")}>Speed Improved:</span>
              <span className={cn("text-sm font-medium text-green-600")}>
                {events?.['speed-improved']?.length ?? 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Database Stats */}
      {dbStats && (
        <div className={cn("border-t border-neutral-200 pt-4")}>
          <p className={cn("text-xs text-neutral-500 mb-2")}>Database Information</p>
          <div className={cn("grid grid-cols-4 gap-4 text-xs")}>
            <div>
              <span className={cn("text-neutral-500")}>Total Measurements: </span>
              <span className={cn("font-medium text-neutral-900")}>{dbStats.measurementCount}</span>
            </div>
            <div>
              <span className={cn("text-neutral-500")}>Total Events: </span>
              <span className={cn("font-medium text-neutral-900")}>{dbStats.eventCount}</span>
            </div>
            <div>
              <span className={cn("text-neutral-500")}>Oldest Record: </span>
              <span className={cn("font-medium text-neutral-900")}>
                {dbStats.oldestTimestamp ? new Date(dbStats.oldestTimestamp).toLocaleDateString() : '—'}
              </span>
            </div>
            <div>
              <span className={cn("text-neutral-500")}>Latest Record: </span>
              <span className={cn("font-medium text-neutral-900")}>
                {dbStats.newestTimestamp ? new Date(dbStats.newestTimestamp).toLocaleDateString() : '—'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
