import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useAppStore } from '../../store/appStore'
import { useConsoleStore } from '../../store/consoleStore'
import StateWizard, { SavedWizardState } from './StateWizard'
import ThermodynamicsWizard from './ThermodynamicsWizard'
import './InitializationWizard.css'

interface InitializationWizardProps {
  onClose: () => void
}

export default function InitializationWizard({ onClose }: InitializationWizardProps) {
  const { configData, setInitialState, setInitializationWizardExecuted, addState } = useAppStore()
  const { log } = useConsoleStore()
  
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedState, setSelectedState] = useState('')
  const [showStateWizard, setShowStateWizard] = useState(false)
  const [showThermoWizard, setShowThermoWizard] = useState(false)
  const [savedStateWizardState, setSavedStateWizardState] = useState<SavedWizardState | undefined>(undefined)

  // Get available states from configData
  const getAvailableStates = (): string[] => {
    if (!configData.states) return []
    return Object.keys(configData.states)
  }

  // Initialize with current initial state if it exists
  useEffect(() => {
    const initialState = configData['initial state']
    if (initialState && typeof initialState === 'string') {
      setSelectedState(initialState)
    }
  }, [configData])

  const availableStates = getAvailableStates()

  const handleFinish = () => {
    if (selectedState) {
      setInitialState(selectedState)
      setInitializationWizardExecuted(true)
      onClose()
    }
  }

  const handleCreateState = () => {
    log('DEBUG', 'info', '[InitWizard] Opening state wizard for new state creation')
    setShowStateWizard(true)
  }

  const handleStateCreated = (newState: any) => {
    try {
      log('DEBUG', 'info', `[InitWizard] handleStateCreated called with state: ${newState.name}`)
      log('DEBUG', 'info', `[InitWizard] State object: ${JSON.stringify(newState)}`)
      addState(newState)
      log('DEBUG', 'success', `[InitWizard] State added to store`)
      setSelectedState(newState.name)
      log('DEBUG', 'success', `[InitWizard] State auto-selected: ${newState.name}`)
      setShowStateWizard(false)
      log('DEBUG', 'success', `[InitWizard] State wizard closed - returning to initialization wizard`)
      setSavedStateWizardState(undefined) // Clear saved state after successful creation
    } catch (error) {
      log('DEBUG', 'error', `[InitWizard] Error in handleStateCreated: ${error}`)
      console.error('[InitWizard] Error:', error)
    }
  }

  const canProceed = () => {
    if (currentStep === 1) {
      return selectedState !== ''
    }
    return true
  }

  return (
    <>
      <div className="modal-overlay">
        <div className="modal-content wizard-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Configure Initialization</h2>
            <button className="icon-button" onClick={onClose}>
              <X size={18} />
            </button>
          </div>

          <div className="wizard-body">
            <div className="wizard-progress">
              Step {currentStep} of 2
            </div>

            {/* Step 1: Select/Create Initial State */}
            {currentStep === 1 && (
              <div className="wizard-step">
                <h3>Select Initial State</h3>
                <p className="wizard-description">
                  The initial state defines the flow conditions throughout the entire domain at the start of the simulation.
                </p>

                {availableStates.length > 0 ? (
                  <div className="form-group">
                    <label>Initial State</label>
                    <select 
                      value={selectedState} 
                      onChange={(e) => setSelectedState(e.target.value)}
                      className="wizard-select"
                    >
                      <option value="">-- Select a state --</option>
                      {availableStates.map(stateName => (
                        <option key={stateName} value={stateName}>
                          {stateName}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="wizard-info-box">
                    <p>No states defined yet. Create a state to use as the initial condition.</p>
                  </div>
                )}

                <button 
                  className="modal-button modal-button-secondary"
                  onClick={handleCreateState}
                  style={{ marginTop: '16px' }}
                >
                  Create New State
                </button>
              </div>
            )}

            {/* Step 2: Info/Guide */}
            {currentStep === 2 && (
              <div className="wizard-step">
                <h3>✓ Initial State Configured!</h3>
                <p className="wizard-description">
                  Your simulation will start with the <strong>{selectedState}</strong> state applied throughout the entire domain.
                </p>

                <div className="wizard-info-box">
                  <h4>Optional: Initialization Regions</h4>
                  <p>
                    You can override the initial state in specific areas by adding <strong>initialization regions</strong>.
                    These allow you to set different flow conditions in boxes, spheres, cylinders, or other geometric regions.
                  </p>
                  <p style={{ marginTop: '12px' }}>
                    To add initialization regions:
                  </p>
                  <ol style={{ marginLeft: '20px', marginTop: '8px' }}>
                    <li>Find the <strong>"initialization regions"</strong> node in the configuration tree</li>
                    <li>Click the "+" button to add a new region</li>
                    <li>Select the region type and define its geometry</li>
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
                disabled={!canProceed()}
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

      {/* State Wizard (modal within modal) */}
      {showStateWizard && (
        <StateWizard
          onClose={() => {
            log('DEBUG', 'info', '[InitWizard] State wizard closed by user (cancel)')
            setShowStateWizard(false)
            setSavedStateWizardState(undefined) // Clear saved state on cancel
          }}
          onCreate={handleStateCreated}
          onOpenThermodynamics={() => {
            log('DEBUG', 'info', '[InitWizard] Opening thermodynamics wizard from state wizard')
            // State is already saved via onSaveState callback
            setShowStateWizard(false)
            setShowThermoWizard(true)
          }}
          savedState={savedStateWizardState}
          onSaveState={setSavedStateWizardState}
        />
      )}
      
      {showThermoWizard && (
        <ThermodynamicsWizard
          onClose={() => {
            log('DEBUG', 'info', '[InitWizard] Thermodynamics wizard closed')
            setShowThermoWizard(false)
            // Reopen state wizard with saved state if it existed
            if (savedStateWizardState) {
              log('DEBUG', 'info', '[InitWizard] Reopening state wizard with saved state')
              setShowStateWizard(true)
            }
          }}
          onUpdate={() => {
            log('DEBUG', 'success', '[InitWizard] Thermodynamics updated')
            // Wizard updates configData directly via updateThermodynamics store action
          }}
        />
      )}
    </>
  )
}
