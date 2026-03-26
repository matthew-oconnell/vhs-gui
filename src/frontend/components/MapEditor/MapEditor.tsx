import { useState, useEffect } from 'react'
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

/** A single number input that uses local string state while editing,
 *  committing parsed values on blur or Enter. */
function NumericValueInput({
  value,
  onCommit,
  placeholder,
  disabled,
  step,
}: {
  value: number
  onCommit: (v: number) => void
  placeholder?: string
  disabled?: boolean
  step?: string
}) {
  const [draft, setDraft] = useState(String(value))
  const [isFocused, setIsFocused] = useState(false)

  // Sync draft from prop when not actively editing
  useEffect(() => {
    if (!isFocused) {
      setDraft(String(value))
    }
  }, [value, isFocused])

  const commit = () => {
    const parsed = parseFloat(draft)
    if (!isNaN(parsed)) {
      onCommit(step === '1' ? Math.floor(parsed) : parsed)
    } else {
      // Revert to the stored value if invalid
      setDraft(String(value))
    }
  }

  return (
    <input
      type="number"
      className="map-editor-value"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => { setIsFocused(false); commit() }}
      onKeyDown={(e) => { if (e.key === 'Enter') { e.currentTarget.blur() } }}
      placeholder={placeholder}
      disabled={disabled}
      step={step}
    />
  )
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

    if (valueType === 'boolean') {
      newMap[key] = newValue === 'true'
    } else {
      newMap[key] = newValue
    }
    onChange(newMap)
  }

  const handleNumericCommit = (key: string, parsed: number) => {
    const newMap = { ...value }
    newMap[key] = parsed
    onChange(newMap)
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
            ) : (valueType === 'number' || valueType === 'integer') ? (
              <NumericValueInput
                value={val as number}
                onCommit={(v) => handleNumericCommit(key, v)}
                placeholder={valuePlaceholder}
                disabled={disabled}
                step={valueType === 'integer' ? '1' : 'any'}
              />
            ) : (
              <input
                type="text"
                className="map-editor-value"
                value={String(val)}
                onChange={(e) => handleValueChange(key, e.target.value)}
                placeholder={valuePlaceholder}
                disabled={disabled}
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
