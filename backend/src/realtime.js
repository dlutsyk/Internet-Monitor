import { WebSocketServer } from 'ws';

const send = (ws, message) => {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(message));
  }
};

export default function setupRealtime(server, { storage, monitor, config, logger = console }) {
  const wss = new WebSocketServer({
    server,
    path: config.wsPath,
  });

  const heartbeat = (ws) => {
    ws.isAlive = true;
  };

  wss.on('connection', (ws) => {
    ws.isAlive = true;
    ws.on('pong', () => heartbeat(ws));

    // Handle incoming messages from clients
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === 'trigger-test') {
          // Send test started acknowledgment
          send(ws, {
            type: 'test-started',
            payload: { timestamp: new Date().toISOString() },
          });

          // Trigger speed test and get result
          try {
            const result = await monitor.triggerOnce();
            // Send test completed with full result
            send(ws, {
              type: 'test-completed',
              payload: result,
            });
          } catch (error) {
            send(ws, {
              type: 'test-error',
              payload: {
                message: error.message || 'Speed test failed',
                timestamp: new Date().toISOString(),
              },
            });
          }
        }
      } catch (error) {
        logger.error('[ws] failed to handle message', error);
      }
    });

    send(ws, {
      type: 'config',
      payload: {
        intervalMs: config.intervalMs,
        simulation: config.simulationMode,
      },
    });

    send(ws, {
      type: 'recent',
      payload: storage.getRecent(50),
    });
  });

  const broadcast = (message) => {
    for (const client of wss.clients) {
      if (client.readyState === client.OPEN) {
        client.send(JSON.stringify(message));
      }
    }
  };

  const monitorListener = (record) => {
    broadcast({ type: 'measurement', payload: record });
  };

  monitor.on('measurement', monitorListener);

  const interval = setInterval(() => {
    for (const ws of wss.clients) {
      if (!ws.isAlive) {
        ws.terminate();
        continue;
      }
      ws.isAlive = false;
      ws.ping();
    }
  }, 30_000);

  wss.on('close', () => {
    clearInterval(interval);
    monitor.off('measurement', monitorListener);
  });

  server.on('close', () => {
    clearInterval(interval);
    monitor.off('measurement', monitorListener);
    wss.close();
  });

  wss.on('error', (error) => {
    logger.error('[ws] error', error);
  });

  return wss;
}
