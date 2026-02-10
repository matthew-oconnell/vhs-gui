import React, { useEffect, useState } from 'react'
import './ProjectSetupWizard.css'

interface ProjectSetupWizardProps {
  isOpen: boolean
  onClose: () => void
  onChooseProjectFolder: () => Promise<string | FileSystemDirectoryHandle | null>
  onCreateConfigInFolder: (folder: string | FileSystemDirectoryHandle, filename: string) => Promise<void> | void
  onImportCSM: () => Promise<void>
  onImportSTEP: () => Promise<void>
}

const ProjectSetupWizard: React.FC<ProjectSetupWizardProps> = ({
  isOpen,
  onClose,
  onChooseProjectFolder,
  onCreateConfigInFolder,
  onImportCSM,
  onImportSTEP
}) => {
  if (!isOpen) return null

  const [step, setStep] = useState(1)
  const [folder, setFolder] = useState<string | FileSystemDirectoryHandle | null>(null)
  const [configName, setConfigName] = useState('vulcan.json')
  const [isWorking, setIsWorking] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setStep(1)
      setFolder(null)
      setConfigName('vulcan.json')
      setIsWorking(false)
    }
  }, [isOpen])

  const folderLabel = folder
    ? (typeof folder === 'string' ? folder.split('/').filter(Boolean).pop() || folder : folder.name)
    : 'No folder selected'

  const normalizeConfigName = (name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return 'vulcan.json'
    return trimmed.toLowerCase().endsWith('.json') ? trimmed : `${trimmed}.json`
  }

  const handleChooseFolder = async () => {
    setIsWorking(true)
    const selected = await onChooseProjectFolder()
    setIsWorking(false)

    if (selected) {
      setFolder(selected)
      setStep(2)
    }
  }

  const handleCreateConfig = async () => {
    if (!folder) return
    const normalized = normalizeConfigName(configName)
    setConfigName(normalized)
    setIsWorking(true)
    await onCreateConfigInFolder(folder, normalized)
    setIsWorking(false)
    setStep(3)
  }

  const handleFinish = async (action?: () => Promise<void>) => {
    onClose()
    if (action) {
      await action()
    }
  }

  return (
    <div className="wizard-overlay">
      <div className="wizard-modal setup-wizard">
        <div className="wizard-header">
          <h2>New Project</h2>
          <button className="wizard-close" onClick={onClose}>×</button>
        </div>

        <div className="wizard-content">
          <div className="wizard-steps">
            <div className={`wizard-step ${step >= 1 ? 'active' : ''}`}>1</div>
            <div className={`wizard-step ${step >= 2 ? 'active' : ''}`}>2</div>
            <div className={`wizard-step ${step >= 3 ? 'active' : ''}`}>3</div>
          </div>

          {step === 1 && (
            <div className="wizard-section">
              <p className="setup-intro">Pick a project folder to store your configuration and assets.</p>
              <div className="wizard-row">
                <button
                  className="modal-button modal-button-primary"
                  onClick={handleChooseFolder}
                  disabled={isWorking}
                >
                  {isWorking ? 'Selecting...' : 'Select Project Folder'}
                </button>
                <span className="wizard-muted">{folderLabel}</span>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="wizard-section">
              <p className="setup-intro">Name your project configuration file.</p>
              <div className="wizard-row">
                <input
                  className="wizard-input"
                  type="text"
                  value={configName}
                  onChange={(event) => setConfigName(event.target.value)}
                />
                <button
                  className="modal-button modal-button-primary"
                  onClick={handleCreateConfig}
                  disabled={isWorking || !configName.trim()}
                >
                  {isWorking ? 'Creating...' : 'Continue'}
                </button>
              </div>
              <div className="wizard-hint">Config will be created in: {folderLabel}</div>
            </div>
          )}

          {step === 3 && (
            <div className="wizard-section">
              <p className="setup-intro">Import geometry now or skip and do it later.</p>
              <div className="setup-options">
                <button
                  className="setup-option-button"
                  onClick={() => handleFinish(onImportCSM)}
                >
                  <div className="setup-option-icon">🔷</div>
                  <div className="setup-option-text">
                    <h3>Import CSM (ESP)</h3>
                    <p>Load geometry from Engineering Sketch Pad</p>
                  </div>
                </button>

                <button
                  className="setup-option-button"
                  onClick={() => handleFinish(onImportSTEP)}
                >
                  <div className="setup-option-icon">🎯</div>
                  <div className="setup-option-text">
                    <h3>Import STEP (ESP)</h3>
                    <p>Import CAD geometry for meshing</p>
                  </div>
                </button>

                <button
                  className="setup-option-button"
                  onClick={() => handleFinish()}
                >
                  <div className="setup-option-icon">🧭</div>
                  <div className="setup-option-text">
                    <h3>Skip Geometry</h3>
                    <p>Start with a blank project and import later</p>
                  </div>
                </button>
              </div>
            </div>
          )}
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
