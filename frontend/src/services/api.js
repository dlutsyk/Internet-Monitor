const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

class ApiError extends Error {
  constructor(message, status, response) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.response = response;
  }
}

async function handleResponse(response) {
  if (!response.ok) {
    const error = new ApiError(
      `API request failed: ${response.status} ${response.statusText}`,
      response.status,
      response
    );
    throw error;
  }
  return response.json();
}

/**
 * Get health status of the backend
 * @returns {Promise<{status: string, simulation: boolean, intervalMs: number}>}
 */
export async function getHealth() {
  const response = await fetch(`${API_BASE_URL}/health`);
  return handleResponse(response);
}

/**
 * Get backend configuration
 * @returns {Promise<{intervalMs: number, speedDropThresholdMbps: number, speedDropPercent: number, simulationMode: boolean, wsPath: string}>}
 */
export async function getConfig() {
  const response = await fetch(`${API_BASE_URL}/config`);
  return handleResponse(response);
}

/**
 * Get the latest metric measurement
 * @returns {Promise<{data: object | null}>}
 */
export async function getLatestMetric() {
  const response = await fetch(`${API_BASE_URL}/metrics/latest`);
  return handleResponse(response);
}

/**
 * Get recent metric measurements
 * @param {number} [limit=50] - Number of recent measurements to retrieve (1-500)
 * @returns {Promise<{items: Array}>}
 */
export async function getRecentMetrics(limit = 50) {
  const clampedLimit = Math.max(1, Math.min(500, limit));
  const response = await fetch(`${API_BASE_URL}/metrics/recent?limit=${clampedLimit}`);
  return handleResponse(response);
}

/**
 * Get today's metrics summary (disconnections, uptime, etc.)
 * @returns {Promise<{disconnectionEvents: number, offlineSamples: number, totalDowntimeMs: number, uptimePercent: number, date: string}>}
 */
export async function getTodayMetrics() {
  const response = await fetch(`${API_BASE_URL}/metrics/today`);
  return handleResponse(response);
}

/**
 * Get historical report for a date range
 * @param {string} [from] - ISO date string for range start
 * @param {string} [to] - ISO date string for range end
 * @returns {Promise<{summary: object, from: string | null, to: string | null, records: Array}>}
 */
export async function getReport(from, to) {
  const params = new URLSearchParams();
  if (from) {
    params.set('from', from);
  }
  if (to) {
    params.set('to', to);
  }
  const response = await fetch(`${API_BASE_URL}/reports?${params.toString()}`);
  return handleResponse(response);
}

/**
 * Trigger a manual speed test measurement
 * @returns {Promise<{data: object}>}
 */
export async function triggerMonitor() {
  const response = await fetch(`${API_BASE_URL}/monitor/trigger`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return handleResponse(response);
}

/**
 * Get recent connection events
 * @param {number} [limit=20] - Number of recent events to retrieve (1-100)
 * @returns {Promise<{events: Array, count: number}>}
 */
export async function getRecentEvents(limit = 20) {
  const clampedLimit = Math.max(1, Math.min(100, limit));
  const response = await fetch(`${API_BASE_URL}/events/recent?limit=${clampedLimit}`);
  return handleResponse(response);
}

/**
 * Get connection events within a date range
 * @param {string} [from] - ISO date string for range start
 * @param {string} [to] - ISO date string for range end
 * @returns {Promise<{events: Array, count: number, from: string | null, to: string | null}>}
 */
export async function getEvents(from, to) {
  const params = new URLSearchParams();
  if (from) {
    params.set('from', from);
  }
  if (to) {
    params.set('to', to);
  }
  const response = await fetch(`${API_BASE_URL}/events?${params.toString()}`);
  return handleResponse(response);
}

/**
 * Get detailed statistics for a date range
 * @param {string} [from] - ISO date string for range start
 * @param {string} [to] - ISO date string for range end
 * @returns {Promise<{period: {from: string, to: string}, summary: object, events: object, uptimePeriods: Array, dbStats: object}>}
 */
export async function getDetailedStatistics(from, to) {
  const params = new URLSearchParams();
  if (from) {
    params.set('from', from);
  }
  if (to) {
    params.set('to', to);
  }
  const response = await fetch(`${API_BASE_URL}/statistics/detailed?${params.toString()}`);
  return handleResponse(response);
}

/**
 * Create WebSocket connection for real-time updates
 * @param {string} [wsPath='/ws'] - WebSocket path
 * @returns {WebSocket}
 */
export function createWebSocket(wsPath = import.meta.env.VITE_WS_PATH || '/ws') {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const url = `${protocol}://${window.location.host}${wsPath}`;
  return new WebSocket(url);
}
