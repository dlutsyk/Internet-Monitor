import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import useConnectionEvents from './useConnectionEvents';
import * as api from '../services/api';

// Mock the API module
vi.mock('../services/api');

describe('useConnectionEvents', () => {
  const mockEvents = [
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
  ];

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial Load', () => {
    it('should load events from API on mount', async () => {
      // Mock API response
      api.getRecentEvents.mockResolvedValue({
        events: mockEvents,
        count: mockEvents.length,
      });

      const { result } = renderHook(() =>
        useConnectionEvents(null, 20)
      );

      // Initially loading
      expect(result.current.loading).toBe(true);
      expect(result.current.events).toEqual([]);

      // Wait for events to load
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.events).toEqual(mockEvents);
      expect(result.current.error).toBe(null);
      expect(api.getRecentEvents).toHaveBeenCalledWith(20);
    });

    it('should respect the limit parameter', async () => {
      api.getRecentEvents.mockResolvedValue({
        events: mockEvents.slice(0, 10),
        count: 10,
      });

      renderHook(() => useConnectionEvents(null, 10));

      await waitFor(() => {
        expect(api.getRecentEvents).toHaveBeenCalledWith(10);
      });
    });

    it('should handle API errors gracefully', async () => {
      const mockError = new Error('Failed to fetch events');
      api.getRecentEvents.mockRejectedValue(mockError);

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() =>
        useConnectionEvents(null, 20)
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe(mockError);
      expect(result.current.events).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to load connection events:',
        mockError
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('WebSocket Updates', () => {
    it('should subscribe to WebSocket messages when subscribeToMessages is provided', async () => {
      api.getRecentEvents.mockResolvedValue({
        events: mockEvents,
        count: mockEvents.length,
      });

      const mockUnsubscribe = vi.fn();
      const mockSubscribeToMessages = vi.fn((handler) => {
        // Call handler with initial events
        handler({ type: 'events', payload: mockEvents });
        return mockUnsubscribe;
      });

      const { result, unmount } = renderHook(() =>
        useConnectionEvents(mockSubscribeToMessages, 20)
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockSubscribeToMessages).toHaveBeenCalled();
      expect(result.current.events).toEqual(mockEvents);

      // Unmount and check unsubscribe was called
      unmount();
      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('should handle individual event updates from WebSocket', async () => {
      api.getRecentEvents.mockResolvedValue({
        events: mockEvents,
        count: mockEvents.length,
      });

      let messageHandler;
      const mockSubscribeToMessages = vi.fn((handler) => {
        messageHandler = handler;
        return vi.fn();
      });

      const { result } = renderHook(() =>
        useConnectionEvents(mockSubscribeToMessages, 20)
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Simulate new event from WebSocket
      const newEvent = {
        id: 'evt_3',
        type: 'connection_lost',
        timestamp: '2025-11-02T10:00:00Z',
        metadata: {},
        createdAt: 0,
      };

      act(() => {
        messageHandler({ type: 'event', payload: newEvent });
      });

      await waitFor(() => {
        expect(result.current.events[0]).toEqual(newEvent);
      });

      // New event should be first in the array
      expect(result.current.events.length).toBe(3);
      expect(result.current.events[0]).toEqual(newEvent);
    });

    it('should limit events to the specified limit when adding new events', async () => {
      api.getRecentEvents.mockResolvedValue({
        events: mockEvents,
        count: mockEvents.length,
      });

      let messageHandler;
      const mockSubscribeToMessages = vi.fn((handler) => {
        messageHandler = handler;
        return vi.fn();
      });

      const limit = 2;
      const { result } = renderHook(() =>
        useConnectionEvents(mockSubscribeToMessages, limit)
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Add a new event via WebSocket
      const newEvent = {
        id: 'evt_3',
        type: 'connection_lost',
        timestamp: '2025-11-02T10:00:00Z',
        metadata: {},
        createdAt: 0,
      };

      act(() => {
        messageHandler({ type: 'event', payload: newEvent });
      });

      await waitFor(() => {
        expect(result.current.events.length).toBe(limit);
      });

      // Should only keep the 2 most recent events
      expect(result.current.events[0]).toEqual(newEvent);
      expect(result.current.events.length).toBe(limit);
    });

    it('should handle events array from WebSocket', async () => {
      api.getRecentEvents.mockResolvedValue({
        events: [],
        count: 0,
      });

      let messageHandler;
      const mockSubscribeToMessages = vi.fn((handler) => {
        messageHandler = handler;
        return vi.fn();
      });

      const { result } = renderHook(() =>
        useConnectionEvents(mockSubscribeToMessages, 20)
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Simulate receiving events array from WebSocket
      act(() => {
        messageHandler({ type: 'events', payload: mockEvents });
      });

      await waitFor(() => {
        expect(result.current.events).toEqual(mockEvents);
      });

      expect(result.current.loading).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty events array from API', async () => {
      api.getRecentEvents.mockResolvedValue({
        events: [],
        count: 0,
      });

      const { result } = renderHook(() =>
        useConnectionEvents(null, 20)
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.events).toEqual([]);
      expect(result.current.error).toBe(null);
    });

    it('should handle non-array events response from API', async () => {
      api.getRecentEvents.mockResolvedValue({
        events: null,
        count: 0,
      });

      const { result } = renderHook(() =>
        useConnectionEvents(null, 20)
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should not set events if response is not an array
      expect(result.current.events).toEqual([]);
    });

    it('should not update state if component unmounts during fetch', async () => {
      let resolvePromise;
      const fetchPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      api.getRecentEvents.mockReturnValue(fetchPromise);

      const { result, unmount } = renderHook(() =>
        useConnectionEvents(null, 20)
      );

      expect(result.current.loading).toBe(true);

      // Unmount before fetch completes
      unmount();

      // Resolve the fetch
      resolvePromise({ events: mockEvents, count: mockEvents.length });

      // Wait a bit to ensure no state update happens
      await new Promise((resolve) => setTimeout(resolve, 100));

      // No error should be thrown (state update on unmounted component would throw)
    });
  });
});
