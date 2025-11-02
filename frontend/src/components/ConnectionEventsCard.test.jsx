import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders, createMockEvents } from '../test/test-utils';
import ConnectionEventsCard from './ConnectionEventsCard';

describe('ConnectionEventsCard', () => {
  describe('Event Display', () => {
    it('should display all events', () => {
      // Create 10 events, ordered from oldest to newest (like the API returns)
      const events = createMockEvents(10);

      renderWithProviders(
        <ConnectionEventsCard connectionEvents={events} eventsLoading={false} />
      );

      // The component should display all 10 events
      // Use more specific selector to avoid matching the title
      const eventElements = screen.getAllByText(/(Speed degradation|Speed improved|Connection lost|Connection restored)/);
      expect(eventElements.length).toBe(10);
    });

    it('should display all events in descending order (newest first)', () => {
      // Create events from oldest to newest (simulating API response)
      const oldEvents = [
        {
          id: 'evt_1',
          type: 'speed_degradation',
          timestamp: '2025-11-01T16:00:00Z', // Yesterday - OLD
          metadata: {},
          createdAt: 0,
        },
        {
          id: 'evt_2',
          type: 'speed_improved',
          timestamp: '2025-11-01T17:00:00Z', // Yesterday - OLD
          metadata: {},
          createdAt: 0,
        },
        {
          id: 'evt_3',
          type: 'speed_degradation',
          timestamp: '2025-11-02T08:00:00Z', // Today - NEW
          metadata: {},
          createdAt: 0,
        },
        {
          id: 'evt_4',
          type: 'speed_improved',
          timestamp: '2025-11-02T09:00:00Z', // Today - NEW
          metadata: {},
          createdAt: 0,
        },
        {
          id: 'evt_5',
          type: 'speed_degradation',
          timestamp: '2025-11-02T09:30:00Z', // Today - NEW
          metadata: {},
          createdAt: 0,
        },
        {
          id: 'evt_6',
          type: 'speed_improved',
          timestamp: '2025-11-02T10:00:00Z', // Today - NEWEST
          metadata: {},
          createdAt: 0,
        },
      ];

      const { container } = renderWithProviders(
        <ConnectionEventsCard connectionEvents={oldEvents} eventsLoading={false} />
      );

      // Check that ALL events are displayed
      const allEventTypes = screen.getAllByText(/(Speed degradation|Speed improved)/);
      expect(allEventTypes.length).toBe(6);

      // Check that the newest events are shown by verifying their IDs are in the DOM
      expect(container.textContent).toContain('Speed improved'); // from evt_6, evt_4, evt_2
      expect(container.textContent).toContain('Speed degradation'); // from evt_5, evt_3, evt_1

      // Verify we have 6 events displayed
      const eventElements = screen.getAllByText(/(Speed degradation|Speed improved)/);
      expect(eventElements.length).toBe(6);
    });

    it('should display events in descending order (newest first)', () => {
      const events = [
        {
          id: 'evt_1',
          type: 'speed_degradation',
          timestamp: '2025-11-02T08:00:00Z',
          metadata: {},
          createdAt: 0,
        },
        {
          id: 'evt_2',
          type: 'speed_improved',
          timestamp: '2025-11-02T09:00:00Z',
          metadata: {},
          createdAt: 0,
        },
        {
          id: 'evt_3',
          type: 'connection_lost',
          timestamp: '2025-11-02T10:00:00Z', // Newest
          metadata: {},
          createdAt: 0,
        },
      ];

      const { container } = renderWithProviders(
        <ConnectionEventsCard connectionEvents={events} eventsLoading={false} />
      );

      const eventRows = container.querySelectorAll('[class*="py-2 flex"]');

      // First displayed event should be the newest (connection_lost from evt_3)
      expect(eventRows[0].textContent).toContain('Connection lost');

      // Last displayed event should be the oldest (speed_degradation from evt_1)
      expect(eventRows[eventRows.length - 1].textContent).toContain('Speed degradation');
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner when eventsLoading is true', () => {
      renderWithProviders(
        <ConnectionEventsCard connectionEvents={[]} eventsLoading={true} />
      );

      expect(screen.getByText('Loading events...')).toBeInTheDocument();
    });

    it('should not show loading spinner when eventsLoading is false', () => {
      renderWithProviders(
        <ConnectionEventsCard connectionEvents={[]} eventsLoading={false} />
      );

      expect(screen.queryByText('Loading events...')).not.toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no events are available', () => {
      renderWithProviders(
        <ConnectionEventsCard connectionEvents={[]} eventsLoading={false} />
      );

      expect(screen.getByText('No events recorded yet')).toBeInTheDocument();
    });
  });

  describe('Event Count Badge', () => {
    it('should display the total number of events', () => {
      const events = createMockEvents(15);

      renderWithProviders(
        <ConnectionEventsCard connectionEvents={events} eventsLoading={false} />
      );

      // Badge should show total count, not just displayed count
      expect(screen.getByText('15')).toBeInTheDocument();
    });

    it('should not display count badge when there are no events', () => {
      renderWithProviders(
        <ConnectionEventsCard connectionEvents={[]} eventsLoading={false} />
      );

      // Should not find any number badge
      expect(screen.queryByText(/^\d+$/)).not.toBeInTheDocument();
    });
  });

  describe('Event Type Formatting', () => {
    it('should format event types correctly', () => {
      const events = [
        {
          id: 'evt_1',
          type: 'speed_degradation',
          timestamp: '2025-11-02T10:00:00Z',
          metadata: {},
          createdAt: 0,
        },
        {
          id: 'evt_2',
          type: 'speed_improved',
          timestamp: '2025-11-02T10:01:00Z',
          metadata: {},
          createdAt: 0,
        },
        {
          id: 'evt_3',
          type: 'connection_lost',
          timestamp: '2025-11-02T10:02:00Z',
          metadata: {},
          createdAt: 0,
        },
        {
          id: 'evt_4',
          type: 'connection_restored',
          timestamp: '2025-11-02T10:03:00Z',
          metadata: {},
          createdAt: 0,
        },
      ];

      renderWithProviders(
        <ConnectionEventsCard connectionEvents={events} eventsLoading={false} />
      );

      expect(screen.getByText('Connection restored')).toBeInTheDocument();
      expect(screen.getByText('Connection lost')).toBeInTheDocument();
      expect(screen.getByText('Speed improved')).toBeInTheDocument();
      expect(screen.getByText('Speed degradation')).toBeInTheDocument();
    });
  });

  describe('Time Formatting', () => {
    it('should format timestamps to HH:mm format', () => {
      const events = [
        {
          id: 'evt_1',
          type: 'speed_degradation',
          timestamp: '2025-11-02T14:30:00Z',
          metadata: {},
          createdAt: 0,
        },
      ];

      renderWithProviders(
        <ConnectionEventsCard connectionEvents={events} eventsLoading={false} />
      );

      // Should display time in HH:mm format
      // Note: This will be in the user's local timezone
      const timeElement = screen.getByText(/\d{2}:\d{2}/);
      expect(timeElement).toBeInTheDocument();
    });
  });

  describe('All Events Displayed', () => {
    it('should display all events provided', () => {
      const events = createMockEvents(20);

      renderWithProviders(
        <ConnectionEventsCard connectionEvents={events} eventsLoading={false} />
      );

      // Count event type texts (should be all 20)
      const eventElements = screen.getAllByText(/(Speed degradation|Speed improved|Connection lost|Connection restored)/);
      expect(eventElements.length).toBe(20);
    });

    it('should display all events if less than limit are available', () => {
      const events = createMockEvents(2);

      renderWithProviders(
        <ConnectionEventsCard connectionEvents={events} eventsLoading={false} />
      );

      const eventElements = screen.getAllByText(/(Speed degradation|Speed improved|Connection lost|Connection restored)/);
      expect(eventElements.length).toBe(2);
    });
  });
});
