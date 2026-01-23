/**
 * Loading overlay component that displays server output during long operations
 */

import { useEffect, useState } from 'react'
import './LoadingOverlay.css'

interface LoadingOverlayProps {
  message: string
  logLines?: string[]
  onCancel?: () => void
}

const LoadingOverlay = ({ message, logLines = [], onCancel }: LoadingOverlayProps) => {
  const [dots, setDots] = useState('.')
  
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '.' : prev + '.')
    }, 500)
    
    return () => clearInterval(interval)
  }, [])
  
  return (
    <div className="loading-overlay">
      <div className="loading-overlay-content">
        <div className="loading-header">
          <div className="loading-spinner"></div>
          <h3>{message}{dots}</h3>
        </div>
        
        {logLines.length > 0 && (
          <div className="loading-log">
            <div className="loading-log-header">Server Output:</div>
            <div className="loading-log-content">
              {logLines.map((line, idx) => (
                <div key={idx} className="loading-log-line">
                  {line}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {onCancel && (
          <button className="loading-cancel-btn" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}

export default LoadingOverlay
