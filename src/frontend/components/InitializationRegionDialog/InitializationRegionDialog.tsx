import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useAppStore } from '../../store/appStore'
import StateWizard from '../EditorPanel/StateWizard'
import './InitializationRegionDialog.css'

// Initialization region types from the schema
// Note: 'aabb', 'box', and 'axis-aligned bounding-box' are aliases for the same type
const INIT_REGION_TYPES = [
  'box',
  'sphere',
  'cylinder',
  'super ellipse frustum',
  'converging diverging nozzle',
  'injector',
  'boundary layer'
]

// Type descriptions for user guidance
const INIT_REGION_TYPE_DESCRIPTIONS: Record<string, string> = {
  'box': 'Define a box (axis-aligned bounding box) and initialize that region with a constant state',
  'sphere': 'Define a sphere and initialize that region with a constant state',
  'cylinder': 'Define a cylinder (possibly with non-constant radius) and initialize that region with a constant state',
  'super ellipse frustum': 'Define a super ellipse frustum region with isentropic initialization',
  'converging diverging nozzle': 'Define a converging-diverging nozzle region with isentropic initialization',
  'injector': 'Initialize cells within a specified distance of mesh boundary tags (Vulcan only)',
  'boundary layer': 'Linearly blend no-slip surface boundary conditions with flowfield initialization'
}

interface InitializationRegionDialogProps {
  isOpen: boolean
  onClose: () => void
}

