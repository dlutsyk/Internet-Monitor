import { cn } from '../utils/cn';

// Helper function to format event type for display
const formatEventType = (type) => {
  const typeMap = {
    'connection_lost': 'Connection lost',
    'connection_restored': 'Connection restored',
    'speed_degradation': 'Speed degradation',
    'speed_improved': 'Speed improved',
  };
  return typeMap[type] || type;
};

// Helper function to format event time
const formatEventTime = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  // If today, show only time
  if (isToday) {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  // If not today, show date and time
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

// Helper function to get event color
const getEventColor = (type) => {
  const colorMap = {
    'connection_lost': 'bg-red-500',
    'connection_restored': 'bg-green-500',
    'speed_degradation': 'bg-orange-500',
    'speed_improved': 'bg-blue-500',
  };
  return colorMap[type] || 'bg-neutral-500';
};

// Helper function to get event pulse color
const getEventPulseColor = (type) => {
  const colorMap = {
    'connection_lost': 'animate-pulse-red',
    'connection_restored': 'animate-pulse-green',
    'speed_degradation': 'animate-pulse-orange',
    'speed_improved': 'animate-pulse-blue',
  };
  return colorMap[type] || '';
};

export default function ConnectionEventsCard({ connectionEvents, eventsLoading, highlightedTimestamp = null, onHighlight = () => {} }) {
  // Check if an event is highlighted based on timestamp proximity (within 2 minutes)
  const isEventHighlighted = (eventTimestamp) => {
    if (!highlightedTimestamp) return false;

    const highlightTime = new Date(highlightedTimestamp).getTime();
    const eventTime = new Date(eventTimestamp).getTime();
    const TOLERANCE_MS = 2 * 60 * 1000; // 2 minutes tolerance

    return Math.abs(highlightTime - eventTime) <= TOLERANCE_MS;
  };
  return (
    <div className={cn("bg-white border border-neutral-200 rounded-lg p-6 transition-all duration-300")}>
      <div className={cn("flex justify-between items-center mb-4")}>
        <p className={cn("text-lg text-neutral-900 transition-colors duration-200")}>
          Connection Events
        </p>
        {connectionEvents.length > 0 && (
          <span className={cn("text-xs text-neutral-500 px-2 py-1 bg-neutral-100 rounded transition-all duration-200")}>
            {connectionEvents.length}
          </span>
        )}
      </div>
      <div className={cn("flex flex-col")}>
        {eventsLoading ? (
          <div className={cn("h-64 flex items-center justify-center")}>
            <div className={cn("flex flex-col items-center gap-3")}>
              <div className={cn("animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent")} />
              <p className={cn("text-sm text-neutral-500")}>Loading events...</p>
            </div>
          </div>
        ) : connectionEvents.length === 0 ? (
          <div className={cn("h-64 flex items-center justify-center text-neutral-500 transition-opacity duration-300")}>
            <p className={cn("text-sm")}>No events recorded yet</p>
          </div>
        ) : (
          <div className={cn("h-64 overflow-y-auto pr-2 -mr-2")}>
            {connectionEvents.slice().reverse().map((event, index) => {
              const isHighlighted = isEventHighlighted(event.timestamp);

              return (
                <div
                  key={event.id}
                  className={cn(`py-2 flex justify-between items-center transition-all duration-300 rounded px-2 -mx-2 animate-fadeIn cursor-pointer ${
                    index < connectionEvents.length - 1 ? 'border-b border-neutral-100' : ''
                  } ${
                    isHighlighted
                      ? 'bg-blue-50 shadow-sm scale-105'
                      : 'hover:bg-neutral-50'
                  }`)}
                  style={{ animationDelay: `${Math.min(index * 50, 500)}ms` }}
                  onMouseEnter={() => onHighlight(event.timestamp)}
                  onMouseLeave={() => onHighlight(null)}
                >
                <div className={cn("flex items-center gap-3")}>
                  <div className={cn(`${getEventColor(event.type)} rounded-full h-2 w-2 transition-transform duration-200 ${
                    index === 0 ? 'animate-ping' : ''
                  }`)} />
                  <p className={cn("text-sm text-neutral-900 transition-colors duration-200")}>
                    {formatEventType(event.type)}
                  </p>
                </div>
                <p className={cn("text-sm text-neutral-500 transition-opacity duration-200")}>
                  {formatEventTime(event.timestamp)}
                </p>
              </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
