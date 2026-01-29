import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore } from '../appStore'

describe('appStore - project folder', () => {
  beforeEach(() => {
    // Reset store to clean state
    useAppStore.setState({
      projectFolderHandle: null,
      projectFolderCollapsed: false
    })
  })

  it('initializes with no project folder', () => {
    const state = useAppStore.getState()
    expect(state.projectFolderHandle).toBeNull()
    expect(state.projectFolderCollapsed).toBe(false)
  })

  it('opens project folder', () => {
    const mockHandle = { name: 'my-project' } as FileSystemDirectoryHandle
    
    useAppStore.getState().openProjectFolder(mockHandle)
    
    const state = useAppStore.getState()
    expect(state.projectFolderHandle).toBe(mockHandle)
  })

  it('closes project folder', () => {
    const mockHandle = { name: 'my-project' } as FileSystemDirectoryHandle
    useAppStore.setState({ projectFolderHandle: mockHandle })
    
    useAppStore.getState().closeProjectFolder()
    
    const state = useAppStore.getState()
    expect(state.projectFolderHandle).toBeNull()
  })

  it('toggles project folder collapsed state', () => {
    expect(useAppStore.getState().projectFolderCollapsed).toBe(false)
    
    useAppStore.getState().setProjectFolderCollapsed(true)
    expect(useAppStore.getState().projectFolderCollapsed).toBe(true)
    
    useAppStore.getState().setProjectFolderCollapsed(false)
    expect(useAppStore.getState().projectFolderCollapsed).toBe(false)
  })
})
