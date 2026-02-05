import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useBoxSelection } from '../useBoxSelection'
import { useAppStore } from '../../../store/appStore'
import type { Surface } from '../../../types/tag'

// Mock the box selection refs (normally set by Scene component)
const mockCanvas = document.createElement('canvas')
mockCanvas.width = 800
mockCanvas.height = 600

const mockCamera = {
  position: { x: 0, y: 0, z: 10 },
  updateProjectionMatrix: vi.fn()
} as any

const mockRenderer = {
  domElement: mockCanvas,
  setSize: vi.fn(),
  render: vi.fn(),
  getContext: vi.fn(() => ({
    readPixels: vi.fn()
  }))
} as any

const mockControls = {
  enabled: true
} as any

beforeEach(() => {
  // Setup box selection refs
  ;(window as any).boxSelectionRefs = {
    canvas: mockCanvas,
    camera: mockCamera,
    renderer: mockRenderer,
    getControls: () => mockControls
  }

  // Reset store
  useAppStore.setState({
    availableTags: [],
    selectedTags: [],
    boxSelection: null,
    cameraSettings: {
      selectionMode: 'tag',
      rotateSpeed: 1.0,
      zoomSpeed: 1.2,
      panSpeed: 0.3
    }
  })
})

afterEach(() => {
  delete (window as any).boxSelectionRefs
  vi.clearAllMocks()
})

describe('useBoxSelection - drag threshold', () => {
  it('does not start box selection on shift+click without drag', () => {
    const { result } = renderHook(() => useBoxSelection())

    // Simulate shift+pointer down (click)
    const pointerDownEvent = new PointerEvent('pointerdown', {
      clientX: 100,
      clientY: 100,
      shiftKey: true,
      button: 0
    })

    act(() => {
      mockCanvas.dispatchEvent(pointerDownEvent)
    })

    // Box selection should NOT start yet (it's pending)
    expect(useAppStore.getState().boxSelection).toBeNull()

    // Simulate pointer up without moving (no drag)
    const pointerUpEvent = new PointerEvent('pointerup', {
      clientX: 100,
      clientY: 100,
      shiftKey: true
    })

    act(() => {
      mockCanvas.dispatchEvent(pointerUpEvent)
    })

    // Box selection should still be null (click, not drag)
    expect(useAppStore.getState().boxSelection).toBeNull()
  })

  it('starts box selection when drag exceeds 3px threshold', () => {
    const { result } = renderHook(() => useBoxSelection())

    // Shift+pointer down at (100, 100)
    const pointerDownEvent = new PointerEvent('pointerdown', {
      clientX: 100,
      clientY: 100,
      shiftKey: true,
      button: 0
    })

    act(() => {
      mockCanvas.dispatchEvent(pointerDownEvent)
    })

    expect(useAppStore.getState().boxSelection).toBeNull()

    // Move pointer 5px (exceeds 3px threshold)
    const pointerMoveEvent = new PointerEvent('pointermove', {
      clientX: 105,
      clientY: 100,
      shiftKey: true
    })

    act(() => {
      mockCanvas.dispatchEvent(pointerMoveEvent)
    })

    // Box selection should now be active
    const boxSelection = useAppStore.getState().boxSelection
    expect(boxSelection).not.toBeNull()
    expect(boxSelection?.startX).toBe(100)
    expect(boxSelection?.startY).toBe(100)
  })

  it('does not start box selection when drag is less than 3px', () => {
    const { result } = renderHook(() => useBoxSelection())

    // Shift+pointer down
    act(() => {
      mockCanvas.dispatchEvent(new PointerEvent('pointerdown', {
        clientX: 100,
        clientY: 100,
        shiftKey: true,
        button: 0
      }))
    })

    // Move only 2px (below threshold)
    act(() => {
      mockCanvas.dispatchEvent(new PointerEvent('pointermove', {
        clientX: 102,
        clientY: 100,
        shiftKey: true
      }))
    })

    // Box selection should still be pending (not started)
    expect(useAppStore.getState().boxSelection).toBeNull()
  })

  it('calculates drag distance using Euclidean distance', () => {
    const { result } = renderHook(() => useBoxSelection())

    act(() => {
      mockCanvas.dispatchEvent(new PointerEvent('pointerdown', {
        clientX: 100,
        clientY: 100,
        shiftKey: true,
        button: 0
      }))
    })

    // Diagonal movement: dx=2, dy=2 -> distance = sqrt(8) ≈ 2.83 < 3px
    act(() => {
      mockCanvas.dispatchEvent(new PointerEvent('pointermove', {
        clientX: 102,
        clientY: 102,
        shiftKey: true
      }))
    })

    // Should NOT start (2.83 < 3)
    expect(useAppStore.getState().boxSelection).toBeNull()

    // Diagonal movement: dx=3, dy=3 -> distance = sqrt(18) ≈ 4.24 > 3px
    act(() => {
      mockCanvas.dispatchEvent(new PointerEvent('pointermove', {
        clientX: 103,
        clientY: 103,
        shiftKey: true
      }))
    })

    // Should START now (4.24 > 3)
    expect(useAppStore.getState().boxSelection).not.toBeNull()
  })

  it('clears pending state on pointer up without drag', () => {
    const { result } = renderHook(() => useBoxSelection())

    // Shift+pointer down
    act(() => {
      mockCanvas.dispatchEvent(new PointerEvent('pointerdown', {
        clientX: 100,
        clientY: 100,
        shiftKey: true,
        button: 0
      }))
    })

    // Pointer up without moving (click)
    act(() => {
      mockCanvas.dispatchEvent(new PointerEvent('pointerup', {
        clientX: 100,
        clientY: 100,
        shiftKey: true
      }))
    })

    // Pending state should be cleared
    expect(useAppStore.getState().boxSelection).toBeNull()

    // Another pointer move should NOT trigger box selection
    act(() => {
      mockCanvas.dispatchEvent(new PointerEvent('pointermove', {
        clientX: 200,
        clientY: 200,
        shiftKey: true
      }))
    })

    expect(useAppStore.getState().boxSelection).toBeNull()
  })

  it('allows shift+click to pass through to surface handlers', () => {
    const { result } = renderHook(() => useBoxSelection())

    // Create a mock surface click handler
    const surfaceClickHandler = vi.fn()
    mockCanvas.addEventListener('click', surfaceClickHandler)

    // Shift+pointer down
    act(() => {
      mockCanvas.dispatchEvent(new PointerEvent('pointerdown', {
        clientX: 100,
        clientY: 100,
        shiftKey: true,
        button: 0,
        bubbles: true
      }))
    })

    // Small move (< 3px)
    act(() => {
      mockCanvas.dispatchEvent(new PointerEvent('pointermove', {
        clientX: 101,
        clientY: 100,
        shiftKey: true,
        bubbles: true
      }))
    })

    // Pointer up (click)
    act(() => {
      mockCanvas.dispatchEvent(new PointerEvent('pointerup', {
        clientX: 101,
        clientY: 100,
        shiftKey: true,
        bubbles: true
      }))
    })

    // Simulate click event (would normally be fired by browser)
    act(() => {
      mockCanvas.dispatchEvent(new MouseEvent('click', {
        clientX: 101,
        clientY: 100,
        shiftKey: true,
        bubbles: true
      }))
    })

    // Click handler should have been called (not prevented)
    expect(surfaceClickHandler).toHaveBeenCalled()

    mockCanvas.removeEventListener('click', surfaceClickHandler)
  })

  it('prevents camera controls during box selection', () => {
    const { result } = renderHook(() => useBoxSelection())

    expect(mockControls.enabled).toBe(true)

    // Start drag
    act(() => {
      mockCanvas.dispatchEvent(new PointerEvent('pointerdown', {
        clientX: 100,
        clientY: 100,
        shiftKey: true,
        button: 0
      }))
    })

    // Exceed threshold
    act(() => {
      mockCanvas.dispatchEvent(new PointerEvent('pointermove', {
        clientX: 110,
        clientY: 100,
        shiftKey: true
      }))
    })

    // Camera controls should be disabled during box selection
    expect(mockControls.enabled).toBe(false)
  })

  it('re-enables camera controls after box selection completes', () => {
    const { result } = renderHook(() => useBoxSelection())

    // Start and complete box selection
    act(() => {
      mockCanvas.dispatchEvent(new PointerEvent('pointerdown', {
        clientX: 100,
        clientY: 100,
        shiftKey: true,
        button: 0
      }))
    })

    act(() => {
      mockCanvas.dispatchEvent(new PointerEvent('pointermove', {
        clientX: 150,
        clientY: 150,
        shiftKey: true
      }))
    })

    expect(mockControls.enabled).toBe(false)

    // Release
    act(() => {
      mockCanvas.dispatchEvent(new PointerEvent('pointerup', {
        clientX: 150,
        clientY: 150,
        shiftKey: true
      }))
    })

    // Controls should be re-enabled
    expect(mockControls.enabled).toBe(true)
  })
})

