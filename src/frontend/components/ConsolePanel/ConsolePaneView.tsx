import React, { useEffect, useRef } from 'react'
import { ConsoleLogEntry, LogCategory } from '../../store/consoleStore'
import './ConsolePanel.css'

interface ConsolePaneViewProps {
  entries: ConsoleLogEntry[]
  visibleCategories: Set<LogCategory>
  onToggleCategory: (category: LogCategory) => void
  onClear: () => void
  title?: string
  showCategoryFilters?: boolean
}

const ConsolePaneView: React.FC<ConsolePaneViewProps> = ({
  entries,
  visibleCategories,
  onToggleCategory,
  onClear,
  title,
  showCategoryFilters = true
}) => {
  const contentRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new entries arrive
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  }, [entries.length])

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

  const allCategories: LogCategory[] = 
    ['ESP', 'DEBUG', 'Validation', 'Geometry', 'Config', 'Network', 'UI', 'Performance']

  // Filter entries by visible categories
  const filteredEntries = entries.filter(e => visibleCategories.has(e.category))

  return (
    <div className="console-pane-view">
      {/* Pane Header */}
      {(title || showCategoryFilters) && (
        <div className="console-pane-header">
          {title && <div className="console-pane-title">{title}</div>}
          
          {showCategoryFilters && (
            <div className="console-pane-categories">
              {allCategories.map(category => {
                const isActive = visibleCategories.has(category)
                return (
                  <button
                    key={category}
                    className={`console-category-pill ${isActive ? 'active' : 'inactive'}`}
                    style={{
                      borderColor: isActive ? getCategoryColor(category) : 'transparent',
                      color: isActive ? getCategoryColor(category) : '#858585'
                    }}
                    onClick={() => onToggleCategory(category)}
                    title={`${isActive ? 'Hide' : 'Show'} ${category} logs`}
                  >
                    {category}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Pane Content */}
      <div ref={contentRef} className="console-pane-content">
        {filteredEntries.length === 0 ? (
          <div className="console-empty">
            No logs to display. {visibleCategories.size === 0 ? 'Select a category above.' : 'Logs will appear here when events occur.'}
          </div>
        ) : (
          filteredEntries.map(entry => (
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
    </div>
  )
}

export default ConsolePaneView
