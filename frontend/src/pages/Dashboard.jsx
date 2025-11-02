import { useState, useEffect, useRef } from 'react';
import { cn } from '../utils/cn';
import { useTranslation } from 'react-i18next';
import useRealtimeMetrics from '../hooks/useRealtimeMetrics.js';
import useFilteredMetrics from '../hooks/useFilteredMetrics.js';
import useConnectionEvents from '../hooks/useConnectionEvents.js';
import SpeedChart from '../components/SpeedChart.jsx';
import TimeRangeFilter, { TIME_RANGES } from '../components/TimeRangeFilter.jsx';
import Header from '../components/Header.jsx';
import Sidebar from '../components/Sidebar.jsx';
import SpeedTestCard from '../components/SpeedTestCard.jsx';
import ConnectionStatusCard from '../components/ConnectionStatusCard.jsx';
import DisconnectionsTodayCard from '../components/DisconnectionsTodayCard.jsx';
import AvgSpeedCard from '../components/AvgSpeedCard.jsx';
import ConnectionEventsCard from '../components/ConnectionEventsCard.jsx';
import DetailedStatistics from '../components/DetailedStatistics.jsx';
import Footer from '../components/Footer.jsx';

export default function Dashboard() {
  const { t } = useTranslation();

  const {
    latest,
    recent,
    connectionState,
    stats,
    todayStats,
    reconnectAttempts,
    sendMessage,
    subscribeToMessages,
    reconnect
  } = useRealtimeMetrics();

  // Connection events - fetch all events without limit
  const { events: connectionEvents, loading: eventsLoading } = useConnectionEvents(subscribeToMessages, 1000);

  // Time range filter state with localStorage persistence
  const [selectedTimeRange, setSelectedTimeRange] = useState(() => {
    const saved = localStorage.getItem('dashboardTimeRange');
    return saved || '24h';
  });

  // Highlighted timestamp for synchronized chart/events highlighting
  const [highlightedTimestamp, setHighlightedTimestamp] = useState(null);

  // Save time range to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('dashboardTimeRange', selectedTimeRange);
  }, [selectedTimeRange]);

  const { data: filteredData, loading: filterLoading } = useFilteredMetrics(
    selectedTimeRange,
    TIME_RANGES,
    subscribeToMessages
  );

  // Speed test state
  const [isTestingSpeed, setIsTestingSpeed] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testError, setTestError] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const testTimeoutRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const maxTestTimeoutRef = useRef(null);
  const isTestingSpeedRef = useRef(false);
  const testResultRef = useRef(null);

  // Keep refs in sync with state
  useEffect(() => {
    isTestingSpeedRef.current = isTestingSpeed;
  }, [isTestingSpeed]);

  useEffect(() => {
    testResultRef.current = testResult;
  }, [testResult]);

  // Reset test state completely
  const resetTestState = () => {
    setIsTestingSpeed(false);
    setTestResult(null);
    setCountdown(0);
    if (testTimeoutRef.current) {
      clearTimeout(testTimeoutRef.current);
      testTimeoutRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (maxTestTimeoutRef.current) {
      clearTimeout(maxTestTimeoutRef.current);
      maxTestTimeoutRef.current = null;
    }
  };

  // Countdown timer effect
  useEffect(() => {
    if (countdown > 0) {
      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current);
            // Always reset when countdown reaches 0
            setTimeout(() => resetTestState(), 100);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
        }
      };
    }
  }, [countdown]);

  // Subscribe to WebSocket messages for speed test updates
  useEffect(() => {
    const handleMessage = (message) => {
      if (message.type === 'test-started') {
        setIsTestingSpeed(true);
        setTestError(null);
        setTestResult(null);
        setCountdown(10);

        // Safety timeout: force reset after 15 seconds if test doesn't complete
        if (maxTestTimeoutRef.current) {
          clearTimeout(maxTestTimeoutRef.current);
        }
        maxTestTimeoutRef.current = setTimeout(() => {
          setTestError('Test timeout - taking too long');
          resetTestState();
        }, 15000);
      } else if (message.type === 'test-completed') {
        // Clear safety timeout
        if (maxTestTimeoutRef.current) {
          clearTimeout(maxTestTimeoutRef.current);
          maxTestTimeoutRef.current = null;
        }

        setTestResult(message.payload);
        setCountdown(10); // Reset countdown for result display (countdown will auto-reset when it reaches 0)
      } else if (message.type === 'test-error') {
        setTestError(message.payload?.message || 'Speed test failed');
        resetTestState();
      } else if (message.type === 'measurement' && isTestingSpeedRef.current && testResultRef.current === null) {
        // Show real-time measurement updates during test
        setTestResult(message.payload);
      }
    };

    if (subscribeToMessages) {
      const unsubscribe = subscribeToMessages(handleMessage);
      return () => {
        unsubscribe();
      };
    }
  }, [subscribeToMessages]);

  // Handle speed test button click
  const handleTestSpeed = () => {
    // If already testing, cancel the test
    if (isTestingSpeed) {
      resetTestState();
      return;
    }

    // Reset any previous test state
    resetTestState();

    const success = sendMessage({ type: 'trigger-test' });
    if (!success) {
      setTestError('WebSocket not connected');
      setIsTestingSpeed(false);
    }
  };

  // Calculate connection quality based on current speed vs average
  const getConnectionQuality = () => {
    // If WebSocket is not connected, show connecting/disconnected state
    if (connectionState === 'connecting') {
      return { level: 1, status: 'warning', label: t('connectionStatus.connecting') };
    }

    if (connectionState === 'closed' || connectionState === 'error') {
      return { level: 0, status: 'offline', label: t('connectionStatus.disconnected') };
    }

    // If no data yet, show loading state
    if (!latest) {
      return { level: 2, status: 'warning', label: t('connectionStatus.loading') };
    }

    // Check internet connection status from latest measurement
    if (latest.status !== 'online') {
      return { level: 0, status: 'offline', label: t('connectionStatus.offline') };
    }

    // If online but no speed data yet
    if (!stats || !latest.downloadMbps || !stats.avgDownload) {
      return { level: 2, status: 'warning', label: t('connectionStatus.online') };
    }

    // Calculate quality based on speed
    const currentSpeed = latest.downloadMbps;
    const avgSpeed = stats.avgDownload;
    const percentage = (currentSpeed / avgSpeed) * 100;

    if (percentage >= 80) {
      return { level: 4, status: 'good', label: t('connectionStatus.excellent') };
    } else if (percentage >= 60) {
      return { level: 3, status: 'good', label: t('connectionStatus.good') };
    } else if (percentage >= 40) {
      return { level: 2, status: 'warning', label: t('connectionStatus.fair') };
    } else if (percentage >= 20) {
      return { level: 1, status: 'critical', label: t('connectionStatus.poor') };
    } else {
      return { level: 1, status: 'critical', label: t('connectionStatus.veryPoor') };
    }
  };

  const connectionQuality = getConnectionQuality();

  return (
    <div className={cn("bg-white border-2 border-[#ced4da] border-solid flex flex-col min-h-screen w-full relative")}>
      {/* Reconnection Overlay */}
      {(connectionState === 'connecting' && reconnectAttempts > 0) && (
        <div className={cn("absolute inset-0 bg-black/10 backdrop-blur-sm z-50 flex items-center justify-center pointer-events-none")}>
          <div className={cn("bg-white rounded-lg shadow-lg p-6 flex items-center gap-4 pointer-events-auto")}>
            <div className={cn("animate-spin rounded-full h-8 w-8 border-4 border-orange-500 border-t-transparent")} />
            <div>
              <p className={cn("text-lg font-medium text-neutral-900")}>
                {t('dashboard.reconnecting.title')}
              </p>
              <p className={cn("text-sm text-neutral-600")}>
                {t('dashboard.reconnecting.attempt', { count: reconnectAttempts })}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <Header
        connectionState={connectionState}
        reconnectAttempts={reconnectAttempts}
        onReconnect={reconnect}
        isTestingSpeed={isTestingSpeed}
        countdown={countdown}
        onTestSpeed={handleTestSpeed}
      />

      {/* Main Content */}
      <div className={cn("flex flex-1 bg-neutral-50 w-full")}>
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <div className={cn("flex-1 flex flex-col p-6 w-full overflow-auto")}>
          {/* Page Title */}
          <div className={cn("mb-6")}>
            <p className={cn("text-2xl text-neutral-900 leading-8")}>
              {t('dashboard.title')}
            </p>
            <p className={cn("text-base text-neutral-600 leading-6 mt-2")}>
              {t('dashboard.subtitle')}
            </p>
          </div>

          {/* Metric Cards */}
          <div className={cn("grid grid-cols-4 gap-5 mb-6")}>
            <SpeedTestCard
              isTestingSpeed={isTestingSpeed}
              countdown={countdown}
              testResult={testResult}
              testError={testError}
              latest={latest}
              stats={stats}
            />
            <ConnectionStatusCard
              connectionQuality={connectionQuality}
              stats={stats}
              recent={recent}
            />
            <DisconnectionsTodayCard todayStats={todayStats} />
            <AvgSpeedCard stats={stats} recent={recent} />
          </div>

          {/* Speed Chart and Connection Events */}
          <div className={cn("grid grid-cols-2 gap-5 mb-6")}>
            {/* Speed Chart */}
            <div className={cn("bg-white border border-neutral-200 rounded-lg p-6")}>
              <div className={cn("flex justify-between items-center mb-4")}>
                <p className={cn("text-lg text-neutral-900")}>
                  {t('speedChart.title')}
                </p>
                <TimeRangeFilter
                  selectedRange={selectedTimeRange}
                  onChange={setSelectedTimeRange}
                />
              </div>
              {filterLoading ? (
                <div className={cn("bg-neutral-50 h-64 rounded flex items-center justify-center")}>
                  <div className={cn("flex flex-col items-center gap-3")}>
                    <div className={cn("animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent")} />
                    <p className={cn("text-sm text-neutral-500")}>{t('speedChart.loading')}</p>
                  </div>
                </div>
              ) : (
                <SpeedChart
                  data={filteredData}
                  highlightedTimestamp={highlightedTimestamp}
                  onHighlight={setHighlightedTimestamp}
                />
              )}
            </div>

            {/* Connection Events */}
            <ConnectionEventsCard
              connectionEvents={connectionEvents}
              eventsLoading={eventsLoading}
              highlightedTimestamp={highlightedTimestamp}
              onHighlight={setHighlightedTimestamp}
            />
          </div>

          {/* Detailed Statistics */}
          <DetailedStatistics />
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
