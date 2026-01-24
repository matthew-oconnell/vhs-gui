import { useAppStore } from '../../store/appStore'
import './SelectionBox.css'

interface SelectionBoxProps {
  containerRef: React.RefObject<HTMLDivElement>
}

export function SelectionBox({ containerRef }: SelectionBoxProps) {
  const { boxSelectionState, boxSelectionSettings } = useAppStore()
  
  const { isBoxSelecting, boxSelectStart, boxSelectEnd, boxSelectMode } = boxSelectionState
  
  if (!isBoxSelecting || !boxSelectStart || !boxSelectEnd || !boxSelectMode) {
    return null
  }
  
  // Calculate box dimensions (handle drag in any direction)
  const left = Math.min(boxSelectStart.x, boxSelectEnd.x)
  const top = Math.min(boxSelectStart.y, boxSelectEnd.y)
  const width = Math.abs(boxSelectEnd.x - boxSelectStart.x)
  const height = Math.abs(boxSelectEnd.y - boxSelectStart.y)
  
  // Get colors based on mode
  const backgroundColor = boxSelectMode === 'all' 
    ? boxSelectionSettings.boxSelectAllColor 
    : boxSelectionSettings.boxSelectVisibleColor
  const borderColor = boxSelectMode === 'all'
    ? boxSelectionSettings.boxSelectAllBorder
    : boxSelectionSettings.boxSelectVisibleBorder
  
  return (
    <div 
      className="selection-box"
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`,
        backgroundColor,
        borderColor
      }}
    >
      <div className="selection-box-label">
        {boxSelectMode === 'all' ? 'Select All' : 'Select Visible'}
      </div>
    </div>
  )
}
