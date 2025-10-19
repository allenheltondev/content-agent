# useInfoBoxManager Hook

A React hook for managing InfoBox dismissed state with localStorage persistence and graceful error handling.

## Features

- ✅ Persistent dismissal state across browser sessions
- ✅ Graceful degradation when localStorage is unavailable
- ✅ Data validation and corruption handling
- ✅ TypeScript support with full type safety
- ✅ Error handling for storage quota exceeded scenarios
- ✅ Simple API for common operations

## Usage

```typescript
import { useInfoBoxManager } from '../hooks/useInfoBoxManager';

function MyComponent() {
  const { isDismissed, dismissInfoBox, resetAllInfoBoxes, isStorageAvailable } = useInfoBoxManager();

  return (
    <div>
      {!isDismissed('welcome-box') && (
        <InfoBox
          id="welcome-box"
          title="Welcome!"
          content="Welcome to Betterer!"
          onDismiss={() => dismissInfoBox('welcome-box')}
        />
      )}
    </div>
  );
}
```

## API Reference

### Return Values

#### `isDismissed(id: string): boolean`
Checks if an InfoBox with the given ID has been dismissed.

#### `dismissInfoBox(id: string): void`
Marks an InfoBox as dismissed and persists the state to localStorage.

#### `resetAllInfoBoxes(): void`
Clears all dismissed states and removes data from localStorage.

#### `isStorageAvailable: boolean`
Indicates whether localStorage is available and working.

## Error Handling

The hook implements comprehensive error handling for various scenarios:

### localStorage Unavailable
- **Scenario**: Private browsing, storage disabled, or browser restrictions
- **Behavior**: Hook continues to work but without persistence
- **Detection**: `isStorageAvailable` returns `false`

### Storage Quota Exceeded
- **Scenario**: localStorage is full
- **Behavior**: Dismissal works in memory, error logged to console
- **User Impact**: InfoBox appears dismissed but won't persist across sessions

### Corrupted Data
- **Scenario**: Invalid JSON or malformed data structure in localStorage
- **Behavior**: Automatically resets to clean state
- **Recovery**: Invalid entries are ignored, valid entries are preserved

### Data Validation
The hook validates stored data structure:
```typescript
interface DismissedInfoBoxes {
  [boxId: string]: {
    dismissedAt: string; // ISO timestamp
    version: string; // App version when dismissed
  };
}
```

## Storage Format

Data is stored in localStorage under the key `betterer_dismissed_info_boxes`:

```json
{
  "welcome-box": {
    "dismissedAt": "2024-01-15T10:30:00.000Z",
    "version": "1.0.0"
  },
  "tip-box": {
    "dismissedAt": "2024-01-15T11:45:00.000Z",
    "version": "1.0.0"
  }
}
```

## Testing

This hook follows the project's manual testing philosophy. See `__tests__/useInfoBoxManager.test.ts` for detailed testing scenarios.

### Quick Manual Test

1. Add `InfoBoxManagerDemo` component to any page
2. Test dismissal and persistence functionality
3. Check localStorage in browser dev tools
4. Test error scenarios (incognito mode, corrupted data)

### Test Scenarios

- ✅ Basic dismissal functionality
- ✅ Persistence across browser sessions
- ✅ Multiple InfoBoxes management
- ✅ Reset functionality
- ✅ localStorage unavailable handling
- ✅ Corrupted data recovery
- ✅ Storage quota exceeded handling
- ✅ Data structure validation

## Performance Considerations

- **Minimal re-renders**: Uses `useCallback` for stable function references
- **Lazy loading**: Data is loaded only once on mount
- **Efficient updates**: Only updates state when necessary
- **Memory efficient**: Stores minimal data structure

## Browser Compatibility

Works in all modern browsers that support:
- React Hooks (React 16.8+)
- localStorage API
- JSON.parse/stringify

Gracefully degrades in environments without localStorage support.

## Integration with InfoBox Component

```typescript
// Example InfoBox component integration
interface InfoBoxProps {
  id: string;
  title: string;
  content: string;
  onDismiss?: () => void;
}

function InfoBox({ id, title, content, onDismiss }: InfoBoxProps) {
  const { isDismissed, dismissInfoBox } = useInfoBoxManager();

  if (isDismissed(id)) {
    return null;
  }

  const handleDismiss = () => {
    dismissInfoBox(id);
    onDismiss?.();
  };

  return (
    <div className="info-box">
      <h3>{title}</h3>
      <p>{content}</p>
      <button onClick={handleDismiss}>Dismiss</button>
    </div>
  );
}
```
