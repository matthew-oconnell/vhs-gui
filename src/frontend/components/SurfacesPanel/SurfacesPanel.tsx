import { Layers, Eye, EyeOff, ChevronRight, ChevronDown } from 'lucide-react'
import { useState, useMemo } from 'react'
import { useAppStore } from '../../store/appStore'
import { Surface } from '../../types/surface'
import './SurfacesPanel.css'

interface SurfaceGroup {
  groupId: string
  displayName: string
  surfaces: Surface[]
  bcName?: string
}

function SurfacesPanel() {
  const { 
    availableSurfaces, 
    surfaceVisibility, 
    toggleSurfaceVisibility,
    surfaceRenderSettings,
    updateSurfaceRenderSettings,
    configData,
    rootSolverKey
  } = useAppStore()
  
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  
  const toggleExpanded = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupId)) {
        next.delete(groupId)
      } else {
        next.add(groupId)
      }
      return next
    })
  }
  
  // Group surfaces by bc_name
  const surfaceGroups = useMemo(() => {
    const groups = new Map<string, SurfaceGroup>()
    
    for (const surface of availableSurfaces) {
      const bcName = surface.metadata.bcName
      
      if (bcName) {
        // Group by bc_name
        const groupId = `bcname-${bcName}`
        if (!groups.has(groupId)) {
          groups.set(groupId, {
            groupId,
            displayName: bcName,
            surfaces: [],
            bcName
          })
        }
        groups.get(groupId)!.surfaces.push(surface)
      } else {
        // Individual entry for unnamed surfaces
        const groupId = `surface-${surface.id}`
        groups.set(groupId, {
          groupId,
          displayName: surface.name,
          surfaces: [surface],
          bcName: undefined
        })
      }
    }
    
    return Array.from(groups.values())
  }, [availableSurfaces])
  
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
        {surfaceGroups.length === 0 ? (
          <div className="empty-message">
            No mesh loaded. Load a mesh file to see surfaces.
          </div>
        ) : (
          <div className="surfaces-list">
            {surfaceGroups.map((group) => {
              const isExpanded = expandedGroups.has(group.groupId)
              const isMultiFace = group.surfaces.length > 1
              
              // For groups, check if all surfaces are visible
              const allVisible = group.surfaces.every(s => surfaceVisibility[s.id] ?? true)
              const someVisible = group.surfaces.some(s => surfaceVisibility[s.id] ?? true)
              
              // For single surface groups, use the surface directly
              const primarySurface = group.surfaces[0]
              const isVisible = surfaceVisibility[primarySurface.id] ?? true
              
              // Find associated BC for the group
              const rootKey = rootSolverKey || 'HyperSolve'
              const rootConfig = (configData as any)[rootKey]
              const associatedBC = rootConfig?.['boundary conditions']?.find(bc => {
                const tags = bc['mesh boundary tags']
                const surfaceTag = primarySurface.metadata.tag
                
                if (Array.isArray(tags)) {
                  return tags.includes(surfaceTag) || tags.includes(String(surfaceTag))
                } else if (typeof tags === 'number') {
                  return tags === surfaceTag
                } else if (typeof tags === 'string') {
                  return tags.split(',').map(s => parseInt(s.trim(), 10)).includes(surfaceTag)
                }
                return false
              })
              
              const handleToggleVisibility = (e: React.MouseEvent) => {
                e.stopPropagation()
                if (isMultiFace) {
                  // Toggle all surfaces in the group
                  group.surfaces.forEach(surface => {
                    const currentlyVisible = surfaceVisibility[surface.id] ?? true
                    if (allVisible || currentlyVisible) {
                      toggleSurfaceVisibility(surface.id)
                    } else if (!someVisible) {
                      toggleSurfaceVisibility(surface.id)
                    }
                  })
                } else {
                  toggleSurfaceVisibility(primarySurface.id)
                }
              }
              
              return (
                <div key={group.groupId} className="surface-item-container">
                  <div className="surface-item">
                    <button
                      className="visibility-toggle"
                      onClick={handleToggleVisibility}
                      title={isMultiFace 
                        ? (allVisible ? 'Hide all faces' : 'Show all faces')
                        : (isVisible ? 'Hide surface' : 'Show surface')}
                    >
                      {isMultiFace 
                        ? (allVisible ? <Eye size={16} /> : someVisible ? <Eye size={16} style={{ opacity: 0.5 }} /> : <EyeOff size={16} />)
                        : (isVisible ? <Eye size={16} /> : <EyeOff size={16} />)}
                    </button>
                    <div 
                      className={`surface-name ${!associatedBC ? 'unassigned' : ''}`}
                      onClick={() => toggleExpanded(group.groupId)}
                      title={!associatedBC ? 'Not assigned to any boundary condition' : ''}
                    >
                      {group.displayName}
                      {isMultiFace && <span className="face-count"> ({group.surfaces.length} faces)</span>}
                    </div>
                    <button
                      className="expand-toggle"
                      onClick={() => toggleExpanded(group.groupId)}
                      title={isExpanded ? 'Collapse' : 'Expand'}
                    >
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                  </div>
                  
                  {isExpanded && (
                    <div className="surface-details">
                      {isMultiFace ? (
                        // Show list of faces in the group
                        <div className="grouped-faces">
                          {group.surfaces.map((surface) => {
                            const faceVisible = surfaceVisibility[surface.id] ?? true
                            return (
                              <div key={surface.id} className="face-detail-item">
                                <button
                                  className="visibility-toggle small"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    toggleSurfaceVisibility(surface.id)
                                  }}
                                  title={faceVisible ? 'Hide face' : 'Show face'}
                                >
                                  {faceVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                                </button>
                                <div className="face-name">{surface.name}</div>
                                <div className="surface-tag">Tag: {surface.metadata.tag}</div>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        // Show single surface details
                        <>
                          <div className="detail-row">
                            <span className="detail-label">ID:</span>
                            <span className="detail-value">{primarySurface.id}</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">Tag:</span>
                            <span className="detail-value">{primarySurface.metadata.tag}</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">Type:</span>
                            <span className="detail-value">{primarySurface.type}</span>
                          </div>
                          {primarySurface.metadata.bodyId !== undefined && (
                            <div className="detail-row">
                              <span className="detail-label">Body ID:</span>
                              <span className="detail-value">{primarySurface.metadata.bodyId}</span>
                            </div>
                          )}
                          {primarySurface.metadata.faceId !== undefined && (
                            <div className="detail-row">
                              <span className="detail-label">Face ID:</span>
                              <span className="detail-value">{primarySurface.metadata.faceId}</span>
                            </div>
                          )}
                          {associatedBC && (
                            <div className="detail-row">
                              <span className="detail-label">BC Type:</span>
                              <span className="detail-value">{associatedBC.type}</span>
                            </div>
                          )}
                        </>
                      )}
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
