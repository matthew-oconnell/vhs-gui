import { useState, useEffect } from 'react'
import { useAppStore } from '../../store/appStore'
import { useConsoleStore } from '../../store/consoleStore'
import { Surface } from '../../types/tag'
import './AddToBCDialog.css'

interface AddToBCDialogProps {
  isOpen: boolean
  onClose: () => void
  surfaces: Surface[]
}

export default function AddToBCDialog({ isOpen, onClose, surfaces }: AddToBCDialogProps) {
  const { log } = useConsoleStore()
  const { configData, updateBoundaryCondition } = useAppStore()
  const [selectedBCId, setSelectedBCId] = useState<string>('')

  const bcs = configData['boundary conditions'] || []

  // DIAGNOSTIC: Log when component renders or props change
  useEffect(() => {
    log('AddToBCDialog', 'info', '🔍 Component render/update', { isOpen, surfaceCount: surfaces.length, bcCount: bcs.length })
  }, [isOpen, surfaces.length, bcs.length])

  useEffect(() => {
    if (isOpen && bcs.length > 0 && !selectedBCId) {
      setSelectedBCId(bcs[0].id)
    }
  }, [isOpen, bcs])

  const handleAdd = () => {
    if (!selectedBCId) return

    const bc = bcs.find(b => b.id === selectedBCId)
    if (!bc) return

    // Get current tags
    let currentTags: (number | string)[] = []
    const meshTags = bc['mesh boundary tags']
    
    if (Array.isArray(meshTags)) {
      currentTags = [...meshTags]
    } else if (typeof meshTags === 'number') {
      currentTags = [meshTags]
    } else if (typeof meshTags === 'string') {
      currentTags = meshTags.split(',').map(s => s.trim())
    }

    // Add new tags from selected surfaces
    const newTags = surfaces.map(s => s.metadata.tag)
    
    // Merge and deduplicate
    const mergedTags = [...currentTags, ...newTags]
    const uniqueTags = Array.from(new Set(mergedTags.map(t => Number(t)))).sort((a, b) => a - b)

    // Update the boundary condition
    updateBoundaryCondition(selectedBCId, {
      'mesh boundary tags': uniqueTags.length === 1 ? uniqueTags[0] : uniqueTags
    })

    onClose()
  }

  if (!isOpen) return null

  if (bcs.length === 0) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content add-to-bc-dialog" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Add to Boundary Condition</h2>
            <button className="close-button" onClick={onClose}>×</button>
          </div>
          <div className="modal-body">
            <p>No boundary conditions available. Create a boundary condition first.</p>
          </div>
          <div className="modal-footer">
            <button className="modal-button modal-button-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content add-to-bc-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add to Boundary Condition</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <div className="info-section">
            <p>
              Adding {surfaces.length} surface{surfaces.length > 1 ? 's' : ''} to an existing boundary condition:
            </p>
            <ul className="surface-list">
              {surfaces.slice(0, 5).map(s => (
                <li key={s.id}>{s.metadata.tagName || `Tag ${s.metadata.tag}`}</li>
              ))}
              {surfaces.length > 5 && <li>... and {surfaces.length - 5} more</li>}
            </ul>
          </div>

          <div className="form-group">
            <label htmlFor="bc-select">Select Boundary Condition:</label>
            <select
              id="bc-select"
              value={selectedBCId}
              onChange={(e) => setSelectedBCId(e.target.value)}
              className="bc-select"
            >
              {bcs.map(bc => (
                <option key={bc.id} value={bc.id}>
                  {bc.name || bc.type || 'Unnamed BC'}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="modal-footer">
          <button className="modal-button modal-button-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="modal-button modal-button-primary"
            onClick={handleAdd}
            disabled={!selectedBCId}
          >
            Add to BC
          </button>
        </div>
      </div>
    </div>
  )
}