export default function InitializationRegionDialog({ isOpen, onClose }: InitializationRegionDialogProps) {
  const { configData, setConfigData, availableSurfaces, setSelectedInitRegion, addState } = useAppStore()

  const [regionType, setRegionType] = useState('box')
  const [stateName, setStateName] = useState('')
  const [showStateWizard, setShowStateWizard] = useState(false)
  
  // AABB/Box fields
  const [lo, setLo] = useState<[number, number, number]>([0, 0, 0])
  const [hi, setHi] = useState<[number, number, number]>([1, 1, 1])
  
  // Sphere fields
  const [sphereCenter, setSphereCenter] = useState<[number, number, number]>([0, 0, 0])
  const [sphereRadius, setSphereRadius] = useState(1)
  
  // Cylinder fields
  const [cylinderA, setCylinderA] = useState<[number, number, number]>([0, 0, 0])
  const [cylinderB, setCylinderB] = useState<[number, number, number]>([1, 0, 0])
  const [cylinderRadius, setCylinderRadius] = useState(1)
  const [cylinderRadius2, setCylinderRadius2] = useState(-1)
  const [alignVelocity, setAlignVelocity] = useState(false)
  
  // Super Ellipse Frustum fields (simplified - showing key fields)
  const [inflowCenter, setInflowCenter] = useState<[number, number, number]>([0, 0, 0])
  const [inflowA, setInflowA] = useState(1)
  const [inflowB, setInflowB] = useState(1)
  const [inflowN, setInflowN] = useState(2)
  const [inflowLocalY, setInflowLocalY] = useState<[number, number, number]>([0, 1, 0])
  const [outflowCenter, setOutflowCenter] = useState<[number, number, number]>([2, 0, 0])
  const [outflowA, setOutflowA] = useState(1)
  const [outflowB, setOutflowB] = useState(1)
  const [outflowN, setOutflowN] = useState(2)
  const [outflowLocalY, setOutflowLocalY] = useState<[number, number, number]>([0, 1, 0])
  const [isentropicInit, setIsentropicInit] = useState(true)
  const [machRoot, setMachRoot] = useState(1)
  const [alignVelocitySEF, setAlignVelocitySEF] = useState(false)
  
  // CD Nozzle fields (using simplified interface)
  const [throatCenter, setThroatCenter] = useState<[number, number, number]>([0, 0, 0])
  const [throatA, setThroatA] = useState(0.5)
  const [throatB, setThroatB] = useState(0.5)
  const [throatN, setThroatN] = useState(2)
  const [throatLocalY, setThroatLocalY] = useState<[number, number, number]>([0, 1, 0])
  const [exitCenter, setExitCenter] = useState<[number, number, number]>([2, 0, 0])
  const [exitA, setExitA] = useState(1)
  const [exitB, setExitB] = useState(1)
  const [exitN, setExitN] = useState(2)
  const [exitLocalY, setExitLocalY] = useState<[number, number, number]>([0, 1, 0])
  const [isentropicInitCD, setIsentropicInitCD] = useState(true)
  const [machRootCD, setMachRootCD] = useState(1)
  const [alignVelocityCD, setAlignVelocityCD] = useState(false)
  
  // Injector fields
  const [selectedTags, setSelectedTags] = useState<number[]>([])
  const [injectorLength, setInjectorLength] = useState(0.03)
  
  // Boundary Layer fields
  const [blThickness, setBlThickness] = useState(0.001)

  // Get available states from configData
  const getAvailableStates = (): string[] => {
    if (!configData?.HyperSolve?.states) return []
    return Object.keys(configData.HyperSolve.states)
  }

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setRegionType('box')
      const availableStates = getAvailableStates()
      setStateName(availableStates.length > 0 ? availableStates[0] : '')
      setLo([0, 0, 0])
      setHi([1, 1, 1])
      setSphereCenter([0, 0, 0])
      setSphereRadius(1)
      setCylinderA([0, 0, 0])
      setCylinderB([1, 0, 0])
      setCylinderRadius(1)
      setCylinderRadius2(-1)
      setAlignVelocity(false)
      setSelectedTags([])
      setInjectorLength(0.03)
      setBlThickness(0.001)
    }
  }, [isOpen])

  const handleTagToggle = (tag: number) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  const handleSelectAllTags = () => {
    setSelectedTags(availableSurfaces.map(s => s.metadata.tag))
  }

  const handleDeselectAllTags = () => {
    setSelectedTags([])
  }

  const handleStateChange = (value: string) => {
    if (value === '__CREATE_NEW__') {
      setShowStateWizard(true)
    } else {
      setStateName(value)
    }
  }

  const handleStateCreated = (newState: any) => {
    addState(newState)
    setStateName(newState.name)
    setShowStateWizard(false)
  }

  const handleCreate = () => {
    // Validation
    if (regionType !== 'boundary layer' && (!stateName || stateName === '__CREATE_NEW__')) {
      alert('Please select or create a state')
      return
    }

    // Build the initialization region object based on type
    const newRegion: any = {
      type: regionType
    }

    // Add type-specific required fields
    switch (regionType) {
      case 'box':
        newRegion.state = stateName
        newRegion.lo = lo
        newRegion.hi = hi
        break
        
      case 'sphere':
        newRegion.state = stateName
        newRegion.center = sphereCenter
        newRegion.radius = sphereRadius
        break
        
      case 'cylinder':
        newRegion.state = stateName
        newRegion.a = cylinderA
        newRegion.b = cylinderB
        newRegion.radius = cylinderRadius
        if (cylinderRadius2 > 0) {
          newRegion['radius 2'] = cylinderRadius2
        }
        if (alignVelocity) {
          newRegion['align velocity'] = true
        }
        break
        
      case 'super ellipse frustum':
        newRegion.state = stateName
        newRegion['inflow center'] = inflowCenter
        newRegion['inflow a'] = inflowA
        newRegion['inflow b'] = inflowB
        newRegion['inflow n'] = inflowN
        newRegion['inflow local Y direction'] = inflowLocalY
        newRegion['outflow center'] = outflowCenter
        newRegion['outflow a'] = outflowA
        newRegion['outflow b'] = outflowB
        newRegion['outflow n'] = outflowN
        newRegion['outflow local Y direction'] = outflowLocalY
        newRegion['isentropic initialization'] = isentropicInit
        newRegion['mach root'] = machRoot
        newRegion['align velocity'] = alignVelocitySEF
        break
        
      case 'converging diverging nozzle':
        newRegion.state = stateName
        newRegion['throat center'] = throatCenter
        newRegion['throat a'] = throatA
        newRegion['throat b'] = throatB
        newRegion['throat n'] = throatN
        newRegion['throat local Y direction'] = throatLocalY
        newRegion['exit center'] = exitCenter
        newRegion['exit a'] = exitA
        newRegion['exit b'] = exitB
        newRegion['exit n'] = exitN
        newRegion['exit local Y direction'] = exitLocalY
        newRegion['isentropic initialization'] = isentropicInitCD
        newRegion['mach root'] = machRootCD
        newRegion['align velocity'] = alignVelocityCD
        break
        
      case 'injector':
        newRegion.state = stateName
        if (selectedTags.length === 0) {
          alert('Please select at least one mesh boundary tag')
          return
        }
        newRegion['mesh boundary tags'] = selectedTags.length === 1 ? selectedTags[0] : selectedTags
        newRegion.length = injectorLength
        break
        
      case 'boundary layer':
        newRegion.thickness = blThickness
        break
    }

    // Add initialization region to the config
    const updatedConfig = { ...configData }
    if (!updatedConfig.HyperSolve) {
      updatedConfig.HyperSolve = { 'boundary conditions': [], states: {} }
    }
    if (!updatedConfig.HyperSolve['initialization regions']) {
      updatedConfig.HyperSolve['initialization regions'] = []
    }
    updatedConfig.HyperSolve['initialization regions'].push(newRegion)
    setConfigData(updatedConfig)

    // Select the newly created region
    const newIndex = updatedConfig.HyperSolve['initialization regions'].length - 1
    setSelectedInitRegion({ data: newRegion, index: newIndex })

    onClose()
  }

  if (!isOpen) return null

  const availableStates = getAvailableStates()

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content init-region-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create Initialization Region</h2>
          <button className="close-button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Region Type */}
          <div className="form-group">
            <label className="form-label">Type *</label>
            <select
              className="form-input"
              value={regionType}
              onChange={(e) => setRegionType(e.target.value)}
            >
              {INIT_REGION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            {INIT_REGION_TYPE_DESCRIPTIONS[regionType] && (
              <div className="help-text">
                {INIT_REGION_TYPE_DESCRIPTIONS[regionType]}
              </div>
            )}
          </div>

          {/* State selector (not for boundary layer) */}
          {regionType !== 'boundary layer' && (
            <div className="form-group">
              <label className="form-label">State *</label>
              <select
                className="form-input"
                value={stateName}
                onChange={(e) => handleStateChange(e.target.value)}
              >
                <option value="__CREATE_NEW__">+ Create new state...</option>
                {availableStates.length === 0 && (
                  <option value="" disabled>
                    No states available
                  </option>
                )}
                {availableStates.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
              <div className="help-text">
                Name of the state used in the region
              </div>
            </div>
          )}

          {/* AABB/Box-specific fields */}
          {regionType === 'box' && (
            <>
              <div className="form-group">
                <label className="form-label">Lower Corner (lo) [x, y, z] *</label>
                <div className="vector-input">
                  <input
                    type="number"
                    className="form-input"
                    value={lo[0]}
                    onChange={(e) => setLo([Number(e.target.value), lo[1], lo[2]])}
                    placeholder="x"
                  />
                  <input
                    type="number"
                    className="form-input"
                    value={lo[1]}
                    onChange={(e) => setLo([lo[0], Number(e.target.value), lo[2]])}
                    placeholder="y"
                  />
                  <input
                    type="number"
                    className="form-input"
                    value={lo[2]}
                    onChange={(e) => setLo([lo[0], lo[1], Number(e.target.value)])}
                    placeholder="z"
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Upper Corner (hi) [x, y, z] *</label>
                <div className="vector-input">
                  <input
                    type="number"
                    className="form-input"
                    value={hi[0]}
                    onChange={(e) => setHi([Number(e.target.value), hi[1], hi[2]])}
                    placeholder="x"
                  />
                  <input
                    type="number"
                    className="form-input"
                    value={hi[1]}
                    onChange={(e) => setHi([hi[0], Number(e.target.value), hi[2]])}
                    placeholder="y"
                  />
                  <input
                    type="number"
                    className="form-input"
                    value={hi[2]}
                    onChange={(e) => setHi([hi[0], hi[1], Number(e.target.value)])}
                    placeholder="z"
                  />
                </div>
              </div>
            </>
          )}

          {/* Sphere-specific fields */}
          {regionType === 'sphere' && (
            <>
              <div className="form-group">
                <label className="form-label">Center [x, y, z] *</label>
                <div className="vector-input">
                  <input
                    type="number"
                    className="form-input"
                    value={sphereCenter[0]}
                    onChange={(e) => setSphereCenter([Number(e.target.value), sphereCenter[1], sphereCenter[2]])}
                    placeholder="x"
                  />
                  <input
                    type="number"
                    className="form-input"
                    value={sphereCenter[1]}
                    onChange={(e) => setSphereCenter([sphereCenter[0], Number(e.target.value), sphereCenter[2]])}
                    placeholder="y"
                  />
                  <input
                    type="number"
                    className="form-input"
                    value={sphereCenter[2]}
                    onChange={(e) => setSphereCenter([sphereCenter[0], sphereCenter[1], Number(e.target.value)])}
                    placeholder="z"
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Radius *</label>
                <input
                  type="number"
                  className="form-input"
                  value={sphereRadius}
                  onChange={(e) => setSphereRadius(Number(e.target.value))}
                  min="0"
                  step="0.1"
                />
              </div>
            </>
          )}

          {/* Cylinder-specific fields */}
          {regionType === 'cylinder' && (
            <>
              <div className="form-group">
                <label className="form-label">Point A [x, y, z] *</label>
                <div className="vector-input">
                  <input
                    type="number"
                    className="form-input"
                    value={cylinderA[0]}
                    onChange={(e) => setCylinderA([Number(e.target.value), cylinderA[1], cylinderA[2]])}
                    placeholder="x"
                  />
                  <input
                    type="number"
                    className="form-input"
                    value={cylinderA[1]}
                    onChange={(e) => setCylinderA([cylinderA[0], Number(e.target.value), cylinderA[2]])}
                    placeholder="y"
                  />
                  <input
                    type="number"
                    className="form-input"
                    value={cylinderA[2]}
                    onChange={(e) => setCylinderA([cylinderA[0], cylinderA[1], Number(e.target.value)])}
                    placeholder="z"
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Point B [x, y, z] *</label>
                <div className="vector-input">
                  <input
                    type="number"
                    className="form-input"
                    value={cylinderB[0]}
                    onChange={(e) => setCylinderB([Number(e.target.value), cylinderB[1], cylinderB[2]])}
                    placeholder="x"
                  />
                  <input
                    type="number"
                    className="form-input"
                    value={cylinderB[1]}
                    onChange={(e) => setCylinderB([cylinderB[0], Number(e.target.value), cylinderB[2]])}
                    placeholder="y"
                  />
                  <input
                    type="number"
                    className="form-input"
                    value={cylinderB[2]}
                    onChange={(e) => setCylinderB([cylinderB[0], cylinderB[1], Number(e.target.value)])}
                    placeholder="z"
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Radius at Point A *</label>
                <input
                  type="number"
                  className="form-input"
                  value={cylinderRadius}
                  onChange={(e) => setCylinderRadius(Number(e.target.value))}
                  min="0"
                  step="0.1"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Radius at Point B (optional)</label>
                <input
                  type="number"
                  className="form-input"
                  value={cylinderRadius2}
                  onChange={(e) => setCylinderRadius2(Number(e.target.value))}
                  step="0.1"
                  placeholder="-1 (use same as radius A)"
                />
                <div className="help-text">
                  Set to -1 to use constant radius, or specify a different value for a tapered cylinder
                </div>
              </div>
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={alignVelocity}
                    onChange={(e) => setAlignVelocity(e.target.checked)}
                  />
                  <span>Align velocity along axis A to B</span>
                </label>
              </div>
            </>
          )}

          {/* Super Ellipse Frustum fields */}
          {regionType === 'super ellipse frustum' && (
            <>
              <h4 className="section-title">Inflow Properties</h4>
              <div className="form-group">
                <label className="form-label">Inflow Center [x, y, z] *</label>
                <div className="vector-input">
                  <input type="number" className="form-input" value={inflowCenter[0]}
                    onChange={(e) => setInflowCenter([Number(e.target.value), inflowCenter[1], inflowCenter[2]])} placeholder="x" />
                  <input type="number" className="form-input" value={inflowCenter[1]}
                    onChange={(e) => setInflowCenter([inflowCenter[0], Number(e.target.value), inflowCenter[2]])} placeholder="y" />
                  <input type="number" className="form-input" value={inflowCenter[2]}
                    onChange={(e) => setInflowCenter([inflowCenter[0], inflowCenter[1], Number(e.target.value)])} placeholder="z" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Inflow Semi-Axis a *</label>
                <input type="number" className="form-input" value={inflowA}
                  onChange={(e) => setInflowA(Number(e.target.value))} min="0" step="0.1" />
              </div>
              <div className="form-group">
                <label className="form-label">Inflow Semi-Axis b *</label>
                <input type="number" className="form-input" value={inflowB}
                  onChange={(e) => setInflowB(Number(e.target.value))} min="0" step="0.1" />
              </div>
              <div className="form-group">
                <label className="form-label">Inflow Exponent n *</label>
                <input type="number" className="form-input" value={inflowN}
                  onChange={(e) => setInflowN(Number(e.target.value))} min="0" step="0.1" />
              </div>
              <div className="form-group">
                <label className="form-label">Inflow Local Y Direction [x, y, z] *</label>
                <div className="vector-input">
                  <input type="number" className="form-input" value={inflowLocalY[0]}
                    onChange={(e) => setInflowLocalY([Number(e.target.value), inflowLocalY[1], inflowLocalY[2]])} placeholder="x" />
                  <input type="number" className="form-input" value={inflowLocalY[1]}
                    onChange={(e) => setInflowLocalY([inflowLocalY[0], Number(e.target.value), inflowLocalY[2]])} placeholder="y" />
                  <input type="number" className="form-input" value={inflowLocalY[2]}
                    onChange={(e) => setInflowLocalY([inflowLocalY[0], inflowLocalY[1], Number(e.target.value)])} placeholder="z" />
                </div>
              </div>

              <h4 className="section-title">Outflow Properties</h4>
              <div className="form-group">
                <label className="form-label">Outflow Center [x, y, z] *</label>
                <div className="vector-input">
                  <input type="number" className="form-input" value={outflowCenter[0]}
                    onChange={(e) => setOutflowCenter([Number(e.target.value), outflowCenter[1], outflowCenter[2]])} placeholder="x" />
                  <input type="number" className="form-input" value={outflowCenter[1]}
                    onChange={(e) => setOutflowCenter([outflowCenter[0], Number(e.target.value), outflowCenter[2]])} placeholder="y" />
                  <input type="number" className="form-input" value={outflowCenter[2]}
                    onChange={(e) => setOutflowCenter([outflowCenter[0], outflowCenter[1], Number(e.target.value)])} placeholder="z" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Outflow Semi-Axis a *</label>
                <input type="number" className="form-input" value={outflowA}
                  onChange={(e) => setOutflowA(Number(e.target.value))} min="0" step="0.1" />
              </div>
              <div className="form-group">
                <label className="form-label">Outflow Semi-Axis b *</label>
                <input type="number" className="form-input" value={outflowB}
                  onChange={(e) => setOutflowB(Number(e.target.value))} min="0" step="0.1" />
              </div>
              <div className="form-group">
                <label className="form-label">Outflow Exponent n *</label>
                <input type="number" className="form-input" value={outflowN}
                  onChange={(e) => setOutflowN(Number(e.target.value))} min="0" step="0.1" />
              </div>
              <div className="form-group">
                <label className="form-label">Outflow Local Y Direction [x, y, z] *</label>
                <div className="vector-input">
                  <input type="number" className="form-input" value={outflowLocalY[0]}
                    onChange={(e) => setOutflowLocalY([Number(e.target.value), outflowLocalY[1], outflowLocalY[2]])} placeholder="x" />
                  <input type="number" className="form-input" value={outflowLocalY[1]}
                    onChange={(e) => setOutflowLocalY([outflowLocalY[0], Number(e.target.value), outflowLocalY[2]])} placeholder="y" />
                  <input type="number" className="form-input" value={outflowLocalY[2]}
                    onChange={(e) => setOutflowLocalY([outflowLocalY[0], outflowLocalY[1], Number(e.target.value)])} placeholder="z" />
                </div>
              </div>

              <h4 className="section-title">Initialization Options</h4>
              <div className="form-group">
                <label className="checkbox-label">
                  <input type="checkbox" checked={isentropicInit}
                    onChange={(e) => setIsentropicInit(e.target.checked)} />
                  <span>Isentropic initialization</span>
                </label>
              </div>
              <div className="form-group">
                <label className="form-label">Mach Root *</label>
                <input type="number" className="form-input" value={machRoot}
                  onChange={(e) => setMachRoot(Number(e.target.value))} step="0.1" />
              </div>
              <div className="form-group">
                <label className="checkbox-label">
                  <input type="checkbox" checked={alignVelocitySEF}
                    onChange={(e) => setAlignVelocitySEF(e.target.checked)} />
                  <span>Align velocity with interpolation between nozzle axis and side walls</span>
                </label>
              </div>
            </>
          )}

          {/* Converging Diverging Nozzle fields */}
          {regionType === 'converging diverging nozzle' && (
            <>
              <h4 className="section-title">Throat Properties</h4>
              <div className="form-group">
                <label className="form-label">Throat Center [x, y, z] *</label>
                <div className="vector-input">
                  <input type="number" className="form-input" value={throatCenter[0]}
                    onChange={(e) => setThroatCenter([Number(e.target.value), throatCenter[1], throatCenter[2]])} placeholder="x" />
                  <input type="number" className="form-input" value={throatCenter[1]}
                    onChange={(e) => setThroatCenter([throatCenter[0], Number(e.target.value), throatCenter[2]])} placeholder="y" />
                  <input type="number" className="form-input" value={throatCenter[2]}
                    onChange={(e) => setThroatCenter([throatCenter[0], throatCenter[1], Number(e.target.value)])} placeholder="z" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Throat Semi-Axis a *</label>
                <input type="number" className="form-input" value={throatA}
                  onChange={(e) => setThroatA(Number(e.target.value))} min="0" step="0.1" />
              </div>
              <div className="form-group">
                <label className="form-label">Throat Semi-Axis b *</label>
                <input type="number" className="form-input" value={throatB}
                  onChange={(e) => setThroatB(Number(e.target.value))} min="0" step="0.1" />
              </div>
              <div className="form-group">
                <label className="form-label">Throat Exponent n *</label>
                <input type="number" className="form-input" value={throatN}
                  onChange={(e) => setThroatN(Number(e.target.value))} min="0" step="0.1" />
              </div>
              <div className="form-group">
                <label className="form-label">Throat Local Y Direction [x, y, z] *</label>
                <div className="vector-input">
                  <input type="number" className="form-input" value={throatLocalY[0]}
                    onChange={(e) => setThroatLocalY([Number(e.target.value), throatLocalY[1], throatLocalY[2]])} placeholder="x" />
                  <input type="number" className="form-input" value={throatLocalY[1]}
                    onChange={(e) => setThroatLocalY([throatLocalY[0], Number(e.target.value), throatLocalY[2]])} placeholder="y" />
                  <input type="number" className="form-input" value={throatLocalY[2]}
                    onChange={(e) => setThroatLocalY([throatLocalY[0], throatLocalY[1], Number(e.target.value)])} placeholder="z" />
                </div>
              </div>

              <h4 className="section-title">Exit Properties</h4>
              <div className="form-group">
                <label className="form-label">Exit Center [x, y, z] *</label>
                <div className="vector-input">
                  <input type="number" className="form-input" value={exitCenter[0]}
                    onChange={(e) => setExitCenter([Number(e.target.value), exitCenter[1], exitCenter[2]])} placeholder="x" />
                  <input type="number" className="form-input" value={exitCenter[1]}
                    onChange={(e) => setExitCenter([exitCenter[0], Number(e.target.value), exitCenter[2]])} placeholder="y" />
                  <input type="number" className="form-input" value={exitCenter[2]}
                    onChange={(e) => setExitCenter([exitCenter[0], exitCenter[1], Number(e.target.value)])} placeholder="z" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Exit Semi-Axis a *</label>
                <input type="number" className="form-input" value={exitA}
                  onChange={(e) => setExitA(Number(e.target.value))} min="0" step="0.1" />
              </div>
              <div className="form-group">
                <label className="form-label">Exit Semi-Axis b *</label>
                <input type="number" className="form-input" value={exitB}
                  onChange={(e) => setExitB(Number(e.target.value))} min="0" step="0.1" />
              </div>
              <div className="form-group">
                <label className="form-label">Exit Exponent n *</label>
                <input type="number" className="form-input" value={exitN}
                  onChange={(e) => setExitN(Number(e.target.value))} min="0" step="0.1" />
              </div>
              <div className="form-group">
                <label className="form-label">Exit Local Y Direction [x, y, z] *</label>
                <div className="vector-input">
                  <input type="number" className="form-input" value={exitLocalY[0]}
                    onChange={(e) => setExitLocalY([Number(e.target.value), exitLocalY[1], exitLocalY[2]])} placeholder="x" />
                  <input type="number" className="form-input" value={exitLocalY[1]}
                    onChange={(e) => setExitLocalY([exitLocalY[0], Number(e.target.value), exitLocalY[2]])} placeholder="y" />
                  <input type="number" className="form-input" value={exitLocalY[2]}
                    onChange={(e) => setExitLocalY([exitLocalY[0], exitLocalY[1], Number(e.target.value)])} placeholder="z" />
                </div>
              </div>

              <h4 className="section-title">Initialization Options</h4>
              <div className="form-group">
                <label className="checkbox-label">
                  <input type="checkbox" checked={isentropicInitCD}
                    onChange={(e) => setIsentropicInitCD(e.target.checked)} />
                  <span>Isentropic initialization</span>
                </label>
              </div>
              <div className="form-group">
                <label className="form-label">Mach Root *</label>
                <input type="number" className="form-input" value={machRootCD}
                  onChange={(e) => setMachRootCD(Number(e.target.value))} step="0.1" />
              </div>
              <div className="form-group">
                <label className="checkbox-label">
                  <input type="checkbox" checked={alignVelocityCD}
                    onChange={(e) => setAlignVelocityCD(e.target.checked)} />
                  <span>Align velocity with interpolation between nozzle axis and side walls</span>
                </label>
              </div>
            </>
          )}

          {/* Injector-specific fields */}
          {regionType === 'injector' && (
            <>
              <div className="form-group">
                <label className="form-label">
                  Mesh Boundary Tags * 
                  <span className="label-hint">
                    ({selectedTags.length} selected)
                  </span>
                </label>
                
                {availableSurfaces.length === 0 ? (
                  <div className="warning-message">
                    No surfaces available. Please load a mesh file first.
                  </div>
                ) : (
                  <>
                    <div className="selection-controls">
                      <button 
                        className="link-button"
                        onClick={handleSelectAllTags}
                        type="button"
                      >
                        Select All
                      </button>
                      <span className="separator">|</span>
                      <button 
                        className="link-button"
                        onClick={handleDeselectAllTags}
                        type="button"
                      >
                        Deselect All
                      </button>
                    </div>
                    
                    <div className="surface-checkbox-list">
                      {availableSurfaces.map((surface) => (
                        <label key={surface.id} className="surface-checkbox-item">
                          <input
                            type="checkbox"
                            checked={selectedTags.includes(surface.metadata.tag)}
                            onChange={() => handleTagToggle(surface.metadata.tag)}
                          />
                          <span className="surface-checkbox-label">
                            {surface.metadata.tagName} 
                            <span className="surface-tag-badge">tag {surface.metadata.tag}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Length *</label>
                <input
                  type="number"
                  className="form-input"
                  value={injectorLength}
                  onChange={(e) => setInjectorLength(Number(e.target.value))}
                  min="0"
                  step="0.01"
                />
                <div className="help-text">
                  Distance from boundary tags within which cells will be initialized
                </div>
              </div>
            </>
          )}

          {/* Boundary Layer-specific fields */}
          {regionType === 'boundary layer' && (
            <div className="form-group">
              <label className="form-label">Thickness *</label>
              <input
                type="number"
                className="form-input"
                value={blThickness}
                onChange={(e) => setBlThickness(Number(e.target.value))}
                min="0"
                step="0.0001"
              />
              <div className="help-text">
                Distance over which no-slip surface BCs are blended with flowfield initialization
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="button button-secondary" onClick={onClose}>
            Cancel
          </button>
          <button 
            className="button button-primary" 
            onClick={handleCreate}
            disabled={regionType !== 'boundary layer' && availableStates.length === 0}
          >
            Create Initialization Region
          </button>
        </div>
      </div>

      {showStateWizard && (
        <StateWizard
          onClose={() => setShowStateWizard(false)}
          onCreate={handleStateCreated}
        />
      )}
    </div>
  )
}
