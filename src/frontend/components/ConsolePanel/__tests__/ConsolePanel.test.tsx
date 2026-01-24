import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ConsolePanel from '../ConsolePanel'
import { useConsoleStore } from '../../../store/consoleStore'

describe('ConsolePanel', () => {
  beforeEach(() => {
    // Reset store to clean state
    useConsoleStore.setState({
      entries: [],
      isCollapsed: false,
      consoleHeight: 300,
      unseenCount: 0,
      visibleCategories: new Set(['ESP', 'DEBUG', 'Validation', 'Geometry', 'Config', 'Network', 'UI', 'Performance']),
      settings: {
        maxEntries: 1000,
        timestampFormat: 'time',
        autoScroll: true,
        autoExpandOnError: true,
        defaultCategories: new Set(['ESP']),
        theme: 'dark'
      }
    })
  })

  describe('rendering', () => {
    it('should render console panel', () => {
      render(<ConsolePanel />)
      expect(screen.getByText('Console')).toBeInTheDocument()
    })

    it('should show empty state when no logs', () => {
      render(<ConsolePanel />)
      expect(screen.getByText(/No logs to display/i)).toBeInTheDocument()
    })

    it('should render log entries', () => {
      const { log } = useConsoleStore.getState()
      log('ESP', 'info', 'Test message 1')
      log('DEBUG', 'error', 'Test message 2')

      render(<ConsolePanel />)
      
      expect(screen.getByText('Test message 1')).toBeInTheDocument()
      expect(screen.getByText('Test message 2')).toBeInTheDocument()
    })

    it('should display timestamps for each entry', () => {
      const { log } = useConsoleStore.getState()
      log('ESP', 'info', 'Test message')

      render(<ConsolePanel />)
      
      // Should have timestamp in HH:MM:SS format
      const timestamps = screen.getAllByText(/\d{2}:\d{2}:\d{2}/)
      expect(timestamps.length).toBeGreaterThan(0)
    })

    it('should display category badges', () => {
      const { log } = useConsoleStore.getState()
      log('ESP', 'info', 'Test message')

      render(<ConsolePanel />)
      
      expect(screen.getByText('[ESP]')).toBeInTheDocument()
    })

    it('should display level icons', () => {
      const { log } = useConsoleStore.getState()
      log('ESP', 'error', 'Error message')
      log('ESP', 'warning', 'Warning message')
      log('ESP', 'success', 'Success message')

      render(<ConsolePanel />)
      
      // Icons should be present (❌, ⚠️, ✅)
      expect(screen.getByText('❌')).toBeInTheDocument()
      expect(screen.getByText('⚠️')).toBeInTheDocument()
      expect(screen.getByText('✅')).toBeInTheDocument()
    })
  })

  describe('collapse/expand', () => {
    it('should toggle collapsed state when clicking toggle button', () => {
      render(<ConsolePanel />)
      
      const toggleBtn = screen.getByTitle(/Collapse Console/i)
      fireEvent.click(toggleBtn)
      
      expect(useConsoleStore.getState().isCollapsed).toBe(true)
    })

    it('should show unseen count badge when collapsed with unseen logs', () => {
      useConsoleStore.setState({ isCollapsed: true, unseenCount: 5 })
      
      render(<ConsolePanel />)
      
      expect(screen.getByText('5')).toBeInTheDocument()
    })

    it('should not show category pills when collapsed', () => {
      useConsoleStore.setState({ isCollapsed: true })
      
      render(<ConsolePanel />)
      
      expect(screen.queryByText('ESP')).not.toBeInTheDocument()
      expect(screen.queryByText('DEBUG')).not.toBeInTheDocument()
    })

    it('should not show clear button when collapsed', () => {
      useConsoleStore.setState({ isCollapsed: true })
      
      render(<ConsolePanel />)
      
      expect(screen.queryByText(/Clear/i)).not.toBeInTheDocument()
    })
  })

  describe('category filtering', () => {
    it('should render all category pills', () => {
      render(<ConsolePanel />)
      
      expect(screen.getByText('ESP')).toBeInTheDocument()
      expect(screen.getByText('DEBUG')).toBeInTheDocument()
      expect(screen.getByText('Validation')).toBeInTheDocument()
      expect(screen.getByText('Geometry')).toBeInTheDocument()
      expect(screen.getByText('Config')).toBeInTheDocument()
      expect(screen.getByText('Network')).toBeInTheDocument()
      expect(screen.getByText('UI')).toBeInTheDocument()
      expect(screen.getByText('Performance')).toBeInTheDocument()
    })

    it('should toggle category visibility when clicking pill', () => {
      render(<ConsolePanel />)
      
      const espPill = screen.getByText('ESP')
      fireEvent.click(espPill)
      
      expect(useConsoleStore.getState().visibleCategories.has('ESP')).toBe(false)
    })

    it('should show active state on visible category pills', () => {
      render(<ConsolePanel />)
      
      const espPill = screen.getByText('ESP')
      expect(espPill).toHaveClass('active')
    })

    it('should show inactive state on hidden category pills', () => {
      useConsoleStore.setState({ 
        visibleCategories: new Set(['ESP']) 
      })
      
      render(<ConsolePanel />)
      
      const debugPill = screen.getByText('DEBUG')
      expect(debugPill).toHaveClass('inactive')
    })

    it('should only display entries from visible categories', () => {
      const { log } = useConsoleStore.getState()
      log('ESP', 'info', 'ESP message')
      log('DEBUG', 'info', 'Debug message')
      
      useConsoleStore.setState({ 
        visibleCategories: new Set(['ESP']) 
      })
      
      render(<ConsolePanel />)
      
      expect(screen.getByText('ESP message')).toBeInTheDocument()
      expect(screen.queryByText('Debug message')).not.toBeInTheDocument()
    })
  })

  describe('clear functionality', () => {
    it('should clear all logs when clicking clear button', () => {
      const { log } = useConsoleStore.getState()
      log('ESP', 'info', 'Message 1')
      log('DEBUG', 'info', 'Message 2')
      
      render(<ConsolePanel />)
      
      const clearBtn = screen.getByText(/Clear/i)
      fireEvent.click(clearBtn)
      
      expect(useConsoleStore.getState().entries).toHaveLength(0)
    })

    it('should show empty state after clearing', () => {
      const { log } = useConsoleStore.getState()
      log('ESP', 'info', 'Message 1')
      
      render(<ConsolePanel />)
      
      const clearBtn = screen.getByText(/Clear/i)
      fireEvent.click(clearBtn)
      
      expect(screen.getByText(/No logs to display/i)).toBeInTheDocument()
    })
  })

  describe('metadata display', () => {
    it('should display metadata when present', () => {
      const { log } = useConsoleStore.getState()
      log('ESP', 'info', 'Test message', { key: 'value', count: 42 })
      
      render(<ConsolePanel />)
      
      expect(screen.getByText(/{"key":"value","count":42}/)).toBeInTheDocument()
    })

    it('should not show metadata section when not present', () => {
      const { log } = useConsoleStore.getState()
      log('ESP', 'info', 'Test message')
      
      const { container } = render(<ConsolePanel />)
      
      const metadataElements = container.querySelectorAll('.console-log-metadata')
      expect(metadataElements).toHaveLength(0)
    })
  })

  describe('resize functionality', () => {
    it('should show resize handle when expanded', () => {
      const { container } = render(<ConsolePanel />)
      
      const resizeHandle = container.querySelector('.console-resize-handle')
      expect(resizeHandle).toBeInTheDocument()
    })

    it('should not show resize handle when collapsed', () => {
      useConsoleStore.setState({ isCollapsed: true })
      
      const { container } = render(<ConsolePanel />)
      
      const resizeHandle = container.querySelector('.console-resize-handle')
      expect(resizeHandle).not.toBeInTheDocument()
    })

    it('should apply height from store', () => {
      useConsoleStore.setState({ consoleHeight: 450 })
      
      const { container } = render(<ConsolePanel />)
      
      const panel = container.querySelector('.console-panel')
      expect(panel).toHaveStyle({ height: '450px' })
    })
  })

  describe('level-specific styling', () => {
    it('should apply error class for error logs', () => {
      const { log } = useConsoleStore.getState()
      log('ESP', 'error', 'Error message')
      
      const { container } = render(<ConsolePanel />)
      
      const errorEntry = container.querySelector('.console-log-error')
      expect(errorEntry).toBeInTheDocument()
    })

    it('should apply warning class for warning logs', () => {
      const { log } = useConsoleStore.getState()
      log('ESP', 'warning', 'Warning message')
      
      const { container } = render(<ConsolePanel />)
      
      const warningEntry = container.querySelector('.console-log-warning')
      expect(warningEntry).toBeInTheDocument()
    })

    it('should apply success class for success logs', () => {
      const { log } = useConsoleStore.getState()
      log('ESP', 'success', 'Success message')
      
      const { container } = render(<ConsolePanel />)
      
      const successEntry = container.querySelector('.console-log-success')
      expect(successEntry).toBeInTheDocument()
    })
  })
})
