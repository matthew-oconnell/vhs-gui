import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore } from '../appStore'

describe('appStore - global render settings', () => {
  beforeEach(() => {
    // Reset store to default render settings before each test
    useAppStore.setState({
      globalRenderSettings: {
        colorMode: 'solid',
        hideAssignedSurfaces: false,
        unassignedColor: '#ff4444',
        assignedColor: '#44aa44',
        solidColor: '#4a9eff'
      }
    })
  })

  describe('colorMode', () => {
    it('defaults to solid color mode', () => {
      const { globalRenderSettings } = useAppStore.getState()
      expect(globalRenderSettings.colorMode).toBe('solid')
    })

    it('can change to assigned-status mode', () => {
      useAppStore.getState().setColorMode('assigned-status')
      
      const { globalRenderSettings } = useAppStore.getState()
      expect(globalRenderSettings.colorMode).toBe('assigned-status')
    })

    it('can change to bc-type mode', () => {
      useAppStore.getState().setColorMode('bc-type')
      
      const { globalRenderSettings } = useAppStore.getState()
      expect(globalRenderSettings.colorMode).toBe('bc-type')
    })

    it('can change to random mode', () => {
      useAppStore.getState().setColorMode('random')
      
      const { globalRenderSettings } = useAppStore.getState()
      expect(globalRenderSettings.colorMode).toBe('random')
    })
  })

  describe('hideAssignedSurfaces', () => {
    it('defaults to false', () => {
      const { globalRenderSettings } = useAppStore.getState()
      expect(globalRenderSettings.hideAssignedSurfaces).toBe(false)
    })

    it('toggles to true and hides assigned surfaces', () => {
      // Setup: add surfaces and a BC that assigns to surface tag 2
      useAppStore.setState({
        availableSurfaces: [
          { id: 's1', name: 'Surface 1', metadata: { id: 's1', tag: 1, tagName: 'surface-1' } },
          { id: 's2', name: 'Surface 2', metadata: { id: 's2', tag: 2, tagName: 'surface-2' } },
        ],
        configData: {
          HyperSolve: {
            'boundary conditions': [
              { id: 'bc1', type: 'no slip', 'mesh boundary tags': 2 }
            ]
          }
        },
        rootSolverKey: 'HyperSolve',
        surfaceVisibility: {}
      })
      
      useAppStore.getState().toggleHideAssignedSurfaces()
      
      const state = useAppStore.getState()
      expect(state.globalRenderSettings.hideAssignedSurfaces).toBe(true)
      // Surface 2 (assigned) should be hidden, Surface 1 (unassigned) should still be visible
      expect(state.surfaceVisibility['s2']).toBe(false)
      expect(state.surfaceVisibility['s1']).toBeUndefined() // unassigned surfaces unchanged
    })

    it('toggles back to false and shows assigned surfaces', () => {
      // Setup with hidden assigned surface
      useAppStore.setState({
        availableSurfaces: [
          { id: 's1', name: 'Surface 1', metadata: { id: 's1', tag: 1, tagName: 'surface-1' } },
          { id: 's2', name: 'Surface 2', metadata: { id: 's2', tag: 2, tagName: 'surface-2' } },
        ],
        configData: {
          HyperSolve: {
            'boundary conditions': [
              { id: 'bc1', type: 'no slip', 'mesh boundary tags': 2 }
            ]
          }
        },
        rootSolverKey: 'HyperSolve',
        surfaceVisibility: { 's2': false },
        globalRenderSettings: {
          colorMode: 'solid',
          hideAssignedSurfaces: true,
          unassignedColor: '#ff4444',
          assignedColor: '#44aa44',
          solidColor: '#4a9eff'
        }
      })
      
      useAppStore.getState().toggleHideAssignedSurfaces()
      
      const state = useAppStore.getState()
      expect(state.globalRenderSettings.hideAssignedSurfaces).toBe(false)
      // Surface 2 should now be visible again
      expect(state.surfaceVisibility['s2']).toBe(true)
    })
  })

  describe('color settings', () => {
    it('can set unassigned color', () => {
      useAppStore.getState().setUnassignedColor('#ff0000')
      
      const { globalRenderSettings } = useAppStore.getState()
      expect(globalRenderSettings.unassignedColor).toBe('#ff0000')
    })

    it('can set assigned color', () => {
      useAppStore.getState().setAssignedColor('#00ff00')
      
      const { globalRenderSettings } = useAppStore.getState()
      expect(globalRenderSettings.assignedColor).toBe('#00ff00')
    })

    it('can set solid color', () => {
      useAppStore.getState().setSolidColor('#0000ff')
      
      const { globalRenderSettings } = useAppStore.getState()
      expect(globalRenderSettings.solidColor).toBe('#0000ff')
    })

    it('preserves other settings when changing one color', () => {
      useAppStore.getState().setColorMode('assigned-status')
      useAppStore.getState().toggleHideAssignedSurfaces()
      useAppStore.getState().setUnassignedColor('#ff0000')
      
      const { globalRenderSettings } = useAppStore.getState()
      expect(globalRenderSettings.colorMode).toBe('assigned-status')
      expect(globalRenderSettings.hideAssignedSurfaces).toBe(true)
      expect(globalRenderSettings.unassignedColor).toBe('#ff0000')
      expect(globalRenderSettings.assignedColor).toBe('#44aa44') // unchanged
    })
  })
})
