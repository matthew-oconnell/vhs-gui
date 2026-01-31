import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useAppStore } from '../../store/appStore'
import { loadVizTypeInfo, getAvailableVizTypesSync, getVizTypeDescriptionsSync } from '../../utils/vizTypeLoader'
import './VisualizationWizard.css'

interface VisualizationWizardProps {
  onClose: () => void
}

export default function VisualizationWizard({ onClose }: VisualizationWizardProps) {
  const { addVisualizationOutput, configData, availableTags } = useAppStore()
  
  const [currentStep, setCurrentStep] = useState(1)
  const [vizType, setVizType] = useState('volume')
  const [filename, setFilename] = useState('volume.vtk')
  const [outputMode, setOutputMode] = useState<'checkpoint' | 'iterations'>('checkpoint')
  const [iterationFrequency, setIterationFrequency] = useState(100)
  const [availableTypes, setAvailableTypes] = useState<string[]>([])
  const [typeDescriptions, setTypeDescriptions] = useState<Record<string, string>>({})
  
  // Load visualization types from schema on mount
  useEffect(() => {
    loadVizTypeInfo().then(() => {
      setAvailableTypes(getAvailableVizTypesSync())
      setTypeDescriptions(getVizTypeDescriptionsSync())
    })
  }, [])
  
  // Type-specific fields
  const [pointLocation, setPointLocation] = useState<[number, number, number]>([0, 0, 0])
  const [lineA, setLineA] = useState<[number, number, number]>([0, 0, 0])
  const [lineB, setLineB] = useState<[number, number, number]>([1, 0, 0])
  const [crinkle, setCrinkle] = useState(false)
  const [planeCenter, setPlaneCenter] = useState<[number, number, number]>([0, 0, 0])
  const [planeNormal, setPlaneNormal] = useState<[number, number, number]>([1, 0, 0])
  const [sphereCenter, setSphereCenter] = useState<[number, number, number]>([0, 0, 0])
  const [sphereRadius, setSphereRadius] = useState(1)
  const [selectedTags, setSelectedTags] = useState<number[]>([])

  // Generate unique filename
  const generateUniqueFilename = (base: string): string => {
    const existingFilenames = (configData.visualization || []).map((v: any) => v.filename)
    const baseFilename = `${base}.vtk`
    
    if (!existingFilenames.includes(baseFilename)) {
      return baseFilename
    }
    
    // Find next available suffix
    let counter = 1
    while (existingFilenames.includes(`${base}_${counter}.vtk`)) {
      counter++
    }
    return `${base}_${counter}.vtk`
  }

  // Update filename when type changes
  const handleTypeChange = (newType: string) => {
    setVizType(newType)
    setFilename(generateUniqueFilename(newType))
  }

  // Tag selection helpers
  const handleTagToggle = (tag: number) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  const handleSelectAllTags = () => {
    setSelectedTags(availableTags.map(s => s.metadata.tag))
  }

  const handleDeselectAllTags = () => {
    setSelectedTags([])
  }

  const handleFinish = () => {
    const vizConfig: any = {
      type: vizType,
      filename: filename || generateUniqueFilename(vizType),
      'iteration frequency': outputMode === 'checkpoint' ? -1 : iterationFrequency
    }

    // Add type-specific fields
    switch (vizType) {
      case 'point':
        vizConfig.location = pointLocation
        break
      case 'line':
        vizConfig.a = lineA
        vizConfig.b = lineB
        if (crinkle) vizConfig.crinkle = true
        break
      case 'plane':
        vizConfig.normal = planeNormal
        if (planeCenter[0] !== 0 || planeCenter[1] !== 0 || planeCenter[2] !== 0) {
          vizConfig.center = planeCenter
        }
        if (crinkle) vizConfig.crinkle = true
        break
      case 'sphere':
        vizConfig.radius = sphereRadius
        if (sphereCenter[0] !== 0 || sphereCenter[1] !== 0 || sphereCenter[2] !== 0) {
          vizConfig.center = sphereCenter
        }
        if (crinkle) vizConfig.crinkle = true
        break
      case 'boundary':
        if (selectedTags.length === 0) {
          alert('Please select at least one mesh boundary tag')
          return
        }
        vizConfig['mesh boundary tags'] = selectedTags.length === 1 ? selectedTags[0] : selectedTags
        break
      case 'volume':
      case 'volume-debug':
        // No additional required fields
        break
    }
    
    addVisualizationOutput(vizConfig)
    onClose()
  }

  // Determine if we need step 2 (type-specific fields)
  const needsStep2 = !['volume', 'volume-debug'].includes(vizType)
  const totalSteps = needsStep2 ? 2 : 1

  const canProceed = () => {
    if (currentStep === 1) {
      return filename.trim() !== ''
    }
    if (currentStep === 2) {
      if (vizType === 'boundary') {
        return selectedTags.length > 0
      }
      return true
    }
    return true
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content wizard-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Visualization</h2>
          <button className="icon-button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="wizard-body">
          <div className="wizard-progress">
            Step {currentStep} of {totalSteps}
          </div>

          {/* Step 1: Type, Filename, and Output Frequency */}
          {currentStep === 1 && (
            <div className="wizard-step">
              <h3>Visualization Setup</h3>
              <p className="wizard-description">
                Configure what part of the flow field to output and how often to save it.
              </p>

              <div className="form-group">
                <label>Visualization Type</label>
                <select
                  value={vizType}
                  onChange={(e) => handleTypeChange(e.target.value)}
                >
                  {availableTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                {typeDescriptions[vizType] && (
                  <span className="form-help">
                    {typeDescriptions[vizType]}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label>Filename</label>
                <input
                  type="text"
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  placeholder="e.g., volume.vtk, plane.csv"
                />
                <span className="form-help">Output file will be saved with this name</span>
              </div>

              <div className="form-group">
                <label>Output Frequency</label>
                <div className="radio-group">
                  <label className="radio-label">
                    <input
                      type="radio"
                      checked={outputMode === 'checkpoint'}
                      onChange={() => setOutputMode('checkpoint')}
                    />
                    <span>Overwrite file at each checkpoint</span>
                  </label>
                  <span className="form-help" style={{ marginLeft: '28px', marginTop: '4px', display: 'block' }}>
                    Single file updated periodically (saves disk space)
                  </span>

                  <label className="radio-label" style={{ marginTop: '12px' }}>
                    <input
                      type="radio"
                      checked={outputMode === 'iterations'}
                      onChange={() => setOutputMode('iterations')}
                    />
                    <span>Create numbered files every N iterations</span>
                  </label>
                  <span className="form-help" style={{ marginLeft: '28px', marginTop: '4px', display: 'block' }}>
                    Multiple files for creating animations
                  </span>
                </div>
              </div>

              {outputMode === 'iterations' && (
                <div className="form-group">
                  <label>Iteration Frequency</label>
                  <input
                    type="number"
                    value={iterationFrequency}
                    onChange={(e) => setIterationFrequency(parseInt(e.target.value))}
                    min="1"
                    step="10"
                  />
                  <span className="form-help">
                    Output every N iterations (e.g., 100 = output every 100 iterations)
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Type-Specific Fields */}
          {currentStep === 2 && (
            <div className="wizard-step">
              <h3>{vizType.charAt(0).toUpperCase() + vizType.slice(1)} Settings</h3>
              <p className="wizard-description">
                Configure the specific parameters for this {vizType} visualization.
              </p>

              {/* Point-specific fields */}
              {vizType === 'point' && (
                <div className="form-group">
                  <label>Location [x, y, z]</label>
                  <div className="vector-input">
                    <input
                      type="number"
                      value={pointLocation[0]}
                      onChange={(e) => setPointLocation([Number(e.target.value), pointLocation[1], pointLocation[2]])}
                      placeholder="x"
                    />
                    <input
                      type="number"
                      value={pointLocation[1]}
                      onChange={(e) => setPointLocation([pointLocation[0], Number(e.target.value), pointLocation[2]])}
                      placeholder="y"
                    />
                    <input
                      type="number"
                      value={pointLocation[2]}
                      onChange={(e) => setPointLocation([pointLocation[0], pointLocation[1], Number(e.target.value)])}
                      placeholder="z"
                    />
                  </div>
                  <span className="form-help">Coordinates of the point to sample</span>
                </div>
              )}

              {/* Line-specific fields */}
              {vizType === 'line' && (
                <>
                  <div className="form-group">
                    <label>Start Point (a) [x, y, z]</label>
                    <div className="vector-input">
                      <input
                        type="number"
                        value={lineA[0]}
                        onChange={(e) => setLineA([Number(e.target.value), lineA[1], lineA[2]])}
                        placeholder="x"
                      />
                      <input
                        type="number"
                        value={lineA[1]}
                        onChange={(e) => setLineA([lineA[0], Number(e.target.value), lineA[2]])}
                        placeholder="y"
                      />
                      <input
                        type="number"
                        value={lineA[2]}
                        onChange={(e) => setLineA([lineA[0], lineA[1], Number(e.target.value)])}
                        placeholder="z"
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>End Point (b) [x, y, z]</label>
                    <div className="vector-input">
                      <input
                        type="number"
                        value={lineB[0]}
                        onChange={(e) => setLineB([Number(e.target.value), lineB[1], lineB[2]])}
                        placeholder="x"
                      />
                      <input
                        type="number"
                        value={lineB[1]}
                        onChange={(e) => setLineB([lineB[0], Number(e.target.value), lineB[2]])}
                        placeholder="y"
                      />
                      <input
                        type="number"
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
                    <span className="form-help">Include cells intersecting the line</span>
                  </div>
                </>
              )}

              {/* Plane-specific fields */}
              {vizType === 'plane' && (
                <>
                  <div className="form-group">
                    <label>Normal [x, y, z]</label>
                    <div className="vector-input">
                      <input
                        type="number"
                        value={planeNormal[0]}
                        onChange={(e) => setPlaneNormal([Number(e.target.value), planeNormal[1], planeNormal[2]])}
                        placeholder="x"
                      />
                      <input
                        type="number"
                        value={planeNormal[1]}
                        onChange={(e) => setPlaneNormal([planeNormal[0], Number(e.target.value), planeNormal[2]])}
                        placeholder="y"
                      />
                      <input
                        type="number"
                        value={planeNormal[2]}
                        onChange={(e) => setPlaneNormal([planeNormal[0], planeNormal[1], Number(e.target.value)])}
                        placeholder="z"
                      />
                    </div>
                    <span className="form-help">Direction perpendicular to the plane</span>
                  </div>
                  <div className="form-group">
                    <label>Center [x, y, z] (optional)</label>
                    <div className="vector-input">
                      <input
                        type="number"
                        value={planeCenter[0]}
                        onChange={(e) => setPlaneCenter([Number(e.target.value), planeCenter[1], planeCenter[2]])}
                        placeholder="x"
                      />
                      <input
                        type="number"
                        value={planeCenter[1]}
                        onChange={(e) => setPlaneCenter([planeCenter[0], Number(e.target.value), planeCenter[2]])}
                        placeholder="y"
                      />
                      <input
                        type="number"
                        value={planeCenter[2]}
                        onChange={(e) => setPlaneCenter([planeCenter[0], planeCenter[1], Number(e.target.value)])}
                        placeholder="z"
                      />
                    </div>
                    <span className="form-help">Point that the plane passes through</span>
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
                    <span className="form-help">Include cells intersecting the plane</span>
                  </div>
                </>
              )}

              {/* Sphere-specific fields */}
              {vizType === 'sphere' && (
                <>
                  <div className="form-group">
                    <label>Radius</label>
                    <input
                      type="number"
                      value={sphereRadius}
                      onChange={(e) => setSphereRadius(Number(e.target.value))}
                      min="0"
                      step="0.1"
                    />
                    <span className="form-help">Radius of the spherical region</span>
                  </div>
                  <div className="form-group">
                    <label>Center [x, y, z] (optional)</label>
                    <div className="vector-input">
                      <input
                        type="number"
                        value={sphereCenter[0]}
                        onChange={(e) => setSphereCenter([Number(e.target.value), sphereCenter[1], sphereCenter[2]])}
                        placeholder="x"
                      />
                      <input
                        type="number"
                        value={sphereCenter[1]}
                        onChange={(e) => setSphereCenter([sphereCenter[0], Number(e.target.value), sphereCenter[2]])}
                        placeholder="y"
                      />
                      <input
                        type="number"
                        value={sphereCenter[2]}
                        onChange={(e) => setSphereCenter([sphereCenter[0], sphereCenter[1], Number(e.target.value)])}
                        placeholder="z"
                      />
                    </div>
                    <span className="form-help">Center of the sphere</span>
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
                    <span className="form-help">Include cells within the sphere</span>
                  </div>
                </>
              )}

              {/* Boundary-specific fields */}
              {vizType === 'boundary' && (
                <div className="form-group">
                  <label>
                    Mesh Boundary Tags 
                    <span className="label-hint">
                      ({selectedTags.length} selected)
                    </span>
                  </label>
                  
                  {availableTags.length === 0 ? (
                    <div className="warning-message" style={{
                      padding: '12px',
                      backgroundColor: '#5a4a1e',
                      border: '1px solid #7f6a2d',
                      borderRadius: '3px',
                      color: '#ffa726',
                      marginTop: '8px'
                    }}>
                      No surfaces available. Please load a mesh file first.
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px', marginBottom: '8px' }}>
                        <button 
                          className="modal-button modal-button-secondary"
                          onClick={handleSelectAllTags}
                          type="button"
                          style={{ fontSize: '12px', padding: '4px 8px' }}
                        >
                          Select All
                        </button>
                        <button 
                          className="modal-button modal-button-secondary"
                          onClick={handleDeselectAllTags}
                          type="button"
                          style={{ fontSize: '12px', padding: '4px 8px' }}
                        >
                          Deselect All
                        </button>
                      </div>
                      
                      <div style={{
                        maxHeight: '300px',
                        overflowY: 'auto',
                        border: '1px solid #3e3e42',
                        borderRadius: '3px',
                        padding: '8px'
                      }}>
                        {availableTags.map((surface) => (
                          <label key={surface.id} style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '6px',
                            cursor: 'pointer',
                            borderRadius: '3px',
                            marginBottom: '2px'
                          }}>
                            <input
                              type="checkbox"
                              checked={selectedTags.includes(surface.metadata.tag)}
                              onChange={() => handleTagToggle(surface.metadata.tag)}
                              style={{ marginRight: '8px' }}
                            />
                            <span>
                              {surface.metadata.tagName} 
                              <span style={{
                                marginLeft: '8px',
                                padding: '2px 6px',
                                backgroundColor: '#3e3e42',
                                borderRadius: '3px',
                                fontSize: '11px',
                                color: '#858585'
                              }}>
                                tag {surface.metadata.tag}
                              </span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer with navigation buttons */}
        <div className="modal-footer">
          {currentStep > 1 && (
            <button 
              className="modal-button modal-button-secondary" 
              onClick={() => setCurrentStep(currentStep - 1)}
            >
              Back
            </button>
          )}
          
          <div style={{ flex: 1 }} />

          {currentStep < totalSteps ? (
            <button 
              className="modal-button modal-button-primary" 
              onClick={() => setCurrentStep(2)}
              disabled={!canProceed()}
            >
              Next
            </button>
          ) : (
            <button 
              className="modal-button modal-button-primary" 
              onClick={handleFinish}
              disabled={!canProceed()}
            >
              {needsStep2 ? 'Create Visualization' : 'Create Visualization'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}