import { useState } from 'react'
import './SetBCNameDialog.css'

interface SetBCNameDialogProps {
  isOpen: boolean
  onClose: () => void
  onSet: (bcName: string) => void
  surfaceCount: number
  currentBCName?: string
}

function SetBCNameDialog({ isOpen, onClose, onSet, surfaceCount, currentBCName }: SetBCNameDialogProps) {
  const [bcName, setBCName] = useState(currentBCName || '')
  
  if (!isOpen) return null
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (bcName.trim()) {
      onSet(bcName.trim())
      onClose()
    }
  }
  
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }
  
  return (
    <div className="set-bc-name-dialog-backdrop" onClick={handleBackdropClick}>
      <div className="set-bc-name-dialog">
        <div className="set-bc-name-dialog-header">
          <h2>Set BC Name</h2>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="set-bc-name-dialog-content">
            <p className="dialog-description">
              {surfaceCount === 1 
                ? 'Enter a boundary condition name for this surface:' 
                : `Enter a boundary condition name for ${surfaceCount} selected surfaces:`}
            </p>
            
            <div className="form-group">
              <label htmlFor="bc-name-input">BC Name:</label>
              <input
                id="bc-name-input"
                type="text"
                value={bcName}
                onChange={(e) => setBCName(e.target.value)}
                placeholder="e.g., inlet, outlet, wall"
                autoFocus
                className="bc-name-input"
              />
            </div>
            
            <div className="dialog-hint">
              Common names: inlet, outlet, wall, symmetry, farfield
            </div>
          </div>
          
          <div className="set-bc-name-dialog-footer">
            <button type="button" className="modal-button modal-button-secondary" onClick={onClose}>
              Cancel
            </button>
            <button 
              type="submit" 
              className="modal-button modal-button-primary"
              disabled={!bcName.trim()}
            >
              Set BC Name
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default SetBCNameDialog
