import React from 'react'
import './ESPErrorDialog.css'

interface ESPErrorDialogProps {
  isOpen: boolean
  errorLog: string
  onClose: () => void
}

const ESPErrorDialog: React.FC<ESPErrorDialogProps> = ({
  isOpen,
  errorLog,
  onClose
}) => {
  if (!isOpen) return null

  const handleSaveLog = async () => {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = `esp-error-${timestamp}.log`
      
      const blob = new Blob([errorLog], { type: 'text/plain' })
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [
          {
            description: 'Log Files',
            accept: { 'text/plain': ['.log', '.txt'] }
          }
        ]
      })
      
      const writable = await handle.createWritable()
      await writable.write(blob)
      await writable.close()
      
      console.log('[ESPErrorDialog] Log saved to', filename)
      onClose()
    } catch (error) {
      if ((error as any).name !== 'AbortError') {
        console.error('[ESPErrorDialog] Failed to save log:', error)
      }
    }
  }

  return (
    <div className="esp-error-overlay" onClick={onClose}>
      <div className="esp-error-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="esp-error-header">
          <h2>ESP Build Failed</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="esp-error-content">
          <div className="error-message">
            <strong>ESP failed to build the geometry.</strong>
            <p>Review the error log below for details. You can save this log for troubleshooting.</p>
          </div>
          
          <div className="error-log-container">
            <div className="error-log-header">Error Log:</div>
            <pre className="error-log">{errorLog}</pre>
          </div>
        </div>
        
        <div className="esp-error-footer">
          <button className="modal-button modal-button-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="modal-button modal-button-primary" onClick={handleSaveLog}>
            Save Failure Log
          </button>
        </div>
      </div>
    </div>
  )
}

export default ESPErrorDialog
