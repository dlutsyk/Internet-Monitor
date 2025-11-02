# Frontend Testing Guide

This document describes the testing setup and practices for the Internet Monitor frontend.

## Test Setup

The project uses:
- **Vitest** - Fast unit test framework powered by Vite
- **React Testing Library** - Testing utilities for React components
- **jsdom** - DOM environment for tests

## Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with UI
npm run test:ui

# Run tests with coverage report
npm run test:coverage
```

## Test Structure

### Component Tests

**File:** `src/components/ConnectionEventsCard.test.jsx`

Tests for the `ConnectionEventsCard` component that ensure:

1. **Critical Bug Prevention** - The component displays the 4 NEWEST events, not the oldest
   - This test would have caught the bug where `.slice(0, 4)` was showing old events

2. **Event Display**
   - Displays exactly 4 events when more are available
   - Shows fewer than 4 when less data is available
   - Events are ordered with newest first

3. **Loading States**
   - Shows loading spinner when data is loading
   - Hides loading spinner when data is ready

4. **Empty States**
   - Shows appropriate message when no events exist

5. **Event Type Formatting**
   - Correctly formats event type names (e.g., `speed_degradation` → "Speed degradation")

6. **Time Formatting**
   - Displays timestamps in HH:mm format

### Hook Tests

**File:** `src/hooks/useConnectionEvents.test.js`

Tests for the `useConnectionEvents` hook that ensure:

1. **Initial Load**
   - Loads events from API on mount
   - Respects the limit parameter
   - Handles API errors gracefully

2. **WebSocket Updates**
   - Subscribes to WebSocket messages when provided
   - Handles individual event updates
   - Limits events array to specified size
   - Properly unsubscribes on unmount

3. **Edge Cases**
   - Handles empty event arrays
   - Handles non-array responses
   - Prevents state updates on unmounted components

## Test Utilities

**File:** `src/test/test-utils.jsx`

Provides helper functions for testing:

- `renderWithProviders()` - Renders components with necessary providers
- `createMockEvents()` - Generates mock event data for testing

## Key Tests That Prevent Bugs

### 1. Newest Events Test

This test specifically catches the bug we encountered:

```javascript
it('should display the NEWEST 4 events, not the oldest', () => {
  // Creates 6 events: 2 old (Nov 1st) and 4 new (Nov 2nd)
  // Verifies that only the 4 newest are displayed
});
```

**Why this matters:** The API returns events ordered oldest-to-newest. Without `.slice(-4).reverse()`, the component would show the 4 oldest events instead of the newest.

### 2. Event Order Test

```javascript
it('should display events in descending order (newest first)', () => {
  // Verifies that the first displayed event is the newest
  // and the last displayed event is the oldest of those shown
});
```

### 3. Event Limit Test

```javascript
it('should never display more than 4 events', () => {
  // Creates 20 events and verifies only 4 are displayed
});
```

## Test Coverage

Run `npm run test:coverage` to see coverage report. Key areas covered:

- ✅ Component rendering logic
- ✅ Event sorting and slicing
- ✅ Loading and empty states
- ✅ Event type formatting
- ✅ WebSocket event handling
- ✅ API error handling
- ✅ Hook lifecycle management

## Best Practices

1. **Test behavior, not implementation** - Tests verify what users see, not internal code details

2. **Use descriptive test names** - Test names clearly describe what's being tested

3. **Arrange-Act-Assert pattern** - Tests are structured with clear setup, action, and assertion phases

4. **Mock external dependencies** - API calls and WebSocket connections are mocked

5. **Test edge cases** - Empty data, errors, and unusual inputs are tested

## Adding New Tests

When adding new tests:

1. Place component tests next to the component file (`.test.jsx`)
2. Place hook tests next to the hook file (`.test.js`)
3. Use `createMockEvents()` for consistent test data
4. Follow the existing test structure and naming conventions
5. Ensure tests are independent and can run in any order

## Continuous Integration

Tests should be run before:
- Creating pull requests
- Merging to main branch
- Building for production

Consider adding to your CI/CD pipeline:

```bash
npm test              # Run all tests
npm run test:coverage # Check coverage thresholds
```
