import { useEffect, useMemo, useRef, useState } from 'react';
import { getConfig, getRecentMetrics, createWebSocket } from '../services/api.js';

const DEFAULT_WS_PATH = '/ws';
const MAX_RECENT = 200;

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
  const reconnectRef = useRef(null);
  const wsRef = useRef(null);
  const messageHandlersRef = useRef(new Set());

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
      ws = createWebSocket(path);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionState('open');
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
              setLatest(ordered.slice(-1)[0] ?? null);
              return ordered;
            });
          }
        } catch (err) {
          setError(err);
        }
      };

      ws.onerror = () => {
        setConnectionState('error');
        setError(new Error('Сталася помилка WebSocket'));
      };

      ws.onclose = () => {
        setConnectionState('closed');
        wsRef.current = null;
        if (!closed) {
          reconnectRef.current = setTimeout(connect, 3_000);
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
  const sendMessage = (message) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  };

  // Helper function to subscribe to WebSocket messages
  const subscribeToMessages = (handler) => {
    messageHandlersRef.current.add(handler);
    return () => {
      messageHandlersRef.current.delete(handler);
    };
  };

  const stats = useMemo(() => {
    if (!recent.length) {
      return null;
    }
    const online = recent.filter((item) => item.status === 'online');
    const avgDownload =
      online.length > 0
        ? online.reduce((acc, item) => acc + (item.downloadMbps ?? 0), 0) / online.length
        : 0;
    return {
      avgDownload,
      offlineCount: recent.length - online.length,
    };
  }, [recent]);

  return {
    config,
    recent,
    latest,
    connectionState,
    error,
    stats,
    sendMessage,
    subscribeToMessages,
  };
}