describe('useBoxSelection - modifier key modes', () => {
  it('uses "visible" mode for shift key', () => {
    renderHook(() => useBoxSelection())

    act(() => {
      mockCanvas.dispatchEvent(new PointerEvent('pointerdown', {
        clientX: 100,
        clientY: 100,
        shiftKey: true,
        button: 0
      }))
    })

    act(() => {
      mockCanvas.dispatchEvent(new PointerEvent('pointermove', {
        clientX: 110,
        clientY: 110,
        shiftKey: true
      }))
    })

    const boxSelection = useAppStore.getState().boxSelection
    expect(boxSelection?.mode).toBe('visible')
  })

  it('uses "all" mode for ctrl key', () => {
    renderHook(() => useBoxSelection())

    act(() => {
      mockCanvas.dispatchEvent(new PointerEvent('pointerdown', {
        clientX: 100,
        clientY: 100,
        ctrlKey: true,
        button: 0
      }))
    })

    act(() => {
      mockCanvas.dispatchEvent(new PointerEvent('pointermove', {
        clientX: 110,
        clientY: 110,
        ctrlKey: true
      }))
    })

    const boxSelection = useAppStore.getState().boxSelection
    expect(boxSelection?.mode).toBe('all')
  })

  it('uses "all" mode for alt key', () => {
    renderHook(() => useBoxSelection())

    act(() => {
      mockCanvas.dispatchEvent(new PointerEvent('pointerdown', {
        clientX: 100,
        clientY: 100,
        altKey: true,
        button: 0
      }))
    })

    act(() => {
      mockCanvas.dispatchEvent(new PointerEvent('pointermove', {
        clientX: 110,
        clientY: 110,
        altKey: true
      }))
    })

    const boxSelection = useAppStore.getState().boxSelection
    expect(boxSelection?.mode).toBe('all')
  })
})
