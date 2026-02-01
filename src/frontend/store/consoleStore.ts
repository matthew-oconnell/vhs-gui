/**
 * Console Store - Unified logging system for the application
 * 
 * Manages console panel state including log entries, visibility,
 * category filtering, and user settings.
 */

import { create } from 'zustand'

const MIN_HEIGHT = 100
const MAX_HEIGHT = 600
const DEFAULT_HEIGHT = 200
const DEFAULT_MAX_ENTRIES = 1000

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * LogCategory is now fully dynamic - any string can be used as a category.
 * Common categories include: 'ESP', 'DEBUG', 'Validation', 'Geometry', 
 * 'Config', 'Network', 'UI', 'Performance'
 */
export type LogCategory = string

export type LogLevel = 
  | 'debug'    // Gray - verbose details
  | 'info'     // White - normal operations
  | 'success'  // Green - successful completion
  | 'warning'  // Yellow - non-critical issues
  | 'error'    // Red - failures

export interface ConsoleLogEntry {
  id: string                    // Format: `${timestamp}-${random}`
  timestamp: Date
  category: LogCategory
  level: LogLevel
  message: string
  metadata?: Record<string, any>
  source?: string               // Optional: component/file that logged
}

export interface ConsoleSettings {
  maxEntries: number            // Default: 1000
  timestampFormat: 'time' | 'datetime' | 'relative'
  autoScroll: boolean           // Default: true
  autoExpandOnError: boolean    // Default: true
  defaultCategories: Set<string> // Initial categories shown (can be any strings)
  theme: 'dark' | 'light'       // Default: 'dark'
}

interface ConsoleState {
  entries: ConsoleLogEntry[]
  visibleCategories: Set<string>
  isCollapsed: boolean
  consoleHeight: number         // In pixels
  settings: ConsoleSettings
  unseenCount: number           // Count of messages added while collapsed
  
  // Split view state
  isSplitView: boolean
  leftPaneCategories: Set<string>
  rightPaneCategories: Set<string>
}

interface ConsoleActions {
  log: (category: string, level: LogLevel, message: string, metadata?: Record<string, any>) => void
  clear: (category?: string) => void
  toggleCategory: (category: string) => void
  setCollapsed: (collapsed: boolean) => void
  setHeight: (height: number) => void
  getVisibleEntries: () => ConsoleLogEntry[]
  updateSettings: (settings: Partial<ConsoleSettings>) => void
  
  // Split view actions
  toggleSplitView: () => void
  toggleLeftCategory: (category: string) => void
  toggleRightCategory: (category: string) => void
  getLeftPaneEntries: () => ConsoleLogEntry[]
  getRightPaneEntries: () => ConsoleLogEntry[]
  
  // Dynamic category extraction
  getAvailableCategories: () => string[]
  
  // Export actions
  formatLogsAsText: (entries: ConsoleLogEntry[]) => string
  copyLogsToClipboard: (entries: ConsoleLogEntry[]) => Promise<void>
  exportLogsToFile: (entries: ConsoleLogEntry[], filename?: string) => void
}

// ============================================================================
// LocalStorage Helpers
// ============================================================================

const loadHeightFromStorage = (): number => {
  try {
    const saved = localStorage.getItem('console-height')
    return saved ? parseInt(saved, 10) : DEFAULT_HEIGHT
  } catch {
    return DEFAULT_HEIGHT
  }
}

const loadSettingsFromStorage = (): ConsoleSettings => {
  try {
    const saved = localStorage.getItem('console-settings')
    if (saved) {
      const parsed = JSON.parse(saved)
      // Reconstruct Set objects
      return {
        ...parsed,
        defaultCategories: new Set(parsed.defaultCategories || ['ESP', 'Validation'])
      }
    }
  } catch {
    // Fall through to defaults
  }
  
  return {
    maxEntries: DEFAULT_MAX_ENTRIES,
    timestampFormat: 'time',
    autoScroll: true,
    autoExpandOnError: true,
    defaultCategories: new Set(['ESP', 'Validation', 'Geometry']),
    theme: 'dark'
  }
}

