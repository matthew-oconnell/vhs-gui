import { useState } from 'react'
import { X } from 'lucide-react'
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

  const updateConfig = (updates: Partial<ThermodynamicsConfig>) => {
    setConfig({ ...config, ...updates })
  }

  const handleNext = () => {
    if (currentStep === 1) {
      // Gas model step
      if (config.gasModel === 'ideal-gas') {
        setCurrentStep(2) // Go to ideal gas properties
      } else {
        setCurrentStep(3) // Go to species selection method
      }
    }
    // More navigation logic will be added in later phases
  }

  const handleBack = () => {
    if (currentStep === 2 || currentStep === 3) {
      setCurrentStep(1)
    }
    // More back navigation will be added in later phases
  }

  const handleUpdate = () => {
    onUpdate(config)
    onClose()
  }

  const isStepValid = () => {
    if (currentStep === 1) return config.gasModel !== undefined
    // More validation will be added in later phases
    return true
  }

  const getTotalSteps = () => {
    if (config.gasModel === 'ideal-gas') return 2
    // Will be more complex for multispecies in later phases
    return 3
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

          {/* Step 2: Ideal Gas Properties - Placeholder for Phase 2 */}
          {currentStep === 2 && config.gasModel === 'ideal-gas' && (
            <div className="wizard-step">
              <h3>Ideal Gas Properties</h3>
              <p className="wizard-description">Configure molecular weight and specific heat ratio</p>
              
              <div className="form-section">
                <p className="info-box">Phase 2: Ideal gas property inputs will be added here</p>
              </div>
            </div>
          )}

          {/* Step 3: Species Selection Method - Placeholder for Phase 3+ */}
          {currentStep === 3 && config.gasModel === 'multispecies' && (
            <div className="wizard-step">
              <h3>Species Selection Method</h3>
              <p className="wizard-description">How do you want to select species?</p>
              
              <div className="form-section">
                <p className="info-box">Phase 3+: Multispecies options will be added here</p>
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
