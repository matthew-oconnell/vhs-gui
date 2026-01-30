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
  onOpenTurbulenceWizard?: () => void
  onOpenInitializationWizard?: () => void
  onOpenTimeAccuracyWizard?: () => void
  onOpenVisualizationWizard?: () => void
}

function StatusBar({ 
  onOpenThermodynamicsWizard, 
  onOpenTurbulenceWizard,
  onOpenInitializationWizard,
  onOpenTimeAccuracyWizard,
  onOpenVisualizationWizard
}: StatusBarProps = {}) {
  const { 
    availableTags,
    configData,
    meshNeedsExport,
  } = useAppStore()

  const hasMesh = availableTags.length > 0

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
          ? `${availableTags.length.toLocaleString()} tags`
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
    const total = availableTags.length
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

  // 4. Turbulence Model - Check if equation type is selected
  const turbulenceWizardExecuted = useAppStore((s) => s.turbulenceWizardExecuted)
  const equationType = configData['equation type']
  const hasTurbulenceModel = equationType !== undefined && equationType !== null

  if (hasMesh) {
    checklistItems.push({
      id: 'turbulence-model',
      label: 'Turbulence Model',
      isComplete: hasTurbulenceModel,
      details: hasTurbulenceModel ? `${equationType}` : 'Not configured',
      onClick: onOpenTurbulenceWizard
    })
  }

  // 5. Initialization - Check if initial state is set
  const initialState = configData['initial state']
  const hasInitialState = initialState !== undefined && initialState !== null && initialState !== ''

  if (hasMesh) {
    checklistItems.push({
      id: 'initialization',
      label: 'Initialization',
      isComplete: hasInitialState,
      details: hasInitialState ? `initial state: ${initialState}` : 'Not configured',
      onClick: onOpenInitializationWizard
    })
  }

  // 6. Time Accuracy - Check if time accuracy is configured
  const timeAccuracyType = configData['time accuracy']?.type
  const hasTimeAccuracy = timeAccuracyType !== undefined && timeAccuracyType !== null

  if (hasMesh) {
    checklistItems.push({
      id: 'time-accuracy',
      label: 'Time Accuracy',
      isComplete: hasTimeAccuracy,
      details: hasTimeAccuracy ? `${timeAccuracyType}` : 'Not configured',
      onClick: onOpenTimeAccuracyWizard
    })
  }

  // 7. Visualization - Check if at least one visualization output exists
  const visualizations = configData.visualization || []
  const hasVisualization = visualizations.length > 0

  if (hasMesh) {
    checklistItems.push({
      id: 'visualization',
      label: 'Visualization',
      isComplete: hasVisualization,
      details: hasVisualization ? `${visualizations.length} output(s)` : 'Not configured',
      onClick: onOpenVisualizationWizard
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
                : item.id === 'boundary-conditions' || item.id === 'turbulence-model' || item.id === 'mesh' || item.id === 'initialization' || item.id === 'time-accuracy' || item.id === 'visualization'
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
