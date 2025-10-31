import { cn } from '../utils/cn';

// Signal strength icon component with dynamic filling
export default function SignalIcon({ level, status }) {
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
