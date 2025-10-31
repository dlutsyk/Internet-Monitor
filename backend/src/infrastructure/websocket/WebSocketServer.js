import { WebSocketServer as WSServer } from 'ws';

/**
 * WebSocket Server
 * Handles real-time communication with clients
 *
 * Design Patterns Applied:
 * - Observer Pattern: Listens to service events and broadcasts
 * - Facade Pattern: Simplifies WebSocket operations
 *
 * SOLID Principles:
 * - SRP: Only responsible for WebSocket communication
 * - DIP: Depends on service abstractions
 *
 * GRASP Principles:
 * - Low Coupling: Depends on services through events
 * - High Cohesion: All methods related to WebSocket communication
 */
export default class WebSocketServer {
  constructor(httpServer, services, config, logger = console) {
    this.services = services;
    this.config = config;
    this.logger = logger;

    // Create WebSocket server
    this.wss = new WSServer({
      server: httpServer,
      path: config.wsPath,
    });

    this.setupEventListeners();
    this.setupConnectionHandler();
    this.setupHeartbeat();
  }

  /**
   * Sets up service event listeners
   */
  setupEventListeners() {
    const { monitorService, eventTrackerService } = this.services;

    // Listen to measurements
    monitorService.on('measurement', async (measurement) => {
      this.logger.info('[WebSocketServer] broadcasting measurement:', {
        status: measurement.status,
        timestamp: measurement.timestamp,
      });

      this.broadcast({ type: 'measurement', payload: measurement.toJSON() });

      // Broadcast updated today stats
      try {
        const todayStats = await this.computeTodayStats();
        this.broadcast({ type: 'today-stats', payload: todayStats });
      } catch (error) {
        this.logger.error('[WebSocketServer] failed to broadcast today stats:', error);
      }
    });

    // Listen to events
    eventTrackerService.on('event', (event) => {
      this.broadcast({ type: 'event', payload: event.toJSON() });
    });
  }

  /**
   * Sets up WebSocket connection handler
   */
  setupConnectionHandler() {
    this.wss.on('connection', async (ws, req) => {
      const clientIp = req.socket.remoteAddress;
      const clientCount = this.wss.clients.size;
      this.logger.info(`[WebSocketServer] client connected from ${clientIp}, total: ${clientCount}`);

      ws.isAlive = true;
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      // Handle disconnection
      ws.on('close', (code, reason) => {
        const remaining = this.wss.clients.size;
        this.logger.info(
          `[WebSocketServer] client disconnected from ${clientIp}, code: ${code}, remaining: ${remaining}`
        );
      });

      // Handle errors
      ws.on('error', (error) => {
        this.logger.error(`[WebSocketServer] client error from ${clientIp}:`, error.message);
      });

      // Handle incoming messages
      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          await this.handleClientMessage(ws, clientIp, message);
        } catch (error) {
          this.logger.error(`[WebSocketServer] failed to handle message from ${clientIp}:`, error);
        }
      });

