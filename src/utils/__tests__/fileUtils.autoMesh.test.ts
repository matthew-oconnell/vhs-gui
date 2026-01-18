import { describe, it, expect, vi, beforeEach } from 'vitest'
import { openJsonFile, promptForDirectoryAccess } from '../fileUtils'

describe('openJsonFile', () => {
  // Existing tests stay the same
  it('returns config data', async () => {
    const mockConfigData = {
      'mesh filename': 'test.obj',
      HyperSolve: {}
    }

    const mockFile = new File(
      [JSON.stringify(mockConfigData)],
      'config.json',
      { type: 'application/json' }
    )

    Object.defineProperty(mockFile, 'text', {
      value: vi.fn().mockResolvedValue(JSON.stringify(mockConfigData)),
      writable: true
    })

    const mockFileHandle = {
      getFile: vi.fn().mockResolvedValue(mockFile)
    }

    globalThis.showOpenFilePicker = vi.fn().mockResolvedValue([mockFileHandle])

    const result = await openJsonFile()
    
    expect(result).toEqual(mockConfigData)
  })
})

describe('promptForDirectoryAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('prompts user to select directory and returns handle', async () => {
    // Arrange
    const mockDirectoryHandle = {
      name: 'project-folder',
      kind: 'directory'
    } as FileSystemDirectoryHandle

    globalThis.showDirectoryPicker = vi.fn().mockResolvedValue(mockDirectoryHandle)

    // Act
    const result = await promptForDirectoryAccess()

    // Assert
    expect(result).toBe(mockDirectoryHandle)
    expect(globalThis.showDirectoryPicker).toHaveBeenCalled()
  })

  it('returns null when user cancels directory picker', async () => {
    // Arrange
    const abortError = new Error('User cancelled')
    abortError.name = 'AbortError'
    
    globalThis.showDirectoryPicker = vi.fn().mockRejectedValue(abortError)

    // Act
    const result = await promptForDirectoryAccess()

    // Assert
    expect(result).toBeNull()
  })
})

