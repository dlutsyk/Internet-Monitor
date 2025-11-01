import { WebSocketServer as WSServer } from 'ws';
import * as db from './db.js';
import * as analytics from './analytics.js';

let wss = null;
let logger = console;
let config = null;

/**
 * Initialize WebSocket server
 */
export function initWebSocket(httpServer, monitorEvents, cfg, log = console) {
  config = cfg;
  logger = log;

  wss = new WSServer({
    server: httpServer,
    path: cfg.wsPath || '/ws',
  });

  setupEventListeners(monitorEvents);
  setupConnectionHandler();
  setupHeartbeat();

  logger.info('[websocket] WebSocket server initialized');
}

/**
 * Broadcast message to all connected clients
 */
function broadcast(message) {
  if (!wss) return;

  const data = JSON.stringify(message);
  let sentCount = 0;

  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      // OPEN
      try {
        client.send(data);
        sentCount++;
      } catch (error) {
        logger.error('[websocket] failed to send to client:', error);
      }
    }
  });

  if (sentCount > 0) {
    logger.debug(`[websocket] broadcast ${message.type} to ${sentCount} clients`);
  }
}

/**
 * Compute today's stats for broadcasting
 */
async function computeTodayStats() {
  const { from, to } = analytics.getTodayDateRange();
  const measurements = await db.getMeasurementsByDateRange(from, to);

  // Parse JSON fields
  const parsed = measurements.map((m) => ({
    ...m,
    error: m.error ? JSON.parse(m.error) : null,
    meta: m.meta ? JSON.parse(m.meta) : null,
    server: m.server ? JSON.parse(m.server) : null,
    client: m.client ? JSON.parse(m.client) : null,
  }));

  const summary = analytics.computeSummary(parsed, config);

  return {
    from,
    to,
    summary,
  };
}

/**
 * Compute detailed stats for a given time period
 */
async function computeDetailedStats(hours) {
  const now = new Date();
  const from = new Date(now.getTime() - hours * 60 * 60 * 1000);
  const to = now;

  // Get measurements for the period
  const measurements = await db.getMeasurementsByDateRange(from.toISOString(), to.toISOString());

  // Parse JSON fields
  const parsed = measurements.map((m) => ({
    ...m,
    error: m.error ? JSON.parse(m.error) : null,
    meta: m.meta ? JSON.parse(m.meta) : null,
    server: m.server ? JSON.parse(m.server) : null,
    client: m.client ? JSON.parse(m.client) : null,
  }));

  // Compute summary
  const summary = analytics.computeSummary(parsed, config);

  // Get events for the period
  const events = await db.getEventsByDateRange(from.toISOString(), to.toISOString());

  // Group events by type
  const eventsByType = events.reduce((acc, event) => {
    if (!acc[event.type]) {
      acc[event.type] = [];
    }
    acc[event.type].push(event);
    return acc;
  }, {});

  // Get database stats
  const dbStats = await db.getDatabaseStats();

  return {
    period: {
      hours,
      from: from.toISOString(),
      to: to.toISOString(),
    },
    summary,
    events: eventsByType,
    dbStats,
  };
}

/**
 * Setup event listeners for monitor events
 */
function setupEventListeners(monitorEvents) {
  // Listen to measurements
  monitorEvents.on('measurement', async (measurement) => {
    logger.info('[websocket] broadcasting measurement:', {
      status: measurement.status,
      timestamp: measurement.timestamp,
    });

    broadcast({ type: 'measurement', payload: measurement });

    // Broadcast updated today stats
    try {
      const todayStats = await computeTodayStats();
      broadcast({ type: 'today-stats', payload: todayStats });
    } catch (error) {
      logger.error('[websocket] failed to broadcast today stats:', error);
    }
  });

  // Listen to events
  monitorEvents.on('event', (event) => {
    broadcast({ type: 'event', payload: event });
  });
}

/**
 * Setup connection handler
 */
