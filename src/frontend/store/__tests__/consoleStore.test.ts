import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useConsoleStore, getCategoryColor } from '../consoleStore'

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

  describe('Split View', () => {
    beforeEach(() => {
      // Reset split view state
      useConsoleStore.setState({
        isSplitView: false,
        leftPaneCategories: new Set(['ESP', 'Geometry']),
        rightPaneCategories: new Set(['DEBUG', 'Validation'])
      })
    })

    describe('toggleSplitView()', () => {
      it('should toggle split view on', () => {
        const { toggleSplitView } = useConsoleStore.getState()
        
        toggleSplitView()
        
        expect(useConsoleStore.getState().isSplitView).toBe(true)
      })

      it('should toggle split view off', () => {
        useConsoleStore.setState({ isSplitView: true })
        const { toggleSplitView } = useConsoleStore.getState()
        
        toggleSplitView()
        
        expect(useConsoleStore.getState().isSplitView).toBe(false)
      })

      it('should persist split view state to localStorage', () => {
        const { toggleSplitView } = useConsoleStore.getState()
        const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')
        
        toggleSplitView()
        
        expect(setItemSpy).toHaveBeenCalledWith('console-split-view', 'true')
      })
    })

    describe('toggleLeftCategory()', () => {
      it('should add category to left pane', () => {
        const { toggleLeftCategory } = useConsoleStore.getState()
        
        toggleLeftCategory('Config')
        
        const { leftPaneCategories } = useConsoleStore.getState()
        expect(leftPaneCategories.has('Config')).toBe(true)
      })

      it('should remove category from left pane', () => {
        const { toggleLeftCategory } = useConsoleStore.getState()
        
        toggleLeftCategory('ESP')  // ESP is in default left pane
        
        const { leftPaneCategories } = useConsoleStore.getState()
        expect(leftPaneCategories.has('ESP')).toBe(false)
      })

      it('should persist left pane categories to localStorage', () => {
        const { toggleLeftCategory } = useConsoleStore.getState()
        const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')
        
        toggleLeftCategory('Config')
        
        expect(setItemSpy).toHaveBeenCalledWith(
          'console-left-pane-categories',
          expect.stringContaining('Config')
        )
      })
    })

    describe('toggleRightCategory()', () => {
      it('should add category to right pane', () => {
        const { toggleRightCategory } = useConsoleStore.getState()
        
        toggleRightCategory('ESP')
        
        const { rightPaneCategories } = useConsoleStore.getState()
        expect(rightPaneCategories.has('ESP')).toBe(true)
      })

      it('should remove category from right pane', () => {
        const { toggleRightCategory } = useConsoleStore.getState()
        
        toggleRightCategory('DEBUG')  // DEBUG is in default right pane
        
        const { rightPaneCategories } = useConsoleStore.getState()
        expect(rightPaneCategories.has('DEBUG')).toBe(false)
      })

      it('should persist right pane categories to localStorage', () => {
        const { toggleRightCategory } = useConsoleStore.getState()
        const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')
        
        toggleRightCategory('ESP')
        
        expect(setItemSpy).toHaveBeenCalledWith(
          'console-right-pane-categories',
          expect.stringContaining('ESP')
        )
      })
    })

    describe('getLeftPaneEntries()', () => {
      it('should return entries matching left pane categories', () => {
        const { log, getLeftPaneEntries } = useConsoleStore.getState()
        
        log('ESP', 'info', 'ESP message')
        log('DEBUG', 'info', 'Debug message')
        log('Geometry', 'info', 'Geometry message')
        
        const leftEntries = getLeftPaneEntries()
        
        expect(leftEntries).toHaveLength(2)  // ESP and Geometry
        expect(leftEntries[0].category).toBe('ESP')
        expect(leftEntries[1].category).toBe('Geometry')
      })

      it('should return empty array when no categories match', () => {
        useConsoleStore.setState({ leftPaneCategories: new Set() })
        const { log, getLeftPaneEntries } = useConsoleStore.getState()
        
        log('ESP', 'info', 'Message')
        
        const leftEntries = getLeftPaneEntries()
        expect(leftEntries).toHaveLength(0)
      })
    })

    describe('getRightPaneEntries()', () => {
      it('should return entries matching right pane categories', () => {
        const { log, getRightPaneEntries } = useConsoleStore.getState()
        
        log('DEBUG', 'info', 'Debug message')
        log('ESP', 'info', 'ESP message')
        log('Validation', 'info', 'Validation message')
        
        const rightEntries = getRightPaneEntries()
        
        expect(rightEntries).toHaveLength(2)  // DEBUG and Validation
        expect(rightEntries[0].category).toBe('DEBUG')
        expect(rightEntries[1].category).toBe('Validation')
      })

      it('should allow same category in both panes', () => {
        useConsoleStore.setState({ 
          leftPaneCategories: new Set(['ESP']),
          rightPaneCategories: new Set(['ESP'])
        })
        const { log, getLeftPaneEntries, getRightPaneEntries } = useConsoleStore.getState()
        
        log('ESP', 'info', 'ESP message')
        
        expect(getLeftPaneEntries()).toHaveLength(1)
        expect(getRightPaneEntries()).toHaveLength(1)
      })
    })
  })

  describe('Dynamic Categories', () => {
    it('should accept any string as a category', () => {
      const { log } = useConsoleStore.getState()
      
      // Use completely new category names
      log('MyCustomCategory', 'info', 'Custom message 1')
      log('AnotherCategory', 'success', 'Custom message 2')
      log('YetAnotherOne', 'debug', 'Custom message 3')
      
      const { entries } = useConsoleStore.getState()
      expect(entries).toHaveLength(3)
      expect(entries[0].category).toBe('MyCustomCategory')
      expect(entries[1].category).toBe('AnotherCategory')
      expect(entries[2].category).toBe('YetAnotherOne')
    })

    it('getAvailableCategories() should extract unique categories from entries', () => {
      const { log, getAvailableCategories } = useConsoleStore.getState()
      
      log('ESP', 'info', 'Message 1')
      log('DEBUG', 'info', 'Message 2')
      log('ESP', 'info', 'Message 3')  // Duplicate category
      log('CustomCategory', 'info', 'Message 4')
      log('DEBUG', 'info', 'Message 5')  // Duplicate category
      
      const categories = getAvailableCategories()
      expect(categories).toHaveLength(3)
      expect(categories).toContain('ESP')
      expect(categories).toContain('DEBUG')
      expect(categories).toContain('CustomCategory')
    })

    it('getAvailableCategories() should return sorted categories', () => {
      const { log, getAvailableCategories } = useConsoleStore.getState()
      
      log('Zebra', 'info', 'Message 1')
      log('Alpha', 'info', 'Message 2')
      log('Mike', 'info', 'Message 3')
      
      const categories = getAvailableCategories()
      expect(categories).toEqual(['Alpha', 'Mike', 'Zebra'])
    })

    it('should return empty array when no entries exist', () => {
      const { getAvailableCategories } = useConsoleStore.getState()
      
      const categories = getAvailableCategories()
      expect(categories).toEqual([])
    })

    it('should work with category filtering for custom categories', () => {
      const { log, toggleCategory, getVisibleEntries } = useConsoleStore.getState()
      
      // Add custom category
      log('MyCategory', 'info', 'Custom message')
      log('ESP', 'info', 'ESP message')
      
      // Initially visible based on default settings
      let visible = getVisibleEntries()
      expect(visible.some(e => e.category === 'ESP')).toBe(true)
      
      // Toggle custom category on
      toggleCategory('MyCategory')
      visible = getVisibleEntries()
      expect(visible.some(e => e.category === 'MyCategory')).toBe(true)
      
      // Toggle custom category off
      toggleCategory('MyCategory')
      visible = getVisibleEntries()
      expect(visible.some(e => e.category === 'MyCategory')).toBe(false)
    })
  })

  describe('getCategoryColor()', () => {
    it('should return predefined colors for known categories', () => {
      expect(getCategoryColor('ESP')).toBe('#4ec9b0')
      expect(getCategoryColor('DEBUG')).toBe('#858585')
      expect(getCategoryColor('Validation')).toBe('#ce9178')
      expect(getCategoryColor('Geometry')).toBe('#dcdcaa')
      expect(getCategoryColor('Config')).toBe('#9cdcfe')
      expect(getCategoryColor('Network')).toBe('#c586c0')
      expect(getCategoryColor('UI')).toBe('#4fc1ff')
      expect(getCategoryColor('Performance')).toBe('#b5cea8')
    })

    it('should generate HSL color for unknown categories', () => {
      const color = getCategoryColor('UnknownCategory')
      expect(color).toMatch(/^hsl\(\d+,\s*\d+%,\s*\d+%\)$/)
    })

    it('should generate consistent color for same category', () => {
      const color1 = getCategoryColor('CustomCategory')
      const color2 = getCategoryColor('CustomCategory')
      expect(color1).toBe(color2)
    })

    it('should generate different colors for different categories', () => {
      const color1 = getCategoryColor('Category1')
      const color2 = getCategoryColor('Category2')
      // Colors should be different (hash collision is extremely rare)
      expect(color1).not.toBe(color2)
    })
  })
})
