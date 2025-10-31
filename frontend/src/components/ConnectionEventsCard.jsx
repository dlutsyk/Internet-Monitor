import { cn } from '../utils/cn';

// Helper function to format event type for display
const formatEventType = (type) => {
  const typeMap = {
    'connection-lost': 'Connection lost',
    'connection-restored': 'Connection restored',
    'speed-degradation': 'Speed degradation',
    'speed-improved': 'Speed improved',
  };
  return typeMap[type] || type;
};

// Helper function to format event time
const formatEventTime = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
};

// Helper function to get event color
const getEventColor = (type) => {
  const colorMap = {
    'connection-lost': 'bg-red-500',
    'connection-restored': 'bg-green-500',
    'speed-degradation': 'bg-orange-500',
    'speed-improved': 'bg-blue-500',
  };
  return colorMap[type] || 'bg-neutral-500';
};

// Helper function to get event pulse color
const getEventPulseColor = (type) => {
  const colorMap = {
    'connection-lost': 'animate-pulse-red',
    'connection-restored': 'animate-pulse-green',
    'speed-degradation': 'animate-pulse-orange',
    'speed-improved': 'animate-pulse-blue',
  };
  return colorMap[type] || '';
};

export default function ConnectionEventsCard({ connectionEvents, eventsLoading }) {
  return (
    <div className={cn("bg-white border border-neutral-200 rounded-lg p-6 transition-all duration-300")}>
      <div className={cn("flex justify-between items-center mb-6")}>
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
          <div className={cn("py-8 text-center")}>
            <div className={cn("animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent mx-auto mb-2")} />
            <p className={cn("text-sm text-neutral-500")}>Loading events...</p>
          </div>
        ) : connectionEvents.length === 0 ? (
          <div className={cn("py-8 text-center text-neutral-500 transition-opacity duration-300")}>
            <p className={cn("text-sm")}>No events recorded yet</p>
          </div>
        ) : (
          connectionEvents.slice(0, 4).map((event, index) => (
            <div
              key={event.id}
              className={cn(`py-2 flex justify-between items-center transition-all duration-300 hover:bg-neutral-50 rounded px-2 -mx-2 animate-fadeIn ${
                index < connectionEvents.slice(0, 4).length - 1 ? 'border-b border-neutral-100' : ''
              }`)}
              style={{ animationDelay: `${index * 50}ms` }}
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
          ))
        )}
      </div>
    </div>
  );
}
