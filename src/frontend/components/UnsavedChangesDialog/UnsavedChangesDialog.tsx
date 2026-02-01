import React from 'react'
import './UnsavedChangesDialog.css'

interface UnsavedChangesDialogProps {
  isOpen: boolean
  onSave: () => void
  onDiscard: () => void
  onCancel: () => void
}

const UnsavedChangesDialog: React.FC<UnsavedChangesDialogProps> = ({
  isOpen,
  onSave,
  onDiscard,
  onCancel
}) => {
  if (!isOpen) return null

  return (
    <div className="unsaved-changes-overlay">
      <div className="unsaved-changes-dialog">
        <div className="unsaved-changes-header">
          <h2>Unsaved Changes</h2>
        </div>
        
        <div className="unsaved-changes-content">
          <p>You have unsaved changes in your current project.</p>
          <p>Do you want to save them before starting a new project?</p>
        </div>
        
        <div className="unsaved-changes-footer">
          <button className="modal-button modal-button-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className="modal-button modal-button-secondary" onClick={onDiscard}>
            Discard Changes
          </button>
          <button className="modal-button modal-button-primary" onClick={onSave}>
            Save and Continue
          </button>
        </div>
      </div>
    </div>
  )
}

export default UnsavedChangesDialog
