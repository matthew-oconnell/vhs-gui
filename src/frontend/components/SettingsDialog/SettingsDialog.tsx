import { useState, useEffect } from 'react'
import { useAppStore } from '../../store/appStore'
import { KNOWN_CATEGORIES, getFeatureFlags, toggleCategory } from '../../utils/featureFlags'
import { getTagsByCategory } from '../../utils/featureTagLoader'
import { AppSettings, defaultAppSettings } from '../../utils/appSettings'
import './SettingsDialog.css'

interface SettingsDialogProps {
  onClose: () => void
  initialSettings?: AppSettings
  onSaveEditorSettings?: (settings: AppSettings) => void
}

type ModifierKey = 'shift' | 'ctrl' | 'alt'

// Convert rgba string to hex color (for color picker)
function rgbaToHex(rgba: string): string {
  const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (!match) return '#0078ff'
  const r = parseInt(match[1]).toString(16).padStart(2, '0')
  const g = parseInt(match[2]).toString(16).padStart(2, '0')
  const b = parseInt(match[3]).toString(16).padStart(2, '0')
  return `#${r}${g}${b}`
}

// Convert hex color to rgba string with specified alpha
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// Get the border color (higher alpha version of fill color)
function getBorderColor(fillColor: string): string {
  const match = fillColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (!match) return 'rgba(0, 120, 255, 0.8)'
  return `rgba(${match[1]}, ${match[2]}, ${match[3]}, 0.8)`
}

