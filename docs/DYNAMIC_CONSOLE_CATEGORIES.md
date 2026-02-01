# Dynamic Console Category System

## Overview

The console panel now supports **dynamic categories** - you can create new log categories on-the-fly without modifying any code. Category filter buttons are automatically generated based on what categories actually exist in the log history.

## Changes Made

### Before (Hardcoded)

```typescript
// consoleStore.ts - OLD
export type LogCategory = 
  | 'ESP'
  | 'DEBUG'
  | 'Validation'
  | 'Geometry'
  | 'Config'
  | 'Network'
  | 'UI'
  | 'Performance'  // ❌ Had to update type to add new category

// ConsolePanel.tsx - OLD
const allCategories = ['ESP', 'DEBUG', 'Validation', ...] // ❌ Had to update array
const getCategoryColor = (category: string) => {
  const colors = {
    'ESP': '#4ec9b0',
    // ❌ Had to add color for new category
  }
}
```

### After (Dynamic)

```typescript
// consoleStore.ts - NEW
export type LogCategory = string  // ✅ Any string is valid

// Automatic category extraction
getAvailableCategories: () => {
  const categoriesSet = new Set<string>()
  state.entries.forEach(entry => categoriesSet.add(entry.category))
  return Array.from(categoriesSet).sort()
}

// Color hash function for unknown categories
export const getCategoryColor = (category: string): string => {
  // Known categories get predefined colors
  const knownColors = { 'ESP': '#4ec9b0', ... }
  if (knownColors[category]) return knownColors[category]
  
  // Unknown categories get a consistent hashed color
  let hash = 0
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash % 360)
  return `hsl(${hue}, 60%, 55%)`
}
```

## Usage Examples

### Creating New Categories On-the-Fly

```typescript
import { useConsoleStore } from './store/consoleStore'

const { log } = useConsoleStore()

// Use any string as a category - no code changes needed!
log('MyFeature', 'info', 'Starting feature X')
log('Database', 'success', 'Connection established')
log('WebSocket', 'warning', 'Reconnecting...')
log('FileSystem', 'error', 'Permission denied')
log('Animation', 'debug', 'Frame rendered')

// Categories automatically appear as filter buttons in the UI
```

### Category Filter Buttons

The console UI automatically generates filter buttons for all categories that exist in the log history:

- **Single pane mode**: Buttons appear in the header center
- **Split pane mode**: Buttons appear in each pane's header
- **Empty logs**: No buttons shown (nothing to filter)
- **New category logged**: Button appears immediately

### Color Assignment

1. **Known categories** (ESP, DEBUG, Validation, etc.) get predefined colors
2. **Unknown categories** get a consistent color generated from a hash of the category name
3. Same category always gets the same color (deterministic hashing)

## Benefits

1. **No code changes needed** to add new categories during development
2. **Cleaner codebase** - no hardcoded category lists to maintain
3. **Better developer experience** - just use `log('NewCategory', ...)`
4. **Automatic UI updates** - filter buttons appear as soon as a category is used
5. **Consistent colors** - hash function ensures same category always has same color

## Migration Notes

### For Developers

- No breaking changes - existing code continues to work
- All existing categories ('ESP', 'DEBUG', etc.) work exactly as before
- New categories can be added anywhere by just using a new string

### For AI Agents

This change **does NOT need to be documented in `docs/whenSchemaChanges.md`** because:

- ✅ The category system is fully automatic (extracts from log entries)
- ✅ No hardcoded arrays need manual updates
- ✅ Color generation is algorithmic (hash function)
- ✅ Adding new categories requires zero code changes

### Common Categories

While you can use any string, these are the most common categories in the codebase:

- `'ESP'` - ESP server operations
- `'DEBUG'` - General debugging messages
- `'Validation'` - Schema validation
- `'Geometry'` - Mesh/surface operations
- `'Config'` - JSON config file operations
- `'Network'` - API/fetch calls
- `'UI'` - User interaction events
- `'Performance'` - Timing/profiling data

## Testing

All console store tests continue to pass. The system is backwards compatible with existing code.

```bash
npm test -- --run store/__tests__/consoleStore.test.ts
# ✓ 35 tests passed
```