      // Send initial data to client
      await this.sendInitialData(ws, clientIp);
    });
  }

  /**
   * Handles incoming client messages
   */
  async handleClientMessage(ws, clientIp, message) {
    const { monitorService, analyticsService, eventTrackerService, database } = this.services;

    this.logger.debug(`[WebSocketServer] received message from ${clientIp}:`, message.type);

    switch (message.type) {
      case 'trigger-test':
        this.logger.info(`[WebSocketServer] client ${clientIp} triggered manual speed test`);
        this.send(ws, {
          type: 'test-started',
          payload: { timestamp: new Date().toISOString() },
        });

        try {
          const result = await monitorService.triggerMeasurement();
          this.logger.info(`[WebSocketServer] speed test completed for ${clientIp}`);
          this.send(ws, {
            type: 'test-completed',
            payload: result ? result.toJSON() : null,
          });
        } catch (error) {
          this.logger.error(`[WebSocketServer] speed test failed for ${clientIp}:`, error.message);
          this.send(ws, {
            type: 'test-error',
            payload: {
              message: error.message || 'Speed test failed',
              timestamp: new Date().toISOString(),
            },
          });
        }
        break;

      case 'request-detailed-stats':
        const timeRangeHours = message.payload?.hours || 24;
        this.logger.info(
          `[WebSocketServer] client ${clientIp} requested detailed stats for ${timeRangeHours}h`
        );

        try {
          const detailedStats = await this.computeDetailedStats(timeRangeHours);
          this.send(ws, {
            type: 'detailed-stats',
            payload: detailedStats,
          });
        } catch (error) {
          this.logger.error(`[WebSocketServer] failed to send detailed stats to ${clientIp}:`, error);
          this.send(ws, {
            type: 'error',
            payload: {
              message: 'Failed to fetch detailed stats',
              timestamp: new Date().toISOString(),
            },
          });
        }
        break;
    }
  }

  /**
   * Sends initial data to newly connected client
   */
  async sendInitialData(ws, clientIp) {
    const { monitorService, eventTrackerService } = this.services;

    try {
      // Send config
      this.send(ws, {
        type: 'config',
        payload: {
          intervalMs: this.config.intervalMs,
          simulation: this.config.simulationMode,
        },
      });

      // Send recent measurements
      const measurements = await monitorService.getRecentMeasurements(50);
      this.send(ws, {
        type: 'recent',
        payload: measurements.map((m) => m.toJSON()),
      });

      // Send recent events
      const events = await eventTrackerService.getRecentEvents(20);
      this.send(ws, {
        type: 'events',
        payload: events.map((e) => e.toJSON()),
      });

      // Send today's stats
      const todayStats = await this.computeTodayStats();
      this.send(ws, {
        type: 'today-stats',
        payload: todayStats,
      });

      // Send detailed stats
      const detailedStats = await this.computeDetailedStats(24);
      this.send(ws, {
        type: 'detailed-stats',
        payload: detailedStats,
      });

      this.logger.info(`[WebSocketServer] client ${clientIp} fully initialized`);
    } catch (error) {
      this.logger.error(`[WebSocketServer] failed to send initial data to ${clientIp}:`, error);
    }
  }

  /**
   * Computes today's statistics
   */
  async computeTodayStats() {
    const { monitorService, analyticsService } = this.services;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    const measurements = await monitorService.getMeasurementsByDateRange(
      startOfToday.toISOString(),
      now.toISOString()
    );

    const summary = analyticsService.computeSummary(measurements);

    return {
      disconnectionEvents: summary.downtime.events,
      offlineSamples: summary.offlineSamples,
      totalDowntimeMs: summary.downtime.durationMs,
      uptimePercent: summary.uptimePercent,
      date: startOfToday.toISOString(),
    };
  }

  /**
   * Computes detailed statistics for a time range
   */
  async computeDetailedStats(timeRangeHours = 24) {
    const { monitorService, eventTrackerService, analyticsService, database } = this.services;

    const now = new Date();
    const from = new Date(now.getTime() - timeRangeHours * 60 * 60 * 1000);

    const measurements = await monitorService.getMeasurementsByDateRange(
      from.toISOString(),
      now.toISOString()
    );

    const summary = analyticsService.computeSummary(measurements);

    const events = await eventTrackerService.getEventsByDateRange(from, now);
    const eventsByType = eventTrackerService.groupEventsByType(events);

    return {
      period: {
        from: from.toISOString(),
        to: now.toISOString(),
        hours: timeRangeHours,
      },
      summary,
      events: Object.keys(eventsByType).reduce((acc, type) => {
        acc[type] = eventsByType[type].map((e) => e.toJSON());
        return acc;
      }, {}),
      dbStats: database.getStats(),
    };
  }

  /**
   * Sends a message to a specific client
   */
  send(ws, message) {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Broadcasts a message to all connected clients
   */
  broadcast(message) {
    const clientCount = this.wss.clients.size;
    this.logger.debug(`[WebSocketServer] broadcasting to ${clientCount} clients`);

    for (const client of this.wss.clients) {
      if (client.readyState === client.OPEN) {
        client.send(JSON.stringify(message));
      }
    }
  }

  /**
   * Sets up heartbeat mechanism to detect dead connections
   */
  setupHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      const clientCount = this.wss.clients.size;
      this.logger.debug(`[WebSocketServer] heartbeat check for ${clientCount} clients`);

      let terminatedCount = 0;
      for (const ws of this.wss.clients) {
        if (!ws.isAlive) {
          this.logger.warn('[WebSocketServer] terminating unresponsive client');
          ws.terminate();
          terminatedCount++;
          continue;
        }
        ws.isAlive = false;
        ws.ping();
      }

      if (terminatedCount > 0) {
        this.logger.info(
          `[WebSocketServer] terminated ${terminatedCount} unresponsive client(s), remaining: ${this.wss.clients.size}`
        );
      }
    }, 30_000);
  }

  /**
   * Closes the WebSocket server
   */
  close() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.wss.close();
    this.logger.info('[WebSocketServer] closed');
  }
}
