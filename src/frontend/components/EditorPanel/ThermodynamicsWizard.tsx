import { useState } from 'react'
import { X } from 'lucide-react'
import { useAppStore } from '../../store/appStore'
import './ThermodynamicsWizard.css'

interface ThermodynamicsWizardProps {
  onClose: () => void
  onUpdate: (config: ThermodynamicsConfig) => void
}

export interface ThermodynamicsConfig {
  gasModel: 'ideal-gas' | 'multispecies'
  
  // Ideal gas properties
  molecularWeight?: number
  gamma?: number
  
  // Multispecies selection method
  speciesSelectionMethod?: 'planetary' | 'reaction-file' | 'manual'
  
  // Planetary body options
  planetaryBody?: 'earth' | 'mars'
  speciesModel?: '5-species' | '7-species' | '11-species'
  
  // Reaction file
  reactionModelFile?: string
  
  // Manual species selection
  selectedSpecies?: string[]
}

function ThermodynamicsWizard({ onClose, onUpdate }: ThermodynamicsWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [config, setConfig] = useState<ThermodynamicsConfig>({
    gasModel: 'ideal-gas',
    molecularWeight: 28.97,
    gamma: 1.4
  })
  
  const { updateThermodynamics } = useAppStore()

  const updateConfig = (updates: Partial<ThermodynamicsConfig>) => {
    setConfig({ ...config, ...updates })
  }

  const handleNext = () => {
    if (currentStep === 1) {
      // Gas model step
      if (config.gasModel === 'ideal-gas') {
        setCurrentStep(2) // Go to ideal gas properties
      } else {
        setCurrentStep(3) // Go to multispecies selection
      }
    } else if (currentStep === 3 && config.gasModel === 'multispecies') {
      // From multispecies selection to specific configuration
      if (config.speciesSelectionMethod === 'planetary') {
        setCurrentStep(4) // Go to planetary body selection
      } else if (config.speciesSelectionMethod === 'reaction-file') {
        setCurrentStep(5) // Go to reaction file selection
      } else if (config.speciesSelectionMethod === 'manual') {
        setCurrentStep(6) // Go to manual species entry
      }
    }
  }

  const handleBack = () => {
    if (currentStep === 2) {
      setCurrentStep(1) // Back to gas model from ideal gas properties
    } else if (currentStep === 3) {
      setCurrentStep(1) // Back to gas model from multispecies method
    } else if (currentStep === 4 || currentStep === 5 || currentStep === 6) {
      setCurrentStep(3) // Back to multispecies method selection
    }
  }

  const handleUpdate = () => {
    updateThermodynamics(config)
    onUpdate(config)
    onClose()
  }

  const isStepValid = () => {
    if (currentStep === 1) return config.gasModel !== undefined
    if (currentStep === 2 && config.gasModel === 'ideal-gas') {
      return config.molecularWeight !== undefined && 
             config.gamma !== undefined &&
             config.molecularWeight > 0 &&
             config.gamma > 0
    }
    if (currentStep === 3 && config.gasModel === 'multispecies') {
      return config.speciesSelectionMethod !== undefined
    }
    if (currentStep === 4) {
      return config.planetaryBody !== undefined && 
             (config.planetaryBody === 'mars' || config.speciesModel !== undefined)
    }
    return true
  }

  const getTotalSteps = () => {
    if (config.gasModel === 'ideal-gas') return 2
    if (config.gasModel === 'multispecies') {
      if (config.speciesSelectionMethod === 'planetary') return 4
      if (config.speciesSelectionMethod === 'reaction-file') return 5
      if (config.speciesSelectionMethod === 'manual') return 6
      return 3 // Just method selection
    }
    return 1
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content wizard-content">
        <div className="modal-header">
          <h2>Configure Thermodynamics</h2>
          <button className="icon-button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="wizard-body">
          <div className="wizard-progress">
            Step {currentStep} of {getTotalSteps()}
          </div>

          {/* Step 1: Gas Model */}
          {currentStep === 1 && (
            <div className="wizard-step">
              <h3>Select Gas Model</h3>
              <p className="wizard-description">Choose the thermodynamic model for your simulation</p>
              
              <div className="wizard-options">
                <button
                  className={`wizard-option ${config.gasModel === 'ideal-gas' ? 'selected' : ''}`}
                  onClick={() => updateConfig({ gasModel: 'ideal-gas' })}
                >
                  <div className="option-title">Ideal Gas</div>
                  <div className="option-description">Single component with constant properties (configurable γ and molecular weight)</div>
                </button>

                <button
                  className={`wizard-option ${config.gasModel === 'multispecies' ? 'selected' : ''}`}
                  onClick={() => updateConfig({ gasModel: 'multispecies' })}
                >
                  <div className="option-title">Multispecies</div>
                  <div className="option-description">Multiple chemical species with varying composition and properties</div>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Ideal Gas Properties */}
          {currentStep === 2 && config.gasModel === 'ideal-gas' && (
            <div className="wizard-step">
              <h3>Ideal Gas Properties</h3>
              <p className="wizard-description">Configure molecular weight and specific heat ratio</p>
              
              <div className="form-section">
                <div className="form-group">
                  <label className="form-label">Molecular Weight (g/mol)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={config.molecularWeight || ''}
                    onChange={(e) => updateConfig({ molecularWeight: parseFloat(e.target.value) || undefined })}
                    placeholder="28.97"
                    step="0.01"
                  />
                  <div className="info-box" style={{ marginTop: '8px' }}>
                    <strong>Examples:</strong> 28.97 (air), 43.34 (Mars), 39.95 (argon), 4.00 (helium)
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Ratio of Specific Heats (γ)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={config.gamma || ''}
                    onChange={(e) => updateConfig({ gamma: parseFloat(e.target.value) || undefined })}
                    placeholder="1.4"
                    step="0.01"
                  />
                  <div className="info-box" style={{ marginTop: '8px' }}>
                    <strong>Examples:</strong> 1.4 (air, N₂, O₂), 1.29 (CO₂), 1.67 (monatomic), 1.41 (H₂)
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Species Selection Method */}
          {currentStep === 3 && config.gasModel === 'multispecies' && (
            <div className="wizard-step">
              <h3>Species Selection Method</h3>
              <p className="wizard-description">How do you want to configure species?</p>
              
              <div className="wizard-options">
                <button
                  className={`wizard-option ${config.speciesSelectionMethod === 'planetary' ? 'selected' : ''}`}
                  onClick={() => updateConfig({ speciesSelectionMethod: 'planetary' })}
                >
                  <div className="option-title">Planetary Atmosphere</div>
                  <div className="option-description">Pre-configured species sets for Earth, Mars, etc.</div>
                </button>

                <button
                  className={`wizard-option ${config.speciesSelectionMethod === 'reaction-file' ? 'selected' : ''}`}
                  onClick={() => updateConfig({ speciesSelectionMethod: 'reaction-file' })}
                  disabled
                  style={{ opacity: 0.5, cursor: 'not-allowed' }}
                >
                  <div className="option-title">Reaction Mechanism File</div>
                  <div className="option-description">Load species from reaction file (Phase 3 - Coming Soon)</div>
                </button>

                <button
                  className={`wizard-option ${config.speciesSelectionMethod === 'manual' ? 'selected' : ''}`}
                  onClick={() => updateConfig({ speciesSelectionMethod: 'manual' })}
                  disabled
                  style={{ opacity: 0.5, cursor: 'not-allowed' }}
                >
                  <div className="option-title">Manual Entry</div>
                  <div className="option-description">Manually specify species list (Phase 4 - Coming Soon)</div>
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Planetary Body Selection */}
          {currentStep === 4 && config.speciesSelectionMethod === 'planetary' && (
            <div className="wizard-step">
              <h3>Select Planetary Body</h3>
              <p className="wizard-description">Choose atmosphere composition</p>
              
              <div className="form-section">
                <div className="form-group">
                  <label className="form-label">Planetary Body</label>
                  <select
                    className="form-input"
                    value={config.planetaryBody || ''}
                    onChange={(e) => updateConfig({ 
                      planetaryBody: e.target.value as 'earth' | 'mars',
                      // Reset species model when changing planet
                      speciesModel: e.target.value === 'mars' ? undefined : config.speciesModel
                    })}
                  >
                    <option value="">-- Select --</option>
                    <option value="earth">Earth</option>
                    <option value="mars">Mars</option>
                  </select>
                </div>

                {config.planetaryBody === 'earth' && (
                  <div className="form-group">
                    <label className="form-label">Species Model</label>
                    <select
                      className="form-input"
                      value={config.speciesModel || ''}
                      onChange={(e) => updateConfig({ speciesModel: e.target.value as '5-species' | '7-species' | '11-species' })}
                    >
                      <option value="">-- Select --</option>
                      <option value="5-species">5-species (N₂, O₂, NO, N, O)</option>
                      <option value="7-species">7-species (+ NO⁺, e⁻)</option>
                      <option value="11-species">11-species (+ N₂⁺, O₂⁺, N⁺, O⁺)</option>
                    </select>
                    <div className="info-box" style={{ marginTop: '8px' }}>
                      <strong>Recommendation:</strong> Start with 5-species for most applications. 
                      Use 7 or 11-species for high-temperature ionization effects.
                    </div>
                  </div>
                )}

                {config.planetaryBody === 'mars' && (
                  <div className="info-box">
                    <strong>Mars Park Model:</strong> Uses 5 species (CO₂, CO, N₂, O₂, NO) 
                    optimized for Mars atmospheric entry simulations.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {currentStep > 1 && (
            <button className="modal-button modal-button-secondary" onClick={handleBack}>
              Back
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button className="modal-button modal-button-secondary" onClick={onClose}>
            Cancel
          </button>
          <button 
            className="modal-button modal-button-primary" 
            onClick={currentStep === getTotalSteps() ? handleUpdate : handleNext}
            disabled={!isStepValid()}
          >
            {currentStep === getTotalSteps() ? 'Update Thermodynamics' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ThermodynamicsWizard
