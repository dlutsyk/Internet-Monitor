const API_BASE_URL = '/api';

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
 * Create WebSocket connection for real-time updates
 * @param {string} [wsPath='/ws'] - WebSocket path
 * @returns {WebSocket}
 */
export function createWebSocket(wsPath = '/ws') {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const url = `${protocol}://${window.location.host}${wsPath}`;
  return new WebSocket(url);
}
