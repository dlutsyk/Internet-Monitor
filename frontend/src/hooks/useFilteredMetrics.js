import { useState, useEffect, useRef } from 'react';

/**
 * Hook to fetch filtered metrics based on a time range
 * Uses WebSocket data instead of HTTP polling
 * @param {string} timeRange - Time range key (e.g., '1h', '24h', '7d')
 * @param {object} timeRanges - Time range configuration object
 * @param {function} subscribeToMessages - Function to subscribe to WebSocket messages
 * @returns {object} - { data, loading, error, refetch }
 */
export default function useFilteredMetrics(timeRange, timeRanges, subscribeToMessages = null) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const timeRangeRef = useRef(timeRange);
  const initialLoadRef = useRef(false);

  // Keep track of current time range
  useEffect(() => {
    timeRangeRef.current = timeRange;
  }, [timeRange]);

  // Initially set loading to true until we receive WebSocket data
  useEffect(() => {
    if (!initialLoadRef.current) {
      setLoading(true);
    }
  }, [timeRange]);

  // Subscribe to WebSocket messages for initial data and real-time updates
  useEffect(() => {
    if (!subscribeToMessages) {
      return;
    }

    const handleMessage = (message) => {
      // Handle initial recent data
      if (message.type === 'recent' && Array.isArray(message.payload)) {
        const currentTimeRange = timeRanges[timeRangeRef.current];
        if (!currentTimeRange) {
          setData([]);
          setLoading(false);
          return;
        }

        const now = new Date();
        const cutoffTime = new Date(now.getTime() - currentTimeRange.hours * 60 * 60 * 1000);

        // Filter and sort the initial data
        const filtered = message.payload
          .filter((item) => new Date(item.timestamp) >= cutoffTime)
          .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        setData(filtered);
        setLoading(false);
        initialLoadRef.current = true;
      }

      // Handle real-time measurement updates
      if (message.type === 'measurement' && message.payload) {
        const newMeasurement = message.payload;
        const measurementTime = new Date(newMeasurement.timestamp);

        setData((prevData) => {
          // Get the current time range in milliseconds
          const currentTimeRange = timeRanges[timeRangeRef.current];
          if (!currentTimeRange) {
            return prevData;
          }

          const now = new Date();
          const cutoffTime = new Date(now.getTime() - currentTimeRange.hours * 60 * 60 * 1000);

          // Only add if measurement is within the current time range
          if (measurementTime < cutoffTime) {
            return prevData;
          }

          // Check if measurement already exists (by timestamp)
          const existingIndex = prevData.findIndex(
            (item) => item.timestamp === newMeasurement.timestamp
          );

          let updatedData;
          if (existingIndex >= 0) {
            // Update existing measurement
            updatedData = [...prevData];
            updatedData[existingIndex] = newMeasurement;
          } else {
            // Add new measurement
            updatedData = [...prevData, newMeasurement];
          }

          // Filter out measurements outside the time range and sort by timestamp
          return updatedData
            .filter((item) => new Date(item.timestamp) >= cutoffTime)
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        });

        setLoading(false);
      }
    };

    const unsubscribe = subscribeToMessages(handleMessage);
    return () => {
      unsubscribe();
    };
  }, [subscribeToMessages, timeRanges]);

  // No refetch function needed anymore - all data comes via WebSocket
  return {
    data,
    loading,
    error,
  };
}
