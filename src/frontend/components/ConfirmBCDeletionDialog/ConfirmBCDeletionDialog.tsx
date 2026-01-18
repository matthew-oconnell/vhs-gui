import { X } from 'lucide-react'
import { BoundaryCondition } from '../../types/config'
import './ConfirmBCDeletionDialog.css'

interface ConfirmBCDeletionDialogProps {
  isOpen: boolean
  onClose: () => void
  bc: BoundaryCondition
  onConfirm: () => void
}

export default function ConfirmBCDeletionDialog({
  isOpen,
  onClose,
  bc,
  onConfirm
}: ConfirmBCDeletionDialogProps) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content deletion-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Confirm Boundary Condition Deletion</h2>
          <button className="close-button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="danger-icon-container">
            <svg 
              width="48" 
              height="48" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
              className="danger-icon"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          
          <p className="danger-message-text">
            Removing this surface will leave boundary condition <strong>{bc.name || 'Unnamed BC'}</strong> with no assigned surfaces.
          </p>
          
          <p className="danger-message-text">
            <strong>The boundary condition will be deleted if you continue.</strong>
          </p>
          
          <p className="danger-question">
            Are you sure you want to proceed?
          </p>
        </div>

        <div className="modal-footer">
          <button className="button button-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="button button-danger" onClick={onConfirm}>
            Delete BC and Continue
          </button>
        </div>
      </div>
    </div>
  )
}
