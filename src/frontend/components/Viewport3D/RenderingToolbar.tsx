import { EyeOff, Palette } from 'lucide-react'
import { useAppStore, ColorMode } from '../../store/appStore'
import './RenderingToolbar.css'

const COLOR_MODE_OPTIONS: { value: ColorMode; label: string }[] = [
  { value: 'solid', label: 'Solid Color' },
  { value: 'assigned-status', label: 'Assigned Status' },
  { value: 'bc-type', label: 'BC Type' },
  { value: 'random', label: 'Random' },
]

export function RenderingToolbar() {
  const { 
    globalRenderSettings, 
    setColorMode, 
    toggleHideAssignedSurfaces 
  } = useAppStore()
  
  const { colorMode, hideAssignedSurfaces } = globalRenderSettings

  const handleColorModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setColorMode(e.target.value as ColorMode)
  }

  return (
    <div className="rendering-toolbar">
      <div className="toolbar-group">
        <Palette size={14} color="#808080" />
        <span className="toolbar-label">Color</span>
        <select 
          className="toolbar-select"
          value={colorMode}
          onChange={handleColorModeChange}
          title="Select tag coloring mode"
        >
          {COLOR_MODE_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      
      <div className="toolbar-separator" />
      
      <div className="toolbar-group">
        <button 
          className={`toolbar-button ${hideAssignedTags ? 'active' : ''}`}
          onClick={toggleHideAssignedSurfaces}
          title={hideAssignedTags ? 'Show all tags' : 'Hide tags with assigned BCs'}
        >
          <EyeOff size={14} />
          <span>Hide Assigned</span>
        </button>
      </div>
    </div>
  )
}
