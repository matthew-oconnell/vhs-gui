import { Trash2, Plus } from 'lucide-react'
import './ArrayEditor.css'

interface ArrayEditorProps {
  value: (string | number | boolean)[]
  onChange: (newValue: (string | number | boolean)[]) => void
  itemType: 'string' | 'number' | 'integer' | 'boolean'
  label?: string
  placeholder?: string
  disabled?: boolean
}

export default function ArrayEditor({
  value,
  onChange,
  itemType,
  label,
  placeholder,
  disabled = false
}: ArrayEditorProps) {
  
  const handleItemChange = (index: number, newValue: string) => {
    const newArray = [...value]
    
    if (itemType === 'number' || itemType === 'integer') {
      const parsed = parseFloat(newValue)
      if (!isNaN(parsed)) {
        newArray[index] = itemType === 'integer' ? Math.floor(parsed) : parsed
        onChange(newArray)
      }
    } else if (itemType === 'boolean') {
      newArray[index] = newValue === 'true'
      onChange(newArray)
    } else {
      newArray[index] = newValue
      onChange(newArray)
    }
  }
  
  const handleDelete = (index: number) => {
    const newArray = value.filter((_, i) => i !== index)
    onChange(newArray)
  }
  
  const handleAdd = () => {
    const defaultValue = itemType === 'number' || itemType === 'integer' ? 0 : 
                        itemType === 'boolean' ? false : ''
    onChange([...value, defaultValue])
  }
  
  return (
    <div className="array-editor">
      {label && <label className="array-editor-label">{label}</label>}
      <div className="array-editor-items">
        {value.map((item, index) => (
          <div key={index} className="array-editor-item">
            {itemType === 'boolean' ? (
              <select
                className="array-editor-input"
                value={String(item)}
                onChange={(e) => handleItemChange(index, e.target.value)}
                disabled={disabled}
              >
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            ) : (
              <input
                type={itemType === 'number' || itemType === 'integer' ? 'number' : 'text'}
                className="array-editor-input"
                value={String(item)}
                onChange={(e) => handleItemChange(index, e.target.value)}
                placeholder={placeholder}
                disabled={disabled}
                step={itemType === 'integer' ? '1' : 'any'}
              />
            )}
            <button
              className="array-editor-delete"
              onClick={() => handleDelete(index)}
              disabled={disabled}
              title="Delete item"
              type="button"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      <button
        className="array-editor-add"
        onClick={handleAdd}
        disabled={disabled}
        type="button"
      >
        <Plus size={14} />
        <span>Add {label || 'item'}</span>
      </button>
    </div>
  )
}
