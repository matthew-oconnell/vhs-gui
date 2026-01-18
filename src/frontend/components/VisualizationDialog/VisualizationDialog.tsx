import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useAppStore } from '../../store/appStore'
import './VisualizationDialog.css'

// Visualization types from the schema
const VISUALIZATION_TYPES = [
  'point',
  'line',
  'plane',
  'sphere',
  'boundary',
  'volume',
  'volume-debug'
]

// Type descriptions for user guidance
const VIZ_TYPE_DESCRIPTIONS: Record<string, string> = {
  'point': 'Sample the solution at a specific point in the domain',
  'line': 'Sample the solution along a line segment',
  'plane': 'Sample the solution on a plane slice through the domain',
  'sphere': 'Sample the solution on or within a sphere',
  'boundary': 'Output solution data on specific mesh boundary surfaces',
  'volume': 'Output the full domain flow field solution',
  'volume-debug': 'Output only volume cells (debug mode)'
}

interface VisualizationDialogProps {
  isOpen: boolean
  onClose: () => void
}

export default function VisualizationDialog({ isOpen, onClose }: VisualizationDialogProps) {
  const { configData, setConfigData, availableSurfaces, setSelectedViz } = useAppStore()

  const [vizType, setVizType] = useState('volume')
  const [filename, setFilename] = useState('')
  const [iterationFrequency, setIterationFrequency] = useState(-1)
  
  // Point-specific fields
  const [pointLocation, setPointLocation] = useState<[number, number, number]>([0, 0, 0])
  
  // Line-specific fields
  const [lineA, setLineA] = useState<[number, number, number]>([0, 0, 0])
  const [lineB, setLineB] = useState<[number, number, number]>([1, 0, 0])
  const [crinkle, setCrinkle] = useState(false)
  
  // Plane-specific fields
  const [planeCenter, setPlaneCenter] = useState<[number, number, number]>([0, 0, 0])
  const [planeNormal, setPlaneNormal] = useState<[number, number, number]>([1, 0, 0])
  
  // Sphere-specific fields
  const [sphereCenter, setSphereCenter] = useState<[number, number, number]>([0, 0, 0])
  const [sphereRadius, setSphereRadius] = useState(1)
  
  // Boundary-specific fields
  const [selectedTags, setSelectedTags] = useState<number[]>([])

  // Helper function to generate unique filename
  const generateUniqueFilename = (type: string): string => {
    const existingFilenames = (configData.visualization || []).map((v: any) => v.filename)
    const baseFilename = `${type}.vtk`
    
    if (!existingFilenames.includes(baseFilename)) {
      return baseFilename
    }
    
    // Find next available suffix (a, b, c, ...)
    const letters = 'abcdefghijklmnopqrstuvwxyz'
    for (let i = 0; i < letters.length; i++) {
      const filename = `${type}_${letters[i]}.vtk`
      if (!existingFilenames.includes(filename)) {
        return filename
      }
    }
    
    // Fallback to numbered if we run out of letters
    let counter = 1
    while (existingFilenames.includes(`${type}_${counter}.vtk`)) {
      counter++
    }
    return `${type}_${counter}.vtk`
  }

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setVizType('volume')
      setFilename(generateUniqueFilename('volume'))
      setIterationFrequency(-1)
      setPointLocation([0, 0, 0])
      setLineA([0, 0, 0])
      setLineB([1, 0, 0])
      setCrinkle(false)
      setPlaneCenter([0, 0, 0])
      setPlaneNormal([1, 0, 0])
      setSphereCenter([0, 0, 0])
      setSphereRadius(1)
      setSelectedTags([])
    }
  }, [isOpen])

  // Update filename when type changes
  useEffect(() => {
    if (isOpen && filename) {
      // Only auto-update if the current filename matches the pattern <type>.vtk or <type>_x.vtk
      const currentTypePattern = new RegExp(`^(${VISUALIZATION_TYPES.join('|')})(_[a-z0-9]+)?\\.vtk$`)
      if (currentTypePattern.test(filename)) {
        setFilename(generateUniqueFilename(vizType))
      }
    }
  }, [vizType])

  const handleTagToggle = (tag: number) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  const handleSelectAllTags = () => {
    setSelectedTags(availableSurfaces.map(s => s.metadata.tag))
  }

  const handleDeselectAllTags = () => {
    setSelectedTags([])
  }

  const handleCreate = () => {
    if (!filename) {
      alert('Please enter a filename')
      return
    }

    // Build the visualization object based on type
    const newViz: any = {
      type: vizType,
      filename: filename
    }

    // Add optional common fields
    if (iterationFrequency > 0) {
      newViz['iteration frequency'] = iterationFrequency
    }

    // Add type-specific required fields
    switch (vizType) {
      case 'point':
        newViz.location = pointLocation
        break
      case 'line':
        newViz.a = lineA
        newViz.b = lineB
        if (crinkle) newViz.crinkle = true
        break
      case 'plane':
        newViz.normal = planeNormal
        if (planeCenter[0] !== 0 || planeCenter[1] !== 0 || planeCenter[2] !== 0) {
          newViz.center = planeCenter
        }
        if (crinkle) newViz.crinkle = true
        break
      case 'sphere':
        newViz.radius = sphereRadius
        if (sphereCenter[0] !== 0 || sphereCenter[1] !== 0 || sphereCenter[2] !== 0) {
          newViz.center = sphereCenter
        }
        if (crinkle) newViz.crinkle = true
        break
      case 'boundary':
        if (selectedTags.length === 0) {
          alert('Please select at least one mesh boundary tag')
          return
        }
        newViz['mesh boundary tags'] = selectedTags.length === 1 ? selectedTags[0] : selectedTags
        break
      case 'volume':
      case 'volume-debug':
        // No additional required fields
        break
    }

    // Add visualization to the config
    const updatedConfig = { ...configData }
    if (!updatedConfig.visualization) {
      updatedConfig.visualization = []
    }
    updatedConfig.visualization.push(newViz)
    setConfigData(updatedConfig)

    // Select the newly created visualization
    const newIndex = updatedConfig.visualization.length - 1
    setSelectedViz({ data: newViz, index: newIndex })

    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content viz-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create Visualization</h2>
          <button className="close-button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Visualization Type */}
          <div className="form-group">
            <label className="form-label">Type *</label>
            <select
              className="form-input"
              value={vizType}
              onChange={(e) => setVizType(e.target.value)}
            >
              {VISUALIZATION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            {VIZ_TYPE_DESCRIPTIONS[vizType] && (
              <div className="help-text">
                {VIZ_TYPE_DESCRIPTIONS[vizType]}
              </div>
            )}
          </div>

          {/* Filename */}
          <div className="form-group">
            <label className="form-label">Filename *</label>
            <input
              type="text"
              className="form-input"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="e.g., output.vtk, plane.csv"
            />
            <div className="help-text">
              Common formats: .vtk, .csv, .dat, .plt
            </div>
          </div>

          {/* Point-specific fields */}
          {vizType === 'point' && (
            <div className="form-group">
              <label className="form-label">Location [x, y, z] *</label>
              <div className="vector-input">
                <input
                  type="number"
                  className="form-input"
                  value={pointLocation[0]}
                  onChange={(e) => setPointLocation([Number(e.target.value), pointLocation[1], pointLocation[2]])}
                  placeholder="x"
                />
                <input
                  type="number"
                  className="form-input"
                  value={pointLocation[1]}
                  onChange={(e) => setPointLocation([pointLocation[0], Number(e.target.value), pointLocation[2]])}
                  placeholder="y"
                />
                <input
                  type="number"
                  className="form-input"
                  value={pointLocation[2]}
                  onChange={(e) => setPointLocation([pointLocation[0], pointLocation[1], Number(e.target.value)])}
                  placeholder="z"
                />
              </div>
            </div>
          )}

          {/* Line-specific fields */}
          {vizType === 'line' && (
            <>
              <div className="form-group">
                <label className="form-label">Start Point (a) [x, y, z] *</label>
                <div className="vector-input">
                  <input
                    type="number"
                    className="form-input"
                    value={lineA[0]}
                    onChange={(e) => setLineA([Number(e.target.value), lineA[1], lineA[2]])}
                    placeholder="x"
                  />
                  <input
                    type="number"
                    className="form-input"
                    value={lineA[1]}
                    onChange={(e) => setLineA([lineA[0], Number(e.target.value), lineA[2]])}
                    placeholder="y"
                  />
                  <input
                    type="number"
                    className="form-input"
                    value={lineA[2]}
                    onChange={(e) => setLineA([lineA[0], lineA[1], Number(e.target.value)])}
                    placeholder="z"
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">End Point (b) [x, y, z] *</label>
                <div className="vector-input">
                  <input
                    type="number"
                    className="form-input"
                    value={lineB[0]}
                    onChange={(e) => setLineB([Number(e.target.value), lineB[1], lineB[2]])}
                    placeholder="x"
                  />
                  <input
                    type="number"
                    className="form-input"
                    value={lineB[1]}
                    onChange={(e) => setLineB([lineB[0], Number(e.target.value), lineB[2]])}
                    placeholder="y"
                  />
                  <input
                    type="number"
                    className="form-input"
                    value={lineB[2]}
                    onChange={(e) => setLineB([lineB[0], lineB[1], Number(e.target.value)])}
                    placeholder="z"
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={crinkle}
                    onChange={(e) => setCrinkle(e.target.checked)}
                  />
                  <span>Crinkle cut</span>
                </label>
              </div>
            </>
          )}

          {/* Plane-specific fields */}
          {vizType === 'plane' && (
            <>
              <div className="form-group">
                <label className="form-label">Normal [x, y, z] *</label>
                <div className="vector-input">
                  <input
                    type="number"
                    className="form-input"
                    value={planeNormal[0]}
                    onChange={(e) => setPlaneNormal([Number(e.target.value), planeNormal[1], planeNormal[2]])}
                    placeholder="x"
                  />
                  <input
                    type="number"
                    className="form-input"
                    value={planeNormal[1]}
                    onChange={(e) => setPlaneNormal([planeNormal[0], Number(e.target.value), planeNormal[2]])}
                    placeholder="y"
                  />
                  <input
                    type="number"
                    className="form-input"
                    value={planeNormal[2]}
                    onChange={(e) => setPlaneNormal([planeNormal[0], planeNormal[1], Number(e.target.value)])}
                    placeholder="z"
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Center [x, y, z]</label>
                <div className="vector-input">
                  <input
                    type="number"
                    className="form-input"
                    value={planeCenter[0]}
                    onChange={(e) => setPlaneCenter([Number(e.target.value), planeCenter[1], planeCenter[2]])}
                    placeholder="x"
                  />
                  <input
                    type="number"
                    className="form-input"
                    value={planeCenter[1]}
                    onChange={(e) => setPlaneCenter([planeCenter[0], Number(e.target.value), planeCenter[2]])}
                    placeholder="y"
                  />
                  <input
                    type="number"
                    className="form-input"
                    value={planeCenter[2]}
                    onChange={(e) => setPlaneCenter([planeCenter[0], planeCenter[1], Number(e.target.value)])}
                    placeholder="z"
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={crinkle}
                    onChange={(e) => setCrinkle(e.target.checked)}
                  />
                  <span>Crinkle cut</span>
                </label>
              </div>
            </>
          )}

          {/* Sphere-specific fields */}
          {vizType === 'sphere' && (
            <>
              <div className="form-group">
                <label className="form-label">Radius *</label>
                <input
                  type="number"
                  className="form-input"
                  value={sphereRadius}
                  onChange={(e) => setSphereRadius(Number(e.target.value))}
                  min="0"
                  step="0.1"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Center [x, y, z]</label>
                <div className="vector-input">
                  <input
                    type="number"
                    className="form-input"
                    value={sphereCenter[0]}
                    onChange={(e) => setSphereCenter([Number(e.target.value), sphereCenter[1], sphereCenter[2]])}
                    placeholder="x"
                  />
                  <input
                    type="number"
                    className="form-input"
                    value={sphereCenter[1]}
                    onChange={(e) => setSphereCenter([sphereCenter[0], Number(e.target.value), sphereCenter[2]])}
                    placeholder="y"
                  />
                  <input
                    type="number"
                    className="form-input"
                    value={sphereCenter[2]}
                    onChange={(e) => setSphereCenter([sphereCenter[0], sphereCenter[1], Number(e.target.value)])}
                    placeholder="z"
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={crinkle}
                    onChange={(e) => setCrinkle(e.target.checked)}
                  />
                  <span>Crinkle cut (include interior)</span>
                </label>
              </div>
            </>
          )}

          {/* Boundary-specific fields */}
          {vizType === 'boundary' && (
            <div className="form-group">
              <label className="form-label">
                Mesh Boundary Tags * 
                <span className="label-hint">
                  ({selectedTags.length} selected)
                </span>
              </label>
              
              {availableSurfaces.length === 0 ? (
                <div className="warning-message">
                  No surfaces available. Please load a mesh file first.
                </div>
              ) : (
                <>
                  <div className="selection-controls">
                    <button 
                      className="link-button"
                      onClick={handleSelectAllTags}
                      type="button"
                    >
                      Select All
                    </button>
                    <span className="separator">|</span>
                    <button 
                      className="link-button"
                      onClick={handleDeselectAllTags}
                      type="button"
                    >
                      Deselect All
                    </button>
                  </div>
                  
                  <div className="surface-checkbox-list">
                    {availableSurfaces.map((surface) => (
                      <label key={surface.id} className="surface-checkbox-item">
                        <input
                          type="checkbox"
                          checked={selectedTags.includes(surface.metadata.tag)}
                          onChange={() => handleTagToggle(surface.metadata.tag)}
                        />
                        <span className="surface-checkbox-label">
                          {surface.metadata.tagName} 
                          <span className="surface-tag-badge">tag {surface.metadata.tag}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Common options */}
          <div className="form-group">
            <label className="form-label">Iteration Frequency</label>
            <input
              type="number"
              className="form-input"
              value={iterationFrequency}
              onChange={(e) => setIterationFrequency(Number(e.target.value))}
              placeholder="-1 (use checkpoint frequency)"
            />
            <div className="help-text">
              Output every N iterations. -1 means use the checkpoint frequency.
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="button button-secondary" onClick={onClose}>
            Cancel
          </button>
          <button 
            className="button button-primary" 
            onClick={handleCreate}
          >
            Create Visualization
          </button>
        </div>
      </div>
    </div>
  )
}
