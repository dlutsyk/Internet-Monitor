import { render } from '@testing-library/react';

/**
 * Custom render function that wraps components with necessary providers
 */
export function renderWithProviders(ui, options = {}) {
  return render(ui, { ...options });
}

/**
 * Create mock events for testing
 */
export function createMockEvents(count = 5, startDate = new Date()) {
  const events = [];
  const types = ['speed_degradation', 'speed_improved', 'connection_lost', 'connection_restored'];

  for (let i = 0; i < count; i++) {
    const timestamp = new Date(startDate.getTime() - i * 10 * 60 * 1000); // 10 minutes apart
    events.push({
      id: `evt_${Date.now() - i}_${types[i % types.length]}`,
      type: types[i % types.length],
      timestamp: timestamp.toISOString(),
      metadata: {
        previousMbps: 100 + i * 10,
        currentMbps: 90 + i * 10,
        dropMbps: 10,
        dropPercent: 10,
      },
      createdAt: 0,
    });
  }

  return events;
}

// Re-export everything from @testing-library/react
export * from '@testing-library/react';
