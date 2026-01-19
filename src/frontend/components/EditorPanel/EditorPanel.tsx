import { Edit3, Save, RotateCcw, Plus, Trash2, Eye, EyeOff, Maximize2, Settings } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useAppStore } from '../../store/appStore'
import { BoundaryCondition } from '../../types/config'
import StateWizard from './StateWizard'
import BoundaryConditionDialog from '../BoundaryConditionDialog/BoundaryConditionDialog'
import PropertyEditorDialog from '../PropertyEditorDialog/PropertyEditorDialog'
import VisualizationDialog from '../VisualizationDialog/VisualizationDialog'
import InitializationRegionDialog from '../InitializationRegionDialog/InitializationRegionDialog'
import ThermodynamicsWizard from './ThermodynamicsWizard'
import ArrayEditor from '../ArrayEditor/ArrayEditor'
import MapEditor from '../MapEditor/MapEditor'
import { loadBCTypeInfo, isBCTypeAvailable } from '../../utils/bcTypeDescriptions'
import { calculateAreaWeightedNormal } from '../../utils/surfaceUtils'
import './EditorPanel.css'

interface SchemaProperty {
  type?: string | string[]
  description?: string
  default?: any
  properties?: Record<string, SchemaProperty>
  items?: SchemaProperty
  $ref?: string
  oneOf?: SchemaProperty[]
  anyOf?: SchemaProperty[]
  allOf?: SchemaProperty[]
  enum?: any[]
  required?: string[]
}

interface Schema {
  properties?: Record<string, SchemaProperty>
  definitions?: Record<string, SchemaProperty>
  required?: string[]
}

// List of BC types from the schema
const BC_TYPES = [
  'dirichlet',
  'dirichlet profile',
  'strong dirichlet',
  'riemann',
  'extrapolation',
  'slip wall',
  'tangent flow',
  'constant temperature',
  'weak constant temperature',
  'weak radiative equilibrium temperature',
  'symmetry',
  'weak symmetry',
  'no slip',
  'wall matching',
  'weak no slip',
  'axisymmetric pole',
  'back pressure',
  'mms',
  'strong mms',
  'strong-weak hns mms',
  'maxwell mms',
  'gol mms',
  'mass flux inflow',
  'subsonic inflow total',
  'supersonic outflow',
  'fixed subsonic inflow',
  'engine inlet',
  'strong particle wall',
  'particle wall',
  'marshak',
  'strong marshak',
  'weak constant intensity',
  'constant intensity',
  'perfect conductor',
  'insulated wall',
  'freestream em',
  'outflow em'
]

