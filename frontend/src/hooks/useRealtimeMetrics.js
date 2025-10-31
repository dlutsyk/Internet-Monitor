import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { getConfig, getRecentMetrics, getTodayMetrics, createWebSocket } from '../services/api.js';

const DEFAULT_WS_PATH = import.meta.env.VITE_WS_PATH || '/ws';
const MAX_RECENT = parseInt(import.meta.env.VITE_MAX_RECENT_MEASUREMENTS || '200', 10);
const INITIAL_RECONNECT_DELAY = parseInt(import.meta.env.VITE_WS_INITIAL_RECONNECT_DELAY || '3000', 10);
const MAX_RECONNECT_DELAY = parseInt(import.meta.env.VITE_WS_MAX_RECONNECT_DELAY || '30000', 10);

const sortByTimestamp = (records) =>
  [...records].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

export default function useRealtimeMetrics() {
  const [config, setConfig] = useState(null);
  const [recent, setRecent] = useState([]);
  const [latest, setLatest] = useState(null);
  const [connectionState, setConnectionState] = useState('idle');
  const [error, setError] = useState(null);
  const [todayStats, setTodayStats] = useState(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const reconnectRef = useRef(null);
  const wsRef = useRef(null);
  const messageHandlersRef = useRef(new Set());
  const reconnectDelayRef = useRef(INITIAL_RECONNECT_DELAY);

  useEffect(() => {
    let cancelled = false;
    const loadConfig = async () => {
      try {
        const data = await getConfig();
        if (!cancelled) {
          setConfig(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err);
          setConfig({ wsPath: DEFAULT_WS_PATH });
        }
      }
    };

    const loadRecent = async () => {
      try {
        const data = await getRecentMetrics(100);
        if (!cancelled && Array.isArray(data.items)) {
          const ordered = sortByTimestamp(data.items);
          setRecent(ordered);
          const last = ordered.slice(-1)[0] ?? null;
          setLatest(last);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err);
        }
      }
    };

    loadConfig();
    loadRecent();

    return () => {
      cancelled = true;
    };
  }, []);

  // Today's stats will be received via WebSocket, no HTTP polling needed

  // Helper to reload data after reconnection
  // Data will be sent automatically by the server on WebSocket connection
  const reloadData = () => {
    // No need to manually reload - server sends initial data on connection
    console.log('[useRealtimeMetrics] Waiting for server to send initial data...');
  };

  useEffect(() => {
    if (!config || typeof window === 'undefined') {
      return undefined;
    }

    let ws;
    let closed = false;

    const connect = () => {
      if (closed) {
        return;
      }

      setConnectionState('connecting');
      setError(null);

      const path = config.wsPath ?? DEFAULT_WS_PATH;
      console.log('[useRealtimeMetrics] Attempting WebSocket connection to path:', path);
      ws = createWebSocket(path);
      wsRef.current = ws;
      console.log('[useRealtimeMetrics] WebSocket created:', ws.url);

      ws.onopen = () => {
        console.log('[useRealtimeMetrics] WebSocket connected successfully');
        setConnectionState('open');
        // Reset reconnection state on successful connection
        setReconnectAttempts(0);
        reconnectDelayRef.current = INITIAL_RECONNECT_DELAY;
        // Reload data after reconnection
        reloadData();
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (!message?.type) {
            return;
          }

          // Notify custom message handlers
          messageHandlersRef.current.forEach((handler) => {
            try {
              handler(message);
            } catch (handlerError) {
              console.error('[useRealtimeMetrics] handler error', handlerError);
            }
          });

          if (message.type === 'recent' && Array.isArray(message.payload)) {
            const ordered = sortByTimestamp(message.payload).slice(-MAX_RECENT);
            setRecent(ordered);
            const last = ordered.slice(-1)[0] ?? null;
            setLatest(last);
          }

          if (message.type === 'measurement' && message.payload) {
            setRecent((prev) => {
              const map = new Map(prev.map((item) => [item.timestamp, item]));
              map.set(message.payload.timestamp, message.payload);
              const ordered = sortByTimestamp(map.values()).slice(-MAX_RECENT);
              return ordered;
            });
            // Update latest measurement separately to avoid state update conflicts
            setLatest(message.payload);
          }

          if (message.type === 'today-stats' && message.payload) {
            setTodayStats(message.payload);
          }
        } catch (err) {
          setError(err);
        }
      };

      ws.onerror = (event) => {
        console.error('[useRealtimeMetrics] WebSocket error:', event);
        setConnectionState('error');
        setError(new Error('Сталася помилка WebSocket'));
      };

      ws.onclose = (event) => {
        console.log('[useRealtimeMetrics] WebSocket closed:', { code: event.code, reason: event.reason, wasClean: event.wasClean });
        setConnectionState('closed');
        wsRef.current = null;
        if (!closed) {
          // Increment reconnection attempts
          setReconnectAttempts((prev) => prev + 1);

          // Calculate delay with exponential backoff
          const delay = Math.min(reconnectDelayRef.current, MAX_RECONNECT_DELAY);
          reconnectDelayRef.current = Math.min(delay * 2, MAX_RECONNECT_DELAY);

          console.log(`[useRealtimeMetrics] WebSocket closed. Reconnecting in ${delay}ms...`);
          reconnectRef.current = setTimeout(connect, delay);
        }
      };
    };

    connect();

    return () => {
      closed = true;
      if (reconnectRef.current) {
        clearTimeout(reconnectRef.current);
      }
      ws?.close();
      wsRef.current = null;
    };
  }, [config]);

  // Helper function to send WebSocket messages
  const sendMessage = useCallback((message) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []); // Empty deps - uses ref which is stable

  // Helper function to subscribe to WebSocket messages
  const subscribeToMessages = useCallback((handler) => {
    messageHandlersRef.current.add(handler);
    return () => {
      messageHandlersRef.current.delete(handler);
    };
  }, []); // Empty deps - uses ref which is stable

  const stats = useMemo(() => {
    if (!recent.length) {
      return null;
    }
    const online = recent.filter((item) => item.status === 'online' && item.downloadMbps != null && item.downloadMbps > 0);
    const avgDownload =
      online.length > 0
        ? online.reduce((acc, item) => acc + item.downloadMbps, 0) / online.length
        : 0;
    return {
      avgDownload,
      offlineCount: recent.filter((item) => item.status === 'offline').length,
    };
  }, [recent]);

  // Manual reconnect function
  const reconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    // Reset reconnection state
    setReconnectAttempts(0);
    reconnectDelayRef.current = INITIAL_RECONNECT_DELAY;
  };

  return {
    config,
    recent,
    latest,
    connectionState,
    error,
    stats,
    todayStats,
    reconnectAttempts,
    sendMessage,
    subscribeToMessages,
    reconnect,
  };
}
