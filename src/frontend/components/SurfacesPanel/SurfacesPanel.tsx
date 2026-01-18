import { Layers, Eye, EyeOff, ChevronRight, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { useAppStore } from '../../store/appStore'
import './SurfacesPanel.css'

function SurfacesPanel() {
  const { 
    availableSurfaces, 
    surfaceVisibility, 
    toggleSurfaceVisibility,
    surfaceRenderSettings,
    updateSurfaceRenderSettings,
    configData
  } = useAppStore()
  
  const [expandedSurfaces, setExpandedSurfaces] = useState<Set<string>>(new Set())
  
  const toggleExpanded = (surfaceId: string) => {
    setExpandedSurfaces(prev => {
      const next = new Set(prev)
      if (next.has(surfaceId)) {
        next.delete(surfaceId)
      } else {
        next.add(surfaceId)
      }
      return next
    })
  }
  
  const getDefaultSettings = (surfaceId: string) => ({
    surfaceColor: surfaceRenderSettings[surfaceId]?.surfaceColor ?? '#4a9eff',
    meshColor: surfaceRenderSettings[surfaceId]?.meshColor ?? '#ffffff',
    renderMode: surfaceRenderSettings[surfaceId]?.renderMode ?? 'surface' as const,
    opacity: surfaceRenderSettings[surfaceId]?.opacity ?? 1
  })

  return (
    <div className="panel surfaces-panel">
      <div className="panel-header">
        <Layers size={16} />
        <span>Mesh Surfaces</span>
      </div>
      <div className="panel-content">
        {availableSurfaces.length === 0 ? (
          <div className="empty-message">
            No mesh loaded. Load a mesh file to see surfaces.
          </div>
        ) : (
          <div className="surfaces-list">
            {availableSurfaces.map((surface) => {
              const isVisible = surfaceVisibility[surface.id] ?? true
              const isExpanded = expandedSurfaces.has(surface.id)
              const settings = getDefaultSettings(surface.id)
              
              // Find associated BC
              const associatedBC = configData.HyperSolve?.['boundary conditions']?.find(bc => {
                const tags = bc['mesh boundary tags']
                const surfaceTag = surface.metadata.tag
                
                if (Array.isArray(tags)) {
                  return tags.includes(surfaceTag) || tags.includes(String(surfaceTag))
                } else if (typeof tags === 'number') {
                  return tags === surfaceTag
                } else if (typeof tags === 'string') {
                  return tags.split(',').map(s => parseInt(s.trim(), 10)).includes(surfaceTag)
                }
                return false
              })
              
              return (
                <div key={surface.id} className="surface-item-container">
                  <div className="surface-item">
                    <button
                      className="visibility-toggle"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleSurfaceVisibility(surface.id)
                      }}
                      title={isVisible ? 'Hide surface' : 'Show surface'}
                    >
                      {isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                    <div 
                      className={`surface-name ${!associatedBC ? 'unassigned' : ''}`}
                      onClick={() => toggleExpanded(surface.id)}
                      title={!associatedBC ? 'Not assigned to any boundary condition' : ''}
                    >
                      {surface.name}
                    </div>
                    <button
                      className="expand-toggle"
                      onClick={() => toggleExpanded(surface.id)}
                      title={isExpanded ? 'Collapse' : 'Expand'}
                    >
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                  </div>
                  
                  {isExpanded && (
                    <div className="surface-details">
                      {/* Render Mode */}
                      <div className="detail-row">
                        <label>Render Mode:</label>
                        <div className="render-mode-buttons">
                          <button
                            className={settings.renderMode === 'surface' ? 'active' : ''}
                            onClick={() => updateSurfaceRenderSettings(surface.id, { renderMode: 'surface' })}
                          >
                            Surface
                          </button>
                          <button
                            className={settings.renderMode === 'mesh' ? 'active' : ''}
                            onClick={() => updateSurfaceRenderSettings(surface.id, { renderMode: 'mesh' })}
                          >
                            Mesh
                          </button>
                          <button
                            className={settings.renderMode === 'both' ? 'active' : ''}
                            onClick={() => updateSurfaceRenderSettings(surface.id, { renderMode: 'both' })}
                          >
                            Both
                          </button>
                        </div>
                      </div>
                      
                      {/* Surface Color */}
                      <div className="detail-row">
                        <label>Surface Color:</label>
                        <input
                          type="color"
                          value={settings.surfaceColor}
                          onChange={(e) => updateSurfaceRenderSettings(surface.id, { surfaceColor: e.target.value })}
                        />
                      </div>
                      
                      {/* Mesh Color */}
                      <div className="detail-row">
                        <label>Mesh Color:</label>
                        <input
                          type="color"
                          value={settings.meshColor}
                          onChange={(e) => updateSurfaceRenderSettings(surface.id, { meshColor: e.target.value })}
                        />
                      </div>
                      
                      {/* Opacity */}
                      <div className="detail-row">
                        <label>Opacity:</label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={settings.opacity * 100}
                          onChange={(e) => updateSurfaceRenderSettings(surface.id, { opacity: parseInt(e.target.value) / 100 })}
                        />
                        <span className="opacity-value">{Math.round(settings.opacity * 100)}%</span>
                      </div>
                      
                      {/* Metadata */}
                      <div className="detail-section">
                        <div className="metadata-label">Metadata:</div>
                        <div className="metadata-item">Tag: {surface.metadata.tag}</div>
                        {surface.metadata.isLumped && surface.metadata.originalRegionCount && (
                          <div className="metadata-item">
                            Lumped: {surface.metadata.originalRegionCount} region{surface.metadata.originalRegionCount > 1 ? 's' : ''}
                          </div>
                        )}
                        {associatedBC && (
                          <div className="metadata-item">BC: {associatedBC.name || 'Unnamed'}</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default SurfacesPanel