const loadSplitViewFromStorage = (): boolean => {
  try {
    const saved = localStorage.getItem('console-split-view')
    return saved === 'true'
  } catch {
    return false
  }
}

const loadPaneCategoriesFromStorage = (pane: 'left' | 'right'): Set<string> => {
  try {
    const saved = localStorage.getItem(`console-${pane}-pane-categories`)
    if (saved) {
      return new Set(JSON.parse(saved) as string[])
    }
  } catch {
    // Fall through to defaults
  }
  
  // Default: ESP & Geometry on left, everything else on right
  if (pane === 'left') {
    return new Set(['ESP', 'Geometry'])
  } else {
    return new Set(['DEBUG', 'Validation', 'Config', 'Network', 'UI', 'Performance'])
  }
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useConsoleStore = create<ConsoleState & ConsoleActions>((set, get) => ({
  // Initial state
  entries: [],
  visibleCategories: new Set(['ESP', 'DEBUG', 'Validation', 'Geometry', 'Config', 'Network']),
  isCollapsed: false,
  consoleHeight: loadHeightFromStorage(),
  unseenCount: 0,
  settings: loadSettingsFromStorage(),
  
  // Split view state
  isSplitView: loadSplitViewFromStorage(),
  leftPaneCategories: loadPaneCategoriesFromStorage('left'),
  rightPaneCategories: loadPaneCategoriesFromStorage('right'),

  // Actions
  log: (category, level, message, metadata?) => {
    const entry: ConsoleLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      category,
      level,
      message,
      metadata
    }

    set((state) => {
      let newEntries = [...state.entries, entry]

      // Ring buffer: keep only last maxEntries
      if (newEntries.length > state.settings.maxEntries) {
        newEntries = newEntries.slice(-state.settings.maxEntries)
      }

      // Auto-expand on error if setting enabled
      let newCollapsed = state.isCollapsed
      if (level === 'error' && state.settings.autoExpandOnError && state.isCollapsed) {
        newCollapsed = false
      }

      // Increment unseen count if collapsed (and not auto-expanding)
      const newUnseenCount = state.isCollapsed && newCollapsed ? state.unseenCount + 1 : 0

      return {
        entries: newEntries,
        isCollapsed: newCollapsed,
        unseenCount: newUnseenCount
      }
    })
  },

  clear: (category?) => {
    set((state) => ({
      entries: category 
        ? state.entries.filter(e => e.category !== category)
        : [],
      unseenCount: 0
    }))
  },

  toggleCategory: (category) => {
    set((state) => {
      const newVisible = new Set(state.visibleCategories)
      if (newVisible.has(category)) {
        newVisible.delete(category)
      } else {
        newVisible.add(category)
      }
      return { visibleCategories: newVisible }
    })
  },

  setCollapsed: (collapsed) => {
    set({ 
      isCollapsed: collapsed,
      unseenCount: collapsed ? get().unseenCount : 0
    })
  },

  setHeight: (height) => {
    const clampedHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, height))
    try {
      localStorage.setItem('console-height', clampedHeight.toString())
    } catch {
      // Silently fail if localStorage unavailable
    }
    set({ consoleHeight: clampedHeight })
  },

  getVisibleEntries: () => {
    const state = get()
    return state.entries.filter(e => state.visibleCategories.has(e.category))
  },

  updateSettings: (newSettings) => {
    const updated = { ...get().settings, ...newSettings }
    try {
      localStorage.setItem('console-settings', JSON.stringify({
        ...updated,
        defaultCategories: Array.from(updated.defaultCategories)
      }))
    } catch {
      // Silently fail if localStorage unavailable
    }
    set({ settings: updated })
  },

  // Split view actions
  toggleSplitView: () => {
    set((state) => {
      const newSplitView = !state.isSplitView
      try {
        localStorage.setItem('console-split-view', newSplitView.toString())
      } catch {
        // Silently fail if localStorage unavailable
      }
      return { isSplitView: newSplitView }
    })
  },

  toggleLeftCategory: (category) => {
    set((state) => {
      const newCategories = new Set(state.leftPaneCategories)
      if (newCategories.has(category)) {
        newCategories.delete(category)
      } else {
        newCategories.add(category)
      }
      try {
        localStorage.setItem('console-left-pane-categories', JSON.stringify(Array.from(newCategories)))
      } catch {
        // Silently fail if localStorage unavailable
      }
      return { leftPaneCategories: newCategories }
    })
  },

  toggleRightCategory: (category) => {
    set((state) => {
      const newCategories = new Set(state.rightPaneCategories)
      if (newCategories.has(category)) {
        newCategories.delete(category)
      } else {
        newCategories.add(category)
      }
      try {
        localStorage.setItem('console-right-pane-categories', JSON.stringify(Array.from(newCategories)))
      } catch {
        // Silently fail if localStorage unavailable
      }
      return { rightPaneCategories: newCategories }
    })
  },

  getLeftPaneEntries: () => {
    const state = get()
    return state.entries.filter(e => state.leftPaneCategories.has(e.category))
  },

  getRightPaneEntries: () => {
    const state = get()
    return state.entries.filter(e => state.rightPaneCategories.has(e.category))
  },

  // Export actions
  formatLogsAsText: (entries) => {
    if (entries.length === 0) {
      return 'No logs to export.'
    }

    return entries.map(entry => {
      const timestamp = entry.timestamp.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      })
      
      let line = `[${timestamp}] [${entry.category}] [${entry.level.toUpperCase()}] ${entry.message}`
      
      if (entry.metadata && Object.keys(entry.metadata).length > 0) {
        line += `\n  Metadata: ${JSON.stringify(entry.metadata, null, 2).split('\n').join('\n  ')}`
      }
      
      return line
    }).join('\n\n')
  },

  copyLogsToClipboard: async (entries) => {
    const text = get().formatLogsAsText(entries)
    
    try {
      await navigator.clipboard.writeText(text)
    } catch (error) {
      console.error('Failed to copy logs to clipboard:', error)
      throw new Error('Failed to copy to clipboard. Please check browser permissions.')
    }
  },

  exportLogsToFile: (entries, filename?) => {
    const text = get().formatLogsAsText(entries)
    
    // Generate filename with timestamp if not provided
    const defaultFilename = `console-logs-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`
    const finalFilename = filename || defaultFilename
    
    // Create blob and download
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = finalFilename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  },

  getAvailableCategories: () => {
    const state = get()
    const categoriesSet = new Set<string>()
    state.entries.forEach(entry => categoriesSet.add(entry.category))
    return Array.from(categoriesSet).sort()
  }
}))

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a consistent color for any category using a hash function.
 * Falls back to predefined colors for common categories.
 */
export const getCategoryColor = (category: string): string => {
  // Predefined colors for common categories
  const knownColors: Record<string, string> = {
    'ESP': '#4ec9b0',
    'DEBUG': '#858585',
    'Validation': '#ce9178',
    'Geometry': '#dcdcaa',
    'Config': '#9cdcfe',
    'Network': '#c586c0',
    'UI': '#4fc1ff',
    'Performance': '#b5cea8'
  }
  
  if (knownColors[category]) {
    return knownColors[category]
  }
  
  // Hash function to generate consistent color from string
  let hash = 0
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  // Generate HSL color with good saturation and lightness for visibility
  const hue = Math.abs(hash % 360)
  const saturation = 60 + (Math.abs(hash >> 8) % 20) // 60-80%
  const lightness = 55 + (Math.abs(hash >> 16) % 15) // 55-70%
  
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`
}
