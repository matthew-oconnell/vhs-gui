import { useState } from 'react'
import { X } from 'lucide-react'
import { State } from '../../types/config'
import './StateWizard.css'

type StateMode = 'static' | 'total' | 'densities' | 'advanced' | null

interface StateWizardProps {
  onClose: () => void
  onCreate: (state: State) => void
}

export default function StateWizard({ onClose, onCreate }: StateWizardProps) {
  const [mode, setMode] = useState<StateMode>(null)
  const [stateName, setStateName] = useState('')
  
  // Static conditions fields
  const [machNumber, setMachNumber] = useState('')
  const [temperature, setTemperature] = useState('')
  const [pressure, setPressure] = useState('')
  
  // Total conditions fields
  const [totalTemperature, setTotalTemperature] = useState('')
  const [totalPressure, setTotalPressure] = useState('')
  
  // Densities fields
  const [speed, setSpeed] = useState('')
  
  // Optional fields
  const [angleOfAttack, setAngleOfAttack] = useState('0')
  const [angleOfYaw, setAngleOfYaw] = useState('0')

  const handleCreate = () => {
    const baseState: State = {
      id: `state-${Date.now()}`,
      name: stateName || `state_${Date.now()}`,
      'angle of attack': parseFloat(angleOfAttack) || 0,
      'angle of yaw': parseFloat(angleOfYaw) || 0
    }

    if (mode === 'static') {
      onCreate({
        ...baseState,
        'mach number': parseFloat(machNumber),
        temperature: parseFloat(temperature),
        pressure: parseFloat(pressure)
      })
    } else if (mode === 'total') {
      onCreate({
        ...baseState,
        'mach number': parseFloat(machNumber),
        'total temperature': parseFloat(totalTemperature),
        'total pressure': parseFloat(totalPressure)
      })
    } else if (mode === 'densities') {
      onCreate({
        ...baseState,
        'mach number': parseFloat(machNumber),
        speed: parseFloat(speed),
        temperature: parseFloat(temperature)
      })
    } else if (mode === 'advanced') {
      // Create with just basics, user can edit all fields manually
      onCreate({
        ...baseState,
        'mach number': parseFloat(machNumber) || 0,
        temperature: parseFloat(temperature) || 300,
        pressure: parseFloat(pressure) || 101325
      })
    }
    onClose()
  }

  const isValid = () => {
    if (!stateName) return false
    if (mode === 'static') {
      return machNumber && temperature && pressure
    } else if (mode === 'total') {
      return machNumber && totalTemperature && totalPressure
    } else if (mode === 'densities') {
      return machNumber && speed && temperature
    } else if (mode === 'advanced') {
      return true // Advanced mode is always valid
    }
    return false
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Create New State</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {!mode ? (
            <>
              <p style={{ color: '#b0b0b0', fontSize: '13px', marginBottom: '16px' }}>
                Choose how you want to define your physical state:
              </p>
              <div className="wizard-options">
                <div className="wizard-option" onClick={() => setMode('static')}>
                  <div className="option-title">State from Static Conditions</div>
                  <div className="option-description">
                    Define using Mach number, static temperature, and static pressure
                  </div>
                </div>

                <div className="wizard-option" onClick={() => setMode('total')}>
                  <div className="option-title">State from Total Conditions</div>
                  <div className="option-description">
                    Define using Mach number, total temperature, and total pressure
                  </div>
                </div>

                <div className="wizard-option" onClick={() => setMode('densities')}>
                  <div className="option-title">State from Mach and Densities</div>
                  <div className="option-description">
                    Define using Mach number, speed, and temperature
                  </div>
                </div>

                <div className="wizard-option" onClick={() => setMode('advanced')}>
                  <div className="option-title">It's Complicated</div>
                  <div className="option-description">
                    Create a basic state and edit all fields manually
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="wizard-form">
              <div className="form-group">
                <label className="form-label">State Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                  placeholder="e.g., freestream, inlet_total"
                  autoFocus
                />
              </div>

              {mode === 'static' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Mach Number *</label>
                    <input
                      type="number"
                      className="form-input"
                      value={machNumber}
                      onChange={(e) => setMachNumber(e.target.value)}
                      placeholder="e.g., 0.8"
                      step="0.01"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Static Temperature (K) *</label>
                    <input
                      type="number"
                      className="form-input"
                      value={temperature}
                      onChange={(e) => setTemperature(e.target.value)}
                      placeholder="e.g., 288.15"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Static Pressure (Pa) *</label>
                    <input
                      type="number"
                      className="form-input"
                      value={pressure}
                      onChange={(e) => setPressure(e.target.value)}
                      placeholder="e.g., 101325"
                    />
                  </div>
                </>
              )}

              {mode === 'total' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Mach Number *</label>
                    <input
                      type="number"
                      className="form-input"
                      value={machNumber}
                      onChange={(e) => setMachNumber(e.target.value)}
                      placeholder="e.g., 0.8"
                      step="0.01"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Total Temperature (K) *</label>
                    <input
                      type="number"
                      className="form-input"
                      value={totalTemperature}
                      onChange={(e) => setTotalTemperature(e.target.value)}
                      placeholder="e.g., 300"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Total Pressure (Pa) *</label>
                    <input
                      type="number"
                      className="form-input"
                      value={totalPressure}
                      onChange={(e) => setTotalPressure(e.target.value)}
                      placeholder="e.g., 150000"
                    />
                  </div>
                </>
              )}

              {mode === 'densities' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Mach Number *</label>
                    <input
                      type="number"
                      className="form-input"
                      value={machNumber}
                      onChange={(e) => setMachNumber(e.target.value)}
                      placeholder="e.g., 2.0"
                      step="0.01"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Speed (m/s) *</label>
                    <input
                      type="number"
                      className="form-input"
                      value={speed}
                      onChange={(e) => setSpeed(e.target.value)}
                      placeholder="e.g., 680"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Temperature (K) *</label>
                    <input
                      type="number"
                      className="form-input"
                      value={temperature}
                      onChange={(e) => setTemperature(e.target.value)}
                      placeholder="e.g., 288.15"
                    />
                  </div>
                </>
              )}

              {mode === 'advanced' && (
                <div className="info-box">
                  A basic state will be created. After creation, you can edit all available fields
                  in the property editor to add densities, velocities, or other advanced properties.
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Angle of Attack (deg)</label>
                <input
                  type="number"
                  className="form-input"
                  value={angleOfAttack}
                  onChange={(e) => setAngleOfAttack(e.target.value)}
                  placeholder="0"
                  step="0.1"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Angle of Yaw (deg)</label>
                <input
                  type="number"
                  className="form-input"
                  value={angleOfYaw}
                  onChange={(e) => setAngleOfYaw(e.target.value)}
                  placeholder="0"
                  step="0.1"
                />
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {mode && (
            <button className="modal-button modal-button-secondary" onClick={() => setMode(null)}>
              Back
            </button>
          )}
          <button className="modal-button modal-button-secondary" onClick={onClose}>
            Cancel
          </button>
          {mode && (
            <button
              className="modal-button modal-button-primary"
              onClick={handleCreate}
              disabled={!isValid()}
            >
              Create State
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
