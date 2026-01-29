import { FolderTree, ChevronRight, ChevronDown, File, Folder, List, FileCode, Settings } from 'lucide-react'
import { useState, useEffect, RefObject } from 'react'
import { TreeNode, buildTreeFromSchema } from '../../utils/schemaParser'
import { useAppStore } from '../../store/appStore'
import { subscribeToFeatureFlags } from '../../utils/featureFlags'
import PropertyEditorDialog from '../PropertyEditorDialog/PropertyEditorDialog'
import type { PanelImperativeHandle } from 'react-resizable-panels'
import './TreePanel.css'

interface TreePanelProps {
  panelRef: RefObject<PanelImperativeHandle>
}

function TreePanel({ panelRef }: TreePanelProps) {
  const [treeData, setTreeData] = useState<TreeNode[]>([])
  const [showPropertyDialog, setShowPropertyDialog] = useState(false)
  const [dialogNode, setDialogNode] = useState<TreeNode | null>(null)
  const [schema, setSchema] = useState<any>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  
  // Use selectors to only subscribe to what we need
  const selectedNode = useAppStore(state => state.selectedNode)
  const setSelectedNode = useAppStore(state => state.setSelectedNode)
  const selectedBC = useAppStore(state => state.selectedBC)
  const setSelectedBC = useAppStore(state => state.setSelectedBC)
  const selectedState = useAppStore(state => state.selectedState)
  const setSelectedState = useAppStore(state => state.setSelectedState)
  const selectedViz = useAppStore(state => state.selectedViz)
  const setSelectedViz = useAppStore(state => state.setSelectedViz)
  const selectedInitRegion = useAppStore(state => state.selectedInitRegion)
  const setSelectedInitRegion = useAppStore(state => state.setSelectedInitRegion)
  const configData = useAppStore(state => state.configData)
  const updateProperty = useAppStore(state => state.updateProperty)
  const selectedId = selectedNode?.id || null
  const treeCollapsed = useAppStore(state => state.treeCollapsed)
  const setTreeCollapsed = useAppStore(state => state.setTreeCollapsed)

  useEffect(() => {
    console.log('TreePanel - Current configData:', configData)
  }, [configData])

  // Subscribe to feature flag changes
  useEffect(() => {
    const unsubscribe = subscribeToFeatureFlags(() => {
      setRefreshKey(prev => prev + 1)
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    // Fetch and build tree from schema on mount
    fetch('/schemas/input.schema.json')
      .then(response => response.json())
      .then(inputSchema => {
        setSchema(inputSchema)
        const tree = buildTreeFromSchema(inputSchema, inputSchema.required || [], showAdvanced)
        setTreeData(tree)
      })
      .catch(error => {
        console.error('Failed to load schema:', error)
      })
  }, [showAdvanced, refreshKey])

  const toggleNode = (id: string) => {
    const toggleRecursive = (nodes: TreeNode[]): TreeNode[] => {
      return nodes.map(node => {
        if (node.id === id) {
          return { ...node, expanded: !node.expanded }
        }
        if (node.children) {
          return { ...node, children: toggleRecursive(node.children) }
        }
        return node
      })
    }
    setTreeData(toggleRecursive(treeData))
  }

  const getIcon = (node: TreeNode) => {
    if (node.type === 'object') return <Folder size={14} className="tree-file-icon" />
    if (node.type === 'array') return <List size={14} className="tree-file-icon" />
    if (node.id.includes('[BC-')) return <FileCode size={14} className="tree-file-icon" />
    if (node.id.includes('[State-')) return <FileCode size={14} className="tree-file-icon" />
    return <File size={14} className="tree-file-icon" />
  }

  // Enhance tree nodes with actual data instances
  const enhanceTreeWithData = (nodes: TreeNode[]): TreeNode[] => {
    return nodes.map(node => {
      // Check if this is the boundary conditions array
      if (node.id === 'root.boundary conditions' && node.type === 'array') {
        const bcs = configData['boundary conditions'] || []
        
        // Create child nodes for each BC instance
        const bcNodes: TreeNode[] = bcs.map((bc, index) => ({
          id: `${node.id}[BC-${bc.id}]`,
          label: bc.name ? `BC: ${bc.name}` : `BC (${index})`,
          type: 'object' as const,
          description: `Boundary Condition: ${bc.type || 'not set'}`,
          bcData: bc, // Attach the actual BC data
          expanded: false
        }))
        
        return {
          ...node,
          children: bcNodes.length > 0 ? bcNodes : node.children,
          // Preserve the node's current expanded state instead of forcing it to true
          expanded: node.expanded
        }
      }
      
      // Check if this is the states object
      if (node.id === 'root.states' && node.type === 'object') {
        const states = configData.states || {}
        const stateEntries = Object.values(states)
        
        // Create child nodes for each state instance
        const stateNodes: TreeNode[] = stateEntries.map((state) => ({
          id: `${node.id}[State-${state.id}]`,
          label: `State: ${state.name}`,
          type: 'object' as const,
          description: `Physical state: ${state.name}`,
          stateData: state, // Attach the actual state data
          expanded: false
        }))
        
        return {
          ...node,
          children: stateNodes.length > 0 ? stateNodes : node.children,
          // Preserve the node's current expanded state instead of forcing it to true
          expanded: node.expanded
        }
      }

      // Check if this is the visualization array
      if (node.id === 'root.visualization' && node.type === 'array') {
        const visualizations = configData.visualization || []
        
        // Create child nodes for each visualization instance
        const vizNodes: TreeNode[] = visualizations.map((viz: any, index: number) => ({
          id: `${node.id}[Viz-${index}]`,
          label: viz.filename || `Visualization ${index + 1}`,
          type: 'object' as const,
          description: `${viz.type} visualization: ${viz.filename || 'unnamed'}`,
          vizData: viz, // Attach the actual visualization data
          vizIndex: index, // Store the index for updates
          expanded: false
        }))
        
        return {
          ...node,
          children: vizNodes.length > 0 ? vizNodes : node.children,
          // Preserve the node's current expanded state instead of forcing it to true
          expanded: node.expanded
        }
      }

      // Check if this is the initialization regions array
      if (node.id === 'root.initialization regions' && node.type === 'array') {
        const initRegions = configData['initialization regions'] || []
        
        // Create child nodes for each initialization region instance
        const initRegionNodes: TreeNode[] = initRegions.map((region: any, index: number) => ({
          id: `${node.id}[InitRegion-${index}]`,
          label: `${region.type}${region.state ? `: ${region.state}` : ''}`,
          type: 'object' as const,
          description: `Initialization Region: ${region.type}`,
          initRegionData: region, // Attach the actual region data
          initRegionIndex: index, // Store the index for updates
          expanded: false
        }))
        
        return {
          ...node,
          children: initRegionNodes.length > 0 ? initRegionNodes : node.children,
          // Preserve the node's current expanded state instead of forcing it to true
          expanded: initRegionNodes.length > 0 ? true : node.expanded
        }
      }
      
      // Recursively enhance children
      if (node.children) {
        return { ...node, children: enhanceTreeWithData(node.children) }
      }
      
      return node
    })
  }

  const renderTree = (nodes: TreeNode[], depth: number = 0) => {
    const enhancedNodes = enhanceTreeWithData(nodes)
    
    return enhancedNodes.map(node => {
      const isBCNode = node.id.includes('[BC-')
      const isStateNode = node.id.includes('[State-')
      const isVizNode = node.id.includes('[Viz-')
      const isInitRegionNode = node.id.includes('[InitRegion-')
      const isSelected = isBCNode 
        ? selectedBC && node.id.includes(selectedBC.id)
        : isStateNode
        ? selectedState && node.id.includes(selectedState.id)
        : isVizNode
        ? selectedViz && node.id.includes(`[Viz-${selectedViz.index}]`)
        : isInitRegionNode
        ? selectedInitRegion && node.id.includes(`[InitRegion-${selectedInitRegion.index}]`)
        : selectedId === node.id
      
      return (
        <div key={node.id} className="tree-node">
          <div 
            className={`tree-node-content ${isSelected ? 'selected' : ''} ${node.required ? 'required' : ''}`}
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
            onClick={() => {
              if (isBCNode && (node as any).bcData) {
                setSelectedBC((node as any).bcData)
              } else if (isStateNode && (node as any).stateData) {
                setSelectedState((node as any).stateData)
              } else if (isVizNode && (node as any).vizData) {
                setSelectedViz({ data: (node as any).vizData, index: (node as any).vizIndex })
              } else if (isInitRegionNode && (node as any).initRegionData) {
                setSelectedInitRegion({ data: (node as any).initRegionData, index: (node as any).initRegionIndex })
              } else {
                setSelectedNode(node)
              }
            }}
            onDoubleClick={() => {
              // Open property dialog on double-click for object nodes (not BC/State/Viz/InitRegion instances)
              // Skip thermodynamics - use the wizard instead (property editor causes grey screen)
              const isThermoNode = node.id === 'root.thermodynamics' || 
                                  (node.id && node.id.endsWith('.thermodynamics')) ||
                                  node.path === 'thermodynamics'
              if (!isBCNode && !isStateNode && !isVizNode && !isInitRegionNode && !isThermoNode && node.type === 'object') {
                setDialogNode(node)
                setShowPropertyDialog(true)
              }
            }}
            title={node.description}
          >
            {node.children && node.children.length > 0 && (
              <span className="tree-icon" onClick={(e) => { e.stopPropagation(); toggleNode(node.id) }}>
                {node.expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </span>
            )}
            {(!node.children || node.children.length === 0) && (
              <span className="tree-icon tree-icon-spacer"></span>
            )}
            {getIcon(node)}
            <span className="tree-label">
              {node.label}
              {node.required && <span className="required-indicator">*</span>}
            </span>
            {!isBCNode && !isStateNode && <span className="tree-type-badge">{node.type}</span>}
          </div>
          {node.expanded && node.children && (
            <div className="tree-children">
              {renderTree(node.children, depth + 1)}
            </div>
          )}
        </div>
      )
    })
  }

  return (
    <div className="panel tree-panel">
      
      {showPropertyDialog && dialogNode && (
        <PropertyEditorDialog
          key={dialogNode.id}
          isOpen={showPropertyDialog}
          onClose={() => setShowPropertyDialog(false)}
          node={dialogNode}
          schema={schema}
          configData={configData}
          onUpdate={updateProperty}
        />
      )}
      <div className="panel-header">
        <button 
          className="panel-collapse-btn"
          onClick={(e) => {
            console.log('[TreePanel] Collapse button clicked!')
            e.stopPropagation()
            if (panelRef.current) {
              console.log('[TreePanel] panelRef is available')
              console.log('[TreePanel] isCollapsed:', panelRef.current.isCollapsed())
              if (panelRef.current.isCollapsed()) {
                console.log('[TreePanel] Calling expand()')
                panelRef.current.expand()
                setTreeCollapsed(false)
              } else {
                console.log('[TreePanel] Calling collapse()')
                panelRef.current.collapse()
                setTreeCollapsed(true)
              }
            } else {
              console.log('[TreePanel] panelRef.current is null!')
            }
          }}
          title={treeCollapsed ? 'Expand Configuration Tree' : 'Collapse Configuration Tree'}
        >
          <span className="collapse-icon">{treeCollapsed ? '▶' : '▼'}</span>
        </button>
        <FolderTree size={16} />
        <span>Configuration Tree</span>
        <button 
          className={`tree-panel-gear ${showAdvanced ? 'active' : ''}`}
          onClick={() => setShowAdvanced(!showAdvanced)}
          title={showAdvanced ? "Hide advanced options" : "Show advanced options"}
        >
          <Settings size={16} />
        </button>
      </div>
      <div className="panel-content">
        {renderTree(treeData)}
      </div>
    </div>
  )
}

export default TreePanel
