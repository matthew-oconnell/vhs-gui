import { Trash2, Plus } from 'lucide-react'
import './MapEditor.css'

interface MapEditorProps {
  value: Record<string, string | number | boolean>
  onChange: (newValue: Record<string, string | number | boolean>) => void
  valueType: 'string' | 'number' | 'integer' | 'boolean'
  label?: string
  keyPlaceholder?: string
  valuePlaceholder?: string
  disabled?: boolean
}

export default function MapEditor({
  value,
  onChange,
  valueType,
  label,
  keyPlaceholder = 'key',
  valuePlaceholder = 'value',
  disabled = false
}: MapEditorProps) {
  
  const entries = Object.entries(value)
  
  const handleKeyChange = (oldKey: string, newKey: string, index: number) => {
    const newMap: Record<string, string | number | boolean> = {}
    entries.forEach(([k, v], i) => {
      if (i === index) {
        newMap[newKey] = v
      } else {
        newMap[k] = v
      }
    })
    onChange(newMap)
  }
  
  const handleValueChange = (key: string, newValue: string) => {
    const newMap = { ...value }
    
    if (valueType === 'number' || valueType === 'integer') {
      const parsed = parseFloat(newValue)
      if (!isNaN(parsed)) {
        newMap[key] = valueType === 'integer' ? Math.floor(parsed) : parsed
        onChange(newMap)
      }
    } else if (valueType === 'boolean') {
      newMap[key] = newValue === 'true'
      onChange(newMap)
    } else {
      newMap[key] = newValue
      onChange(newMap)
    }
  }
  
  const handleDelete = (key: string) => {
    const newMap = { ...value }
    delete newMap[key]
    onChange(newMap)
  }
  
  const handleAdd = () => {
    const defaultValue = valueType === 'number' || valueType === 'integer' ? 0 : 
                        valueType === 'boolean' ? false : ''
    onChange({ ...value, '': defaultValue })
  }
  
  return (
    <div className="map-editor">
      {label && <label className="map-editor-label">{label}</label>}
      <div className="map-editor-items">
        {entries.map(([key, val], index) => (
          <div key={index} className="map-editor-item">
            <input
              type="text"
              className="map-editor-key"
              value={key}
              onChange={(e) => handleKeyChange(key, e.target.value, index)}
              placeholder={keyPlaceholder}
              disabled={disabled}
            />
            <span className="map-editor-separator">:</span>
            {valueType === 'boolean' ? (
              <select
                className="map-editor-value"
                value={String(val)}
                onChange={(e) => handleValueChange(key, e.target.value)}
                disabled={disabled}
              >
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            ) : (
              <input
                type={valueType === 'number' || valueType === 'integer' ? 'number' : 'text'}
                className="map-editor-value"
                value={String(val)}
                onChange={(e) => handleValueChange(key, e.target.value)}
                placeholder={valuePlaceholder}
                disabled={disabled}
                step={valueType === 'integer' ? '1' : 'any'}
              />
            )}
            <button
              className="map-editor-delete"
              onClick={() => handleDelete(key)}
              disabled={disabled}
              title="Delete entry"
              type="button"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      <button
        className="map-editor-add"
        onClick={handleAdd}
        disabled={disabled}
        type="button"
      >
        <Plus size={14} />
        <span>Add {label || 'entry'}</span>
      </button>
    </div>
  )
}
