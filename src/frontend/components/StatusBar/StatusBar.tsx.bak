/**
 * StatusBar - Project setup checklist tracker
 * 
 * Shows categorized completion status for all required CFD setup tasks.
 * Categories expand on click to show individual wizards.
 */

import { useState } from 'react'
import { useAppStore } from '../../store/appStore'
import { Check, AlertCircle } from 'lucide-react'
import CategoryDropdown, { WizardItem } from './CategoryDropdown'
import './StatusBar.css'

interface StatusBarProps {
  onOpenThermodynamicsWizard?: () => void
  onOpenTurbulenceWizard?: () => void
  onOpenInitializationWizard?: () => void
  onOpenTimeAccuracyWizard?: () => void
  onOpenVisualizationWizard?: () => void
  onSaveConfig?: () => void
}

function StatusBar({ 
  onOpenThermodynamicsWizard, 
  onOpenTurbulenceWizard,
  onOpenInitializationWizard,
  onOpenTimeAccuracyWizard,
  onOpenVisualizationWizard,
  onSaveConfig
}: StatusBarProps = {}) {
  const { 
    availableTags,
    configData,
    meshNeedsExport,
  } = useAppStore()

  // Track which category dropdown is currently open
  const [openCategory, setOpenCategory] = useState<string | null>(null)

  const hasMesh = availableTags.length > 0

  // === Build wizard items for each category ===

  // MESH CATEGORY
  const meshWizards: WizardItem[] = []
  if (hasMesh) {
    const meshFilename = (configData as any)['mesh filename']
    const isMeshComplete = meshFilename && !meshNeedsExport
    
    meshWizards.push({
      id: 'mesh',
      label: 'Mesh Status',
      isComplete: isMeshComplete,
      details: meshNeedsExport 
        ? 'Needs re-export' 
        : meshFilename 
          ? `${availableTags.length.toLocaleString()} surface tags`
          : 'No filename set'
    })
  }

  // BOUNDARY CONDITIONS CATEGORY
  const bcWizards: WizardItem[] = []
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
    bcWizards.push({
      id: 'boundary-conditions',
      label: 'Boundary Conditions',
      isComplete: bcProgress.isComplete,
      details: `${bcProgress.assigned} of ${bcProgress.total} surfaces assigned`
    })
  }

  // PHYSICS CATEGORY
  const physicsWizards: WizardItem[] = []
  const thermoWizardExecuted = useAppStore((s) => s.thermoWizardExecuted)
  const turbulenceWizardExecuted = useAppStore((s) => s.turbulenceWizardExecuted)
  const equationType = configData['equation type']
  const hasTurbulenceModel = equationType !== undefined && equationType !== null

  if (hasMesh) {
    physicsWizards.push({
      id: 'thermodynamics',
      label: 'Thermodynamics',
      isComplete: thermoWizardExecuted,
      details: thermoWizardExecuted ? 'Configured' : 'default: ideal gas',
      onClick: onOpenThermodynamicsWizard
    })

    physicsWizards.push({
      id: 'turbulence-model',
      label: 'Turbulence Model',
      isComplete: hasTurbulenceModel,
      details: hasTurbulenceModel ? `${equationType}` : 'Not configured',
      onClick: onOpenTurbulenceWizard
    })
  }

  // TIME CONTROL CATEGORY
  const timeControlWizards: WizardItem[] = []
  const initialState = configData['initial state']
  const hasInitialState = initialState !== undefined && initialState !== null && initialState !== ''
  const timeAccuracyType = configData['time accuracy']?.type
  const hasTimeAccuracy = timeAccuracyType !== undefined && timeAccuracyType !== null

  if (hasMesh) {
    timeControlWizards.push({
      id: 'initialization',
      label: 'Initialization',
      isComplete: hasInitialState,
      details: hasInitialState ? `initial state: ${initialState}` : 'Not configured',
      onClick: onOpenInitializationWizard
    })

    timeControlWizards.push({
      id: 'time-accuracy',
      label: 'Time Accuracy',
      isComplete: hasTimeAccuracy,
      details: hasTimeAccuracy ? `${timeAccuracyType}` : 'Not configured',
      onClick: onOpenTimeAccuracyWizard
    })
  }

  // OUTPUT CATEGORY
  const outputWizards: WizardItem[] = []
  const visualizations = configData.visualization || []
  const hasVisualization = visualizations.length > 0

  if (hasMesh) {
    outputWizards.push({
      id: 'visualization',
      label: 'Visualization',
      isComplete: hasVisualization,
      details: hasVisualization ? `${visualizations.length} output(s)` : 'Not configured',
      onClick: onOpenVisualizationWizard
    })
  }

  // Calculate total completion across all categories
  const allWizards = [
    ...meshWizards,
    ...bcWizards,
    ...physicsWizards,
    ...timeControlWizards,
    ...outputWizards
  ]
  const allComplete = allWizards.length > 0 && allWizards.every(w => w.isComplete)

  // Don't show status bar if no mesh loaded
  if (!hasMesh) {
    return (
      <div className="status-bar status-bar-empty">
        <div className="status-bar-message">
          <AlertCircle size={16} />
          <span>No mesh loaded. Use File → Open Project Folder and import a CSM file to get started.</span>
        </div>
      </div>
    )
  }

  return (
    <div className="status-bar">
      <div className="status-bar-categories">
        <CategoryDropdown
          title="Mesh"
          icon="🌐"
          wizards={meshWizards}
          isOpen={openCategory === 'mesh'}
          onToggle={() => setOpenCategory(openCategory === 'mesh' ? null : 'mesh')}
          onClose={() => setOpenCategory(null)}
        />
        
        <CategoryDropdown
          title="Boundary Conditions"
          icon="🎯"
          wizards={bcWizards}
          isOpen={openCategory === 'bc'}
          onToggle={() => setOpenCategory(openCategory === 'bc' ? null : 'bc')}
          onClose={() => setOpenCategory(null)}
        />
        
        <CategoryDropdown
          title="Physics"
          icon="🔬"
          wizards={physicsWizards}
          isOpen={openCategory === 'physics'}
          onToggle={() => setOpenCategory(openCategory === 'physics' ? null : 'physics')}
          onClose={() => setOpenCategory(null)}
        />
        
        <CategoryDropdown
          title="Time Control"
          icon="⏱️"
          wizards={timeControlWizards}
          isOpen={openCategory === 'time'}
          onToggle={() => setOpenCategory(openCategory === 'time' ? null : 'time')}
          onClose={() => setOpenCategory(null)}
        />
        
        <CategoryDropdown
          title="Output"
          icon="📊"
          wizards={outputWizards}
          isOpen={openCategory === 'output'}
          onToggle={() => setOpenCategory(openCategory === 'output' ? null : 'output')}
          onClose={() => setOpenCategory(null)}
        />
      </div>
      
      {allComplete && (
        <div 
          className="status-bar-ready status-bar-ready-clickable"
          onClick={onSaveConfig}
          role="button"
          tabIndex={0}
          title="Save configuration file"
        >
          <Check size={16} />
          <span>Ready to run!</span>
        </div>
      )}
      
      <div className="status-bar-version">
        <span className="status-bar-beta-label">BETA</span>
        <span className="status-bar-version-info">v1.0.0-beta.1 • 2026-02-03 • 72782d0</span>
      </div>
    </div>
  )
}

export default StatusBar
