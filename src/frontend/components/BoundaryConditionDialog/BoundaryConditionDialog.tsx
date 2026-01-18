import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useAppStore } from '../../store/appStore'
import { BoundaryCondition, State } from '../../types/config'
import { Surface } from '../../types/surface'
import { loadBCTypeDescriptions, loadBCTypeInfo, isBCTypeAvailable } from '../../utils/bcTypeDescriptions'
import StateWizard from '../EditorPanel/StateWizard'
import './BoundaryConditionDialog.css'

// BC types that require a state reference
const BC_TYPES_REQUIRING_STATE = [
  'dirichlet',
  'dirichlet profile',
  'strong dirichlet',
  'riemann',
  'mass flux inflow',
  'subsonic inflow total',
  'fixed subsonic inflow',
  'engine inlet'
]

// BC types that require wall temperature (viscous walls)
const BC_TYPES_WITH_WALL_TEMP = [
  'no slip',
  'wall matching',
  'weak no slip'
]

// Complete list of BC types from the schema
const BC_TYPES = [
  'dirichlet',
  'dirichlet profile',
  'strong dirichlet',
  'riemann',
  'extrapolation',
  'slip wall',
  'tangent flow',
  'constant temperature',
  'weak constant temperature',
  'weak radiative equilibrium temperature',
  'symmetry',
  'weak symmetry',
  'no slip',
  'wall matching',
  'weak no slip',
  'axisymmetric pole',
  'back pressure',
  'mms',
  'strong mms',
  'strong-weak hns mms',
  'maxwell mms',
  'gol mms',
  'mass flux inflow',
  'subsonic inflow total',
  'supersonic outflow',
  'fixed subsonic inflow',
  'engine inlet',
  'strong particle wall',
  'particle wall',
  'marshak',
  'strong marshak',
  'weak constant intensity',
  'constant intensity',
  'perfect conductor',
  'insulated wall',
  'freestream em',
  'outflow em'
]

interface BoundaryConditionDialogProps {
  isOpen: boolean
  onClose: () => void
  initialSurface?: Surface // Surface that was right-clicked
}

