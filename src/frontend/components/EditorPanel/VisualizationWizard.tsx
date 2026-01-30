import { useState } from 'react'
import { X } from 'lucide-react'
import { useAppStore } from '../../store/appStore'
import './VisualizationWizard.css'

interface VisualizationWizardProps {
  onClose: () => void
}

export default function VisualizationWizard({ onClose }: VisualizationWizardProps) {
  const { addVisualizationOutput, configData } = useAppStore()
  
  const [currentStep, setCurrentStep] = useState(1)
  const [createVolume, setCreateVolume] = useState(true)
  const [filename, setFilename] = useState('volume.vtk')
  const [outputMode, setOutputMode] = useState<'checkpoint' | 'iterations'>('checkpoint')
  const [iterationFrequency, setIterationFrequency] = useState(100)

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

  const handleFinish = () => {
    if (createVolume) {
      const vizConfig = {
        type: 'volume',
        filename: filename || generateUniqueFilename('volume'),
        'iteration frequency': outputMode === 'checkpoint' ? -1 : iterationFrequency
      }
      
      addVisualizationOutput(vizConfig)
    }
    
    onClose()
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content wizard-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Configure Visualization</h2>
          <button className="icon-button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="wizard-body">
          <div className="wizard-progress">
            Step {currentStep} of 2
          </div>

          {/* Step 1: Create Volume Visualization */}
          {currentStep === 1 && (
            <div className="wizard-step">
              <h3>Volume Visualization</h3>
              <p className="wizard-description">
                Visualization outputs let you examine the flow field solution. At minimum, create a volume output to see the full domain solution.
              </p>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={createVolume}
                    onChange={(e) => setCreateVolume(e.target.checked)}
                  />
                  <span>Create volume visualization</span>
                </label>
                <span className="form-help">Outputs the entire computational domain</span>
              </div>

              {createVolume && (
                <>
                  <div className="form-group">
                    <label>Filename</label>
                    <input
                      type="text"
                      value={filename}
                      onChange={(e) => setFilename(e.target.value)}
                      placeholder="volume.vtk"
                    />
                    <span className="form-help">Output file will be saved as this name</span>
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
                </>
              )}
            </div>
          )}

          {/* Step 2: Info/Guide */}
          {currentStep === 2 && (
            <div className="wizard-step">
              <h3>✓ Visualization Configured!</h3>
              <p className="wizard-description">
                {createVolume 
                  ? `Your simulation will output the full volume solution to ${filename}.`
                  : 'You can add visualizations later from the configuration tree.'
                }
              </p>

              <div className="wizard-info-box">
                <h4>Additional Visualization Types</h4>
                <p>
                  You can add more visualizations to sample the flow field at specific locations or surfaces:
                </p>
                <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
                  <li><strong>Point</strong> - Sample at a specific (x,y,z) location</li>
                  <li><strong>Line</strong> - Sample along a line segment</li>
                  <li><strong>Plane</strong> - Sample on a 2D plane slice</li>
                  <li><strong>Sphere</strong> - Sample on or within a spherical region</li>
                  <li><strong>Boundary</strong> - Output solution data on mesh surfaces</li>
                </ul>
                <p style={{ marginTop: '12px' }}>
                  To add more visualizations:
                </p>
                <ol style={{ marginLeft: '20px', marginTop: '8px' }}>
                  <li>Find the <strong>"visualization"</strong> node in the configuration tree</li>
                  <li>Click the "+" button to add a new visualization</li>
                  <li>Select the type and define its parameters</li>
                </ol>
              </div>
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

          {currentStep < 2 ? (
            <button 
              className="modal-button modal-button-primary" 
              onClick={() => setCurrentStep(2)}
            >
              Next
            </button>
          ) : (
            <button 
              className="modal-button modal-button-primary" 
              onClick={handleFinish}
            >
              Finish
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
