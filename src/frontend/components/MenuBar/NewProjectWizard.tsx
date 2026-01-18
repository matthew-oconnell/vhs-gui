import { useState } from 'react'
import { X } from 'lucide-react'
import './NewProjectWizard.css'

interface NewProjectWizardProps {
  onClose: () => void
  onCreate: (config: ProjectConfig) => void
}

export interface ProjectConfig {
  gasModel: 'single-species' | 'multispecies'
  speciesType?: 'non-reacting' | 'reacting'
  reactionType?: 'edl' | 'combustion'
  planetaryBody?: 'earth' | 'mars'
  speciesModel?: '5-species' | '7-species' | '11-species'
  reactionModelFile?: string
  timeMode: 'steady' | 'unsteady'
  timeAccuracy?: {
    timeStep?: number
    endTime?: number
    cfl?: number
    scheme?: string
  }
}

function NewProjectWizard({ onClose, onCreate }: NewProjectWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [config, setConfig] = useState<ProjectConfig>({
    gasModel: 'single-species',
    timeMode: 'steady'
  })

  const updateConfig = (updates: Partial<ProjectConfig>) => {
    setConfig({ ...config, ...updates })
  }

  const handleNext = () => {
    // Determine next step based on current selections
    if (currentStep === 1) {
      // Gas model step
      if (config.gasModel === 'multispecies') {
        setCurrentStep(2) // Go to species type
      } else {
        setCurrentStep(5) // Skip to time mode
      }
    } else if (currentStep === 2) {
      // Species type step
      if (config.speciesType === 'reacting') {
        setCurrentStep(3) // Go to reaction type
      } else {
        setCurrentStep(5) // Skip to time mode
      }
    } else if (currentStep === 3) {
      // Reaction type step
      if (config.reactionType === 'edl') {
        setCurrentStep(4) // Go to planetary body
      } else if (config.reactionType === 'combustion') {
        setCurrentStep(4.5) // Go to reaction model file
      }
    } else if (currentStep === 4) {
      // Planetary body step (EDL only)
      if (config.planetaryBody === 'earth') {
        setCurrentStep(4.2) // Go to species model selection
      } else {
        setCurrentStep(5) // Mars has only one model, skip to time mode
      }
    } else if (currentStep === 4.2) {
      // Species model step (Earth EDL only)
      setCurrentStep(5) // Go to time mode
    } else if (currentStep === 4.5) {
      // Reaction model file step (Combustion only)
      setCurrentStep(5) // Go to time mode
    } else if (currentStep === 5) {
      // Time mode step
      if (config.timeMode === 'unsteady') {
        setCurrentStep(6) // Go to time accuracy
      } else {
        // Finish - create project
        handleCreate()
      }
    } else if (currentStep === 6) {
      // Time accuracy step - finish
      handleCreate()
    }
  }

  const handleBack = () => {
    if (currentStep === 6) {
      setCurrentStep(5)
    } else if (currentStep === 5) {
      // Coming back from time mode
      if (config.reactionType === 'combustion') {
        setCurrentStep(4.5)
      } else if (config.reactionType === 'edl' && config.planetaryBody === 'earth') {
        setCurrentStep(4.2)
      } else if (config.reactionType === 'edl') {
        setCurrentStep(4)
      } else if (config.gasModel === 'multispecies' && config.speciesType === 'reacting') {
        setCurrentStep(3)
      } else if (config.gasModel === 'multispecies') {
        setCurrentStep(2)
      } else {
        setCurrentStep(1)
      }
    } else if (currentStep === 4.5) {
      setCurrentStep(3)
    } else if (currentStep === 4.2) {
      setCurrentStep(4)
    } else if (currentStep === 4) {
      setCurrentStep(3)
    } else if (currentStep === 3) {
      setCurrentStep(2)
    } else if (currentStep === 2) {
      setCurrentStep(1)
    }
  }

  const handleCreate = () => {
    onCreate(config)
    onClose()
  }

  const isStepValid = () => {
    if (currentStep === 1) return config.gasModel !== undefined
    if (currentStep === 2) return config.speciesType !== undefined
    if (currentStep === 3) return config.reactionType !== undefined
    if (currentStep === 4) return config.planetaryBody !== undefined
    if (currentStep === 4.2) return config.speciesModel !== undefined
    if (currentStep === 4.5) return config.reactionModelFile !== undefined && config.reactionModelFile !== ''
    if (currentStep === 5) return config.timeMode !== undefined
    if (currentStep === 6) {
      // Time accuracy is optional fields, so always valid
      return true
    }
    return false
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content wizard-content">
        <div className="modal-header">
          <h2>New Project Wizard</h2>
          <button className="icon-button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="wizard-body">
          <div className="wizard-progress">
            Step {currentStep} of {config.gasModel === 'single-species' 
              ? (config.timeMode === 'steady' ? 2 : 3)
              : (config.speciesType === 'non-reacting' 
                  ? (config.timeMode === 'steady' ? 3 : 4)
                  : (config.timeMode === 'steady' ? 4 : 5)
                )
            }
          </div>

          {/* Step 1: Gas Model */}
          {currentStep === 1 && (
            <div className="wizard-step">
              <h3>Select Gas Model</h3>
              <p className="wizard-description">Choose the thermodynamic model for your simulation</p>
              
              <div className="wizard-options">
                <button
                  className={`wizard-option ${config.gasModel === 'single-species' ? 'selected' : ''}`}
                  onClick={() => updateConfig({ gasModel: 'single-species' })}
                >
                  <div className="option-title">Single Species Perfect Gas</div>
                  <div className="option-description">Air as a single component with constant properties</div>
                </button>

                <button
                  className={`wizard-option ${config.gasModel === 'multispecies' ? 'selected' : ''}`}
                  onClick={() => updateConfig({ gasModel: 'multispecies' })}
                >
                  <div className="option-title">Multispecies</div>
                  <div className="option-description">Multiple chemical species with varying composition</div>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Species Type (conditional) */}
          {currentStep === 2 && (
            <div className="wizard-step">
              <h3>Species Type</h3>
              <p className="wizard-description">Are the species chemically reacting?</p>
              
              <div className="wizard-options">
                <button
                  className={`wizard-option ${config.speciesType === 'non-reacting' ? 'selected' : ''}`}
                  onClick={() => updateConfig({ speciesType: 'non-reacting', reactionType: undefined })}
                >
                  <div className="option-title">Non-Reacting</div>
                  <div className="option-description">Species mix but do not chemically react</div>
                </button>

                <button
                  className={`wizard-option ${config.speciesType === 'reacting' ? 'selected' : ''}`}
                  onClick={() => updateConfig({ speciesType: 'reacting' })}
                >
                  <div className="option-title">Reacting</div>
                  <div className="option-description">Species undergo chemical reactions</div>
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Reaction Type (conditional) */}
          {currentStep === 3 && (
            <div className="wizard-step">
              <h3>Reaction Type</h3>
              <p className="wizard-description">What type of chemistry are you modeling?</p>
              
              <div className="wizard-options">
                <button
                  className={`wizard-option ${config.reactionType === 'edl' ? 'selected' : ''}`}
                  onClick={() => updateConfig({ reactionType: 'edl', reactionModelFile: undefined })}
                >
                  <div className="option-title">Entry Descent Landing (EDL)</div>
                  <div className="option-description">Endothermic chemistry for atmospheric entry</div>
                </button>

                <button
                  className={`wizard-option ${config.reactionType === 'combustion' ? 'selected' : ''}`}
                  onClick={() => updateConfig({ reactionType: 'combustion', planetaryBody: undefined, speciesModel: undefined })}
                >
                  <div className="option-title">Combustion</div>
                  <div className="option-description">Exothermic chemistry for burning/propulsion</div>
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Planetary Body (EDL only) */}
          {currentStep === 4 && (
            <div className="wizard-step">
              <h3>Planetary Body</h3>
              <p className="wizard-description">Select the atmospheric environment</p>
              
              <div className="wizard-options">
                <button
                  className={`wizard-option ${config.planetaryBody === 'earth' ? 'selected' : ''}`}
                  onClick={() => updateConfig({ planetaryBody: 'earth' })}
                >
                  <div className="option-title">Earth</div>
                  <div className="option-description">Earth atmosphere - choose from 5, 7, or 11 species air models</div>
                </button>

                <button
                  className={`wizard-option ${config.planetaryBody === 'mars' ? 'selected' : ''}`}
                  onClick={() => updateConfig({ planetaryBody: 'mars', speciesModel: '5-species' })}
                >
                  <div className="option-title">Mars</div>
                  <div className="option-description">Mars atmosphere - 5 species Park model</div>
                </button>
              </div>
            </div>
          )}

          {/* Step 4.2: Species Model (Earth EDL only) */}
          {currentStep === 4.2 && (
            <div className="wizard-step">
              <h3>Earth Atmosphere Species Model</h3>
              <p className="wizard-description">Select the fidelity of the air chemistry model</p>
              
              <div className="wizard-options">
                <button
                  className={`wizard-option ${config.speciesModel === '5-species' ? 'selected' : ''}`}
                  onClick={() => updateConfig({ speciesModel: '5-species' })}
                >
                  <div className="option-title">5 Species Air</div>
                  <div className="option-description">N₂, O₂, NO, N, O - Basic air dissociation</div>
                </button>

                <button
                  className={`wizard-option ${config.speciesModel === '7-species' ? 'selected' : ''}`}
                  onClick={() => updateConfig({ speciesModel: '7-species' })}
                >
                  <div className="option-title">7 Species Air</div>
                  <div className="option-description">Adds NO⁺, e⁻ - Includes ionization</div>
                </button>

                <button
                  className={`wizard-option ${config.speciesModel === '11-species' ? 'selected' : ''}`}
                  onClick={() => updateConfig({ speciesModel: '11-species' })}
                >
                  <div className="option-title">11 Species Air</div>
                  <div className="option-description">Full air chemistry with additional ions</div>
                </button>
              </div>
            </div>
          )}

          {/* Step 4.5: Reaction Model File (Combustion only) */}
          {currentStep === 4.5 && (
            <div className="wizard-step">
              <h3>Reaction Model File</h3>
              <p className="wizard-description">Load the chemical reaction mechanism file</p>
              
              <div className="form-section">
                <div className="form-group">
                  <label className="form-label">Reaction Model File Path</label>
                  <input
                    type="text"
                    className="form-input"
                    value={config.reactionModelFile || ''}
                    onChange={(e) => updateConfig({ reactionModelFile: e.target.value })}
                    placeholder="e.g., /path/to/reaction_model.yaml"
                  />
                  <span className="default-hint">
                    File will be parsed to extract species list for thermodynamics section
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Time Mode */}
          {currentStep === 5 && (
            <div className="wizard-step">
              <h3>Time Dependency</h3>
              <p className="wizard-description">Is this a steady-state or time-dependent simulation?</p>
              
              <div className="wizard-options">
                <button
                  className={`wizard-option ${config.timeMode === 'steady' ? 'selected' : ''}`}
                  onClick={() => updateConfig({ timeMode: 'steady', timeAccuracy: undefined })}
                >
                  <div className="option-title">Steady State</div>
                  <div className="option-description">Solution converges to time-invariant state</div>
                </button>

                <button
                  className={`wizard-option ${config.timeMode === 'unsteady' ? 'selected' : ''}`}
                  onClick={() => updateConfig({ timeMode: 'unsteady' })}
                >
                  <div className="option-title">Time Dependent (Unsteady)</div>
                  <div className="option-description">Solution evolves over physical time</div>
                </button>
              </div>
            </div>
          )}

          {/* Step 6: Time Accuracy Settings (conditional) */}
          {currentStep === 6 && (
            <div className="wizard-step">
              <h3>Time Accuracy Settings</h3>
              <p className="wizard-description">Configure temporal discretization parameters (optional)</p>
              
              <div className="form-section">
                <div className="form-group">
                  <label className="form-label">Time Step (Δt)</label>
                  <input
                    type="number"
                    className="form-input"
                    step="0.0001"
                    value={config.timeAccuracy?.timeStep || ''}
                    onChange={(e) => updateConfig({
                      timeAccuracy: { 
                        ...config.timeAccuracy, 
                        timeStep: e.target.value ? parseFloat(e.target.value) : undefined 
                      }
                    })}
                    placeholder="e.g., 0.001"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">End Time</label>
                  <input
                    type="number"
                    className="form-input"
                    step="0.1"
                    value={config.timeAccuracy?.endTime || ''}
                    onChange={(e) => updateConfig({
                      timeAccuracy: { 
                        ...config.timeAccuracy, 
                        endTime: e.target.value ? parseFloat(e.target.value) : undefined 
                      }
                    })}
                    placeholder="e.g., 1.0"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">CFL Number</label>
                  <input
                    type="number"
                    className="form-input"
                    step="0.1"
                    value={config.timeAccuracy?.cfl || ''}
                    onChange={(e) => updateConfig({
                      timeAccuracy: { 
                        ...config.timeAccuracy, 
                        cfl: e.target.value ? parseFloat(e.target.value) : undefined 
                      }
                    })}
                    placeholder="e.g., 0.9"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Temporal Scheme</label>
                  <select
                    className="form-input"
                    value={config.timeAccuracy?.scheme || ''}
                    onChange={(e) => updateConfig({
                      timeAccuracy: { 
                        ...config.timeAccuracy, 
                        scheme: e.target.value || undefined 
                      }
                    })}
                  >
                    <option value="">Select scheme...</option>
                    <option value="bdf1">BDF1 (Backward Euler)</option>
                    <option value="bdf2">BDF2</option>
                    <option value="rk4">Runge-Kutta 4th Order</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {currentStep > 1 && (
            <button className="modal-button-secondary" onClick={handleBack}>
              Back
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button className="modal-button-secondary" onClick={onClose}>
            Cancel
          </button>
          <button 
            className="modal-button-primary" 
            onClick={handleNext}
            disabled={!isStepValid()}
          >
            {(currentStep === 5 && config.timeMode === 'steady') || currentStep === 6 ? 'Create Project' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default NewProjectWizard
