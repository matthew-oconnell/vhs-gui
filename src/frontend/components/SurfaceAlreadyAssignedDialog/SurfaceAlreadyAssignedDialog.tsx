import { X } from 'lucide-react'
import { Surface } from '../../types/surface'
import { BoundaryCondition } from '../../types/config'
import './SurfaceAlreadyAssignedDialog.css'

interface SurfaceAlreadyAssignedDialogProps {
  isOpen: boolean
  onClose: () => void
  surface: Surface
  existingBC: BoundaryCondition
  onGoToBC: () => void
  onRemoveAndContinue: () => void
}

export default function SurfaceAlreadyAssignedDialog({
  isOpen,
  onClose,
  surface,
  existingBC,
  onGoToBC,
  onRemoveAndContinue
}: SurfaceAlreadyAssignedDialogProps) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content warning-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Surface Already Assigned</h2>
          <button className="close-button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="warning-icon-container">
            <svg 
              width="48" 
              height="48" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
              className="warning-icon"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          
          <p className="warning-message-text">
            The surface <strong>{surface.metadata.tagName}</strong> (tag {surface.metadata.tag}) 
            is already assigned to boundary condition <strong>{existingBC.name || 'Unnamed BC'}</strong>.
          </p>
          
          <p className="warning-question">
            What would you like to do?
          </p>
        </div>

        <div className="modal-footer">
          <button className="button button-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="button button-secondary" onClick={onGoToBC}>
            Go to BC
          </button>
          <button className="button button-warning" onClick={onRemoveAndContinue}>
            Remove from "{existingBC.name || 'Unnamed BC'}" and Continue
          </button>
        </div>
      </div>
    </div>
  )
}
