import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, parseISO, differenceInHours } from 'date-fns';
import { cn } from '../utils/cn';

export default function SpeedChart({ data = [] }) {
  // Determine the time format based on data range
  const timeFormat = useMemo(() => {
    if (!data || data.length < 2) {
      return 'HH:mm';
    }

    const firstTimestamp = new Date(data[0].timestamp);
    const lastTimestamp = new Date(data[data.length - 1].timestamp);
    const hoursDiff = differenceInHours(lastTimestamp, firstTimestamp);

    // If more than 48 hours, show date and time
    if (hoursDiff > 48) {
      return 'MMM dd HH:mm';
    }
    // If more than 24 hours, show short date and time
    if (hoursDiff > 24) {
      return 'dd HH:mm';
    }
    // Otherwise just show time
    return 'HH:mm';
  }, [data]);

  // Transform the data for the chart
  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      return [];
    }

    // Max realistic speeds to filter out outliers/errors
    const MAX_REALISTIC_DOWNLOAD = 1000; // 1 Gbps
    const MAX_REALISTIC_UPLOAD = 500; // 500 Mbps

    // Filter out invalid speeds and unrealistic values, but keep offline entries
    return data
      .filter(item => {
        // Always include offline measurements (they'll show as 0)
        if (item.status === 'offline') return true;

        // For online measurements, filter out unrealistic values
        if (item.status === 'online') {
          const download = item.downloadMbps || 0;
          const upload = item.uploadMbps || 0;
          // Filter out unrealistic values that would skew the chart
          return download <= MAX_REALISTIC_DOWNLOAD && upload <= MAX_REALISTIC_UPLOAD;
        }

        return false;
      })
      .map(item => ({
        timestamp: item.timestamp,
        time: format(parseISO(item.timestamp), timeFormat),
        // Show 0 for offline, otherwise use actual values
        download: item.status === 'offline' ? 0 : (item.downloadMbps || 0),
        upload: item.status === 'offline' ? 0 : (item.uploadMbps || 0),
      }));
  }, [data, timeFormat]);

  // Calculate max value for Y-axis domain
  const maxSpeed = useMemo(() => {
    if (chartData.length === 0) return 100;
    const max = Math.max(
      ...chartData.map(d => Math.max(d.download, d.upload))
    );
    // Round up to nearest 10
    return Math.ceil(max / 10) * 10;
  }, [chartData]);

  // Calculate tick interval based on data length
  const tickInterval = useMemo(() => {
    const length = chartData.length;
    if (length <= 20) return 0; // Show all ticks
    if (length <= 50) return Math.floor(length / 10);
    if (length <= 100) return Math.floor(length / 8);
    return Math.floor(length / 6);
  }, [chartData.length]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const timestamp = payload[0]?.payload?.timestamp;
      const formattedTime = timestamp
        ? format(parseISO(timestamp), 'MMM dd, yyyy HH:mm:ss')
        : '';

      return (
        <div className={cn("bg-white border border-neutral-200 rounded-lg p-3 shadow-lg")}>
          <p className={cn("text-xs text-neutral-600 mb-2")}>{formattedTime}</p>
          {payload.map((entry, index) => (
            <div key={index} className={cn("flex items-center gap-2 text-sm")}>
              <div
                className={cn("w-3 h-3 rounded")}
                style={{ backgroundColor: entry.color }}
              />
              <span className={cn("text-neutral-600")}>{entry.name}:</span>
              <span className={cn("text-neutral-900 font-medium")}>
                {entry.value.toFixed(2)} Mbps
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <div className={cn("bg-neutral-50 h-64 rounded flex items-center justify-center")}>
        <p className={cn("text-base text-neutral-500")}>No data available</p>
      </div>
    );
  }

  return (
    <div className={cn("transition-all duration-300")}>
      <ResponsiveContainer width="100%" height={256}>
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className={cn("transition-opacity duration-300")} />
          <XAxis
            dataKey="time"
            stroke="#6b7280"
            style={{ fontSize: '11px' }}
            interval={tickInterval}
            angle={chartData.length > 50 ? -45 : 0}
            textAnchor={chartData.length > 50 ? 'end' : 'middle'}
            height={chartData.length > 50 ? 60 : 30}
          />
          <YAxis
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
            domain={[0, maxSpeed]}
            label={{
              value: 'Speed (Mbps)',
              angle: -90,
              position: 'insideLeft',
              style: { fontSize: '12px', fill: '#6b7280' }
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '12px' }}
            iconType="line"
          />
          <Line
            type="monotone"
            dataKey="download"
            stroke="#3b82f6"
            strokeWidth={2}
            name="Download"
            dot={false}
            activeDot={{ r: 4 }}
            animationDuration={800}
            animationEasing="ease-in-out"
          />
          <Line
            type="monotone"
            dataKey="upload"
            stroke="#10b981"
            strokeWidth={2}
            name="Upload"
            dot={false}
            activeDot={{ r: 4 }}
            animationDuration={800}
            animationEasing="ease-in-out"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
