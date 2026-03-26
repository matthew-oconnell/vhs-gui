import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { State } from '../../types/config'
import { useAppStore } from '../../store/appStore'
import { useConsoleStore } from '../../store/consoleStore'
import MapEditor from '../MapEditor/MapEditor'
import { 
  isSingleSpecies, 
  getSpeciesList, 
  validateMassFractions,
  initializeMassFractions 
} from '../../utils/thermodynamicsUtils'
import './StateWizard.css'

type StateMode = 'static' | 'total' | 'densities' | 'mach-density' | 'advanced' | null

// Wizard state for persistence
export interface SavedWizardState {
  mode: StateMode
  stateName: string
  machNumber: string
  temperature: string
  pressure: string
  totalTemperature: string
  totalPressure: string
  speed: string
  angleOfAttack: string
  density: string
  angleOfYaw: string
  massFractions: Record<string, number>
}

interface StateWizardProps {
  onClose: () => void
  onCreate: (state: State) => void
  onOpenThermodynamics?: () => void
  savedState?: SavedWizardState | null
  onSaveState?: (state: SavedWizardState) => void
}

export default function StateWizard({ onClose, onCreate, onOpenThermodynamics, savedState, onSaveState }: StateWizardProps) {
  const { configData } = useAppStore()
  const { log } = useConsoleStore()
  
  // Log wizard instantiation with prop status
  useEffect(() => {
    log('DEBUG', 'info', '[StateWizard] Wizard instantiated')
    log('DEBUG', 'info', `[StateWizard] Props provided: onOpenThermodynamics=${!!onOpenThermodynamics}, savedState=${!!savedState}, onSaveState=${!!onSaveState}`)
    if (!onOpenThermodynamics) {
      log('DEBUG', 'warning', '[StateWizard] Missing onOpenThermodynamics - thermodynamics wizard integration disabled')
    }
  }, [])
  
  // Initialize state from savedState if available, otherwise use defaults
  const [mode, setMode] = useState<StateMode>(savedState?.mode ?? null)
  const [stateName, setStateName] = useState(savedState?.stateName ?? '')
  
  // Static conditions fields
  const [machNumber, setMachNumber] = useState(savedState?.machNumber ?? '')
  const [temperature, setTemperature] = useState(savedState?.temperature ?? '')
  const [pressure, setPressure] = useState(savedState?.pressure ?? '')
  
  // Total conditions fields
  const [totalTemperature, setTotalTemperature] = useState(savedState?.totalTemperature ?? '')
  const [totalPressure, setTotalPressure] = useState(savedState?.totalPressure ?? '')
  
  // Densities fields
  const [speed, setSpeed] = useState(savedState?.speed ?? '')

  // Mach-density fields
  const [density, setDensity] = useState(savedState?.density ?? '')
  
  // Optional fields
  const [angleOfAttack, setAngleOfAttack] = useState(savedState?.angleOfAttack ?? '0')
  const [angleOfYaw, setAngleOfYaw] = useState(savedState?.angleOfYaw ?? '0')
  
  // Mass fractions
  const [massFractions, setMassFractions] = useState<Record<string, number>>(
    savedState?.massFractions ?? {}
  )
  
  const [isCreating, setIsCreating] = useState(false)

  // Initialize mass fractions when wizard opens or thermodynamics changes
  useEffect(() => {
    // Skip if we already have saved state with mass fractions
    if (savedState?.massFractions && Object.keys(savedState.massFractions).length > 0) {
      return
    }
    
    // Skip if we already have manually entered mass fractions
    if (Object.keys(massFractions).length > 0) {
      return
    }
    
    const species = getSpeciesList(configData)
    const isMultispecies = !isSingleSpecies(configData)
    
    // Only auto-initialize for multispecies with no existing mass fractions
    if (isMultispecies && species.length > 0) {
      const initialized = initializeMassFractions(species, configData)
      setMassFractions(initialized)
    }
  }, [configData]) // Re-run when thermodynamics changes

  // Handler to open thermodynamics wizard
  const handleOpenThermodynamics = () => {
    log('DEBUG', 'info', '[StateWizard] handleOpenThermodynamics called')
    
    if (!onOpenThermodynamics) {
      log('DEBUG', 'error', '[StateWizard] onOpenThermodynamics callback not provided - cannot open thermodynamics wizard')
      console.warn('onOpenThermodynamics not provided to StateWizard')
      return
    }
    
    log('DEBUG', 'info', '[StateWizard] Saving current wizard state before opening thermodynamics')
    
    // Save current wizard state before opening thermodynamics
    if (onSaveState) {
      onSaveState({
        mode,
        stateName,
        machNumber,
        temperature,
        pressure,
        totalTemperature,
        totalPressure,
        speed,
        density,
        angleOfAttack,
        angleOfYaw,
        massFractions
      })
      log('DEBUG', 'success', '[StateWizard] Wizard state saved successfully')
    } else {
      log('DEBUG', 'warning', '[StateWizard] onSaveState not provided - wizard state will not persist')
    }
    
    log('DEBUG', 'info', '[StateWizard] Calling onOpenThermodynamics callback')
    // Don't call onClose() here - let the parent handle closing when onOpenThermodynamics is called
    onOpenThermodynamics()
  }

  const handleCreate = async () => {
    if (isCreating) {
      log('DEBUG', 'warning', '[StateWizard] Already creating state, ignoring duplicate click')
      return
    }
    
    setIsCreating(true)
    log('DEBUG', 'info', `[StateWizard] handleCreate called - mode: ${mode}, stateName: ${stateName}`)
    
    try {
      const baseState: State = {
        id: `state-${Date.now()}`,
        name: stateName || `state_${Date.now()}`,
        'angle of attack': parseFloat(angleOfAttack) || 0,
        'angle of yaw': parseFloat(angleOfYaw) || 0
      }
      
      // Add mass fractions if any have been defined
      if (Object.keys(massFractions).length > 0) {
        baseState['mass fractions'] = massFractions
      }

      let newState: State
      if (mode === 'static') {
        log('DEBUG', 'info', '[StateWizard] Creating static state')
        newState = {
          ...baseState,
          'mach number': parseFloat(machNumber),
          temperature: parseFloat(temperature),
          pressure: parseFloat(pressure)
        }
      } else if (mode === 'total') {
        log('DEBUG', 'info', '[StateWizard] Creating total state')
        newState = {
          ...baseState,
          'mach number': parseFloat(machNumber),
          'total temperature': parseFloat(totalTemperature),
          'total pressure': parseFloat(totalPressure)
        }
      } else if (mode === 'densities') {
        log('DEBUG', 'info', '[StateWizard] Creating densities state')
        newState = {
          ...baseState,
          'mach number': parseFloat(machNumber),
          speed: parseFloat(speed),
          temperature: parseFloat(temperature)
        }
      } else if (mode === 'mach-density') {
        log('DEBUG', 'info', '[StateWizard] Creating mach-density state')
        newState = {
          ...baseState,
          'mach number': parseFloat(machNumber),
          temperature: parseFloat(temperature),
          density: parseFloat(density)
        }
      } else if (mode === 'advanced') {
        log('DEBUG', 'info', '[StateWizard] Creating advanced state')
        newState = {
          ...baseState,
          'mach number': parseFloat(machNumber) || 0,
          temperature: parseFloat(temperature) || 300,
          pressure: parseFloat(pressure) || 101325
        }
      } else {
        throw new Error(`Invalid mode: ${mode}`)
      }
      
      log('DEBUG', 'info', `[StateWizard] Calling onCreate with state: ${JSON.stringify(newState)}`)
      onCreate(newState)
      log('DEBUG', 'success', '[StateWizard] onCreate completed, calling onClose()')
      
      // Clear saved state after successful creation
      if (onSaveState) {
        onSaveState(null as any)
      }
      
      onClose()
    } catch (error) {
      log('DEBUG', 'error', `[StateWizard] Error creating state: ${error}`)
      console.error('[StateWizard] Error:', error)
      setIsCreating(false)
    }
  }

  const isValid = () => {
    if (!stateName) return false
    
    // Validate mass fractions if any have been defined
    if (Object.keys(massFractions).length > 0 && (mode === 'static' || mode === 'total' || mode === 'mach-density' || mode === 'advanced')) {
      const species = getSpeciesList(configData)
      const validation = validateMassFractions(massFractions, species)
      if (!validation.valid) {
        return false
      }
    }
    
    if (mode === 'static') {
      return machNumber && temperature && pressure
    } else if (mode === 'total') {
      return machNumber && totalTemperature && totalPressure
    } else if (mode === 'densities') {
      return machNumber && speed && temperature
    } else if (mode === 'mach-density') {
      return machNumber && temperature && density
    } else if (mode === 'advanced') {
      return true // Advanced mode is always valid
    }
    return false
  }
  
  // Component to render mass fractions section
  const renderMassFractionsSection = () => {
    const isMultispecies = !isSingleSpecies(configData)
    const species = getSpeciesList(configData)
    const hasMassFractions = Object.keys(massFractions).length > 0
    
    // Validate mass fractions if they exist
    const validation = hasMassFractions 
      ? validateMassFractions(massFractions, species)
      : { valid: true }
    
    return (
      <div className="state-form-group-vertical">
        <label className="state-form-label">Species Mass Fractions</label>
        
        {!isMultispecies ? (
          <div className="info-box" style={{ marginBottom: '8px' }}>
            This is currently a single-species simulation.
            {onOpenThermodynamics && (
              <>
                {' '}To switch to multispecies,{' '}
                <button 
                  className="link-button" 
                  onClick={handleOpenThermodynamics}
                  type="button"
                >
                  setup Thermodynamics
                </button>.
              </>
            )}
            {hasMassFractions && (
              <div style={{ marginTop: '8px' }}>
                Note: Mass fractions you define here will be saved with the state.
              </div>
            )}
          </div>
        ) : (
          <div className="info-box" style={{ marginBottom: '8px' }}>
            Specify the mass fraction for each species. Values must sum to 1.0.
            {onOpenThermodynamics && (
              <>
                {' '}To change species,{' '}
                <button 
                  className="link-button" 
                  onClick={handleOpenThermodynamics}
                  type="button"
                >
                  reconfigure Thermodynamics
                </button>.
              </>
            )}
          </div>
        )}
        
        <MapEditor
          value={massFractions}
          onChange={setMassFractions}
          valueType="number"
          label=""
          keyPlaceholder="Species name"
          valuePlaceholder="Mass fraction"
        />
        
        {!validation.valid && (
          <div className="error-box" style={{ marginTop: '8px' }}>
            ⚠️ {validation.message}
          </div>
        )}
      </div>
    )
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

                <div className="wizard-option" onClick={() => setMode('mach-density')}>
                  <div className="option-title">State from Mach, Temperature, and Density</div>
                  <div className="option-description">
                    Define using Mach number, temperature, and density
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
              <div className="state-form-group">
                <label className="state-form-label">State Name *</label>
                <input
                  type="text"
                  className="state-form-input"
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                  placeholder="e.g., freestream, inlet_total"
                  autoFocus
                />
              </div>

              {mode === 'static' && (
                <>
                  <div className="state-form-group">
                    <label className="state-form-label">Mach Number *</label>
                    <input
                      type="number"
                      className="state-form-input"
                      value={machNumber}
                      onChange={(e) => setMachNumber(e.target.value)}
                      placeholder="e.g., 0.8"
                      step="0.01"
                    />
                  </div>

                  <div className="state-form-group">
                    <label className="state-form-label">Static Temperature (K) *</label>
                    <input
                      type="number"
                      className="state-form-input"
                      value={temperature}
                      onChange={(e) => setTemperature(e.target.value)}
                      placeholder="e.g., 288.15"
                    />
                  </div>

                  <div className="state-form-group">
                    <label className="state-form-label">Static Pressure (Pa) *</label>
                    <input
                      type="number"
                      className="state-form-input"
                      value={pressure}
                      onChange={(e) => setPressure(e.target.value)}
                      placeholder="e.g., 101325"
                    />
                  </div>
                  
                  {renderMassFractionsSection()}
                </>
              )}

              {mode === 'total' && (
                <>
                  <div className="state-form-group">
                    <label className="state-form-label">Mach Number *</label>
                    <input
                      type="number"
                      className="state-form-input"
                      value={machNumber}
                      onChange={(e) => setMachNumber(e.target.value)}
                      placeholder="e.g., 0.8"
                      step="0.01"
                    />
                  </div>

                  <div className="state-form-group">
                    <label className="state-form-label">Total Temperature (K) *</label>
                    <input
                      type="number"
                      className="state-form-input"
                      value={totalTemperature}
                      onChange={(e) => setTotalTemperature(e.target.value)}
                      placeholder="e.g., 300"
                    />
                  </div>

                  <div className="state-form-group">
                    <label className="state-form-label">Total Pressure (Pa) *</label>
                    <input
                      type="number"
                      className="state-form-input"
                      value={totalPressure}
                      onChange={(e) => setTotalPressure(e.target.value)}
                      placeholder="e.g., 150000"
                    />
                  </div>
                  
                  {renderMassFractionsSection()}
                </>
              )}

              {mode === 'densities' && (
                <>
                  <div className="state-form-group">
                    <label className="state-form-label">Mach Number *</label>
                    <input
                      type="number"
                      className="state-form-input"
                      value={machNumber}
                      onChange={(e) => setMachNumber(e.target.value)}
                      placeholder="e.g., 2.0"
                      step="0.01"
                    />
                  </div>

                  <div className="state-form-group">
                    <label className="state-form-label">Speed (m/s) *</label>
                    <input
                      type="number"
                      className="state-form-input"
                      value={speed}
                      onChange={(e) => setSpeed(e.target.value)}
                      placeholder="e.g., 680"
                    />
                  </div>

                  <div className="state-form-group">
                    <label className="state-form-label">Temperature (K) *</label>
                    <input
                      type="number"
                      className="state-form-input"
                      value={temperature}
                      onChange={(e) => setTemperature(e.target.value)}
                      placeholder="e.g., 288.15"
                    />
                  </div>
                </>
              )}

              {mode === 'mach-density' && (
                <>
                  <div className="state-form-group">
                    <label className="state-form-label">Mach Number *</label>
                    <input
                      type="number"
                      className="state-form-input"
                      value={machNumber}
                      onChange={(e) => setMachNumber(e.target.value)}
                      placeholder="e.g., 2.0"
                      step="0.01"
                    />
                  </div>

                  <div className="state-form-group">
                    <label className="state-form-label">Temperature (K) *</label>
                    <input
                      type="number"
                      className="state-form-input"
                      value={temperature}
                      onChange={(e) => setTemperature(e.target.value)}
                      placeholder="e.g., 288.15"
                    />
                  </div>

                  <div className="state-form-group">
                    <label className="state-form-label">Density (kg/m³) *</label>
                    <input
                      type="number"
                      className="state-form-input"
                      value={density}
                      onChange={(e) => setDensity(e.target.value)}
                      placeholder="e.g., 1.225"
                      step="0.001"
                    />
                  </div>

                  {renderMassFractionsSection()}
                </>
              )}

              {mode === 'advanced' && (
                <>
                  <div className="info-box">
                    A basic state will be created. After creation, you can edit all available fields
                    in the property editor to add densities, velocities, or other advanced properties.
                  </div>
                  
                  {renderMassFractionsSection()}
                </>
              )}

              <div className="state-form-group">
                <label className="state-form-label">Angle of Attack (deg)</label>
                <input
                  type="number"
                  className="state-form-input"
                  value={angleOfAttack}
                  onChange={(e) => setAngleOfAttack(e.target.value)}
                  placeholder="0"
                  step="0.1"
                />
              </div>

              <div className="state-form-group">
                <label className="state-form-label">Angle of Yaw (deg)</label>
                <input
                  type="number"
                  className="state-form-input"
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
              disabled={!isValid() || isCreating}
            >
              {isCreating ? 'Creating...' : 'Create State'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
