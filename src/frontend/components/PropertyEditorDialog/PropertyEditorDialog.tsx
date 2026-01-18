import { X, Maximize2 } from 'lucide-react'
import { TreeNode } from '../../utils/schemaParser'
import './PropertyEditorDialog.css'

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

interface PropertyEditorDialogProps {
  isOpen: boolean
  onClose: () => void
  node: TreeNode | null
  schema: Schema | null
  configData: any
  onUpdate?: (path: string, key: string, value: any) => void
}

export default function PropertyEditorDialog({
  isOpen,
  onClose,
  node,
  schema,
  configData,
  onUpdate
}: PropertyEditorDialogProps) {
  if (!isOpen || !node) return null

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

  const handleInputChange = (key: string, value: any) => {
    if (onUpdate) {
      onUpdate(node.id, key, value)
    }
  }

  const renderProperties = () => {
    if (node.type !== 'object') {
      return (
        <div className="info-box">
          Property editor is only available for object types.
        </div>
      )
    }

    const objSchema = getSchemaForPath(node.id)
    const podProps = getPODProperties(objSchema)
    const objValue = getValueFromPath(node.id) || {}
    
    if (podProps.length === 0) {
      return (
        <div className="info-box">
          This object has no primitive properties. Expand it in the tree to edit nested objects.
        </div>
      )
    }

    return (
      <div className="property-grid">
        {podProps.map(({ key, prop, required }) => {
          const value = objValue[key]
          const displayValue = value !== undefined ? value : prop.default
          const propType = Array.isArray(prop.type) ? prop.type[0] : prop.type
          
          return (
            <div key={key} className="property-grid-item">
              <label className="property-grid-label">
                {key}
                {required && <span className="property-required-marker">*</span>}
              </label>
              {prop.description && (
                <div className="property-grid-description">
                  {prop.description}
                </div>
              )}
              
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
                    style={{ 
                      position: 'absolute',
                      opacity: 0,
                      width: '100%',
                      height: '100%',
                      cursor: 'pointer',
                      zIndex: 1
                    }}
                    onChange={(e) => {
                      handleInputChange(key, e.target.checked)
                      const toggle = e.target.nextElementSibling as HTMLElement
                      const knob = toggle?.firstChild as HTMLElement
                      if (toggle && knob) {
                        if (e.target.checked) {
                          toggle.style.backgroundColor = '#4da6ff'
                          knob.style.left = '28px'
                        } else {
                          toggle.style.backgroundColor = '#444'
                          knob.style.left = '4px'
                        }
                      }
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
                  className="property-grid-input"
                  value={displayValue || ''}
                  onChange={(e) => handleInputChange(key, e.target.value)}
                >
                  <option value="">-- Select --</option>
                  {prop.enum.map((enumValue: any) => (
                    <option key={enumValue} value={enumValue}>
                      {enumValue}
                    </option>
                  ))}
                </select>
              ) : propType === 'array' ? (
                <textarea 
                  className="property-grid-input"
                  rows={3}
                  value={Array.isArray(displayValue) ? JSON.stringify(displayValue, null, 2) : '[]'}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value)
                      handleInputChange(key, parsed)
                    } catch {
                      // Invalid JSON, ignore
                    }
                  }}
                  placeholder="[...]"
                />
              ) : (
                <input 
                  type={propType === 'integer' || propType === 'number' ? 'number' : 'text'}
                  className="property-grid-input"
                  value={displayValue !== undefined ? displayValue : ''}
                  onChange={(e) => {
                    const val = e.target.value
                    if (propType === 'integer' || propType === 'number') {
                      handleInputChange(key, parseFloat(val))
                    } else {
                      handleInputChange(key, val)
                    }
                  }}
                  placeholder={prop.default !== undefined ? String(prop.default) : ''}
                  step={propType === 'number' ? 'any' : undefined}
                />
              )}
              
              {prop.default !== undefined && (
                <div className="property-grid-description">
                  Default: {String(prop.default)}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="property-editor-dialog-overlay" onClick={onClose}>
      <div className="property-editor-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="property-editor-dialog-header">
          <div className="property-editor-dialog-title">
            <Maximize2 size={16} />
            <span>{node.label}</span>
            <span className="property-editor-dialog-type-badge">{node.type}</span>
          </div>
          <button 
            className="property-editor-dialog-close"
            onClick={onClose}
            title="Close"
          >
            <X size={18} />
          </button>
        </div>
        
        <div className="property-editor-dialog-content">
          {node.description && (
            <p className="property-editor-dialog-description">{node.description}</p>
          )}
          
          {renderProperties()}
        </div>
        
        <div className="property-editor-dialog-footer">
          <button 
            className="property-editor-dialog-btn property-editor-dialog-btn-cancel"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
