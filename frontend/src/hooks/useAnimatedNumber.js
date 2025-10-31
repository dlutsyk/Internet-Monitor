import { useEffect, useRef, useState } from 'react';

/**
 * Hook to animate number transitions smoothly
 * @param {number} targetValue - The target value to animate to
 * @param {number} duration - Animation duration in milliseconds (default: 600ms)
 * @param {number} precision - Number of decimal places (default: 2)
 * @returns {number} - The current animated value
 */
export default function useAnimatedNumber(targetValue, duration = 600, precision = 2) {
  const [displayValue, setDisplayValue] = useState(targetValue);
  const rafRef = useRef(null);
  const startTimeRef = useRef(null);
  const startValueRef = useRef(targetValue);

  useEffect(() => {
    // Skip animation if target value is null/undefined
    if (targetValue == null) {
      setDisplayValue(targetValue);
      return;
    }

    // Skip animation if values are the same
    if (Math.abs(displayValue - targetValue) < 0.01) {
      return;
    }

    startValueRef.current = displayValue;
    startTimeRef.current = null;

    const animate = (timestamp) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-out cubic)
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);

      const currentValue =
        startValueRef.current + (targetValue - startValueRef.current) * easeOutCubic;

      setDisplayValue(
        precision === 0
          ? Math.round(currentValue)
          : parseFloat(currentValue.toFixed(precision))
      );

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(targetValue);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [targetValue, duration, precision]);

  return displayValue;
}
