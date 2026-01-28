/**
 * StatusBar - Project setup checklist tracker
 * 
 * Shows completion status for all required CFD setup tasks.
 * Tasks can be completed in any order - no enforced sequence.
 */

import { useAppStore } from '../../store/appStore'
import { Check, Circle, AlertCircle } from 'lucide-react'
import './StatusBar.css'

interface ChecklistItem {
  id: string
  label: string
  isComplete: boolean
  details?: string
  onClick?: () => void
}

interface StatusBarProps {
  onOpenThermodynamicsWizard?: () => void
}

function StatusBar({ onOpenThermodynamicsWizard }: StatusBarProps = {}) {
  const { 
    availableSurfaces,
    configData,
    meshNeedsExport,
  } = useAppStore()

  const hasMesh = availableSurfaces.length > 0

  // Build checklist items based on current project state
  const checklistItems: ChecklistItem[] = []

  // 1. Mesh - complete when mesh filename is set AND no pending exports
  if (hasMesh) {
    const meshFilename = (configData as any)['mesh filename']
    const isMeshComplete = meshFilename && !meshNeedsExport
    
    checklistItems.push({
      id: 'mesh',
      label: 'Mesh',
      isComplete: isMeshComplete,
      details: meshNeedsExport 
        ? 'Needs re-export' 
        : meshFilename 
          ? `${availableSurfaces.length.toLocaleString()} surfaces`
          : 'No filename set'
    })
  }

  // 2. Thermodynamics - Check if user has run the wizard
  const thermoWizardExecuted = useAppStore((s) => s.thermoWizardExecuted)

  if (hasMesh) {
    checklistItems.push({
      id: 'thermodynamics',
      label: 'Thermodynamics',
      isComplete: thermoWizardExecuted,
      details: thermoWizardExecuted ? 'Configured' : 'default: ideal gas',
      onClick: onOpenThermodynamicsWizard
    })
  }

  // 3. Boundary Conditions
  const bcProgress = (() => {
    const total = availableSurfaces.length
    if (total === 0) return { assigned: 0, total: 0, isComplete: false }

    const bcs = configData['boundary conditions'] || []
    
    // Count assigned surfaces
    const assignedSurfaceNames = new Set<string>()
    bcs.forEach((bc: any) => {
      const tags = bc['mesh boundary tags']
      if (tags) {
        if (Array.isArray(tags)) {
          tags.forEach(tag => assignedSurfaceNames.add(String(tag)))
        } else {
          assignedSurfaceNames.add(String(tags))
        }
      }
    })
    
    const assigned = assignedSurfaceNames.size
    const isComplete = assigned === total && total > 0
    
    return { assigned, total, isComplete }
  })()

  if (hasMesh) {
    checklistItems.push({
      id: 'boundary-conditions',
      label: 'Boundary Conditions',
      isComplete: bcProgress.isComplete,
      details: `${bcProgress.assigned} of ${bcProgress.total} assigned`
    })
  }

  // 4. Code Control
  const hasCodeControl = (() => {
    // Check if code control section exists and has required fields
    const codeControl = configData['code control']
    return codeControl !== undefined && codeControl !== null
  })()

  if (hasMesh) {
    checklistItems.push({
      id: 'code-control',
      label: 'Code Control',
      isComplete: hasCodeControl,
      details: hasCodeControl ? 'Configured' : 'Using defaults'
    })
  }

  // Check if all items are complete
  const allComplete = checklistItems.length > 0 && checklistItems.every(item => item.isComplete)

  // Don't show status bar if no mesh loaded
  if (!hasMesh) {
    return (
      <div className="status-bar status-bar-empty">
        <div className="status-bar-message">
          <AlertCircle size={16} />
          <span>No mesh loaded. Use File → New Project to get started.</span>
        </div>
      </div>
    )
  }

  return (
    <div className="status-bar">
      <div className="status-bar-checklist">
        {checklistItems.map((item) => (
          <div 
            key={item.id} 
            className={`checklist-item ${
              item.isComplete
                ? 'checklist-item-complete'
                : item.id === 'thermodynamics'
                ? 'checklist-item-default'
                : item.id === 'boundary-conditions' || item.id === 'code-control' || item.id === 'mesh'
                ? 'checklist-item-warning'
                : 'checklist-item-incomplete'
            } ${item.onClick ? 'checklist-item-clickable' : ''}`}
            onClick={item.onClick}
            role={item.onClick ? 'button' : undefined}
            tabIndex={item.onClick ? 0 : undefined}
          >
            {item.isComplete ? (
              <Check size={16} className="checklist-icon-complete" />
            ) : (
              <Circle size={16} className="checklist-icon-incomplete" />
            )}
            <span className="checklist-label">{item.label}</span>
            {item.details && (
              <span className="checklist-details">({item.details})</span>
            )}
          </div>
        ))}
      </div>
      
      {allComplete && (
        <div className="status-bar-ready">
          <Check size={16} />
          <span>Ready to run!</span>
        </div>
      )}
    </div>
  )
}

export default StatusBar
