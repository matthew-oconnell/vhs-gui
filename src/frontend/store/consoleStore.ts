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

export type LogCategory = 
  | 'ESP'          // ESP server operations
  | 'DEBUG'        // General debugging
  | 'Validation'   // Schema validation
  | 'Geometry'     // Mesh/surface operations
  | 'Config'       // JSON config operations
  | 'Network'      // API/fetch calls
  | 'UI'           // User interactions
  | 'Performance'  // Timing/profiling

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
  defaultCategories: Set<LogCategory>
  theme: 'dark' | 'light'       // Default: 'dark'
}

interface ConsoleState {
  entries: ConsoleLogEntry[]
  visibleCategories: Set<LogCategory>
  isCollapsed: boolean
  consoleHeight: number         // In pixels
  settings: ConsoleSettings
  unseenCount: number           // Count of messages added while collapsed
}

interface ConsoleActions {
  log: (category: LogCategory, level: LogLevel, message: string, metadata?: Record<string, any>) => void
  clear: (category?: LogCategory) => void
  toggleCategory: (category: LogCategory) => void
  setCollapsed: (collapsed: boolean) => void
  setHeight: (height: number) => void
  getVisibleEntries: () => ConsoleLogEntry[]
  updateSettings: (settings: Partial<ConsoleSettings>) => void
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
  }
}))
