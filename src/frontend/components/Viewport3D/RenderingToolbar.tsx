import { EyeOff, Palette, Mouse } from 'lucide-react'
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
    toggleHideAssignedSurfaces,
    cameraSettings,
    setSelectionMode
  } = useAppStore()
  
  const { colorMode, hideAssignedSurfaces } = globalRenderSettings
  const { selectionMode } = cameraSettings

  const handleColorModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setColorMode(e.target.value as ColorMode)
  }
  
  const handleSelectionModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectionMode(e.target.value as 'face' | 'group')
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
          title="Select surface coloring mode"
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
        <Mouse size={14} color="#808080" />
        <span className="toolbar-label">Select</span>
        <select 
          className="toolbar-select"
          value={selectionMode}
          onChange={handleSelectionModeChange}
          title="Select individual faces or entire groups (by bc_name)"
        >
          <option value="face">Faces</option>
          <option value="group">Groups</option>
        </select>
      </div>
      
      <div className="toolbar-separator" />
      
      <div className="toolbar-group">
        <button 
          className={`toolbar-button ${hideAssignedSurfaces ? 'active' : ''}`}
          onClick={toggleHideAssignedSurfaces}
          title={hideAssignedSurfaces ? 'Show all surfaces' : 'Hide surfaces with assigned BCs'}
        >
          <EyeOff size={14} />
          <span>Hide Assigned</span>
        </button>
      </div>
    </div>
  )
}
