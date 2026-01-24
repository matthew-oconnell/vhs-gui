import React, { useEffect, useRef, useState } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { useConsoleStore } from '../../store/consoleStore'
import ConsolePaneView from './ConsolePaneView'
import './ConsolePanel.css'

const ConsolePanel: React.FC = () => {
  const {
    entries,
    isCollapsed,
    consoleHeight,
    unseenCount,
    visibleCategories,
    isSplitView,
    leftPaneCategories,
    rightPaneCategories,
    setCollapsed,
    toggleCategory,
    toggleSplitView,
    toggleLeftCategory,
    toggleRightCategory,
    clear,
    setHeight,
    getVisibleEntries,
    getLeftPaneEntries,
    getRightPaneEntries
  } = useConsoleStore()

  const [isResizing, setIsResizing] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  const visibleEntries = getVisibleEntries()

  // Auto-scroll to bottom when new entries arrive
  useEffect(() => {
    if (contentRef.current && !isCollapsed) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  }, [entries.length, isCollapsed])

  // Handle resize drag
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!panelRef.current) return
      
      const rect = panelRef.current.getBoundingClientRect()
      const newHeight = rect.bottom - e.clientY
      setHeight(newHeight)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, setHeight])

  const formatTimestamp = (date: Date): string => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    })
  }

  const getLevelIcon = (level: string): string => {
    switch (level) {
      case 'error': return '❌'
      case 'warning': return '⚠️'
      case 'success': return '✅'
      case 'info': return 'ℹ️'
      case 'debug': return '🐛'
      default: return '•'
    }
  }

  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      'ESP': '#4ec9b0',
      'DEBUG': '#858585',
      'Validation': '#ce9178',
      'Geometry': '#dcdcaa',
      'Config': '#9cdcfe',
      'Network': '#c586c0',
      'UI': '#4fc1ff',
      'Performance': '#b5cea8'
    }
    return colors[category] || '#cccccc'
  }

  const allCategories: Array<'ESP' | 'DEBUG' | 'Validation' | 'Geometry' | 'Config' | 'Network' | 'UI' | 'Performance'> = 
    ['ESP', 'DEBUG', 'Validation', 'Geometry', 'Config', 'Network', 'UI', 'Performance']

  return (
    <div 
      ref={panelRef}
      className={`console-panel ${isCollapsed ? 'collapsed' : 'expanded'} ${isResizing ? 'resizing' : ''}`}
      style={{ height: isCollapsed ? 'auto' : `${consoleHeight}px` }}
    >
      {/* Resize Handle */}
      {!isCollapsed && (
        <div 
          className="console-resize-handle"
          onMouseDown={handleMouseDown}
        >
          <div className="console-resize-indicator" />
        </div>
      )}

      {/* Header */}
      <div className="console-header">
        <div className="console-header-left">
          <button 
            className="console-toggle-btn"
            onClick={() => setCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Expand Console (Ctrl+`)' : 'Collapse Console (Ctrl+`)'}
          >
            <span className="console-toggle-icon">{isCollapsed ? '▲' : '▼'}</span>
            <span className="console-title">Console</span>
            {isCollapsed && unseenCount > 0 && (
              <span className="console-unseen-badge">{unseenCount}</span>
            )}
          </button>
        </div>

        {!isCollapsed && (
          <>
            <div className="console-header-center">
              {!isSplitView && allCategories.map(category => {
                const isActive = visibleCategories.has(category)
                return (
                  <button
                    key={category}
                    className={`console-category-pill ${isActive ? 'active' : 'inactive'}`}
                    style={{
                      borderColor: isActive ? getCategoryColor(category) : 'transparent',
                      color: isActive ? getCategoryColor(category) : '#858585'
                    }}
                    onClick={() => toggleCategory(category)}
                    title={`${isActive ? 'Hide' : 'Show'} ${category} logs`}
                  >
                    {category}
                  </button>
                )
              })}
            </div>

            <div className="console-header-right">
              <button 
                className="console-split-toggle-btn"
                onClick={() => toggleSplitView()}
                title={isSplitView ? 'Switch to single pane' : 'Split console view'}
              >
                {isSplitView ? '⊟ Single' : '⊞ Split'}
              </button>
              <button 
                className="console-clear-btn"
                onClick={() => clear()}
                title="Clear all console logs"
              >
                🗑️ Clear
              </button>
            </div>
          </>
        )}
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div className="console-content-wrapper">
          {isSplitView ? (
            <PanelGroup direction="horizontal" className="console-split-container">
              <Panel defaultSize={50} minSize={20}>
                <ConsolePaneView
                  entries={entries}
                  visibleCategories={leftPaneCategories}
                  onToggleCategory={toggleLeftCategory}
                  onClear={() => clear()}
                  title="Left Pane"
                  showCategoryFilters={true}
                />
              </Panel>
              
              <PanelResizeHandle className="console-split-handle">
                <div className="console-split-handle-bar" />
              </PanelResizeHandle>
              
              <Panel defaultSize={50} minSize={20}>
                <ConsolePaneView
                  entries={entries}
                  visibleCategories={rightPaneCategories}
                  onToggleCategory={toggleRightCategory}
                  onClear={() => clear()}
                  title="Right Pane"
                  showCategoryFilters={true}
                />
              </Panel>
            </PanelGroup>
          ) : (
            <div ref={contentRef} className="console-content">
              {visibleEntries.length === 0 ? (
                <div className="console-empty">
                  No logs to display. Logs will appear here when events occur.
                </div>
              ) : (
                visibleEntries.map(entry => (
                  <div 
                    key={entry.id} 
                    className={`console-log-entry console-log-${entry.level}`}
                  >
                    <span className="console-log-timestamp">
                      {formatTimestamp(entry.timestamp)}
                    </span>
                    <span 
                      className="console-log-category"
                      style={{ color: getCategoryColor(entry.category) }}
                    >
                      [{entry.category}]
                    </span>
                    <span className="console-log-icon">
                      {getLevelIcon(entry.level)}
                    </span>
                    <span className="console-log-message">
                      {entry.message}
                    </span>
                    {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                      <span className="console-log-metadata">
                        {JSON.stringify(entry.metadata)}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ConsolePanel
