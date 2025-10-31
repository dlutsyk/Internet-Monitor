import { useState, useEffect, useRef } from 'react';
import { cn } from '../utils/cn';
import useRealtimeMetrics from '../hooks/useRealtimeMetrics.js';
import LiveMetrics from '../components/LiveMetrics.jsx';
import RecentActivity from '../components/RecentActivity.jsx';
import HistoryReport from '../components/HistoryReport.jsx';
import { formatMbps } from '../utils/format.js';

// Asset URLs from Figma
const imgFrame = "https://www.figma.com/api/mcp/asset/91d2fffa-fc79-41c6-82d3-a8284e948488";
const imgFrame1 = "https://www.figma.com/api/mcp/asset/fcfd6a69-7f48-4c81-ae33-e4839b12b786";
const imgFrame2 = "https://www.figma.com/api/mcp/asset/3dc66ba4-dacc-4a4d-8bcd-04ca855c51a1";
const imgFrame3 = "https://www.figma.com/api/mcp/asset/37a8aa32-2bfd-4a11-aea9-745eaacb3e02";
const imgFrame4 = "https://www.figma.com/api/mcp/asset/e2b5bf14-4b4b-4c0a-95c6-7688c2b37696";
const imgFrame5 = "https://www.figma.com/api/mcp/asset/53984e1a-2e96-46fb-b47a-f9cbf0c0a589";
const imgFrame6 = "https://www.figma.com/api/mcp/asset/935f9ab7-b6b8-447d-8c20-2a446cea64e2";
const imgFrame7 = "https://www.figma.com/api/mcp/asset/9f2bf45b-5ec2-4a94-ae0d-69903a6a212d";
const imgFrame8 = "https://www.figma.com/api/mcp/asset/841d4efa-8036-466f-98d5-f276d057eb8c";
const imgGroup = "https://www.figma.com/api/mcp/asset/2c9b85be-6937-485a-8c5e-d51deb9dfdef";
const imgFrame9 = "https://www.figma.com/api/mcp/asset/65cf4bd3-e813-4881-8ea3-82e9631fadae";
const imgFrame10 = "https://www.figma.com/api/mcp/asset/7b965f30-eec9-48bf-b8e3-5ccfdd3e1b32";

// Signal strength icon component with dynamic filling
function SignalIcon({ level, status }) {
  // level: 0-4 (number of bars filled)
  // status: 'good' (green), 'warning' (orange), 'critical' (red), 'offline' (gray)
  const colors = {
    good: '#22c55e',      // green-500
    warning: '#f97316',   // orange-500
    critical: '#ef4444',  // red-500
    offline: '#9ca3af',   // gray-400
  };

  const color = colors[status] || colors.offline;

  return (
    <svg width="20" height="16" viewBox="0 0 20 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Bar 1 - shortest */}
      <rect x="1" y="12" width="3" height="3" rx="0.5" fill={level >= 1 ? color : '#e5e7eb'} />
      {/* Bar 2 */}
      <rect x="5.5" y="9" width="3" height="6" rx="0.5" fill={level >= 2 ? color : '#e5e7eb'} />
      {/* Bar 3 */}
      <rect x="10" y="6" width="3" height="9" rx="0.5" fill={level >= 3 ? color : '#e5e7eb'} />
      {/* Bar 4 - tallest */}
      <rect x="14.5" y="3" width="3" height="12" rx="0.5" fill={level >= 4 ? color : '#e5e7eb'} />
    </svg>
  );
}

