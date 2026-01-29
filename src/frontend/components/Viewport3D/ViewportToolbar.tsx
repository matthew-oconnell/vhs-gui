import { Maximize2, RotateCw, RotateCcw, Square, EyeOff, Palette, Mouse } from 'lucide-react'
import { useAppStore, ColorMode } from '../../store/appStore'
import './ViewportToolbar.css'

const COLOR_MODE_OPTIONS: { value: ColorMode; label: string }[] = [
  { value: 'solid', label: 'Solid Color' },
  { value: 'assigned-status', label: 'Assigned Status' },
  { value: 'bc-type', label: 'BC Type' },
  { value: 'random', label: 'Random' },
]

export function ViewportToolbar() {
  const { 
    globalRenderSettings, 
    setColorMode, 
    toggleHideAssignedTags,
    cameraSettings,
    setSelectionMode
  } = useAppStore()
  
  const { colorMode, hideAssignedTags } = globalRenderSettings
  const { selectionMode } = cameraSettings

  const handleColorModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setColorMode(e.target.value as ColorMode)
  }
  
  const handleSelectionModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectionMode(e.target.value as 'tag' | 'group')  // MIGRATION: Changed from 'face' to 'tag'
  }

  const handleFitToView = () => {
    ;(window as any).cameraControlFunctions?.fitToView()
  }
  
  const handleSnapToPlane = (plane: 'xy' | 'yz' | 'xz') => {
    ;(window as any).cameraControlFunctions?.snapToPlane(plane)
  }
  
  const handleRotate = (degrees: number) => {
    ;(window as any).cameraControlFunctions?.rotateCamera(degrees)
  }

  return (
    <div className="viewport-toolbar">
      {/* Row 1: Tag/Selection Controls */}
      <div className="toolbar-row">
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
          <Mouse size={14} color="#808080" />
          <span className="toolbar-label">Select</span>
          <select 
            className="toolbar-select"
            value={selectionMode}
            onChange={handleSelectionModeChange}
            title="Select individual tags or entire groups (tags with same name)"
          >
            <option value="tag">Tags</option>
            <option value="group">Groups</option>
          </select>
        </div>
        
        <div className="toolbar-separator" />
        
        <div className="toolbar-group">
          <button 
            className={`toolbar-button ${hideAssignedTags ? 'active' : ''}`}
            onClick={toggleHideAssignedTags}
            title={hideAssignedTags ? 'Show all tags' : 'Hide tags with assigned BCs'}
          >
            <EyeOff size={14} />
            <span>Hide Assigned</span>
          </button>
        </div>
      </div>

      {/* Row 2: Camera Controls */}
      <div className="toolbar-row">
        <div className="toolbar-group">
          <button 
            className="toolbar-button" 
            onClick={handleFitToView}
            title="Fit camera to visible tags"
          >
            <Maximize2 size={14} />
            <span>Fit</span>
          </button>
        </div>
        
        <div className="toolbar-separator" />
        
        <div className="toolbar-group">
          <button 
            className="toolbar-button" 
            onClick={() => handleSnapToPlane('xy')}
            title="View XY plane (top view)"
          >
            <Square size={14} />
            <span>XY</span>
          </button>
          <button 
            className="toolbar-button" 
            onClick={() => handleSnapToPlane('yz')}
            title="View YZ plane (side view)"
          >
            <Square size={14} />
            <span>YZ</span>
          </button>
          <button 
            className="toolbar-button" 
            onClick={() => handleSnapToPlane('xz')}
            title="View XZ plane (front view)"
          >
            <Square size={14} />
            <span>XZ</span>
          </button>
        </div>
        
        <div className="toolbar-separator" />
        
        <div className="toolbar-group">
          <button 
            className="toolbar-button" 
            onClick={() => handleRotate(-90)}
            title="Rotate camera -90°"
          >
            <RotateCcw size={14} />
            <span>-90°</span>
          </button>
          <button 
            className="toolbar-button" 
            onClick={() => handleRotate(90)}
            title="Rotate camera +90°"
          >
            <RotateCw size={14} />
            <span>+90°</span>
          </button>
        </div>
      </div>
    </div>
  )
}
