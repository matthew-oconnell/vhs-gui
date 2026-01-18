import { useState, useEffect } from 'react'
import { useAppStore } from '../../store/appStore'
import { KNOWN_CATEGORIES, getFeatureFlags, toggleCategory } from '../../utils/featureFlags'
import './SettingsDialog.css'

interface SettingsDialogProps {
  onClose: () => void
}

function SettingsDialog({ onClose }: SettingsDialogProps) {
  const [activeTab, setActiveTab] = useState('general')
  const { cameraSettings, updateCameraSettings } = useAppStore()
  
  // Feature flags state
  const [enabledCategories, setEnabledCategories] = useState<Set<string>>(() => {
    return getFeatureFlags().enabledCategories
  })
  
  // Camera settings local state
  const [rotateSpeed, setRotateSpeed] = useState(cameraSettings.rotateSpeed)
  const [zoomSpeed, setZoomSpeed] = useState(cameraSettings.zoomSpeed)
  const [panSpeed, setPanSpeed] = useState(cameraSettings.panSpeed)
  const [invertZoom, setInvertZoom] = useState(cameraSettings.invertZoom)
  
  const [editorFontSize, setEditorFontSize] = useState(() => {
    const saved = localStorage.getItem('editorFontSize')
    return saved ? Number(saved) : 14
  })
  const [uiFontSize, setUiFontSize] = useState(() => {
    const saved = localStorage.getItem('uiFontSize')
    return saved ? Number(saved) : 13
  })
  const [treeFontSize, setTreeFontSize] = useState(() => {
    const saved = localStorage.getItem('treeFontSize')
    return saved ? Number(saved) : 13
  })
  const [menuFontSize, setMenuFontSize] = useState(() => {
    const saved = localStorage.getItem('menuFontSize')
    return saved ? Number(saved) : 13
  })

  // Apply font sizes immediately as they change
  useEffect(() => {
    document.documentElement.style.setProperty('--editor-font-size', `${editorFontSize}px`)
  }, [editorFontSize])

  useEffect(() => {
    document.documentElement.style.setProperty('--ui-font-size', `${uiFontSize}px`)
  }, [uiFontSize])

  useEffect(() => {
    document.documentElement.style.setProperty('--tree-font-size', `${treeFontSize}px`)
  }, [treeFontSize])

  useEffect(() => {
    document.documentElement.style.setProperty('--menu-font-size', `${menuFontSize}px`)
  }, [menuFontSize])

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleSave = () => {
    localStorage.setItem('editorFontSize', String(editorFontSize))
    localStorage.setItem('uiFontSize', String(uiFontSize))
    localStorage.setItem('treeFontSize', String(treeFontSize))
    localStorage.setItem('menuFontSize', String(menuFontSize))
    
    // Save camera settings to store
    updateCameraSettings({
      rotateSpeed,
      zoomSpeed,
      panSpeed,
      invertZoom
    })
    
    onClose()
  }

  return (
    <div className="settings-dialog-backdrop" onClick={handleBackdropClick}>
      <div className="settings-dialog">
        <div className="settings-dialog-header">
          <h2>Settings</h2>
          <button className="close-button" onClick={onClose}>
            ✕
          </button>
        </div>
        
        <div className="settings-dialog-content">
          <div className="settings-tabs">
            <button
              className={`settings-tab ${activeTab === 'general' ? 'active' : ''}`}
              onClick={() => setActiveTab('general')}
            >
              General
            </button>
            <button
              className={`settings-tab ${activeTab === 'editor' ? 'active' : ''}`}
              onClick={() => setActiveTab('editor')}
            >
              Editor
            </button>
            <button
              className={`settings-tab ${activeTab === 'camera' ? 'active' : ''}`}
              onClick={() => setActiveTab('camera')}
            >
              Camera
            </button>
            <button
              className={`settings-tab ${activeTab === 'appearance' ? 'active' : ''}`}
              onClick={() => setActiveTab('appearance')}
            >
              Appearance
            </button>
            <button
              className={`settings-tab ${activeTab === 'features' ? 'active' : ''}`}
              onClick={() => setActiveTab('features')}
            >
              Features
            </button>
          </div>

          <div className="settings-panel">
            {activeTab === 'general' && (
              <div className="settings-section">
                <h3>General Settings</h3>
                <div className="settings-item">
                  <label htmlFor="auto-save">
                    <input type="checkbox" id="auto-save" />
                    Enable auto-save
                  </label>
                </div>
                <div className="settings-item">
                  <label htmlFor="auto-validate">
                    <input type="checkbox" id="auto-validate" />
                    Auto-validate on change
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'editor' && (
              <div className="settings-section">
                <h3>Editor Settings</h3>
                <div className="settings-item">
                  <label htmlFor="line-numbers">
                    <input type="checkbox" id="line-numbers" defaultChecked />
                    Show line numbers
                  </label>
                </div>
                <div className="settings-item">
                  <label htmlFor="word-wrap">
                    <input type="checkbox" id="word-wrap" />
                    Enable word wrap
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'camera' && (
              <div className="settings-section">
                <h3>3D Viewport Camera Controls</h3>
                
                <div className="settings-item">
                  <label htmlFor="rotate-speed" className="settings-label-column">
                    <span>Rotation Speed</span>
                    <div className="settings-input-group">
                      <input
                        type="range"
                        id="rotate-speed"
                        min="0.5"
                        max="3.0"
                        step="0.1"
                        value={rotateSpeed}
                        onChange={(e) => setRotateSpeed(Number(e.target.value))}
                        className="settings-range"
                      />
                      <input
                        type="number"
                        min="0.5"
                        max="3.0"
                        step="0.1"
                        value={rotateSpeed}
                        onChange={(e) => setRotateSpeed(Number(e.target.value))}
                        className="settings-number"
                      />
                    </div>
                  </label>
                </div>

                <div className="settings-item">
                  <label htmlFor="zoom-speed" className="settings-label-column">
                    <span>Zoom Speed</span>
                    <div className="settings-input-group">
                      <input
                        type="range"
                        id="zoom-speed"
                        min="0.5"
                        max="3.0"
                        step="0.1"
                        value={zoomSpeed}
                        onChange={(e) => setZoomSpeed(Number(e.target.value))}
                        className="settings-range"
                      />
                      <input
                        type="number"
                        min="0.5"
                        max="3.0"
                        step="0.1"
                        value={zoomSpeed}
                        onChange={(e) => setZoomSpeed(Number(e.target.value))}
                        className="settings-number"
                      />
                    </div>
                  </label>
                </div>

                <div className="settings-item">
                  <label htmlFor="pan-speed" className="settings-label-column">
                    <span>Pan Speed</span>
                    <div className="settings-input-group">
                      <input
                        type="range"
                        id="pan-speed"
                        min="0.3"
                        max="2.0"
                        step="0.1"
                        value={panSpeed}
                        onChange={(e) => setPanSpeed(Number(e.target.value))}
                        className="settings-range"
                      />
                      <input
                        type="number"
                        min="0.3"
                        max="2.0"
                        step="0.1"
                        value={panSpeed}
                        onChange={(e) => setPanSpeed(Number(e.target.value))}
                        className="settings-number"
                      />
                    </div>
                  </label>
                </div>

                <div className="settings-item">
                  <label htmlFor="invert-zoom">
                    <input 
                      type="checkbox" 
                      id="invert-zoom" 
                      checked={invertZoom}
                      onChange={(e) => setInvertZoom(e.target.checked)}
                    />
                    Invert zoom direction (pull back to zoom in)
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="settings-section">
                <h3>Appearance Settings</h3>
                <div className="settings-item">
                  <label htmlFor="theme">
                    Theme
                    <select id="theme" className="settings-select">
                      <option value="dark">Dark</option>
                      <option value="light">Light</option>
                      <option value="auto">Auto</option>
                    </select>
                  </label>
                </div>

                <h3 style={{ marginTop: '24px' }}>Font Sizes</h3>
                
                <div className="settings-item">
                  <label htmlFor="editor-font-size" className="settings-label-column">
                    <span>Editor Font Size</span>
                    <div className="settings-input-group">
                      <input
                        type="range"
                        id="editor-font-size"
                        min="10"
                        max="24"
                        value={editorFontSize}
                        onChange={(e) => setEditorFontSize(Number(e.target.value))}
                        className="settings-range"
                      />
                      <input
                        type="number"
                        min="10"
                        max="24"
                        value={editorFontSize}
                        onChange={(e) => setEditorFontSize(Number(e.target.value))}
                        className="settings-number"
                      />
                      <span className="settings-unit">px</span>
                    </div>
                  </label>
                </div>

                <div className="settings-item">
                  <label htmlFor="ui-font-size" className="settings-label-column">
                    <span>UI Font Size</span>
                    <div className="settings-input-group">
                      <input
                        type="range"
                        id="ui-font-size"
                        min="10"
                        max="20"
                        value={uiFontSize}
                        onChange={(e) => setUiFontSize(Number(e.target.value))}
                        className="settings-range"
                      />
                      <input
                        type="number"
                        min="10"
                        max="20"
                        value={uiFontSize}
                        onChange={(e) => setUiFontSize(Number(e.target.value))}
                        className="settings-number"
                      />
                      <span className="settings-unit">px</span>
                    </div>
                  </label>
                </div>

                <div className="settings-item">
                  <label htmlFor="tree-font-size" className="settings-label-column">
                    <span>Tree Panel Font Size</span>
                    <div className="settings-input-group">
                      <input
                        type="range"
                        id="tree-font-size"
                        min="10"
                        max="20"
                        value={treeFontSize}
                        onChange={(e) => setTreeFontSize(Number(e.target.value))}
                        className="settings-range"
                      />
                      <input
                        type="number"
                        min="10"
                        max="20"
                        value={treeFontSize}
                        onChange={(e) => setTreeFontSize(Number(e.target.value))}
                        className="settings-number"
                      />
                      <span className="settings-unit">px</span>
                    </div>
                  </label>
                </div>

                <div className="settings-item">
                  <label htmlFor="menu-font-size" className="settings-label-column">
                    <span>Menu Font Size</span>
                    <div className="settings-input-group">
                      <input
                        type="range"
                        id="menu-font-size"
                        min="10"
                        max="18"
                        value={menuFontSize}
                        onChange={(e) => setMenuFontSize(Number(e.target.value))}
                        className="settings-range"
                      />
                      <input
                        type="number"
                        min="10"
                        max="18"
                        value={menuFontSize}
                        onChange={(e) => setMenuFontSize(Number(e.target.value))}
                        className="settings-number"
                      />
                      <span className="settings-unit">px</span>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'features' && (
              <div className="settings-section">
                <h3>Feature Categories</h3>
                <p className="settings-description">
                  Control which feature categories are visible in the configuration schema.
                  By default, only "vulcan" features are shown. Enable additional categories as needed.
                </p>
                
                <div className="feature-toggles">
                  {Array.from(KNOWN_CATEGORIES).map(category => (
                    <div key={category} className="settings-item feature-toggle-item">
                      <label htmlFor={`feature-${category}`} className="feature-toggle-label">
                        <input
                          type="checkbox"
                          id={`feature-${category}`}
                          checked={enabledCategories.has(category)}
                          onChange={() => {
                            const newCategories = new Set(enabledCategories)
                            if (newCategories.has(category)) {
                              newCategories.delete(category)
                            } else {
                              newCategories.add(category)
                            }
                            setEnabledCategories(newCategories)
                            toggleCategory(category)
                          }}
                        />
                        <span className="feature-category-name">{category}</span>
                      </label>
                    </div>
                  ))}
                </div>
                
                <div className="settings-info-box">
                  <strong>Note:</strong> Changes to feature categories will take effect immediately.
                  The configuration tree and property editors will update to show/hide properties
                  based on your selections.
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="settings-dialog-footer">
          <button className="settings-button settings-button-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="settings-button settings-button-primary" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

export default SettingsDialog
