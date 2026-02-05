import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore } from '../appStore'
import type { Surface } from '../../types/tag'

describe('appStore - multi-selection features', () => {
  // Mock surfaces with different bc_names for testing
  const mockSurfaces: Surface[] = [
    {
      id: 's1',
      name: 'Surface 1',
      metadata: {
        id: 's1',
        tag: 1,
        tagName: 'surface-1',
        tagNumber: 1,
        bcName: 'farfield'
      },
      geometry: {
        vertices: new Float32Array([0, 0, 0]),
        normals: new Float32Array([0, 0, 1])
      }
    },
    {
      id: 's2',
      name: 'Surface 2',
      metadata: {
        id: 's2',
        tag: 2,
        tagName: 'surface-2',
        tagNumber: 2,
        bcName: 'farfield'
      },
      geometry: {
        vertices: new Float32Array([1, 0, 0]),
        normals: new Float32Array([0, 0, 1])
      }
    },
    {
      id: 's3',
      name: 'Surface 3',
      metadata: {
        id: 's3',
        tag: 3,
        tagName: 'surface-3',
        tagNumber: 3,
        bcName: 'vehicle'
      },
      geometry: {
        vertices: new Float32Array([2, 0, 0]),
        normals: new Float32Array([0, 0, 1])
      }
    },
    {
      id: 's4',
      name: 'Surface 4',
      metadata: {
        id: 's4',
        tag: 4,
        tagName: 'surface-4',
        tagNumber: 4,
        bcName: 'vehicle'
      },
      geometry: {
        vertices: new Float32Array([3, 0, 0]),
        normals: new Float32Array([0, 0, 1])
      }
    },
    {
      id: 's5',
      name: 'Surface 5',
      metadata: {
        id: 's5',
        tag: 5,
        tagName: 'surface-5',
        tagNumber: 5,
        bcName: undefined // Ungrouped surface
      },
      geometry: {
        vertices: new Float32Array([4, 0, 0]),
        normals: new Float32Array([0, 0, 1])
      }
    }
  ]

  beforeEach(() => {
    // Reset store to clean state
    useAppStore.setState({
      availableTags: mockSurfaces,
      selectedTags: [],
      hoveredGroup: null,
      cameraSettings: {
        selectionMode: 'tag',
        rotateSpeed: 1.0,
        zoomSpeed: 1.2,
        panSpeed: 0.3
      }
    })
  })

  describe('hoveredGroup state', () => {
    it('initializes as null', () => {
      const { hoveredGroup } = useAppStore.getState()
      expect(hoveredGroup).toBeNull()
    })

    it('sets hoveredGroup to bc_name when setHoveredGroup is called', () => {
      useAppStore.getState().setHoveredGroup('farfield')
      
      const { hoveredGroup } = useAppStore.getState()
      expect(hoveredGroup).toBe('farfield')
    })

    it('clears hoveredGroup when set to null', () => {
      useAppStore.getState().setHoveredGroup('farfield')
      expect(useAppStore.getState().hoveredGroup).toBe('farfield')
      
      useAppStore.getState().setHoveredGroup(null)
      expect(useAppStore.getState().hoveredGroup).toBeNull()
    })

    it('can switch between different bc_names', () => {
      useAppStore.getState().setHoveredGroup('farfield')
      expect(useAppStore.getState().hoveredGroup).toBe('farfield')
      
      useAppStore.getState().setHoveredGroup('vehicle')
      expect(useAppStore.getState().hoveredGroup).toBe('vehicle')
    })
  })

  describe('multi-selection with shift+click (tag mode)', () => {
    it('toggleTagSelection adds surface to empty selection', () => {
      const surface = mockSurfaces[0]
      useAppStore.getState().toggleTagSelection(surface)
      
      const { selectedTags } = useAppStore.getState()
      expect(selectedTags).toHaveLength(1)
      expect(selectedTags[0].id).toBe('s1')
    })

    it('toggleTagSelection adds multiple surfaces to selection', () => {
      useAppStore.getState().toggleTagSelection(mockSurfaces[0])
      useAppStore.getState().toggleTagSelection(mockSurfaces[2])
      
      const { selectedTags } = useAppStore.getState()
      expect(selectedTags).toHaveLength(2)
      expect(selectedTags.map(s => s.id)).toEqual(['s1', 's3'])
    })

    it('toggleTagSelection removes surface if already selected', () => {
      useAppStore.getState().toggleTagSelection(mockSurfaces[0])
      useAppStore.getState().toggleTagSelection(mockSurfaces[2])
      expect(useAppStore.getState().selectedTags).toHaveLength(2)
      
      // Toggle s1 off
      useAppStore.getState().toggleTagSelection(mockSurfaces[0])
      
      const { selectedTags } = useAppStore.getState()
      expect(selectedTags).toHaveLength(1)
      expect(selectedTags[0].id).toBe('s3')
    })

    it('clearTagSelection removes all selected surfaces', () => {
      useAppStore.getState().toggleTagSelection(mockSurfaces[0])
      useAppStore.getState().toggleTagSelection(mockSurfaces[2])
      expect(useAppStore.getState().selectedTags).toHaveLength(2)
      
      useAppStore.getState().clearTagSelection()
      
      expect(useAppStore.getState().selectedTags).toHaveLength(0)
    })
  })

  describe('group selection helper - simulating component behavior', () => {
    beforeEach(() => {
      // Set selection mode to 'group'
      useAppStore.setState({
        cameraSettings: {
          selectionMode: 'group',
          rotateSpeed: 1.0,
          zoomSpeed: 1.2,
          panSpeed: 0.3
        }
      })
    })

    it('selecting group manually calls toggleTagSelection for all group members', () => {
      // Simulate what Viewport3D does: toggle all surfaces in farfield group
      const farfieldGroup = mockSurfaces.filter(s => s.metadata.bcName === 'farfield')
      
      farfieldGroup.forEach(surface => {
        useAppStore.getState().toggleTagSelection(surface)
      })
      
      const { selectedTags } = useAppStore.getState()
      expect(selectedTags).toHaveLength(2)
      expect(selectedTags.map(s => s.id).sort()).toEqual(['s1', 's2'])
    })

    it('selecting multiple groups adds all their surfaces', () => {
      // Select farfield group (s1, s2)
      const farfieldGroup = mockSurfaces.filter(s => s.metadata.bcName === 'farfield')
      farfieldGroup.forEach(s => useAppStore.getState().toggleTagSelection(s))
      
      // Select vehicle group (s3, s4)
      const vehicleGroup = mockSurfaces.filter(s => s.metadata.bcName === 'vehicle')
      vehicleGroup.forEach(s => useAppStore.getState().toggleTagSelection(s))
      
      const { selectedTags } = useAppStore.getState()
      expect(selectedTags).toHaveLength(4)
      expect(selectedTags.map(s => s.id).sort()).toEqual(['s1', 's2', 's3', 's4'])
    })

    it('deselecting all members of a group removes them from selection', () => {
      // Select farfield group
      const farfieldGroup = mockSurfaces.filter(s => s.metadata.bcName === 'farfield')
      farfieldGroup.forEach(s => useAppStore.getState().toggleTagSelection(s))
      expect(useAppStore.getState().selectedTags).toHaveLength(2)
      
      // Toggle each member off
      farfieldGroup.forEach(s => useAppStore.getState().toggleTagSelection(s))
      
      expect(useAppStore.getState().selectedTags).toHaveLength(0)
    })

    it('toggleTagSelection handles surfaces without bc_name individually', () => {
      // Surface without bc_name should be selected alone
      useAppStore.getState().toggleTagSelection(mockSurfaces[4])
      
      const { selectedTags } = useAppStore.getState()
      expect(selectedTags).toHaveLength(1)
      expect(selectedTags[0].id).toBe('s5')
    })

    it('setSelectedTag replaces selection (used for non-modifier clicks)', () => {
      // Select one surface first
      useAppStore.getState().setSelectedTag(mockSurfaces[0])
      expect(useAppStore.getState().selectedTags).toHaveLength(1)
      expect(useAppStore.getState().selectedTags[0].id).toBe('s1')
      
      // Selecting another replaces it
      useAppStore.getState().setSelectedTag(mockSurfaces[2])
      const { selectedTags } = useAppStore.getState()
      expect(selectedTags).toHaveLength(1)
      expect(selectedTags[0].id).toBe('s3')
    })
  })

  describe('selection mode switching', () => {
    it('switching from group to tag mode preserves current selection', () => {
      // Start in group mode, manually select surfaces (simulating component behavior)
      useAppStore.setState({
        cameraSettings: {
          selectionMode: 'group',
          rotateSpeed: 1.0,
          zoomSpeed: 1.2,
          panSpeed: 0.3
        }
      })
      
      // Simulate component selecting all farfield surfaces
      const farfieldGroup = mockSurfaces.filter(s => s.metadata.bcName === 'farfield')
      farfieldGroup.forEach(s => useAppStore.getState().toggleTagSelection(s))
      
      expect(useAppStore.getState().selectedTags).toHaveLength(2)
      
      // Switch to tag mode
      useAppStore.getState().setSelectionMode('tag')
      
      // Selection should be preserved
      const { selectedTags } = useAppStore.getState()
      expect(selectedTags).toHaveLength(2)
      expect(selectedTags.map(s => s.id).sort()).toEqual(['s1', 's2'])
    })

    it('clicking in tag mode after group selection adds individual surface', () => {
      // Start in group mode with farfield selected
      useAppStore.setState({
        cameraSettings: {
          selectionMode: 'group',
          rotateSpeed: 1.0,
          zoomSpeed: 1.2,
          panSpeed: 0.3
        }
      })
      
      const farfieldGroup = mockSurfaces.filter(s => s.metadata.bcName === 'farfield')
      farfieldGroup.forEach(s => useAppStore.getState().toggleTagSelection(s))
      
      // Switch to tag mode
      useAppStore.getState().setSelectionMode('tag')
      
      // Add individual surface from different group
      useAppStore.getState().toggleTagSelection(mockSurfaces[2])
      
      const { selectedTags } = useAppStore.getState()
      expect(selectedTags).toHaveLength(3)
      expect(selectedTags.map(s => s.id).sort()).toEqual(['s1', 's2', 's3'])
    })
  })

  describe('hover highlighting in group mode', () => {
    beforeEach(() => {
      useAppStore.setState({
        cameraSettings: {
          selectionMode: 'group',
          rotateSpeed: 1.0,
          zoomSpeed: 1.2,
          panSpeed: 0.3
        }
      })
    })

    it('hovering surface sets hoveredGroup to its bc_name', () => {
      useAppStore.getState().setHoveredGroup('farfield')
      
      // All farfield surfaces should be highlighted (checked by Viewport3D component)
      expect(useAppStore.getState().hoveredGroup).toBe('farfield')
    })

    it('leaving surface clears hoveredGroup', () => {
      useAppStore.getState().setHoveredGroup('farfield')
      useAppStore.getState().setHoveredGroup(null)
      
      expect(useAppStore.getState().hoveredGroup).toBeNull()
    })

    it('hovering different group updates hoveredGroup', () => {
      useAppStore.getState().setHoveredGroup('farfield')
      expect(useAppStore.getState().hoveredGroup).toBe('farfield')
      
      useAppStore.getState().setHoveredGroup('vehicle')
      expect(useAppStore.getState().hoveredGroup).toBe('vehicle')
    })
  })

  describe('integration: hover + selection', () => {
    beforeEach(() => {
      useAppStore.setState({
        cameraSettings: {
          selectionMode: 'group',
          rotateSpeed: 1.0,
          zoomSpeed: 1.2,
          panSpeed: 0.3
        }
      })
    })

    it('hoveredGroup and selectedTags can be different groups', () => {
      // Select farfield group (simulate component behavior)
      const farfieldGroup = mockSurfaces.filter(s => s.metadata.bcName === 'farfield')
      farfieldGroup.forEach(s => useAppStore.getState().toggleTagSelection(s))
      expect(useAppStore.getState().selectedTags.map(s => s.id).sort()).toEqual(['s1', 's2'])
      
      // Hover vehicle group
      useAppStore.getState().setHoveredGroup('vehicle')
      
      const state = useAppStore.getState()
      expect(state.hoveredGroup).toBe('vehicle')
      expect(state.selectedTags.map(s => s.id).sort()).toEqual(['s1', 's2'])
    })

    it('clicking hovered group selects it and clears hover', () => {
      // Hover farfield
      useAppStore.getState().setHoveredGroup('farfield')
      expect(useAppStore.getState().hoveredGroup).toBe('farfield')
      
      // Click to select it (simulate component behavior)
      const farfieldGroup = mockSurfaces.filter(s => s.metadata.bcName === 'farfield')
      farfieldGroup.forEach(s => useAppStore.getState().toggleTagSelection(s))
      
      // Clear hover (this would happen in component)
      useAppStore.getState().setHoveredGroup(null)
      
      const state = useAppStore.getState()
      expect(state.selectedTags.map(s => s.id).sort()).toEqual(['s1', 's2'])
      expect(state.hoveredGroup).toBeNull()
    })
  })
})