function EditorPanel() {
  const [showStateWizard, setShowStateWizard] = useState(false)
  const [showBCDialog, setShowBCDialog] = useState(false)
  const [showPropertyDialog, setShowPropertyDialog] = useState(false)
  const [showVizDialog, setShowVizDialog] = useState(false)
  const [showInitRegionDialog, setShowInitRegionDialog] = useState(false)
  const [showThermoWizard, setShowThermoWizard] = useState(false)
  const [normalPreset, setNormalPreset] = useState<string>('custom')
  const [selectedSurfaceForNormal, setSelectedSurfaceForNormal] = useState<string>('')
  const [schema, setSchema] = useState<Schema | null>(null)
  const [availableBCTypes, setAvailableBCTypes] = useState<string[]>(BC_TYPES)
  
  useEffect(() => {
    // Load the schema
    fetch('/schemas/input.schema.json')
      .then(response => response.json())
      .then(loadedSchema => setSchema(loadedSchema))
      .catch(error => console.error('Failed to load schema:', error))
    
    // Load and filter BC types
    loadBCTypeInfo().then(() => {
      const filtered = BC_TYPES.filter(type => isBCTypeAvailable(type))
      setAvailableBCTypes(filtered)
    })
  }, [])
  
  const { 
    selectedNode, 
    selectedSurface, 
    selectedBC,
    selectedState,
    selectedViz,
    setSelectedViz,
    selectedInitRegion,
    setSelectedInitRegion,
    soloBC,
    setSoloBC,
    configData,
    setConfigData,
    availableSurfaces,
    addBoundaryCondition, 
    updateBoundaryCondition,
    deleteBoundaryCondition,
    setSelectedBC,
    addState,
    updateState,
    deleteState
  } = useAppStore()

  // Helper function to get value from configData based on node path
  const getValueFromPath = (path: string) => {
    const parts = path.replace('root.', '').split('.')
    let value: any = configData
    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part]
      } else {
        return undefined
      }
    }
    return value
  }

  // Helper function to update value at a path in configData
  const updateValueAtPath = (path: string, key: string, value: any) => {
    const parts = path.replace('root.', '').split('.')
    const updatedConfig = JSON.parse(JSON.stringify(configData)) // Deep clone
    
    let current: any = updatedConfig
    for (const part of parts) {
      if (!current[part]) {
        current[part] = {}
      }
      current = current[part]
    }
    
    current[key] = value
    setConfigData(updatedConfig)
  }

  // Helper function to get schema properties for a node path
  const getSchemaForPath = (path: string): SchemaProperty | null => {
    if (!schema) return null
    
    // Handle special Global node
    if (path === 'root.global') {
      return { type: 'object', properties: schema.properties }
    }
    
    const parts = path.replace('root.', '').split('.')
    let current: SchemaProperty | undefined = { properties: schema.properties }
    
    for (const part of parts) {
      if (!current?.properties) return null
      current = current.properties[part]
      if (!current) return null
      
      // Resolve $ref if present
      if (current.$ref && schema.definitions) {
        const defName: string = current.$ref.replace('#/definitions/', '')
        current = schema.definitions[defName]
      }
      
      // Handle allOf - merge all schemas together
      if (current?.allOf) {
        const merged: SchemaProperty = { type: 'object', properties: {} }
        
        for (const subSchema of current.allOf) {
          let resolvedSchema = subSchema
          
          // Resolve $ref if present in allOf item
          if (subSchema.$ref && schema.definitions) {
            const defName = subSchema.$ref.replace('#/definitions/', '')
            resolvedSchema = schema.definitions[defName] || subSchema
          }
          
          // Merge properties
          if (resolvedSchema.properties) {
            merged.properties = { ...merged.properties, ...resolvedSchema.properties }
          }
          
          // Merge required arrays
          if (resolvedSchema.required) {
            merged.required = [...(merged.required || []), ...resolvedSchema.required]
          }
          
          // Copy other properties from first schema
          if (!merged.description && resolvedSchema.description) merged.description = resolvedSchema.description
          if (!merged.default && resolvedSchema.default) merged.default = resolvedSchema.default
        }
        
        current = merged
      }
    }
    
    return current || null
  }

  // Helper function to check if a type is POD
  const isPODType = (type: string | string[] | undefined): boolean => {
    if (!type) return false
    const typeStr = Array.isArray(type) ? type[0] : type
    return typeStr === 'string' || typeStr === 'number' || typeStr === 'integer' || typeStr === 'boolean'
  }
  
  // Helper function to check if a property (including oneOf/anyOf) is POD
  const isPropertyPOD = (prop: SchemaProperty): boolean => {
    // Direct type check
    if (prop.type) {
      if (isPODType(prop.type)) {
        return true
      }
      // Check for array of primitives
      if (prop.type === 'array' && prop.items) {
        const itemType = prop.items.type
        if (isPODType(itemType)) {
          return true
        }
      }
      return false
    }
    
    // Check oneOf/anyOf - consider it POD if all options are POD
    if (prop.oneOf || prop.anyOf) {
      const options = prop.oneOf || prop.anyOf
      if (options && options.length > 0) {
        return options.every(option => {
          const optionType = option.type
          if (!optionType) return false
          return isPODType(optionType)
        })
      }
    }
    
    return false
  }

  // Get POD properties from a schema object
  const getPODProperties = (objSchema: SchemaProperty | null): Array<{key: string, prop: SchemaProperty, required: boolean}> => {
    if (!objSchema?.properties) return []
    
    const podProps: Array<{key: string, prop: SchemaProperty, required: boolean}> = []
    const requiredFields = objSchema.required || []
    
    for (const [key, prop] of Object.entries(objSchema.properties)) {
      if (isPropertyPOD(prop)) {
        podProps.push({
          key,
          prop,
          required: requiredFields.includes(key)
        })
      }
    }
    
    return podProps
  }
  
  // Check if a property is a simple map (object with string keys to POD values)
  const isSimpleMap = (prop: SchemaProperty): { isMap: boolean, valueType?: string } => {
    // Check for object type with additionalProperties defining value type
    if (prop.type === 'object' && (prop as any).additionalProperties) {
      const additionalProps = (prop as any).additionalProperties
      if (typeof additionalProps === 'object' && additionalProps.type) {
        const valueType = additionalProps.type
        if (isPODType(valueType)) {
          return { isMap: true, valueType: valueType as string }
        }
      }
    }
    return { isMap: false }
  }

  const renderBCEditor = () => {
    if (!selectedBC) return null
    
    return (
      <div className="editor-content">
        <div className="property-header">
          <h3 className="property-title">Boundary Condition</h3>
          <span className="property-type-badge">BC</span>
          <button 
            className="icon-button"
            onClick={() => setSoloBC(soloBC?.id === selectedBC.id ? null : selectedBC)}
            title={soloBC?.id === selectedBC.id ? "Show all surfaces" : "Solo this BC (hide others)"}
            style={{ color: soloBC?.id === selectedBC.id ? '#4da6ff' : '#cccccc' }}
          >
            {soloBC?.id === selectedBC.id ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>
          <button 
            className="icon-button delete-button"
            onClick={() => deleteBoundaryCondition(selectedBC.id)}
            title="Delete BC"
          >
            <Trash2 size={14} />
          </button>
        </div>
        
        <p className="property-description">
          Configure boundary condition type and mesh tags
        </p>

        <div className="form-section">
          <div className="form-group">
            <label className="form-label">BC Name</label>
            <input 
              type="text" 
              className="form-input" 
              value={selectedBC.name || ''}
              onChange={(e) => updateBoundaryCondition(selectedBC.id, { name: e.target.value })}
              placeholder="Enter a name for this BC..."
            />
          </div>

          <div className="form-group">
            <label className="form-label">BC Type</label>
            <select 
              className="form-input" 
              value={selectedBC.type || ''}
              onChange={(e) => updateBoundaryCondition(selectedBC.id, { type: e.target.value })}
            >
              <option value="">Select BC type...</option>
              {availableBCTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Mesh Boundary Tags</label>
            <input 
              type="text" 
              className="form-input" 
              value={
                Array.isArray(selectedBC['mesh boundary tags'])
                  ? (selectedBC['mesh boundary tags'] as any[]).join(', ')
                  : String(selectedBC['mesh boundary tags'] || '')
              }
              onChange={(e) => {
                const val = e.target.value
                // Try to parse as comma-separated numbers
                if (val.includes(',')) {
                  const tags = val.split(',').map(s => s.trim()).filter(s => s).map(Number).filter(n => !isNaN(n))
                  updateBoundaryCondition(selectedBC.id, { 'mesh boundary tags': tags })
                } else if (val && !isNaN(Number(val))) {
                  updateBoundaryCondition(selectedBC.id, { 'mesh boundary tags': Number(val) })
                } else {
                  updateBoundaryCondition(selectedBC.id, { 'mesh boundary tags': val })
                }
              }}
              placeholder="Enter tag(s): 1 or 1,2,3 or 1:10"
            />
            <span className="default-hint">
              Can be a single number, comma-separated list, or range string (e.g., "1:10")
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">Add Surface by Name</label>
            <select 
              className="form-input"
              onChange={(e) => {
                if (e.target.value) {
                  const tag = parseInt(e.target.value, 10)
                  const currentTags = selectedBC['mesh boundary tags']
                  let newTags: number[] = []
                  
                  // Convert current tags to array
                  if (Array.isArray(currentTags)) {
                    newTags = currentTags.map(t => typeof t === 'number' ? t : parseInt(t as string, 10))
                  } else if (typeof currentTags === 'number') {
                    newTags = [currentTags]
                  } else if (typeof currentTags === 'string') {
                    newTags = currentTags.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n))
                  }
                  
                  // Add tag if not already present
                  if (!newTags.includes(tag)) {
                    newTags.push(tag)
                    updateBoundaryCondition(selectedBC.id, { 'mesh boundary tags': newTags })
                  }
                  
                  e.target.value = '' // Reset selection
                }
              }}
              defaultValue=""
            >
              <option value="">Select surface to add...</option>
              {availableSurfaces.map((surf) => (
                <option key={surf.id} value={surf.metadata.tag}>
                  {surf.metadata.tagName} (tag {surf.metadata.tag})
                </option>
              ))}
            </select>
          </div>

          {(selectedBC.type === 'dirichlet' || 
            selectedBC.type === 'strong dirichlet' ||
            selectedBC.type === 'riemann' ||
            selectedBC.type === 'mass flux inflow') && (
            <div className="form-group">
              <label className="form-label">State Name</label>
              <select 
                className="form-input" 
                value={selectedBC.state || ''}
                onChange={(e) => {
                  if (e.target.value === '__CREATE_NEW__') {
                    setShowStateWizard(true)
                  } else {
                    updateBoundaryCondition(selectedBC.id, { state: e.target.value })
                  }
                }}
              >
                <option value="">Select state...</option>
                <option value="__CREATE_NEW__">Create New State...</option>
                {Object.keys(configData.HyperSolve?.states || {}).map((stateName) => (
                  <option key={stateName} value={stateName}>{stateName}</option>
                ))}
              </select>
              <span className="default-hint">Reference to a defined state</span>
            </div>
          )}

          <div className="info-box">
            <strong>Current tags:</strong>{' '}
            {selectedBC['mesh boundary tags'] 
              ? JSON.stringify(selectedBC['mesh boundary tags'])
              : 'None'}
          </div>
        </div>
      </div>
    )
  }

  const renderBCArrayEditor = () => {
    const bcs = configData.HyperSolve?.['boundary conditions'] || []
    
    const handleAddBC = () => {
      setShowBCDialog(true)
    }
    
    return (
      <div className="editor-content">
        <div className="property-header">
          <h3 className="property-title">Boundary Conditions</h3>
          <span className="property-type-badge">array</span>
        </div>
        
        <p className="property-description">
          Spatial boundary conditions for the domain. Click to add a new boundary condition.
        </p>

        <div className="form-section">
          <button className="add-button" onClick={handleAddBC}>
            <Plus size={16} /> Add Boundary Condition
          </button>
          
          <div className="info-box">
            {bcs.length === 0 ? (
              'No boundary conditions defined. Click above to add one.'
            ) : (
              `${bcs.length} boundary condition(s) defined. Select one from the tree to edit.`
            )}
          </div>
        </div>
      </div>
    )
  }

  const renderStateEditor = () => {
    if (!selectedState) return null
    
    return (
      <div className="editor-content">
        <div className="property-header">
          <h3 className="property-title">State</h3>
          <span className="property-type-badge">State</span>
          <button 
            className="icon-button delete-button"
            onClick={() => deleteState(selectedState.id)}
            title="Delete State"
          >
            <Trash2 size={14} />
          </button>
        </div>
        
        <p className="property-description">
          Configure physical state properties (all units must be MKS)
        </p>

        <div className="form-section">
          <div className="form-group">
            <label className="form-label">State Name</label>
            <input 
              type="text" 
              className="form-input" 
              value={selectedState.name || ''}
              onChange={(e) => updateState(selectedState.id, { name: e.target.value })}
              placeholder="Enter state name..."
            />
            <span className="default-hint">Used to reference this state in BCs</span>
          </div>

          <div className="form-group">
            <label className="form-label">Mach Number</label>
            <input 
              type="number" 
              className="form-input" 
              value={selectedState['mach number'] || ''}
              onChange={(e) => updateState(selectedState.id, { 'mach number': parseFloat(e.target.value) })}
              placeholder="Enter mach number..."
              step="0.01"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Temperature (K)</label>
            <input 
              type="number" 
              className="form-input" 
              value={selectedState.temperature || ''}
              onChange={(e) => updateState(selectedState.id, { temperature: parseFloat(e.target.value) })}
              placeholder="Enter temperature..."
            />
          </div>

          <div className="form-group">
            <label className="form-label">Pressure (Pa)</label>
            <input 
              type="number" 
              className="form-input" 
              value={selectedState.pressure || ''}
              onChange={(e) => updateState(selectedState.id, { pressure: parseFloat(e.target.value) })}
              placeholder="Enter pressure..."
            />
          </div>

          <div className="form-group">
            <label className="form-label">Angle of Attack (deg)</label>
            <input 
              type="number" 
              className="form-input" 
              value={selectedState['angle of attack'] || 0}
              onChange={(e) => updateState(selectedState.id, { 'angle of attack': parseFloat(e.target.value) })}
              placeholder="0.0"
              step="0.1"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Angle of Yaw (deg)</label>
            <input 
              type="number" 
              className="form-input" 
              value={selectedState['angle of yaw'] || 0}
              onChange={(e) => updateState(selectedState.id, { 'angle of yaw': parseFloat(e.target.value) })}
              placeholder="0.0"
              step="0.1"
            />
          </div>
        </div>
      </div>
    )
  }

  const renderStatesObjectEditor = () => {
    const states = Object.values(configData.HyperSolve?.states || {})
    
    return (
      <div className="editor-content">
        <div className="property-header">
          <h3 className="property-title">States</h3>
          <span className="property-type-badge">object</span>
        </div>
        
        <p className="property-description">
          Physical states to be used for boundary/initial conditions
        </p>

        <div className="form-section">
          <button className="add-button" onClick={() => setShowStateWizard(true)}>
            <Plus size={16} /> Add State
          </button>
          
          <div className="info-box">
            {states.length === 0 ? (
              'No states defined. Click above to add one.'
            ) : (
              `${states.length} state(s) defined. Select one from the tree to edit.`
            )}
          </div>
        </div>
      </div>
    )
  }

  const renderVisualizationArrayEditor = () => {
    const visualizations = configData.visualization || []
    
    const handleAddVisualization = () => {
      setShowVizDialog(true)
    }
    
    return (
      <div className="editor-content">
        <div className="property-header">
          <h3 className="property-title">Visualization</h3>
          <span className="property-type-badge">array</span>
        </div>
        
        <p className="property-description">
          Configure visualization outputs for sampling the flow field solution at various locations and surfaces.
        </p>

        <div className="form-section">
          <button className="add-button" onClick={handleAddVisualization}>
            <Plus size={16} /> Add Visualization
          </button>
          
          <div className="info-box">
            {visualizations.length === 0 ? (
              'No visualizations defined. Click above to add one.'
            ) : (
              `${visualizations.length} visualization(s) defined. Select one from the tree to edit.`
            )}
          </div>
        </div>
      </div>
    )
  }

  const renderVisualizationEditor = () => {
    if (!selectedViz) return null
    
    const viz = selectedViz.data
    const vizIndex = selectedViz.index
    
    const handleUpdate = (updates: any) => {
      const updatedConfig = { ...configData }
      if (!updatedConfig.visualization) return
      
      updatedConfig.visualization[vizIndex] = {
        ...updatedConfig.visualization[vizIndex],
        ...updates
      }
      setConfigData(updatedConfig)
      
      // Update the selected viz reference
      setSelectedViz({ data: updatedConfig.visualization[vizIndex], index: vizIndex })
    }
    
    const handleDelete = () => {
      const updatedConfig = { ...configData }
      if (!updatedConfig.visualization) return
      
      updatedConfig.visualization.splice(vizIndex, 1)
      setConfigData(updatedConfig)
      setSelectedViz(null)
    }
    
    return (
      <div className="editor-content">
        <div className="property-header">
          <h3 className="property-title">Visualization</h3>
          <span className="property-type-badge">{viz.type}</span>
          <button 
            className="icon-button delete-button"
            onClick={handleDelete}
            title="Delete Visualization"
          >
            <Trash2 size={14} />
          </button>
        </div>
        
        <p className="property-description">
          {viz.type} visualization output
        </p>

        <div className="form-section">
          <div className="form-group">
            <label className="form-label">Filename *</label>
            <input 
              type="text" 
              className="form-input" 
              value={viz.filename || ''}
              onChange={(e) => handleUpdate({ filename: e.target.value })}
              placeholder="output.vtk"
            />
          </div>

          {viz.type === 'point' && viz.location && (
            <div className="form-group">
              <label className="form-label">Location [x, y, z]</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                <input 
                  type="number" 
                  className="form-input" 
                  value={viz.location[0] || 0}
                  onChange={(e) => handleUpdate({ location: [Number(e.target.value), viz.location[1], viz.location[2]] })}
                  placeholder="x"
                />
                <input 
                  type="number" 
                  className="form-input" 
                  value={viz.location[1] || 0}
                  onChange={(e) => handleUpdate({ location: [viz.location[0], Number(e.target.value), viz.location[2]] })}
                  placeholder="y"
                />
                <input 
                  type="number" 
                  className="form-input" 
                  value={viz.location[2] || 0}
                  onChange={(e) => handleUpdate({ location: [viz.location[0], viz.location[1], Number(e.target.value)] })}
                  placeholder="z"
                />
              </div>
            </div>
          )}

          {viz.type === 'line' && (
            <>
              <div className="form-group">
                <label className="form-label">Start Point (a) [x, y, z]</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  <input type="number" className="form-input" value={viz.a?.[0] || 0} onChange={(e) => handleUpdate({ a: [Number(e.target.value), viz.a[1], viz.a[2]] })} placeholder="x" />
                  <input type="number" className="form-input" value={viz.a?.[1] || 0} onChange={(e) => handleUpdate({ a: [viz.a[0], Number(e.target.value), viz.a[2]] })} placeholder="y" />
                  <input type="number" className="form-input" value={viz.a?.[2] || 0} onChange={(e) => handleUpdate({ a: [viz.a[0], viz.a[1], Number(e.target.value)] })} placeholder="z" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">End Point (b) [x, y, z]</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  <input type="number" className="form-input" value={viz.b?.[0] || 0} onChange={(e) => handleUpdate({ b: [Number(e.target.value), viz.b[1], viz.b[2]] })} placeholder="x" />
                  <input type="number" className="form-input" value={viz.b?.[1] || 0} onChange={(e) => handleUpdate({ b: [viz.b[0], Number(e.target.value), viz.b[2]] })} placeholder="y" />
                  <input type="number" className="form-input" value={viz.b?.[2] || 0} onChange={(e) => handleUpdate({ b: [viz.b[0], viz.b[1], Number(e.target.value)] })} placeholder="z" />
                </div>
              </div>
            </>
          )}

          {viz.type === 'plane' && (
            <>
              <div className="form-group">
                <label className="form-label">Normal:</label>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '4px' }}>
                  <button
                    className={`add-button ${normalPreset === 'x-normal' ? '' : ''}`}
                    style={{ 
                      padding: '4px 8px', 
                      fontSize: '11px', 
                      backgroundColor: normalPreset === 'x-normal' ? '#4a9eff' : '#3a3a3a',
                      color: '#fff',
                      border: '1px solid #555',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      minWidth: '28px',
                      maxWidth: '32px'
                    }}
                    onClick={() => {
                      setNormalPreset('x-normal')
                      handleUpdate({ normal: [1, 0, 0] })
                    }}
                    title="X Normal (1, 0, 0)"
                  >
                    X
                  </button>
                  <button
                    className={`add-button ${normalPreset === 'y-normal' ? '' : ''}`}
                    style={{ 
                      padding: '4px 8px', 
                      fontSize: '11px', 
                      backgroundColor: normalPreset === 'y-normal' ? '#4a9eff' : '#3a3a3a',
                      color: '#fff',
                      border: '1px solid #555',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      minWidth: '28px',
                      maxWidth: '32px'
                    }}
                    onClick={() => {
                      setNormalPreset('y-normal')
                      handleUpdate({ normal: [0, 1, 0] })
                    }}
                    title="Y Normal (0, 1, 0)"
                  >
                    Y
                  </button>
                  <button
                    className={`add-button ${normalPreset === 'z-normal' ? '' : ''}`}
                    style={{ 
                      padding: '4px 8px', 
                      fontSize: '11px', 
                      backgroundColor: normalPreset === 'z-normal' ? '#4a9eff' : '#3a3a3a',
                      color: '#fff',
                      border: '1px solid #555',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      minWidth: '28px',
                      maxWidth: '32px'
                    }}
                    onClick={() => {
                      setNormalPreset('z-normal')
                      handleUpdate({ normal: [0, 0, 1] })
                    }}
                    title="Z Normal (0, 0, 1)"
                  >
                    Z
                  </button>
                  <select
                    className="form-input"
                    style={{ flex: '1 1 auto', minWidth: 0 }}
                    value={selectedSurfaceForNormal}
                    onChange={(e) => {
                      const surfaceId = e.target.value
                      setSelectedSurfaceForNormal(surfaceId)
                      
                      if (surfaceId) {
                        setNormalPreset('surface-normal')
                        const surface = availableSurfaces.find(s => s.id === surfaceId)
                        if (surface) {
                          const normal = calculateAreaWeightedNormal(surface)
                          handleUpdate({ normal })
                        }
                      } else {
                        setNormalPreset('custom')
                      }
                    }}
                  >
                    <option value="">Normal from surface...</option>
                    {availableSurfaces.map(surface => (
                      <option key={surface.id} value={surface.id}>
                        {surface.name || surface.metadata?.tagName || `Tag ${surface.metadata?.tag}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="form-group">
                <label className="form-label">[x, y, z]:</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginTop: '4px' }}>
                  <input 
                    type="number" 
                    className="form-input" 
                    style={{ padding: '4px 8px', fontSize: '12px' }}
                    value={viz.normal?.[0] || 0} 
                    onChange={(e) => {
                      setNormalPreset('custom')
                      setSelectedSurfaceForNormal('')
                      handleUpdate({ normal: [Number(e.target.value), viz.normal[1], viz.normal[2]] })
                    }} 
                    placeholder="x" 
                  />
                  <input 
                    type="number" 
                    className="form-input" 
                    style={{ padding: '4px 8px', fontSize: '12px' }}
                    value={viz.normal?.[1] || 0} 
                    onChange={(e) => {
                      setNormalPreset('custom')
                      setSelectedSurfaceForNormal('')
                      handleUpdate({ normal: [viz.normal[0], Number(e.target.value), viz.normal[2]] })
                    }} 
                    placeholder="y" 
                  />
                  <input 
                    type="number" 
                    className="form-input" 
                    style={{ padding: '4px 8px', fontSize: '12px' }}
                    value={viz.normal?.[2] || 0} 
                    onChange={(e) => {
                      setNormalPreset('custom')
                      setSelectedSurfaceForNormal('')
                      handleUpdate({ normal: [viz.normal[0], viz.normal[1], Number(e.target.value)] })
                    }} 
                    placeholder="z" 
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label className="form-label">Center:</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginTop: '4px' }}>
                  <input type="number" className="form-input" value={viz.center?.[0] || 0} onChange={(e) => handleUpdate({ center: [Number(e.target.value), viz.center?.[1] || 0, viz.center?.[2] || 0] })} placeholder="x" />
                  <input type="number" className="form-input" value={viz.center?.[1] || 0} onChange={(e) => handleUpdate({ center: [viz.center?.[0] || 0, Number(e.target.value), viz.center?.[2] || 0] })} placeholder="y" />
                  <input type="number" className="form-input" value={viz.center?.[2] || 0} onChange={(e) => handleUpdate({ center: [viz.center?.[0] || 0, viz.center?.[1] || 0, Number(e.target.value)] })} placeholder="z" />
                </div>
              </div>
            </>
          )}

          {viz.type === 'sphere' && (
            <>
              <div className="form-group">
                <label className="form-label">Radius</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={viz.radius || 0}
                  onChange={(e) => handleUpdate({ radius: Number(e.target.value) })}
                  min="0"
                  step="0.1"
                />
              </div>
              {viz.center && (
                <div className="form-group">
                  <label className="form-label">Center [x, y, z]</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    <input type="number" className="form-input" value={viz.center[0] || 0} onChange={(e) => handleUpdate({ center: [Number(e.target.value), viz.center[1], viz.center[2]] })} placeholder="x" />
                    <input type="number" className="form-input" value={viz.center[1] || 0} onChange={(e) => handleUpdate({ center: [viz.center[0], Number(e.target.value), viz.center[2]] })} placeholder="y" />
                    <input type="number" className="form-input" value={viz.center[2] || 0} onChange={(e) => handleUpdate({ center: [viz.center[0], viz.center[1], Number(e.target.value)] })} placeholder="z" />
                  </div>
                </div>
              )}
            </>
          )}

          {viz['iteration frequency'] !== undefined && (
            <div className="form-group">
              <label className="form-label">Iteration Frequency</label>
              <input 
                type="number" 
                className="form-input" 
                value={viz['iteration frequency'] || -1}
                onChange={(e) => handleUpdate({ 'iteration frequency': Number(e.target.value) })}
                placeholder="-1"
              />
              <span className="default-hint">-1 means use checkpoint frequency</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderInitializationRegionArrayEditor = () => {
    const initRegions = configData.HyperSolve?.['initialization regions'] || []
    
    const handleAddInitRegion = () => {
      setShowInitRegionDialog(true)
    }
    
    return (
      <div className="editor-content">
        <div className="property-header">
          <h3 className="property-title">Initialization Regions</h3>
          <span className="property-type-badge">array</span>
        </div>
        
        <p className="property-description">
          Define regions of the domain to initialize with specific states. Common types include boxes, spheres, cylinders, and boundary layers.
        </p>

        <div className="form-section">
          <button className="add-button" onClick={handleAddInitRegion}>
            <Plus size={16} /> Add Initialization Region
          </button>
          
          <div className="info-box">
            {initRegions.length === 0 ? (
              'No initialization regions defined. Click above to add one.'
            ) : (
              `${initRegions.length} initialization region(s) defined. Select one from the tree to edit.`
            )}
          </div>
        </div>
      </div>
    )
  }

  const renderInitializationRegionEditor = () => {
    if (!selectedInitRegion) return null
    
    const region = selectedInitRegion.data
    const regionIndex = selectedInitRegion.index
    
    const handleUpdate = (updates: any) => {
      const updatedConfig = { ...configData }
      if (!updatedConfig.HyperSolve?.['initialization regions']) return
      
      updatedConfig.HyperSolve['initialization regions'][regionIndex] = {
        ...updatedConfig.HyperSolve['initialization regions'][regionIndex],
        ...updates
      }
      setConfigData(updatedConfig)
      
      // Update the selected region reference
      setSelectedInitRegion({ data: updatedConfig.HyperSolve['initialization regions'][regionIndex], index: regionIndex })
    }
    
    const handleDelete = () => {
      const updatedConfig = { ...configData }
      if (!updatedConfig.HyperSolve?.['initialization regions']) return
      
      updatedConfig.HyperSolve['initialization regions'].splice(regionIndex, 1)
      setConfigData(updatedConfig)
      setSelectedInitRegion(null)
    }
    
    return (
      <div className="editor-content">
        <div className="property-header">
          <h3 className="property-title">Initialization Region</h3>
          <span className="property-type-badge">{region.type}</span>
          <button 
            className="icon-button delete-button"
            onClick={handleDelete}
            title="Delete Initialization Region"
          >
            <Trash2 size={14} />
          </button>
        </div>
        
        <div className="form-section">
          {/* Box-specific editable fields */}
          {region.type === 'box' && (
            <>
              {region.state && (
                <div className="form-group">
                  <label className="form-label">State</label>
                  <div className="property-value">{region.state}</div>
                </div>
              )}
              
              <div className="form-group">
                <label className="form-label">Lower Corner (lo) [x, y, z]</label>
                <div className="vector-input">
                  <input
                    type="number"
                    className="form-input"
                    value={region.lo?.[0] ?? 0}
                    onChange={(e) => handleUpdate({ lo: [Number(e.target.value), region.lo[1], region.lo[2]] })}
                    placeholder="x"
                  />
                  <input
                    type="number"
                    className="form-input"
                    value={region.lo?.[1] ?? 0}
                    onChange={(e) => handleUpdate({ lo: [region.lo[0], Number(e.target.value), region.lo[2]] })}
                    placeholder="y"
                  />
                  <input
                    type="number"
                    className="form-input"
                    value={region.lo?.[2] ?? 0}
                    onChange={(e) => handleUpdate({ lo: [region.lo[0], region.lo[1], Number(e.target.value)] })}
                    placeholder="z"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Upper Corner (hi) [x, y, z]</label>
                <div className="vector-input">
                  <input
                    type="number"
                    className="form-input"
                    value={region.hi?.[0] ?? 0}
                    onChange={(e) => handleUpdate({ hi: [Number(e.target.value), region.hi[1], region.hi[2]] })}
                    placeholder="x"
                  />
                  <input
                    type="number"
                    className="form-input"
                    value={region.hi?.[1] ?? 0}
                    onChange={(e) => handleUpdate({ hi: [region.hi[0], Number(e.target.value), region.hi[2]] })}
                    placeholder="y"
                  />
                  <input
                    type="number"
                    className="form-input"
                    value={region.hi?.[2] ?? 0}
                    onChange={(e) => handleUpdate({ hi: [region.hi[0], region.hi[1], Number(e.target.value)] })}
                    placeholder="z"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Snap to Bounds</label>
                <select
                  className="form-input"
                  value=""
                  onChange={(e) => {
                    const selectedTag = Number(e.target.value)
                    if (!selectedTag) return
                    
                    // Find the surface with this tag
                    const surface = availableSurfaces.find(s => s.metadata.tag === selectedTag)
                    if (!surface || !surface.geometry) return
                    
                    // Compute AABB from vertices (vertices are already in physical coordinates)
                    const vertices = surface.geometry.vertices
                    let minX = Infinity, minY = Infinity, minZ = Infinity
                    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity
                    
                    for (let i = 0; i < vertices.length; i += 3) {
                      const x = vertices[i]
                      const y = vertices[i + 1]
                      const z = vertices[i + 2]
                      
                      minX = Math.min(minX, x)
                      minY = Math.min(minY, y)
                      minZ = Math.min(minZ, z)
                      maxX = Math.max(maxX, x)
                      maxY = Math.max(maxY, y)
                      maxZ = Math.max(maxZ, z)
                    }
                    
                    // Compute box dimensions
                    let dx = maxX - minX
                    let dy = maxY - minY
                    let dz = maxZ - minZ
                    
                    // Handle degenerate cases: ensure aspect ratio doesn't exceed 50:1
                    const MAX_ASPECT_RATIO = 50
                    
                    // Find min and max dimensions
                    let dims = [dx, dy, dz]
                    let indices = [0, 1, 2] // x, y, z
                    
                    // Sort by dimension size
                    const sorted = dims.map((d, i) => ({ dim: d, index: i })).sort((a, b) => a.dim - b.dim)
                    
                    // Inflate smallest dimension(s) to maintain max aspect ratio of 50:1
                    const maxDim = sorted[2].dim
                    const minAllowedDim = maxDim / MAX_ASPECT_RATIO
                    
                    // First pass: inflate the smallest dimension
                    if (sorted[0].dim < minAllowedDim) {
                      const inflation = (minAllowedDim - sorted[0].dim) / 2
                      if (sorted[0].index === 0) {
                        minX -= inflation
                        maxX += inflation
                        dx = maxX - minX
                      } else if (sorted[0].index === 1) {
                        minY -= inflation
                        maxY += inflation
                        dy = maxY - minY
                      } else {
                        minZ -= inflation
                        maxZ += inflation
                        dz = maxZ - minZ
                      }
                      
                      // Update sorted dimensions for second pass
                      sorted[0].dim = minAllowedDim
                      dims = [dx, dy, dz]
                      sorted.sort((a, b) => a.dim - b.dim)
                    }
                    
                    // Second pass: check if middle dimension needs inflation after first pass
                    const newMaxDim = Math.max(dx, dy, dz)
                    const newMinAllowedDim = newMaxDim / MAX_ASPECT_RATIO
                    
                    if (sorted[1].dim < newMinAllowedDim) {
                      const inflation = (newMinAllowedDim - sorted[1].dim) / 2
                      if (sorted[1].index === 0) {
                        minX -= inflation
                        maxX += inflation
                      } else if (sorted[1].index === 1) {
                        minY -= inflation
                        maxY += inflation
                      } else {
                        minZ -= inflation
                        maxZ += inflation
                      }
                    }
                    
                    // Update the box bounds
                    handleUpdate({ 
                      lo: [minX, minY, minZ],
                      hi: [maxX, maxY, maxZ]
                    })
                    
                    // Reset the dropdown
                    e.target.value = ''
                  }}
                >
                  <option value="">Select a surface...</option>
                  {availableSurfaces.map(surface => (
                    <option key={surface.id} value={surface.metadata.tag}>
                      Tag {surface.metadata.tag}: {surface.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Cylinder-specific editable fields */}
          {region.type === 'cylinder' && (
            <>
              {region.state && (
                <div className="form-group">
                  <label className="form-label">State</label>
                  <div className="property-value">{region.state}</div>
                </div>
              )}
              
              <div className="form-group">
                <label className="form-label">Point A [x, y, z]</label>
                <div className="vector-input">
                  <input
                    type="number"
                    className="form-input"
                    value={region.a?.[0] ?? 0}
                    onChange={(e) => handleUpdate({ a: [Number(e.target.value), region.a[1], region.a[2]] })}
                    placeholder="x"
                  />
                  <input
                    type="number"
                    className="form-input"
                    value={region.a?.[1] ?? 0}
                    onChange={(e) => handleUpdate({ a: [region.a[0], Number(e.target.value), region.a[2]] })}
                    placeholder="y"
                  />
                  <input
                    type="number"
                    className="form-input"
                    value={region.a?.[2] ?? 0}
                    onChange={(e) => handleUpdate({ a: [region.a[0], region.a[1], Number(e.target.value)] })}
                    placeholder="z"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Point B [x, y, z]</label>
                <div className="vector-input">
                  <input
                    type="number"
                    className="form-input"
                    value={region.b?.[0] ?? 0}
                    onChange={(e) => handleUpdate({ b: [Number(e.target.value), region.b[1], region.b[2]] })}
                    placeholder="x"
                  />
                  <input
                    type="number"
                    className="form-input"
                    value={region.b?.[1] ?? 0}
                    onChange={(e) => handleUpdate({ b: [region.b[0], Number(e.target.value), region.b[2]] })}
                    placeholder="y"
                  />
                  <input
                    type="number"
                    className="form-input"
                    value={region.b?.[2] ?? 0}
                    onChange={(e) => handleUpdate({ b: [region.b[0], region.b[1], Number(e.target.value)] })}
                    placeholder="z"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Radius</label>
                <input
                  type="number"
                  className="form-input"
                  value={region.radius ?? 1}
                  onChange={(e) => handleUpdate({ radius: Number(e.target.value) })}
                  placeholder="radius"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Flip Cylinder Direction</label>
                <button
                  className="form-button"
                  onClick={() => {
                    // Swap points A and B to flip the cylinder direction
                    const tempA = region.a
                    const tempB = region.b
                    handleUpdate({ 
                      a: tempB,
                      b: tempA
                    })
                  }}
                >
                  Flip Normal
                </button>
              </div>

              <div className="form-group">
                <label className="form-label">Snap to Surface Normal</label>
                <select
                  className="form-input"
                  value=""
                  onChange={(e) => {
                    const selectedTag = Number(e.target.value)
                    if (!selectedTag) return
                    
                    // Find the surface with this tag
                    const surface = availableSurfaces.find(s => s.metadata.tag === selectedTag)
                    if (!surface || !surface.geometry) return
                    
                    // Compute centroid
                    const vertices = surface.geometry.vertices
                    const normals = surface.geometry.normals
                    let sumX = 0, sumY = 0, sumZ = 0
                    let sumNx = 0, sumNy = 0, sumNz = 0
                    let count = 0
                    
                    for (let i = 0; i < vertices.length; i += 3) {
                      sumX += vertices[i]
                      sumY += vertices[i + 1]
                      sumZ += vertices[i + 2]
                      sumNx += normals[i]
                      sumNy += normals[i + 1]
                      sumNz += normals[i + 2]
                      count++
                    }
                    
                    const centroid: [number, number, number] = [
                      sumX / count,
                      sumY / count,
                      sumZ / count
                    ]
                    
                    // Average normal (flipped)
                    let avgNormal: [number, number, number] = [
                      -sumNx / count,
                      -sumNy / count,
                      -sumNz / count
                    ]
                    
                    // Normalize
                    const normalLength = Math.sqrt(avgNormal[0] * avgNormal[0] + avgNormal[1] * avgNormal[1] + avgNormal[2] * avgNormal[2])
                    if (normalLength > 0) {
                      avgNormal = [
                        avgNormal[0] / normalLength,
                        avgNormal[1] / normalLength,
                        avgNormal[2] / normalLength
                      ]
                    }
                    
                    // Find max distance from centroid to any point
                    let maxDist = 0
                    for (let i = 0; i < vertices.length; i += 3) {
                      const dx = vertices[i] - centroid[0]
                      const dy = vertices[i + 1] - centroid[1]
                      const dz = vertices[i + 2] - centroid[2]
                      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
                      maxDist = Math.max(maxDist, dist)
                    }
                    
                    // Set radius slightly larger than max distance
                    const cylinderRadius = maxDist * 1.1
                    
                    // Set length such that diameter/length = 5
                    // diameter = 2 * radius, so length = diameter / 5 = 2 * radius / 5
                    const cylinderLength = (2 * cylinderRadius) / 5
                    
                    // Point B is in the direction of the normal from the centroid
                    const pointB: [number, number, number] = [
                      centroid[0] + avgNormal[0] * cylinderLength,
                      centroid[1] + avgNormal[1] * cylinderLength,
                      centroid[2] + avgNormal[2] * cylinderLength
                    ]
                    
                    // Update the cylinder
                    handleUpdate({ 
                      a: centroid,
                      b: pointB,
                      radius: cylinderRadius
                    })
                    
                    // Reset the dropdown
                    e.target.value = ''
                  }}
                >
                  <option value="">Select a surface...</option>
                  {availableSurfaces.map(surface => (
                    <option key={surface.id} value={surface.metadata.tag}>
                      Tag {surface.metadata.tag}: {surface.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* For other region types, show read-only properties */}
          {region.type !== 'box' && region.type !== 'cylinder' && (
            <>
              <div className="property-list">
                {Object.entries(region).map(([key, value]) => {
                  if (key === 'type') return null // Already shown in badge
                  
                  let displayValue = value
                  if (Array.isArray(value)) {
                    displayValue = `[${value.join(', ')}]`
                  } else if (typeof value === 'object') {
                    displayValue = JSON.stringify(value)
                  }
                  
                  return (
                    <div key={key} className="property-item">
                      <label className="form-label">{key}</label>
                      <div className="property-value">{String(displayValue)}</div>
                    </div>
                  )
                })}
              </div>
              
              <div className="info-box" style={{ marginTop: '16px' }}>
                <strong>Note:</strong> To edit this initialization region, delete it and create a new one with the desired properties.
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  const renderEditor = () => {
    // Priority: InitRegion > Viz > State > BC > Node
    if (selectedInitRegion) {
      return renderInitializationRegionEditor()
    }
    if (selectedViz) {
      return renderVisualizationEditor()
    }
    if (selectedState) {
      return renderStateEditor()
    }
    if (selectedBC) {
      return renderBCEditor()
    }
    if (selectedNode) {
      // Check if this is the boundary conditions array node
      if (selectedNode.id === 'root.HyperSolve.boundary conditions') {
        return renderBCArrayEditor()
      }
      // Check if this is the states object node
      if (selectedNode.id === 'root.HyperSolve.states' || (selectedNode.id && selectedNode.id.endsWith('.states')) || selectedNode.path === 'HyperSolve.states') {
        return renderStatesObjectEditor()
      }
      // Check if this is the visualization array node
      if (selectedNode.id === 'root.visualization') {
        return renderVisualizationArrayEditor()
      }
      // Check if this is the initialization regions array node
      if (selectedNode.id === 'root.HyperSolve.initialization regions') {
        return renderInitializationRegionArrayEditor()
      }
      return renderNodeEditor()
    }
    return (
      <div className="editor-placeholder">
        <p className="placeholder-text">Select an item from the configuration tree to edit</p>
      </div>
    )
  }

  const renderNodeEditor = () => {
    if (!selectedNode) return null

    // Check if this is the thermodynamics node
    const isThermoNode = selectedNode.id === 'root.HyperSolve.thermodynamics' || 
                        (selectedNode.id && selectedNode.id.endsWith('.thermodynamics')) ||
                        selectedNode.path === 'HyperSolve.thermodynamics'

    return (
      <div className="editor-content">
        <div className="property-header">
          <h3 className="property-title">{selectedNode.label}</h3>
          <span className="property-type-badge">{selectedNode.type}</span>
          {selectedNode.type === 'object' && (
            <button 
              className="icon-button"
              onClick={() => setShowPropertyDialog(true)}
              title="Open in larger window"
            >
              <Maximize2 size={14} />
            </button>
          )}
        </div>
        
        {selectedNode.description && (
          <p className="property-description">{selectedNode.description}</p>
        )}

        <div className="form-section">
          {isThermoNode && (
            <button 
              className="wizard-launch-button" 
              onClick={() => setShowThermoWizard(true)}
            >
              <Settings size={16} /> Open Thermodynamics Wizard
            </button>
          )}

          {selectedNode.required && (
            <div className="required-badge">Required Field</div>
          )}

          {selectedNode.type === 'object' && (() => {
            const objSchema = getSchemaForPath(selectedNode.id)
            const objValue = getValueFromPath(selectedNode.id) || {}
            
            // Check if this is a simple map (object with arbitrary keys -> POD values)
            const mapInfo = isSimpleMap(objSchema || {})
            if (mapInfo.isMap && mapInfo.valueType) {
              return (
                <MapEditor
                  value={objValue}
                  onChange={(newValue) => updateValueAtPath(selectedNode.id, '', newValue)}
                  valueType={mapInfo.valueType as 'string' | 'number' | 'integer' | 'boolean'}
                  label={selectedNode.label}
                  keyPlaceholder="key"
                  valuePlaceholder={`value (${mapInfo.valueType})`}
                />
              )
            }
            
            // Otherwise handle as object with known POD properties
            const podProps = getPODProperties(objSchema)
            
            if (podProps.length === 0) {
              return (
                <div className="info-box">
                  This object has no primitive properties. Expand it in the tree to edit nested objects.
                </div>
              )
            }
            
            return podProps.map(({ key, prop, required }) => {
              const value = objValue[key]
              const displayValue = value !== undefined ? value : prop.default
              const propType = Array.isArray(prop.type) ? prop.type[0] : prop.type
              
              
              return (
                <div key={key} className="form-group">
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    gap: '16px'
                  }}>
                    <div style={{ flex: '0 0 auto', minWidth: 0 }}>
                      <label className="form-label" style={{ marginBottom: 0 }}>
                        {key}
                        {required && <span style={{ color: '#ff6b6b' }}> *</span>}
                      </label>
                      {prop.description && (
                        <div style={{ 
                          fontSize: '11px', 
                          color: '#888', 
                          marginTop: '2px',
                          maxWidth: '300px'
                        }}>
                          {prop.description}
                        </div>
                      )}
                    </div>
                    
                    <div style={{ flex: '0 0 auto', minWidth: '200px', maxWidth: '300px' }}>
                      {propType === 'boolean' ? (
                        <label style={{ 
                          position: 'relative',
                          display: 'inline-block',
                          width: '50px',
                          height: '24px',
                          cursor: 'pointer'
                        }}>
                          <input 
                            type="checkbox"
                            checked={displayValue === true}
                            onChange={(e) => updateValueAtPath(selectedNode.id, key, e.target.checked)}
                            style={{ 
                              position: 'absolute',
                              opacity: 0,
                              width: '100%',
                              height: '100%',
                              cursor: 'pointer',
                              zIndex: 1
                            }}
                          />
                          <span style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: displayValue ? '#4da6ff' : '#444',
                            borderRadius: '24px',
                            transition: 'background-color 0.2s',
                            pointerEvents: 'none'
                          }}>
                            <span style={{
                              position: 'absolute',
                              content: '""',
                              height: '18px',
                              width: '18px',
                              left: displayValue ? '28px' : '4px',
                              bottom: '3px',
                              backgroundColor: 'white',
                              borderRadius: '50%',
                              transition: 'left 0.2s'
                            }} />
                          </span>
                        </label>
                      ) : prop.enum ? (
                        <select 
                          className="form-input"
                          value={displayValue || ''}
                          onChange={(e) => updateValueAtPath(selectedNode.id, key, e.target.value)}
                          style={{ width: '100%' }}
                        >
                          <option value="">-- Select --</option>
                          {prop.enum.map((enumValue: any) => (
                            <option key={enumValue} value={enumValue}>
                              {enumValue}
                            </option>
                          ))}
                        </select>
                      ) : propType === 'array' ? (
                        // Check if it's a simple array (POD items)
                        (() => {
                          const itemType = prop.items?.type
                          const isSimpleArray = itemType && isPODType(itemType)
                          
                          if (isSimpleArray && Array.isArray(displayValue)) {
                            return (
                              <ArrayEditor
                                value={displayValue}
                                onChange={(newValue) => updateValueAtPath(selectedNode.id, key, newValue)}
                                itemType={itemType as 'string' | 'number' | 'integer' | 'boolean'}
                                placeholder={`Enter ${itemType}`}
                              />
                            )
                          }
                          
                          // Fallback to textarea for complex arrays
                          return (
                            <textarea 
                              className="form-input"
                              rows={2}
                              value={Array.isArray(displayValue) ? JSON.stringify(displayValue) : '[]'}
                              onChange={(e) => {
                                try {
                                  const parsed = JSON.parse(e.target.value)
                                  updateValueAtPath(selectedNode.id, key, parsed)
                                } catch (err) {
                                  // Invalid JSON - don't update yet
                                }
                              }}
                              placeholder="[...]"
                              style={{ width: '100%', fontSize: '12px' }}
                            />
                          )
                        })()
                      ) : (
                        <input 
                          type={propType === 'integer' || propType === 'number' ? 'number' : 'text'}
                          className="form-input"
                          value={displayValue !== undefined ? displayValue : ''}
                          onChange={(e) => {
                            const newValue = (propType === 'integer' || propType === 'number') 
                              ? parseFloat(e.target.value) || 0
                              : e.target.value
                            updateValueAtPath(selectedNode.id, key, newValue)
                          }}
                          placeholder={prop.default !== undefined ? String(prop.default) : ''}
                          style={{ width: '100%' }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          })()}
        </div>
      </div>
    )
  }

  return (
    <div className="panel editor-panel">
      <div className="panel-header">
        <Edit3 size={16} />
        <span>Property Editor</span>
        <div className="panel-actions">
          <button className="icon-button" title="Reset to defaults">
            <RotateCcw size={14} />
          </button>
          <button className="icon-button" title="Save changes">
            <Save size={14} />
          </button>
        </div>
      </div>
      <div className="panel-content">
        {renderEditor()}
      </div>
      
      {showStateWizard && (
        <StateWizard
          onClose={() => setShowStateWizard(false)}
          onCreate={(state) => addState(state)}
        />
      )}
      
      {showBCDialog && (
        <BoundaryConditionDialog
          isOpen={showBCDialog}
          onClose={() => setShowBCDialog(false)}
        />
      )}
      
      {showPropertyDialog && selectedNode && (
        <PropertyEditorDialog
          isOpen={showPropertyDialog}
          onClose={() => setShowPropertyDialog(false)}
          node={selectedNode}
          schema={schema}
          configData={configData}
        />
      )}

      {showVizDialog && (
        <VisualizationDialog
          isOpen={showVizDialog}
          onClose={() => setShowVizDialog(false)}
        />
      )}

      {showInitRegionDialog && (
        <InitializationRegionDialog
          isOpen={showInitRegionDialog}
          onClose={() => setShowInitRegionDialog(false)}
        />
      )}

      {showThermoWizard && (
        <ThermodynamicsWizard
          onClose={() => setShowThermoWizard(false)}
          onUpdate={() => {
            // Wizard updates configData directly via updateThermodynamics store action
          }}
        />
      )}
    </div>
  )
}

export default EditorPanel