function SettingsDialog({ onClose, initialSettings, onSaveEditorSettings }: SettingsDialogProps) {
  const [activeTab, setActiveTab] = useState('general')
  const { cameraSettings, updateCameraSettings, boxSelectionSettings, updateBoxSelectionSettings } = useAppStore()
  
  // Feature flags state
  const [enabledCategories, setEnabledCategories] = useState<Set<string>>(() => {
    return getFeatureFlags().enabledCategories
  })
  
  // Tag categorization (loaded from featureTagCategories.txt)
  const [productTags, setProductTags] = useState<string[]>([])
  const [featureTags, setFeatureTags] = useState<string[]>([])
  const [visibilityTags, setVisibilityTags] = useState<string[]>([])
  
  // Load tag categories on mount
  useEffect(() => {
    async function loadCategories() {
      const products = await getTagsByCategory('product')
      const features = await getTagsByCategory('feature')
      const visibility = await getTagsByCategory('visibility')
      
      setProductTags(products)
      setFeatureTags(features)
      setVisibilityTags(visibility)
    }
    loadCategories()
  }, [])
  
  // Camera settings local state
  const [rotateSpeed, setRotateSpeed] = useState(cameraSettings.rotateSpeed)
  const [zoomSpeed, setZoomSpeed] = useState(cameraSettings.zoomSpeed)
  const [panSpeed, setPanSpeed] = useState(cameraSettings.panSpeed)
  const [invertZoom, setInvertZoom] = useState(cameraSettings.invertZoom)
  
  // Box selection settings local state
  const [boxSelectAllModifier, setBoxSelectAllModifier] = useState<ModifierKey>(boxSelectionSettings.boxSelectAllModifier)
  const [boxSelectVisibleModifier, setBoxSelectVisibleModifier] = useState<ModifierKey>(boxSelectionSettings.boxSelectVisibleModifier)
  const [boxSelectAllColor, setBoxSelectAllColor] = useState(boxSelectionSettings.boxSelectAllColor)
  const [boxSelectAllBorder, setBoxSelectAllBorder] = useState(boxSelectionSettings.boxSelectAllBorder)
  const [boxSelectVisibleColor, setBoxSelectVisibleColor] = useState(boxSelectionSettings.boxSelectVisibleColor)
  const [boxSelectVisibleBorder, setBoxSelectVisibleBorder] = useState(boxSelectionSettings.boxSelectVisibleBorder)
  
  const resolvedSettings = initialSettings ?? defaultAppSettings
  const [editorFontSize, setEditorFontSize] = useState(resolvedSettings.editorFontSize)
  const [uiFontSize, setUiFontSize] = useState(resolvedSettings.uiFontSize)
  const [treeFontSize, setTreeFontSize] = useState(resolvedSettings.treeFontSize)
  const [menuFontSize, setMenuFontSize] = useState(resolvedSettings.menuFontSize)
  const [editorVimMode, setEditorVimMode] = useState(resolvedSettings.editorVimMode)

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

  useEffect(() => {
    setEditorFontSize(resolvedSettings.editorFontSize)
    setUiFontSize(resolvedSettings.uiFontSize)
    setTreeFontSize(resolvedSettings.treeFontSize)
    setMenuFontSize(resolvedSettings.menuFontSize)
    setEditorVimMode(resolvedSettings.editorVimMode)
  }, [
    resolvedSettings.editorFontSize,
    resolvedSettings.uiFontSize,
    resolvedSettings.treeFontSize,
    resolvedSettings.menuFontSize,
    resolvedSettings.editorVimMode
  ])

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleSave = () => {
    const updatedSettings: AppSettings = {
      editorVimMode,
      editorFontSize,
      uiFontSize,
      treeFontSize,
      menuFontSize
    }
    
    // Save camera settings to store
    updateCameraSettings({
      rotateSpeed,
      zoomSpeed,
      panSpeed,
      invertZoom
    })
    
    // Save box selection settings to store
    updateBoxSelectionSettings({
      boxSelectAllModifier,
      boxSelectVisibleModifier,
      boxSelectAllColor,
      boxSelectAllBorder,
      boxSelectVisibleColor,
      boxSelectVisibleBorder
    })

    onSaveEditorSettings?.(updatedSettings)
    
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
                <div className="settings-item">
                  <label htmlFor="vim-mode">
                    <input
                      type="checkbox"
                      id="vim-mode"
                      checked={editorVimMode}
                      onChange={(e) => setEditorVimMode(e.target.checked)}
                    />
                    Enable Vim keybindings
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
                
                <h3 style={{ marginTop: '24px' }}>Box Selection</h3>
                <p className="settings-description">
                  Hold a modifier key and drag to select multiple surfaces at once.
                </p>
                
                <div className="settings-item">
                  <label htmlFor="box-select-all-modifier" className="settings-label-column">
                    <span>Select All (in box)</span>
                    <select
                      id="box-select-all-modifier"
                      className="settings-select"
                      value={boxSelectAllModifier}
                      onChange={(e) => setBoxSelectAllModifier(e.target.value as ModifierKey)}
                    >
                      <option value="shift">Shift</option>
                      <option value="ctrl">Ctrl</option>
                      <option value="alt">Alt</option>
                    </select>
                  </label>
                </div>
                
                <div className="settings-item">
                  <label htmlFor="box-select-visible-modifier" className="settings-label-column">
                    <span>Select Visible Only</span>
                    <select
                      id="box-select-visible-modifier"
                      className="settings-select"
                      value={boxSelectVisibleModifier}
                      onChange={(e) => setBoxSelectVisibleModifier(e.target.value as ModifierKey)}
                    >
                      <option value="shift">Shift</option>
                      <option value="ctrl">Ctrl</option>
                      <option value="alt">Alt</option>
                    </select>
                  </label>
                </div>
                
                <h4 style={{ marginTop: '16px', marginBottom: '8px', color: '#cccccc' }}>Box Colors (Accessibility)</h4>
                
                <div className="settings-item">
                  <label className="settings-label-column">
                    <span>"Select All" Box Color</span>
                    <div className="color-picker-group">
                      <input
                        type="color"
                        value={rgbaToHex(boxSelectAllColor)}
                        onChange={(e) => {
                          const fillColor = hexToRgba(e.target.value, 0.2)
                          setBoxSelectAllColor(fillColor)
                          setBoxSelectAllBorder(getBorderColor(fillColor))
                        }}
                        className="settings-color"
                      />
                      <div 
                        className="color-preview" 
                        style={{ 
                          backgroundColor: boxSelectAllColor,
                          border: `2px dashed ${boxSelectAllBorder}`
                        }}
                      />
                    </div>
                  </label>
                </div>
                
                <div className="settings-item">
                  <label className="settings-label-column">
                    <span>"Select Visible" Box Color</span>
                    <div className="color-picker-group">
                      <input
                        type="color"
                        value={rgbaToHex(boxSelectVisibleColor)}
                        onChange={(e) => {
                          const fillColor = hexToRgba(e.target.value, 0.2)
                          setBoxSelectVisibleColor(fillColor)
                          setBoxSelectVisibleBorder(getBorderColor(fillColor))
                        }}
                        className="settings-color"
                      />
                      <div 
                        className="color-preview" 
                        style={{ 
                          backgroundColor: boxSelectVisibleColor,
                          border: `2px dashed ${boxSelectVisibleBorder}`
                        }}
                      />
                    </div>
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
                  Control which features are visible in the configuration schema.
                  Categories use different visibility rules - see explanations below.
                </p>
                
                {/* Product Categories */}
                {productTags.length > 0 && (
                  <>
                    <h4 style={{ marginTop: '20px', marginBottom: '8px', fontSize: '14px', fontWeight: 600 }}>
                      Solver Products
                    </h4>
                    <p className="settings-description" style={{ fontSize: '12px', marginBottom: '12px', color: '#999' }}>
                      Enable at least one product. Features tagged with multiple products will appear if <strong>any</strong> of their products are enabled.
                    </p>
                    <div className="feature-toggles">
                      {productTags.map(category => (
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
                  </>
                )}
                
                {/* Feature Categories */}
                {featureTags.length > 0 && (
                  <>
                    <h4 style={{ marginTop: '20px', marginBottom: '8px', fontSize: '14px', fontWeight: 600 }}>
                      Capabilities & Modules
                    </h4>
                    <p className="settings-description" style={{ fontSize: '12px', marginBottom: '12px', color: '#999' }}>
                      Enable capabilities you need. Features requiring multiple modules will appear if <strong>any</strong> of their modules are enabled.
                    </p>
                    <div className="feature-toggles">
                      {featureTags.map(category => (
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
                  </>
                )}
                
                {/* Visibility Toggles */}
                {visibilityTags.length > 0 && (
                  <>
                    <h4 style={{ marginTop: '20px', marginBottom: '8px', fontSize: '14px', fontWeight: 600 }}>
                      Developer Options
                    </h4>
                    <p className="settings-description" style={{ fontSize: '12px', marginBottom: '12px', color: '#999' }}>
                      These options show advanced/experimental features. Features are hidden unless <strong>all</strong> required visibility toggles are enabled.
                    </p>
                    <div className="feature-toggles">
                      {visibilityTags.map(category => (
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
                  </>
                )}
                
                <div className="settings-info-box" style={{ marginTop: '20px' }}>
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
