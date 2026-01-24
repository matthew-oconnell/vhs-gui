/**
 * Farfield Wizard - Dialog for creating farfield domain around imported geometry
 */

import { useState, useEffect } from 'react'
import './FarfieldWizard.css'
import { BoundingBox } from '../../utils/geometryUtils'

interface FarfieldWizardProps {
  isOpen: boolean
  onClose: () => void
  boundingBox: BoundingBox
  onCreateFarfield: (multiplier: number) => void
}

function FarfieldWizard({ isOpen, onClose, boundingBox, onCreateFarfield }: FarfieldWizardProps) {
  const [multiplier, setMultiplier] = useState(10)
  const [farfieldRadius, setFarfieldRadius] = useState(0)

  useEffect(() => {
    // Calculate farfield radius based on characteristic length and multiplier
    const radius = boundingBox.characteristicLength * multiplier
    setFarfieldRadius(radius)
  }, [multiplier, boundingBox])

  const handleCreate = () => {
    onCreateFarfield(multiplier)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="farfield-wizard-overlay">
      <div className="farfield-wizard-dialog">
        <div className="farfield-wizard-header">
          <h2>Create Farfield Domain</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="farfield-wizard-content">
          <div className="info-section">
            <h3>Geometry Information</h3>
            <div className="info-grid">
              <div className="info-row">
                <span className="info-label">Bounding Box Center:</span>
                <span className="info-value">
                  ({boundingBox.center.x.toFixed(2)}, {boundingBox.center.y.toFixed(2)}, {boundingBox.center.z.toFixed(2)})
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">Bounding Box Size:</span>
                <span className="info-value">
                  {boundingBox.size.x.toFixed(2)} × {boundingBox.size.y.toFixed(2)} × {boundingBox.size.z.toFixed(2)}
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">Characteristic Length:</span>
                <span className="info-value">{boundingBox.characteristicLength.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="input-section">
            <h3>Farfield Configuration</h3>
            <div className="input-group">
              <label htmlFor="multiplier">Body Length Multiplier:</label>
              <div className="input-with-display">
                <input
                  type="range"
                  id="multiplier"
                  min="2"
                  max="50"
                  step="0.5"
                  value={multiplier}
                  onChange={(e) => setMultiplier(parseFloat(e.target.value))}
                />
                <input
                  type="number"
                  min="2"
                  max="50"
                  step="0.5"
                  value={multiplier}
                  onChange={(e) => setMultiplier(parseFloat(e.target.value))}
                  className="multiplier-number-input"
                />
              </div>
            </div>

            <div className="result-display">
              <div className="result-row">
                <span className="result-label">Farfield Radius:</span>
                <span className="result-value">{farfieldRadius.toFixed(2)}</span>
              </div>
              <div className="result-row">
                <span className="result-label">Sphere Center:</span>
                <span className="result-value">
                  ({boundingBox.center.x.toFixed(2)}, {boundingBox.center.y.toFixed(2)}, {boundingBox.center.z.toFixed(2)})
                </span>
              </div>
            </div>
          </div>

          <div className="csm-preview">
            <h3>CSM Operations Preview</h3>
            <pre className="csm-code">
{`# Import and store vehicle
import <geometry>
attribute bc_name $vehicle
set vehicle:length @xmax-@xmin
store vehicle

# Create farfield sphere (${multiplier}× vehicle length)
sphere 0 0 0 vehicle:length*${multiplier}
attribute bc_name $farfield
translate vehicle:xmax-(vehicle:length/2) 0 0

# Subtract vehicle from farfield
restore vehicle
subtract`}
            </pre>
          </div>
        </div>

        <div className="farfield-wizard-footer">
          <button className="modal-button modal-button-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="modal-button modal-button-primary" onClick={handleCreate}>
            Create Farfield Domain
          </button>
        </div>
      </div>
    </div>
  )
}

export default FarfieldWizard
