import { useState } from 'react'
import { X, Maximize2 } from 'lucide-react'
import { useAppStore } from '../../store/appStore'
import './TurbulenceWizard.css'

interface TurbulenceWizardProps {
  onClose: () => void
  onOpenPropertyDialog: (node: any) => void
}

export type EquationType = 'euler' | 'laminar' | 'turbulent'
export type TurbulenceModelType = 'sa' | 'sa-neg' | 'sa-catriscons' | 'sstm' | 'sst-2003m' | 'sst-1994m' | 'BSLm' | 'wilcox2006'

export interface TurbulenceConfig {
  equationType: EquationType
  turbulenceModelType?: TurbulenceModelType
}

function TurbulenceWizard({ onClose, onOpenPropertyDialog }: TurbulenceWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [config, setConfig] = useState<TurbulenceConfig>({
    equationType: 'laminar'
  })
  
  const { updateTurbulenceModel, setSelectedNode } = useAppStore()

  const updateConfig = (updates: Partial<TurbulenceConfig>) => {
    setConfig({ ...config, ...updates })
  }

  const handleNext = () => {
    if (currentStep === 1) {
      if (config.equationType === 'turbulent') {
        setCurrentStep(2) // Go to turbulence model selection
      } else {
        // Laminar or Euler selected, complete the wizard
        handleComplete()
      }
    }
  }

  const handleBack = () => {
    if (currentStep === 2) {
      setCurrentStep(1)
    }
  }

  const handleComplete = () => {
    updateTurbulenceModel(config)
    onClose()
  }

  const handleExplodeAndEdit = () => {
    // Save the current configuration
    updateTurbulenceModel(config)
    
    // Close the wizard first
    onClose()
    
    // Then open the property dialog for the turbulence model node (after a short delay)
    setTimeout(() => {
      const turbulenceModelNode = {
        id: 'root.turbulence model',
        label: 'turbulence model',
        type: 'object' as const,
        description: 'Turbulence Model settings'
      }
      // Navigate to the node first
      setSelectedNode(turbulenceModelNode)
      // Then open the property dialog
      onOpenPropertyDialog(turbulenceModelNode)
    }, 100)
  }

  const isStepValid = () => {
    if (currentStep === 1) {
      return config.equationType !== undefined
    }
    if (currentStep === 2) {
      return config.turbulenceModelType !== undefined
    }
    return true
  }

  const getTotalSteps = () => {
    return config.equationType === 'turbulent' ? 2 : 1
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content wizard-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Configure Turbulence Model</h2>
          <button className="icon-button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="wizard-body">
          <div className="wizard-progress">
            Step {currentStep} of {getTotalSteps()}
          </div>

          {/* Step 1: Inviscid, Laminar, or Turbulent */}
          {currentStep === 1 && (
            <div className="wizard-step">
              <h3>Select Simulation Type</h3>
              <p className="wizard-description">Choose the governing equations for your simulation</p>
              
              <div className="wizard-options">
                <button
                  className={`wizard-option ${config.equationType === 'euler' ? 'selected' : ''}`}
                  onClick={() => updateConfig({ equationType: 'euler' })}
                >
                  <div className="option-title">Inviscid (Euler)</div>
                  <div className="option-description">
                    Euler equations - no viscosity or heat conduction. Fastest option for high-speed inviscid flows.
                  </div>
                </button>

                <button
                  className={`wizard-option ${config.equationType === 'laminar' ? 'selected' : ''}`}
                  onClick={() => updateConfig({ equationType: 'laminar' })}
                >
                  <div className="option-title">Laminar</div>
                  <div className="option-description">
                    Viscous flow without turbulence modeling. Use for low Reynolds number flows.
                  </div>
                </button>

                <button
                  className={`wizard-option ${config.equationType === 'turbulent' ? 'selected' : ''}`}
                  onClick={() => updateConfig({ equationType: 'turbulent' })}
                >
                  <div className="option-title">Turbulent</div>
                  <div className="option-description">
                    Include turbulence modeling. Required for high Reynolds number flows with turbulent boundary layers.
                  </div>
                </button>
              </div>

              {config.equationType === 'euler' && (
                <div className="info-box" style={{ marginTop: '16px' }}>
                  <strong>Note:</strong> Inviscid simulations solve the Euler equations without viscosity.
                  Fastest option, suitable for supersonic/hypersonic flows where viscous effects are minimal.
                </div>
              )}

              {config.equationType === 'laminar' && (
                <div className="info-box" style={{ marginTop: '16px' }}>
                  <strong>Note:</strong> Laminar simulations solve the Navier-Stokes equations without turbulence modeling.
                  This is appropriate for low Reynolds number flows.
                </div>
              )}

              {config.equationType === 'turbulent' && (
                <div className="info-box" style={{ marginTop: '16px' }}>
                  <strong>Next:</strong> You'll select a specific turbulence model (SA, SST, etc.) in the next step.
                </div>
              )}
            </div>
          )}

          {/* Step 2: Turbulence Model Selection */}
          {currentStep === 2 && config.equationType === 'turbulent' && (
            <div className="wizard-step">
              <h3>Select Turbulence Model</h3>
              <p className="wizard-description">Choose the turbulence model for your simulation</p>
              
              <div className="form-section">
                <div className="form-group">
                  <label className="form-label">Turbulence Model Type</label>
                  <select
                    className="form-input"
                    value={config.turbulenceModelType || ''}
                    onChange={(e) => updateConfig({ turbulenceModelType: e.target.value as TurbulenceModelType })}
                  >
                    <option value="">-- Select Model --</option>
                    <optgroup label="Spalart-Allmaras (1-equation)">
                      <option value="sa">SA (Standard)</option>
                      <option value="sa-neg">SA-neg (Negative values allowed)</option>
                      <option value="sa-catriscons">SA-catris (Cons formulation)</option>
                    </optgroup>
                    <optgroup label="SST Models (2-equation)">
                      <option value="sstm">SST-m (Menter SST)</option>
                      <option value="sst-2003m">SST-2003m</option>
                      <option value="sst-1994m">SST-1994m</option>
                      <option value="BSLm">BSL-m (Baseline model)</option>
                    </optgroup>
                    <optgroup label="K-Omega Models">
                      <option value="wilcox2006">Wilcox 2006</option>
                    </optgroup>
                  </select>

                  {config.turbulenceModelType && (
                    <div className="info-box" style={{ marginTop: '8px' }}>
                      {config.turbulenceModelType.startsWith('sa') && (
                        <>
                          <strong>Spalart-Allmaras:</strong> One-equation model. Good for aerospace applications, 
                          boundary layers, and attached flows. Fast and robust.
                        </>
                      )}
                      {config.turbulenceModelType.startsWith('sst') && (
                        <>
                          <strong>SST Model:</strong> Two-equation model combining K-epsilon and K-omega. 
                          Excellent for separated flows and adverse pressure gradients.
                        </>
                      )}
                      {config.turbulenceModelType === 'BSLm' && (
                        <>
                          <strong>BSL Model:</strong> Baseline two-equation model. 
                          Foundation of the SST model without production limiter.
                        </>
                      )}
                      {config.turbulenceModelType === 'wilcox2006' && (
                        <>
                          <strong>Wilcox 2006:</strong> Two-equation K-omega model. 
                          Improved cross-diffusion treatment for better free shear flows.
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {config.turbulenceModelType && (
                <div style={{ marginTop: '16px' }}>
                  <button 
                    className="edit-properties-button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleExplodeAndEdit()
                    }}
                    style={{ width: '100%', justifyContent: 'center' }}
                    type="button"
                  >
                    <Maximize2 size={14} /> Edit
                  </button>
                  <div className="info-box" style={{ marginTop: '8px' }}>
                    Click to open the full turbulence model configuration editor with all advanced options.
                  </div>
                </div>
              )}
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
            onClick={currentStep === getTotalSteps() ? handleComplete : handleNext}
            disabled={!isStepValid()}
          >
            {currentStep === getTotalSteps() ? 'Complete' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default TurbulenceWizard