export default function BoundaryConditionDialog({ 
  isOpen, 
  onClose, 
  initialSurface 
}: BoundaryConditionDialogProps) {
  const { 
    availableSurfaces, 
    configData, 
    addBoundaryCondition, 
    setSelectedBC,
    addState
  } = useAppStore()

  const [bcName, setBcName] = useState('')
  const [bcType, setBcType] = useState('no slip')
  const [selectedSurfaceTags, setSelectedSurfaceTags] = useState<number[]>([])
  const [stateName, setStateName] = useState('')
  const [wallTemperature, setWallTemperature] = useState<'adiabatic' | 'radiative equilibrium' | 'constant'>('adiabatic')
  const [constantTempValue, setConstantTempValue] = useState(300)
  const [bcDescriptions, setBcDescriptions] = useState<Record<string, string>>({})
  const [availableBCTypes, setAvailableBCTypes] = useState<string[]>(BC_TYPES)
  const [showStateWizard, setShowStateWizard] = useState(false)

  // Get list of unassigned surfaces
  const getUnassignedSurfaces = (): Surface[] => {
    const bcs = configData.HyperSolve?.['boundary conditions'] || []
    const assignedTags = new Set<number>()
    
    bcs.forEach(bc => {
      const tags = bc['mesh boundary tags']
      if (Array.isArray(tags)) {
        tags.forEach(tag => {
          if (typeof tag === 'number') assignedTags.add(tag)
          else if (typeof tag === 'string') assignedTags.add(parseInt(tag, 10))
        })
      } else if (typeof tags === 'number') {
        assignedTags.add(tags)
      } else if (typeof tags === 'string') {
        tags.split(',').forEach(t => {
          const parsed = parseInt(t.trim(), 10)
          if (!isNaN(parsed)) assignedTags.add(parsed)
        })
      }
    })
    
    return availableSurfaces.filter(surf => !assignedTags.has(surf.metadata.tag))
  }

  const unassignedSurfaces = getUnassignedSurfaces()

  // Get available states from config

  // Load BC type descriptions on mount
  useEffect(() => {
    loadBCTypeDescriptions().then(descriptions => {
      setBcDescriptions(descriptions)
    loadBCTypeInfo().then(() => {
      // Filter BC types to only show those available for vulcan/hypersolve
      const filtered = BC_TYPES.filter(type => isBCTypeAvailable(type))
      setAvailableBCTypes(filtered)
    })
    })
  }, [])
  const availableStates = Object.keys(configData.HyperSolve?.states || {})

  // Initialize with the surface that was right-clicked
  useEffect(() => {
    if (isOpen && initialSurface) {
      setSelectedSurfaceTags([initialSurface.metadata.tag])
      setBcName(initialSurface.metadata.tagName)
    } else if (isOpen) {
      // Reset form when dialog opens
      setBcName('')
      setBcType('no slip')
      setSelectedSurfaceTags([])
      setStateName('')
      setWallTemperature('adiabatic')
      setConstantTempValue(300)
    }
  }, [isOpen, initialSurface])

  const handleStateChange = (value: string) => {
    if (value === '__CREATE_NEW__') {
      setShowStateWizard(true)
    } else {
      setStateName(value)
    }
  }

  const handleCreateState = (state: State) => {
    addState(state)
    setStateName(state.name)
    setShowStateWizard(false)
  }

  const handleSurfaceToggle = (tag: number) => {
    setSelectedSurfaceTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  const handleSelectAll = () => {
    setSelectedSurfaceTags(unassignedSurfaces.map(s => s.metadata.tag))
  }

  const handleDeselectAll = () => {
    setSelectedSurfaceTags([])
  }

  const handleCreate = () => {
    if (selectedSurfaceTags.length === 0) {
      alert('Please select at least one surface')
      return
    }

    // Check if state is required for this BC type
    if (BC_TYPES_REQUIRING_STATE.includes(bcType) && !stateName) {
      alert(`BC type "${bcType}" requires a state to be selected`)
      return
    }

    // Build the BC object
    const newBC: BoundaryCondition = {
      id: `bc-${Date.now()}`,
      name: bcName || `${bcType} BC`,
      type: bcType,
      'mesh boundary tags': selectedSurfaceTags.length === 1 ? selectedSurfaceTags[0] : selectedSurfaceTags,
    }

    // Add state if required
    if (BC_TYPES_REQUIRING_STATE.includes(bcType) && stateName) {
      newBC.state = stateName
    }

    // Add wall temperature for viscous walls
    if (BC_TYPES_WITH_WALL_TEMP.includes(bcType)) {
      if (wallTemperature === 'constant') {
        newBC['wall temperature'] = constantTempValue
      } else {
        newBC['wall temperature'] = wallTemperature
      }
    }

    addBoundaryCondition(newBC)
    setSelectedBC(newBC)
    onClose()
  }

  if (!isOpen) return null

  const requiresState = BC_TYPES_REQUIRING_STATE.includes(bcType)
  const requiresWallTemp = BC_TYPES_WITH_WALL_TEMP.includes(bcType)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content bc-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create Boundary Condition</h2>
          <button className="close-button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* BC Name */}
          <div className="form-group">
            <label className="form-label">Name</label>
            <input
              type="text"
              className="form-input"
              value={bcName}
              onChange={(e) => setBcName(e.target.value)}
              placeholder="Enter a descriptive name (optional)"
            />
          </div>

          {/* BC Type */}
          <div className="form-group">
            <label className="form-label">Type *</label>
            <select
              className="form-input"
              value={bcType}
              onChange={(e) => setBcType(e.target.value)}
            >
              {availableBCTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            {bcDescriptions[bcType] && (
              <div className="help-text">
                {bcDescriptions[bcType]}
              </div>
            )}
          </div>

          {/* State Selection (conditional) */}
          {requiresState && (
            <div className="form-group">
              <label className="form-label">State *</label>
              <select
                className="form-input"
                value={stateName}
                onChange={(e) => handleStateChange(e.target.value)}
              >
                <option value="">-- Select a state --</option>
                {availableStates.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
                <option value="__CREATE_NEW__">+ Create new state...</option>
              </select>
            </div>
          )}

          {/* Wall Temperature (conditional) */}
          {requiresWallTemp && (
            <div className="form-group">
              <label className="form-label">Wall Temperature *</label>
              <select
                className="form-input"
                value={wallTemperature}
                onChange={(e) => setWallTemperature(e.target.value as any)}
              >
                <option value="adiabatic">Adiabatic</option>
                <option value="radiative equilibrium">Radiative Equilibrium</option>
                <option value="constant">Constant Temperature</option>
              </select>
              {wallTemperature === 'constant' && (
                <input
                  type="number"
                  className="form-input"
                  style={{ marginTop: '8px' }}
                  value={constantTempValue}
                  onChange={(e) => setConstantTempValue(Number(e.target.value))}
                  placeholder="Temperature (K)"
                  min="0"
                />
              )}
            </div>
          )}

          {/* Surface Selection */}
          <div className="form-group">
            <label className="form-label">
              Mesh Surfaces * 
              <span className="label-hint">
                ({selectedSurfaceTags.length} selected)
              </span>
            </label>
            
            {unassignedSurfaces.length === 0 ? (
              <div className="warning-message">
                All surfaces are already assigned to boundary conditions.
              </div>
            ) : (
              <>
                <div className="selection-controls">
                  <button 
                    className="link-button"
                    onClick={handleSelectAll}
                    type="button"
                  >
                    Select All
                  </button>
                  <span className="separator">|</span>
                  <button 
                    className="link-button"
                    onClick={handleDeselectAll}
                    type="button"
                  >
                    Deselect All
                  </button>
                </div>
                
                <div className="surface-checkbox-list">
                  {unassignedSurfaces.map((surface) => (
                    <label key={surface.id} className="surface-checkbox-item">
                      <input
                        type="checkbox"
                        checked={selectedSurfaceTags.includes(surface.metadata.tag)}
                        onChange={() => handleSurfaceToggle(surface.metadata.tag)}
                      />
                      <span className="surface-checkbox-label">
                        {surface.metadata.tagName} 
                        <span className="surface-tag-badge">tag {surface.metadata.tag}</span>
                        {surface.metadata.isLumped && (
                          <span className="surface-lumped-badge">
                            {surface.metadata.originalRegionCount} regions
                          </span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="button button-secondary" onClick={onClose}>
            Cancel
          </button>
          <button 
            className="button button-primary" 
            onClick={handleCreate}
            disabled={selectedSurfaceTags.length === 0}
          >
            Create Boundary Condition
          </button>
        </div>
      </div>

      {showStateWizard && (
        <StateWizard
          onClose={() => setShowStateWizard(false)}
          onCreate={handleCreateState}
        />
      )}
    </div>
  )
}
