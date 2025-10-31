import { useState, useEffect } from 'react';
import { getRecentEvents } from '../services/api.js';

/**
 * Hook for managing connection events
 * @param {Function} subscribeToMessages - Function from useRealtimeMetrics to subscribe to WebSocket messages
 * @param {number} limit - Maximum number of events to keep
 */
export default function useConnectionEvents(subscribeToMessages, limit = 20) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load initial events from API
  useEffect(() => {
    let cancelled = false;

    const loadEvents = async () => {
      try {
        setLoading(true);
        const data = await getRecentEvents(limit);
        if (!cancelled && Array.isArray(data.events)) {
          setEvents(data.events);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load connection events:', err);
          setError(err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadEvents();

    return () => {
      cancelled = true;
    };
  }, [limit]);

  // Subscribe to real-time event updates via WebSocket
  useEffect(() => {
    if (!subscribeToMessages) {
      return undefined;
    }

    const handleMessage = (message) => {
      // Handle initial events list
      if (message.type === 'events' && Array.isArray(message.payload)) {
        setEvents(message.payload);
        setLoading(false);
      }

      // Handle individual event updates
      if (message.type === 'event' && message.payload) {
        setEvents((prev) => {
          // Add new event at the beginning (most recent first)
          const updated = [message.payload, ...prev];
          // Keep only the most recent events
          return updated.slice(0, limit);
        });
      }
    };

    const unsubscribe = subscribeToMessages(handleMessage);

    return () => {
      unsubscribe();
    };
  }, [subscribeToMessages, limit]);

  return {
    events,
    loading,
    error,
  };
}
