import React from 'react'
import './ProjectSetupWizard.css'

interface ProjectSetupWizardProps {
  isOpen: boolean
  onClose: () => void
  onLoadMesh: () => void
  onLoadCSM: () => void
  onImportCAD: () => void
}

const ProjectSetupWizard: React.FC<ProjectSetupWizardProps> = ({
  isOpen,
  onClose,
  onLoadMesh,
  onLoadCSM,
  onImportCAD
}) => {
  if (!isOpen) return null

  const handleChoice = (action: () => void) => {
    onClose() // Close wizard first
    action() // Then execute the action
  }

  return (
    <div className="wizard-overlay">
      <div className="wizard-modal setup-wizard">
        <div className="wizard-header">
          <h2>New Project</h2>
          <button className="wizard-close" onClick={onClose}>×</button>
        </div>

        <div className="wizard-content">
          <p className="setup-intro">Choose how you want to start your simulation:</p>

          <div className="setup-options">
            <button 
              className="setup-option-button"
              onClick={() => handleChoice(onLoadCSM)}
            >
              <div className="setup-option-icon">🔷</div>
              <div className="setup-option-text">
                <h3>Load CSM File</h3>
                <p>Load geometry from Engineering Sketch Pad</p>
              </div>
            </button>

            <button 
              className="setup-option-button"
              onClick={() => handleChoice(onImportCAD)}
            >
              <div className="setup-option-icon">🎯</div>
              <div className="setup-option-text">
                <h3>Import CAD + Farfield</h3>
                <p>Import CAD geometry and create outer boundary</p>
              </div>
            </button>
          </div>
        </div>

        <div className="wizard-footer">
          <button className="modal-button modal-button-secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProjectSetupWizard
