import { useState } from 'react'
import { X } from 'lucide-react'
import { useAppStore } from '../../store/appStore'
import './TimeAccuracyWizard.css'

interface TimeAccuracyWizardProps {
  onClose: () => void
}

export default function TimeAccuracyWizard({ onClose }: TimeAccuracyWizardProps) {
  const { updateTimeAccuracy } = useAppStore()
  
  const [currentStep, setCurrentStep] = useState(1)
  const [mode, setMode] = useState<'steady' | 'unsteady'>('steady')
  
  // Steady state settings
  const [timesteppingType, setTimesteppingType] = useState<'local timestepping' | 'global timestepping'>('local timestepping')
  
  // Unsteady settings
  const [timestep, setTimestep] = useState(4e-3)
  const [order, setOrder] = useState(1)
  const [subiterations, setSubiterations] = useState(20)
  const [subiterationTolerance, setSubiterationTolerance] = useState(1e-3)
  
  // Common settings
  const [startingCfl, setStartingCfl] = useState('1.0')
  const [cflMin, setCflMin] = useState('1e-3')
  const [cflMax, setCflMax] = useState('1e6')
  const [steps, setSteps] = useState(1000)
  
  // Advanced options
  const [showAdvanced, setShowAdvanced] = useState(false)

  const handleFinish = () => {
    const config = {
      mode,
      timesteppingType,
      timestep,
      order,
      subiterations,
      subiterationTolerance,
      startingCfl: parseFloat(startingCfl) || 1.0,
      cflMin: parseFloat(cflMin) || 1e-3,
      cflMax: parseFloat(cflMax) || 1e6,
      steps
    }
    
    updateTimeAccuracy(config)
    onClose()
  }

  const getTotalSteps = () => {
    return showAdvanced ? 3 : 2
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content wizard-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Configure Time Accuracy</h2>
          <button className="icon-button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="wizard-body">
          <div className="wizard-progress">
            Step {currentStep} of {getTotalSteps()}
          </div>

          {/* Step 1: Steady or Unsteady */}
          {currentStep === 1 && (
            <div className="wizard-step">
              <h3>Select Simulation Mode</h3>
              <p className="wizard-description">
                Choose whether this is a steady-state or time-accurate (unsteady) simulation.
              </p>

              <div className="wizard-options">
                <button
                  className={`wizard-option ${mode === 'steady' ? 'selected' : ''}`}
                  onClick={() => setMode('steady')}
                >
                  <div className="option-title">Steady State</div>
                  <div className="option-description">
                    Converge to a time-independent solution using pseudo-timestepping
                  </div>
                </button>

                <button
                  className={`wizard-option ${mode === 'unsteady' ? 'selected' : ''}`}
                  onClick={() => setMode('unsteady')}
                >
                  <div className="option-title">Unsteady (Time-Accurate)</div>
                  <div className="option-description">
                    Resolve time-dependent physics with fixed physical timesteps
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Step 2a: Steady State Settings */}
          {currentStep === 2 && mode === 'steady' && (
            <div className="wizard-step">
              <h3>Steady State Configuration</h3>
              <p className="wizard-description">
                Configure pseudo-timestepping for steady-state convergence.
              </p>

              <div className="form-group">
                <label>Timestepping Type</label>
                <div className="radio-group">
                  <label className="radio-label">
                    <input
                      type="radio"
                      checked={timesteppingType === 'local timestepping'}
                      onChange={() => setTimesteppingType('local timestepping')}
                    />
                    <span>Local Timestepping (recommended)</span>
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      checked={timesteppingType === 'global timestepping'}
                      onChange={() => setTimesteppingType('global timestepping')}
                    />
                    <span>Global Timestepping</span>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>Starting CFL</label>
                <input
                  type="text"
                  value={startingCfl}
                  onChange={(e) => setStartingCfl(e.target.value)}
                  placeholder="e.g., 1.0 or 1.0e-3"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Min CFL</label>
                  <input
                    type="text"
                    value={cflMin}
                    onChange={(e) => setCflMin(e.target.value)}
                    placeholder="e.g., 1e-3"
                  />
                </div>
                <div className="form-group">
                  <label>Max CFL</label>
                  <input
                    type="text"
                    value={cflMax}
                    onChange={(e) => setCflMax(e.target.value)}
                    placeholder="e.g., 1e6"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Steps (Iterations)</label>
                <input
                  type="number"
                  value={steps}
                  onChange={(e) => setSteps(parseInt(e.target.value))}
                  step="100"
                  min="1"
                />
              </div>
            </div>
          )}

          {/* Step 2b: Unsteady Settings */}
          {currentStep === 2 && mode === 'unsteady' && (
            <div className="wizard-step">
              <h3>Unsteady Configuration</h3>
              <p className="wizard-description">
                Configure fixed physical timestep for time-accurate simulation using BDF integration.
              </p>

              <div className="form-group">
                <label>Physical Timestep (seconds)</label>
                <input
                  type="number"
                  value={timestep}
                  onChange={(e) => setTimestep(parseFloat(e.target.value))}
                  step="0.0001"
                  min="0"
                />
                <span className="form-help">Time elapsed per iteration in physical seconds</span>
              </div>

              <div className="form-group">
                <label>BDF Order</label>
                <div className="radio-group">
                  <label className="radio-label">
                    <input
                      type="radio"
                      checked={order === 1}
                      onChange={() => setOrder(1)}
                    />
                    <span>Order 1 (First-order accurate)</span>
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      checked={order === 2}
                      onChange={() => setOrder(2)}
                    />
                    <span>Order 2 (Second-order accurate)</span>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>Subiterations</label>
                <input
                  type="number"
                  value={subiterations}
                  onChange={(e) => setSubiterations(parseInt(e.target.value))}
                  step="1"
                  min="1"
                />
                <span className="form-help">Nonlinear iterations per timestep</span>
              </div>

              <div className="form-group">
                <label>Subiteration Tolerance</label>
                <input
                  type="number"
                  value={subiterationTolerance}
                  onChange={(e) => setSubiterationTolerance(parseFloat(e.target.value))}
                  step="0.0001"
                  min="0"
                  max="1"
                />
                <span className="form-help">Relative tolerance for nonlinear convergence</span>
              </div>

              <div className="form-group">
                <label>Starting CFL</label>
                <input
                  type="text"
                  value={startingCfl}
                  onChange={(e) => setStartingCfl(e.target.value)}
                  placeholder="e.g., 1.0 or 1.0e-3"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Min CFL</label>
                  <input
                    type="text"
                    value={cflMin}
                    onChange={(e) => setCflMin(parseFloat(e.target.value) || 0)}
                    placeholder="e.g., 1e-3"
                  />
                </div>
                <div className="form-group">
                  <label>Max CFL</label>
                  <input
                    type="text"
                    value={cflMax}
                    onChange={(e) => setCflMax(parseFloat(e.target.value) || 0)}
                    placeholder="e.g., 1e6"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Steps (Timesteps)</label>
                <input
                  type="number"
                  value={steps}
                  onChange={(e) => setSteps(parseInt(e.target.value))}
                  step="100"
                  min="1"
                />
                <span className="form-help">Total number of physical timesteps to simulate</span>
              </div>
            </div>
          )}

          {/* Step 3: Advanced Options */}
          {currentStep === 3 && (
            <div className="wizard-step">
              <h3>Advanced Options</h3>
              <p className="wizard-description">
                Additional time integration settings (optional).
              </p>

              <div className="wizard-info-box">
                <p>
                  Advanced options are currently configured with default values.
                  You can modify these later in the configuration tree under <strong>"time accuracy"</strong> and <strong>"nonlinear solver"</strong>.
                </p>
                <p style={{ marginTop: '12px' }}>
                  Advanced settings include:
                </p>
                <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
                  <li>Turbulent CFL ratio</li>
                  <li>Viscous timestep limits</li>
                  <li>CFL increase/decrease factors</li>
                  <li>Linesearch thresholds</li>
                  <li>And more...</li>
                </ul>
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

          {currentStep === 2 && (
            <button 
              className="modal-button modal-button-secondary" 
              onClick={() => {
                setShowAdvanced(true)
                setCurrentStep(3)
              }}
            >
              Advanced Options
            </button>
          )}

          {currentStep < getTotalSteps() ? (
            <button 
              className="modal-button modal-button-primary" 
              onClick={() => {
                if (currentStep === 2 && !showAdvanced) {
                  handleFinish()
                } else {
                  setCurrentStep(currentStep + 1)
                }
              }}
            >
              {currentStep === 2 && !showAdvanced ? 'Finish' : 'Next'}
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