function setupConnectionHandler() {
  wss.on('connection', async (ws, req) => {
    const clientIp = req.socket.remoteAddress;
    const clientCount = wss.clients.size;
    logger.info(`[websocket] client connected from ${clientIp}, total: ${clientCount}`);

    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    // Handle disconnection
    ws.on('close', (code, reason) => {
      const remaining = wss.clients.size;
      logger.info(
        `[websocket] client disconnected from ${clientIp}, code: ${code}, remaining: ${remaining}`
      );
    });

    // Handle errors
    ws.on('error', (error) => {
      logger.error(`[websocket] client error from ${clientIp}:`, error.message);
    });

    // Handle incoming messages
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        await handleClientMessage(ws, clientIp, message);
      } catch (error) {
        logger.error(`[websocket] failed to handle message from ${clientIp}:`, error);
      }
    });

    // Send initial data
    try {
      // Send recent measurements
      const recentMeasurements = await db.getRecentMeasurements(100);
      const parsedRecent = recentMeasurements.map((m) => ({
        ...m,
        error: m.error ? JSON.parse(m.error) : null,
        meta: m.meta ? JSON.parse(m.meta) : null,
        server: m.server ? JSON.parse(m.server) : null,
        client: m.client ? JSON.parse(m.client) : null,
      }));
      ws.send(JSON.stringify({ type: 'recent', payload: parsedRecent }));

      // Send latest measurement
      const latest = await db.getLatestMeasurement();
      if (latest) {
        ws.send(
          JSON.stringify({
            type: 'measurement',
            payload: {
              ...latest,
              error: latest.error ? JSON.parse(latest.error) : null,
              meta: latest.meta ? JSON.parse(latest.meta) : null,
              server: latest.server ? JSON.parse(latest.server) : null,
              client: latest.client ? JSON.parse(latest.client) : null,
            },
          })
        );
      }

      const todayStats = await computeTodayStats();
      ws.send(JSON.stringify({ type: 'today-stats', payload: todayStats }));

      // Send initial detailed stats (24h)
      const detailedStats = await computeDetailedStats(24);
      ws.send(JSON.stringify({ type: 'detailed-stats', payload: detailedStats }));
    } catch (error) {
      logger.error('[websocket] failed to send initial data:', error);
    }
  });
}

/**
 * Handle client messages
 */
async function handleClientMessage(ws, clientIp, message) {
  logger.info(`[websocket] received message from ${clientIp}:`, message);

  const { type } = message;

  switch (type) {
    case 'ping':
      ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      break;

    case 'get-latest':
      try {
        const latest = await db.getLatestMeasurement();
        if (latest) {
          ws.send(
            JSON.stringify({
              type: 'measurement',
              payload: {
                ...latest,
                error: latest.error ? JSON.parse(latest.error) : null,
                meta: latest.meta ? JSON.parse(latest.meta) : null,
                server: latest.server ? JSON.parse(latest.server) : null,
                client: latest.client ? JSON.parse(latest.client) : null,
              },
            })
          );
        }
      } catch (error) {
        logger.error('[websocket] failed to get latest measurement:', error);
      }
      break;

    case 'get-recent':
      try {
        const recentMeasurements = await db.getRecentMeasurements(100);
        const parsedRecent = recentMeasurements.map((m) => ({
          ...m,
          error: m.error ? JSON.parse(m.error) : null,
          meta: m.meta ? JSON.parse(m.meta) : null,
          server: m.server ? JSON.parse(m.server) : null,
          client: m.client ? JSON.parse(m.client) : null,
        }));
        ws.send(JSON.stringify({ type: 'recent', payload: parsedRecent }));
      } catch (error) {
        logger.error('[websocket] failed to get recent measurements:', error);
      }
      break;

    case 'get-today-stats':
      try {
        const todayStats = await computeTodayStats();
        ws.send(JSON.stringify({ type: 'today-stats', payload: todayStats }));
      } catch (error) {
        logger.error('[websocket] failed to get today stats:', error);
      }
      break;

    case 'request-detailed-stats':
      try {
        const hours = message.payload?.hours || 24;
        const detailedStats = await computeDetailedStats(hours);
        ws.send(JSON.stringify({ type: 'detailed-stats', payload: detailedStats }));
      } catch (error) {
        logger.error('[websocket] failed to get detailed stats:', error);
      }
      break;

    default:
      logger.warn(`[websocket] unknown message type: ${type}`);
  }
}

/**
 * Setup heartbeat to detect dead connections
 */
function setupHeartbeat() {
  const interval = setInterval(() => {
    if (!wss) {
      clearInterval(interval);
      return;
    }

    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        logger.info('[websocket] terminating dead connection');
        return ws.terminate();
      }

      ws.isAlive = false;
      ws.ping();
    });
  }, 30000); // 30 seconds
}

/**
 * Close WebSocket server
 */
export function closeWebSocket() {
  if (wss) {
    wss.close(() => {
      logger.info('[websocket] WebSocket server closed');
    });
    wss = null;
  }
}
