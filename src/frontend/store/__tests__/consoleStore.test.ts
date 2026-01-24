import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useConsoleStore } from '../consoleStore'

describe('consoleStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useConsoleStore.setState({
      entries: [],
      visibleCategories: new Set(['ESP', 'Validation', 'Geometry']),
      isCollapsed: false,
      consoleHeight: 200,
      unseenCount: 0,
      settings: {
        maxEntries: 1000,
        timestampFormat: 'time',
        autoScroll: true,
        autoExpandOnError: true,
        defaultCategories: new Set(['ESP', 'Validation']),
        theme: 'dark'
      }
    })
  })

  describe('log()', () => {
    it('should add log entry with correct structure', () => {
      const { log } = useConsoleStore.getState()
      
      log('ESP', 'info', 'Test message')
      
      const state = useConsoleStore.getState()
      expect(state.entries).toHaveLength(1)
      expect(state.entries[0]).toMatchObject({
        category: 'ESP',
        level: 'info',
        message: 'Test message'
      })
      expect(state.entries[0].id).toBeTruthy()
      expect(state.entries[0].timestamp).toBeInstanceOf(Date)
    })

    it('should generate unique IDs for each entry', () => {
      const { log } = useConsoleStore.getState()
      
      log('ESP', 'info', 'Message 1')
      log('ESP', 'info', 'Message 2')
      
      const { entries } = useConsoleStore.getState()
      expect(entries[0].id).not.toBe(entries[1].id)
    })

    it('should store metadata when provided', () => {
      const { log } = useConsoleStore.getState()
      const metadata = { operation: 'build', duration: 1234 }
      
      log('ESP', 'info', 'Build complete', metadata)
      
      const { entries } = useConsoleStore.getState()
      expect(entries[0].metadata).toEqual(metadata)
    })

    it('should increment unseenCount when collapsed', () => {
      useConsoleStore.setState({ isCollapsed: true })
      const { log } = useConsoleStore.getState()
      
      log('ESP', 'info', 'Message 1')
      log('ESP', 'info', 'Message 2')
      
      expect(useConsoleStore.getState().unseenCount).toBe(2)
    })

    it('should not increment unseenCount when expanded', () => {
      useConsoleStore.setState({ isCollapsed: false })
      const { log } = useConsoleStore.getState()
      
      log('ESP', 'info', 'Message')
      
      expect(useConsoleStore.getState().unseenCount).toBe(0)
    })
  })

  describe('ring buffer', () => {
    it('should keep entries under MAX_ENTRIES limit', () => {
      useConsoleStore.setState({ 
        settings: { 
          ...useConsoleStore.getState().settings, 
          maxEntries: 10 
        } 
      })
      const { log } = useConsoleStore.getState()
      
      // Add 15 entries
      for (let i = 0; i < 15; i++) {
        log('ESP', 'info', `Message ${i}`)
      }
      
      const { entries } = useConsoleStore.getState()
      expect(entries).toHaveLength(10)
    })

    it('should remove oldest entries when limit exceeded', () => {
      useConsoleStore.setState({ 
        settings: { 
          ...useConsoleStore.getState().settings, 
          maxEntries: 10 
        } 
      })
      const { log } = useConsoleStore.getState()
      
      for (let i = 0; i < 15; i++) {
        log('ESP', 'info', `Message ${i}`)
      }
      
      const { entries } = useConsoleStore.getState()
      expect(entries[0].message).toBe('Message 5')
      expect(entries[9].message).toBe('Message 14')
    })

    it('should preserve most recent entries', () => {
      useConsoleStore.setState({ 
        settings: { 
          ...useConsoleStore.getState().settings, 
          maxEntries: 5 
        } 
      })
      const { log } = useConsoleStore.getState()
      
      for (let i = 0; i < 10; i++) {
        log('ESP', 'info', `Message ${i}`)
      }
      
      const { entries } = useConsoleStore.getState()
      expect(entries.map(e => e.message)).toEqual([
        'Message 5', 'Message 6', 'Message 7', 'Message 8', 'Message 9'
      ])
    })
  })

  describe('clear()', () => {
    beforeEach(() => {
      const { log } = useConsoleStore.getState()
      log('ESP', 'info', 'ESP message 1')
      log('ESP', 'info', 'ESP message 2')
      log('Validation', 'warning', 'Validation warning')
      log('Geometry', 'info', 'Geometry info')
    })

    it('should clear all entries when no category specified', () => {
      const { clear } = useConsoleStore.getState()
      
      clear()
      
      expect(useConsoleStore.getState().entries).toHaveLength(0)
    })

    it('should clear only specified category entries', () => {
      const { clear } = useConsoleStore.getState()
      
      clear('ESP')
      
      const { entries } = useConsoleStore.getState()
      expect(entries).toHaveLength(2)
      expect(entries.every(e => e.category !== 'ESP')).toBe(true)
    })

    it('should preserve other categories when clearing one', () => {
      const { clear } = useConsoleStore.getState()
      
      clear('ESP')
      
      const { entries } = useConsoleStore.getState()
      expect(entries.find(e => e.category === 'Validation')).toBeTruthy()
      expect(entries.find(e => e.category === 'Geometry')).toBeTruthy()
    })

    it('should reset unseenCount', () => {
      useConsoleStore.setState({ unseenCount: 10 })
      const { clear } = useConsoleStore.getState()
      
      clear()
      
      expect(useConsoleStore.getState().unseenCount).toBe(0)
    })
  })

  describe('category filtering', () => {
    it('should toggle category visibility', () => {
      const { toggleCategory } = useConsoleStore.getState()
      
      toggleCategory('ESP')
      
      const { visibleCategories } = useConsoleStore.getState()
      expect(visibleCategories.has('ESP')).toBe(false)
      
      toggleCategory('ESP')
      expect(useConsoleStore.getState().visibleCategories.has('ESP')).toBe(true)
    })

    it('should return only visible entries', () => {
      const { log, getVisibleEntries } = useConsoleStore.getState()
      
      log('ESP', 'info', 'ESP message')
      log('DEBUG', 'info', 'Debug message')
      log('Validation', 'info', 'Validation message')
      
      // Set visible categories to exclude DEBUG
      useConsoleStore.setState({ visibleCategories: new Set(['ESP', 'Validation']) })
      
      const visible = getVisibleEntries()
      expect(visible).toHaveLength(2)
      expect(visible.every(e => e.category !== 'DEBUG')).toBe(true)
    })

    it('should handle multiple categories enabled', () => {
      const { log, getVisibleEntries } = useConsoleStore.getState()
      
      log('ESP', 'info', 'ESP')
      log('Geometry', 'info', 'Geometry')
      log('DEBUG', 'info', 'Debug')
      
      useConsoleStore.setState({ visibleCategories: new Set(['ESP', 'Geometry']) })
      
      const visible = getVisibleEntries()
      expect(visible).toHaveLength(2)
    })
  })

  describe('collapse/expand', () => {
    it('should toggle collapsed state', () => {
      const { setCollapsed } = useConsoleStore.getState()
      
      setCollapsed(true)
      expect(useConsoleStore.getState().isCollapsed).toBe(true)
      
      setCollapsed(false)
      expect(useConsoleStore.getState().isCollapsed).toBe(false)
    })

    it('should reset unseenCount when expanding', () => {
      useConsoleStore.setState({ isCollapsed: true, unseenCount: 5 })
      const { setCollapsed } = useConsoleStore.getState()
      
      setCollapsed(false)
      
      expect(useConsoleStore.getState().unseenCount).toBe(0)
    })

    it('should auto-expand on error when setting enabled', () => {
      useConsoleStore.setState({ 
        isCollapsed: true,
        settings: { ...useConsoleStore.getState().settings, autoExpandOnError: true }
      })
      const { log } = useConsoleStore.getState()
      
      log('ESP', 'error', 'Build failed')
      
      expect(useConsoleStore.getState().isCollapsed).toBe(false)
    })

    it('should not auto-expand on error when setting disabled', () => {
      useConsoleStore.setState({ 
        isCollapsed: true,
        settings: { ...useConsoleStore.getState().settings, autoExpandOnError: false }
      })
      const { log } = useConsoleStore.getState()
      
      log('ESP', 'error', 'Build failed')
      
      expect(useConsoleStore.getState().isCollapsed).toBe(true)
    })
  })

  describe('height management', () => {
    it('should update console height', () => {
      const { setHeight } = useConsoleStore.getState()
      
      setHeight(300)
      
      expect(useConsoleStore.getState().consoleHeight).toBe(300)
    })

    it('should clamp height to min/max bounds', () => {
      const { setHeight } = useConsoleStore.getState()
      
      setHeight(50)  // Too small
      expect(useConsoleStore.getState().consoleHeight).toBe(100)  // Min
      
      setHeight(10000)  // Too large
      expect(useConsoleStore.getState().consoleHeight).toBe(600)  // Max
    })

    it('should persist height to localStorage', () => {
      const { setHeight } = useConsoleStore.getState()
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')
      
      setHeight(250)
      
      expect(setItemSpy).toHaveBeenCalledWith('console-height', '250')
    })
  })
})