export default function Dashboard() {
  const { latest, recent, connectionState, stats, sendMessage, subscribeToMessages } = useRealtimeMetrics();

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
    if (!latest || latest.status !== 'online') {
      return { level: 0, status: 'offline', label: 'Offline' };
    }

    if (!stats || !latest.downloadMbps) {
      return { level: 2, status: 'warning', label: 'Unknown' };
    }

    const currentSpeed = latest.downloadMbps;
    const avgSpeed = stats.avgDownload;
    const percentage = (currentSpeed / avgSpeed) * 100;

    if (percentage >= 80) {
      return { level: 4, status: 'good', label: 'Excellent' };
    } else if (percentage >= 60) {
      return { level: 3, status: 'good', label: 'Good' };
    } else if (percentage >= 40) {
      return { level: 2, status: 'warning', label: 'Fair' };
    } else if (percentage >= 20) {
      return { level: 1, status: 'critical', label: 'Poor' };
    } else {
      return { level: 1, status: 'critical', label: 'Very Poor' };
    }
  };

  const connectionQuality = getConnectionQuality();

  return (
    <div className={cn("bg-white border-2 border-[#ced4da] border-solid flex flex-col min-h-screen w-full")}>
      {/* Header */}
      <div className={cn("bg-white border-b border-neutral-200 h-[75px] w-full flex-shrink-0")}>
        <div className={cn("flex items-center justify-between h-full px-6")}>
          {/* Logo and Title */}
          <div className={cn("flex items-center gap-3")}>
            <div className={cn("h-6 w-[30px] flex items-center justify-center")}>
              <img alt="Logo" className={cn("block h-full w-full")} src={imgFrame} />
            </div>
            <p className={cn("font-normal text-xl text-neutral-900")}>
              Internet Monitor
            </p>
          </div>
          {/* Connection Status and Buttons */}
          <div className={cn("flex items-center gap-4")}>
            <div className={cn("flex items-center gap-2")}>
              <div className={cn(`rounded-full h-3 w-3 ${
                connectionState === 'open'
                  ? 'bg-green-500 animate-pulse'
                  : connectionState === 'connecting'
                  ? 'bg-orange-500 animate-pulse'
                  : 'bg-red-500'
              }`)} />
              <p className={cn("font-normal text-sm text-neutral-600")}>
                {connectionState === 'open' ? 'Live' : connectionState === 'connecting' ? 'Connecting...' : 'Disconnected'}
              </p>
            </div>
            <button
              onClick={handleTestSpeed}
              className={cn(`h-[42px] px-4 rounded-lg flex items-center gap-2 transition-colors ${
                isTestingSpeed
                  ? 'bg-red-500 hover:bg-red-600 border border-red-600'
                  : 'bg-blue-500 hover:bg-blue-600 border border-blue-600'
              }`)}
            >
              <div className={cn("h-4 w-4 flex items-center justify-center")}>
                {isTestingSpeed ? (
                  countdown > 0 ? (
                    <div className={cn("text-white text-xs font-bold w-4 h-4 flex items-center justify-center")}>
                      {countdown}
                    </div>
                  ) : (
                    <div className={cn("animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent")} />
                  )
                ) : (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 1v6M8 7l3-3M8 7L5 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M3 11c0 2.761 2.239 5 5 5s5-2.239 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                )}
              </div>
              <p className={cn("font-normal text-base text-white")}>
                {isTestingSpeed ? (countdown > 0 ? `Cancel (${countdown}s)` : 'Cancel') : 'Test Speed'}
              </p>
            </button>
            <button className={cn("bg-neutral-100 border border-neutral-200 h-[42px] px-4 rounded-lg flex items-center gap-2")}>
              <div className={cn("h-4 w-4 flex items-center justify-center")}>
                <img alt="" className={cn("block h-full w-full")} src={imgFrame1} />
              </div>
              <p className={cn("font-normal text-base text-neutral-700")}>
                Export Report
              </p>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={cn("flex flex-1 bg-neutral-50 w-full")}>
        {/* Sidebar */}
        <aside className={cn("bg-white border-r border-neutral-200 w-64 flex-shrink-0")}>
          <nav className={cn("p-4 flex flex-col gap-2")}>
            <div className={cn("bg-neutral-100 h-10 rounded-lg flex items-center gap-3 px-3")}>
              <div className={cn("h-4 w-4 flex items-center justify-center flex-shrink-0")}>
                <img alt="" className={cn("block h-full w-full")} src={imgFrame2} />
              </div>
              <p className={cn("font-normal text-base text-neutral-900")}>
                Real-time Monitor
              </p>
            </div>
            <div className={cn("h-10 rounded-lg flex items-center gap-3 px-3")}>
              <div className={cn("h-4 w-4 flex items-center justify-center flex-shrink-0")}>
                <img alt="" className={cn("block h-full w-full")} src={imgFrame3} />
              </div>
              <p className={cn("font-normal text-base text-neutral-600")}>
                Historical Reports
              </p>
            </div>
            <div className={cn("h-10 rounded-lg flex items-center gap-3 px-3")}>
              <div className={cn("h-4 w-4 flex items-center justify-center flex-shrink-0")}>
                <img alt="" className={cn("block h-full w-full")} src={imgFrame4} />
              </div>
              <p className={cn("font-normal text-base text-neutral-600")}>
                Statistics
              </p>
            </div>
            <div className={cn("h-10 rounded-lg flex items-center gap-3 px-3")}>
              <div className={cn("h-4 w-4 flex items-center justify-center flex-shrink-0")}>
                <img alt="" className={cn("block h-full w-full")} src={imgFrame5} />
              </div>
              <p className={cn("font-normal text-base text-neutral-600")}>
                Settings
              </p>
            </div>
          </nav>
        </aside>

        {/* Main Content Area */}
        <div className={cn("flex-1 flex flex-col p-6 w-full overflow-auto")}>
          {/* Page Title */}
          <div className={cn("mb-6")}>
            <p className={cn("text-2xl text-neutral-900 leading-8")}>
              Real-time Internet Monitoring
            </p>
            <p className={cn("text-base text-neutral-600 leading-6 mt-2")}>
              Monitor your internet connection quality in real-time
            </p>
          </div>

          {/* Metric Cards */}
          <div className={cn("grid grid-cols-4 gap-5 mb-6")}>
            {/* Current Speed Card */}
            <div className={cn(`bg-white border rounded-lg p-6 transition-all ${
              isTestingSpeed || testResult ? 'border-blue-500 border-2 shadow-lg' : 'border-neutral-200'
            }`)}>
              <div className={cn("flex justify-between items-start mb-2")}>
                <div className={cn("flex items-center gap-2")}>
                  <p className={cn("text-sm text-neutral-600")}>
                    {isTestingSpeed ? 'Speed Test' : 'Current Speed'}
                  </p>
                  {isTestingSpeed && (
                    <div className={cn("bg-blue-500 text-white text-xs px-2 py-1 rounded flex items-center gap-1")}>
                      {countdown > 0 && (
                        <span className={cn("font-bold")}>{countdown}s</span>
                      )}
                      <span>Testing</span>
                    </div>
                  )}
                </div>
                <div className={cn("h-4 w-4")}>
                  <img alt="" className={cn("block h-full w-full")} src={imgFrame6} />
                </div>
              </div>

              {isTestingSpeed && testResult ? (
                // Test mode: show both download and upload with real-time updates
                <div className={cn("space-y-3")}>
                  <div>
                    <div className={cn("flex items-baseline gap-2")}>
                      <p className={cn("text-2xl text-blue-600 font-semibold")}>
                        {testResult.downloadMbps ? formatMbps(testResult.downloadMbps) : '—'}
                      </p>
                      <p className={cn("text-xs text-neutral-500 uppercase tracking-wide")}>
                        Download
                      </p>
                    </div>
                  </div>
                  <div>
                    <div className={cn("flex items-baseline gap-2")}>
                      <p className={cn("text-2xl text-blue-600 font-semibold")}>
                        {testResult.uploadMbps ? formatMbps(testResult.uploadMbps) : '—'}
                      </p>
                      <p className={cn("text-xs text-neutral-500 uppercase tracking-wide")}>
                        Upload
                      </p>
                    </div>
                  </div>
                  <p className={cn("text-sm text-neutral-600 pt-1")}>
                    {testResult.status === 'online'
                      ? `Real-time test result • ${countdown}s remaining`
                      : 'Test failed - connection offline'}
                  </p>
                </div>
              ) : isTestingSpeed ? (
                // Testing but no result yet
                <div className={cn("flex flex-col items-center justify-center py-4")}>
                  <div className={cn("animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-3")} />
                  <p className={cn("text-sm text-neutral-600")}>
                    Running speed test...
                  </p>
                </div>
              ) : (
                // Normal mode: show current speed
                <>
                  <p className={cn("text-2xl text-neutral-900 mb-2")}>
                    {latest?.downloadMbps ? formatMbps(latest.downloadMbps) : '—'}
                  </p>
                  <p className={cn("text-sm text-neutral-600")}>
                    {latest && stats
                      ? `${((latest.downloadMbps - stats.avgDownload) / stats.avgDownload * 100).toFixed(1)}% from avg`
                      : 'Loading...'}
                  </p>
                </>
              )}

              {testError && (
                <p className={cn("text-sm text-red-500 mt-2")}>
                  Error: {testError}
                </p>
              )}
            </div>

            {/* Connection Status Card */}
            <div className={cn("bg-white border border-neutral-200 rounded-lg p-6")}>
              <div className={cn("flex justify-between items-start mb-2")}>
                <p className={cn("text-sm text-neutral-600")}>
                  Connection Status
                </p>
                <div className={cn("h-4 w-5 flex items-center justify-center")}>
                  <SignalIcon level={connectionQuality.level} status={connectionQuality.status} />
                </div>
              </div>
              <p className={cn("text-2xl text-neutral-900 mb-2")}>
                {connectionQuality.label}
              </p>
              <p className={cn("text-sm text-neutral-600")}>
                {stats ? `Uptime: ${((recent.length - stats.offlineCount) / recent.length * 100).toFixed(1)}%` : 'Loading...'}
              </p>
            </div>

            {/* Disconnections Today Card */}
            <div className={cn("bg-white border border-neutral-200 rounded-lg p-6")}>
              <div className={cn("flex justify-between items-start mb-2")}>
                <p className={cn("text-sm text-neutral-600")}>
                  Disconnections Today
                </p>
                <div className={cn("h-4 w-4")}>
                  <img alt="" className={cn("block h-full w-full")} src={imgGroup} />
                </div>
              </div>
              <p className={cn("text-2xl text-neutral-600 mb-2")}>
                {stats?.offlineCount ?? 0}
              </p>
              <p className={cn("text-sm text-neutral-600")}>
                Recent disconnections
              </p>
            </div>

            {/* Avg Speed (24h) Card */}
            <div className={cn("bg-white border border-neutral-200 rounded-lg p-6")}>
              <div className={cn("flex justify-between items-start mb-2")}>
                <p className={cn("text-sm text-neutral-600")}>
                  Avg Speed (24h)
                </p>
                <div className={cn("h-4 w-4")}>
                  <img alt="" className={cn("block h-full w-full")} src={imgFrame9} />
                </div>
              </div>
              <p className={cn("text-2xl text-neutral-900 mb-2")}>
                {stats ? formatMbps(stats.avgDownload) : '—'}
              </p>
              <p className={cn("text-sm text-neutral-600")}>
                {recent.length > 0 ? `Min: ${formatMbps(Math.min(...recent.filter(r => r.status === 'online').map(r => r.downloadMbps || 0)))} | Max: ${formatMbps(Math.max(...recent.filter(r => r.status === 'online').map(r => r.downloadMbps || 0)))}` : 'Loading...'}
              </p>
            </div>
          </div>

          {/* Speed Chart and Connection Events */}
          <div className={cn("grid grid-cols-2 gap-5 mb-6")}>
            {/* Speed Chart */}
            <div className={cn("bg-white border border-neutral-200 rounded-lg p-6")}>
              <div className={cn("flex justify-between items-center mb-4")}>
                <p className={cn("text-lg text-neutral-900")}>
                  Speed Chart (Last 24h)
                </p>
                <div className={cn("flex items-center border border-neutral-200 rounded px-3 h-[34px] gap-2")}>
                  <p className={cn("text-sm text-black")}>Last 24h</p>
                  <div className={cn("h-[18px] w-[18px]")}>
                    <img alt="" className={cn("block h-full w-full")} src={imgFrame10} />
                  </div>
                </div>
              </div>
              <div className={cn("bg-neutral-100 h-64 rounded flex items-center justify-center")}>
                <p className={cn("text-base text-neutral-500")}>
                  Speed Chart Visualization
                </p>
              </div>
            </div>

            {/* Connection Events */}
            <div className={cn("bg-white border border-neutral-200 rounded-lg p-6")}>
              <div className={cn("flex justify-between items-center mb-6")}>
                <p className={cn("text-lg text-neutral-900")}>
                  Connection Events
                </p>
                <button className={cn("text-sm text-neutral-600")}>
                  View All
                </button>
              </div>
              <div className={cn("flex flex-col")}>
                <div className={cn("border-b border-neutral-100 py-2 flex justify-between items-center")}>
                  <div className={cn("flex items-center gap-3")}>
                    <div className={cn("bg-neutral-500 rounded-full h-2 w-2")} />
                    <p className={cn("text-sm text-neutral-900")}>
                      Connection lost
                    </p>
                  </div>
                  <p className={cn("text-sm text-neutral-500")}>
                    14:32
                  </p>
                </div>
                <div className={cn("border-b border-neutral-100 py-2 flex justify-between items-center")}>
                  <div className={cn("flex items-center gap-3")}>
                    <div className={cn("bg-neutral-500 rounded-full h-2 w-2")} />
                    <p className={cn("text-sm text-neutral-900")}>
                      Connection restored
                    </p>
                  </div>
                  <p className={cn("text-sm text-neutral-500")}>
                    14:34
                  </p>
                </div>
                <div className={cn("border-b border-neutral-100 py-2 flex justify-between items-center")}>
                  <div className={cn("flex items-center gap-3")}>
                    <div className={cn("bg-neutral-500 rounded-full h-2 w-2")} />
                    <p className={cn("text-sm text-neutral-900")}>
                      Speed degradation
                    </p>
                  </div>
                  <p className={cn("text-sm text-neutral-500")}>
                    12:15
                  </p>
                </div>
                <div className={cn("py-2 flex justify-between items-center")}>
                  <div className={cn("flex items-center gap-3")}>
                    <div className={cn("bg-neutral-500 rounded-full h-2 w-2")} />
                    <p className={cn("text-sm text-neutral-900")}>
                      Speed improved
                    </p>
                  </div>
                  <p className={cn("text-sm text-neutral-500")}>
                    11:48
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Statistics */}
          <div className={cn("bg-white border border-neutral-200 rounded-lg")}>
            <div className={cn("border-b border-neutral-200 p-6")}>
              <p className={cn("text-lg text-neutral-900")}>
                Detailed Statistics
              </p>
            </div>
            <div className={cn("p-6")}>
              <div className={cn("grid grid-cols-3 gap-8")}>
                {/* Speed Metrics */}
                <div className={cn("flex flex-col gap-2")}>
                  <p className={cn("text-sm text-neutral-600 mb-2")}>
                    Speed Metrics
                  </p>
                  <div className={cn("flex justify-between text-sm")}>
                    <p className={cn("text-neutral-600")}>Maximum Speed:</p>
                    <p className={cn("text-neutral-900")}>94.1 Mbps</p>
                  </div>
                  <div className={cn("flex justify-between text-sm")}>
                    <p className={cn("text-neutral-600")}>Minimum Speed:</p>
                    <p className={cn("text-neutral-900")}>12.3 Mbps</p>
                  </div>
                  <div className={cn("flex justify-between text-sm")}>
                    <p className={cn("text-neutral-600")}>Average Speed:</p>
                    <p className={cn("text-neutral-900")}>76.2 Mbps</p>
                  </div>
                  <div className={cn("flex justify-between text-sm")}>
                    <p className={cn("text-neutral-600")}>Median Speed:</p>
                    <p className={cn("text-neutral-900")}>78.5 Mbps</p>
                  </div>
                </div>

                {/* Connection Quality */}
                <div className={cn("flex flex-col gap-2")}>
                  <p className={cn("text-sm text-neutral-600 mb-2")}>
                    Connection Quality
                  </p>
                  <div className={cn("flex justify-between text-sm")}>
                    <p className={cn("text-neutral-600")}>Uptime:</p>
                    <p className={cn("text-neutral-900")}>99.8%</p>
                  </div>
                  <div className={cn("flex justify-between text-sm")}>
                    <p className={cn("text-neutral-600")}>Total Disconnections:</p>
                    <p className={cn("text-neutral-900")}>3</p>
                  </div>
                  <div className={cn("flex justify-between text-sm")}>
                    <p className={cn("text-neutral-600")}>Avg Disconnect Duration:</p>
                    <p className={cn("text-neutral-900")}>50 sec</p>
                  </div>
                  <div className={cn("flex justify-between text-sm")}>
                    <p className={cn("text-neutral-600")}>Longest Disconnect:</p>
                    <p className={cn("text-neutral-900")}>2.1 min</p>
                  </div>
                </div>

                {/* Performance Issues */}
                <div className={cn("flex flex-col gap-2")}>
                  <p className={cn("text-sm text-neutral-600 mb-2")}>
                    Performance Issues
                  </p>
                  <div className={cn("flex justify-between text-sm")}>
                    <p className={cn("text-neutral-600")}>Speed Drops:</p>
                    <p className={cn("text-neutral-900")}>7</p>
                  </div>
                  <div className={cn("flex justify-between text-sm")}>
                    <p className={cn("text-neutral-600")}>{`Severe Drops (<50%):`}</p>
                    <p className={cn("text-neutral-900")}>2</p>
                  </div>
                  <div className={cn("flex justify-between text-sm")}>
                    <p className={cn("text-neutral-600")}>Recovery Time:</p>
                    <p className={cn("text-neutral-900")}>1.2 min</p>
                  </div>
                  <div className={cn("flex justify-between text-sm text-neutral-600")}>
                    <p>Stability Score:</p>
                    <p>8.7/10</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className={cn("bg-white border-t border-neutral-200 py-4 w-full flex-shrink-0")}>
        <div className={cn("flex justify-between items-center px-6")}>
          <p className={cn("text-sm text-neutral-600")}>
            Last updated: 2025-01-15 15:42:33
          </p>
          <div className={cn("flex items-center gap-2 text-sm text-neutral-600")}>
            <p>Monitoring since: 2025-01-01</p>
            <p>•</p>
            <p>Data points: 1,247,892</p>
          </div>
        </div>
      </div>
    </div>
  );
}
