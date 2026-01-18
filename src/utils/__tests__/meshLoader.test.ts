import { describe, it, expect, vi, beforeEach } from 'vitest'
import { loadMeshByFilename, loadMeshFromDirectory } from '../meshLoader'

describe('loadMeshFromDirectory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads mesh file from directory handle by filename', async () => {
    // Arrange
    const mockMeshData = 'v 0 0 0\nv 1 0 0\nv 0 1 0'
    const mockMeshFile = new File([mockMeshData], 'waverider.obj', { type: 'model/obj' })
    
    const mockDirectoryHandle = {
      getFileHandle: vi.fn().mockResolvedValue({
        getFile: vi.fn().mockResolvedValue(mockMeshFile)
      })
    } as any

    const mockParseMesh = vi.fn().mockResolvedValue({
      regions: [],
      totalVertices: 100,
      totalFaces: 50,
      globalCenter: [0, 0, 0] as [number, number, number],
      globalScale: 1
    })

    const mockLoadMesh = vi.fn()

    // Act
    await loadMeshFromDirectory(
      'waverider.obj',
      mockDirectoryHandle,
      mockParseMesh,
      mockLoadMesh
    )

    // Assert
    expect(mockDirectoryHandle.getFileHandle).toHaveBeenCalledWith('waverider.obj')
    expect(mockParseMesh).toHaveBeenCalledWith(mockMeshFile)
    expect(mockLoadMesh).toHaveBeenCalled()
  })

  it('returns false when mesh file not found in directory', async () => {
    // Arrange
    const mockDirectoryHandle = {
      getFileHandle: vi.fn().mockRejectedValue(new Error('File not found'))
    } as any

    const mockParseMesh = vi.fn()
    const mockLoadMesh = vi.fn()

    // Act
    const result = await loadMeshFromDirectory(
      'missing.obj',
      mockDirectoryHandle,
      mockParseMesh,
      mockLoadMesh
    )

    // Assert
    expect(result).toBe(false)
    expect(mockParseMesh).not.toHaveBeenCalled()
    expect(mockLoadMesh).not.toHaveBeenCalled()
  })

  it('handles duplicate tag names with lump dialog', async () => {
    // Arrange
    const mockMeshFile = new File(['mesh data'], 'test.obj', { type: 'model/obj' })
    
    const mockDirectoryHandle = {
      getFileHandle: vi.fn().mockResolvedValue({
        getFile: vi.fn().mockResolvedValue(mockMeshFile)
      })
    } as any

    const mockParsedMesh = {
      regions: [
        { name: 'wall', tag: 1, meshData: {} as any },
        { name: 'wall', tag: 2, meshData: {} as any } // Duplicate
      ],
      totalVertices: 100,
      totalFaces: 50,
      globalCenter: [0, 0, 0] as [number, number, number],
      globalScale: 1
    }

    const mockParseMesh = vi.fn().mockResolvedValue(mockParsedMesh)
    const mockLoadMesh = vi.fn()
    const mockShowLumpDialog = vi.fn()

    // Act
    await loadMeshFromDirectory(
      'test.obj',
      mockDirectoryHandle,
      mockParseMesh,
      mockLoadMesh,
      mockShowLumpDialog
    )

    // Assert
    expect(mockShowLumpDialog).toHaveBeenCalledWith(mockParsedMesh, 'test.obj')
    expect(mockLoadMesh).not.toHaveBeenCalled()
  })
})

describe('loadMeshByFilename', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('prompts user to select the specified mesh file', async () => {
    // Arrange
    const mockPickMesh = vi.fn().mockResolvedValue(null) // User cancels
    const mockParseMesh = vi.fn()
    const mockLoadMesh = vi.fn()

    // Act
    await loadMeshByFilename(
      'waverider.obj',
      mockPickMesh,
      mockParseMesh,
      mockLoadMesh
    )

    // Assert: Should call pickMesh with the filename hint
    expect(mockPickMesh).toHaveBeenCalledWith('waverider.obj')
    expect(mockParseMesh).not.toHaveBeenCalled()
    expect(mockLoadMesh).not.toHaveBeenCalled()
  })

  it('parses and loads mesh when user selects a file', async () => {
    // Arrange
    const mockFile = new File(['mesh data'], 'waverider.obj', { type: 'model/obj' })
    const mockParsedMesh = {
      regions: [],
      totalVertices: 100,
      totalFaces: 50,
      globalCenter: [0, 0, 0] as [number, number, number],
      globalScale: 1
    }
    
    const mockPickMesh = vi.fn().mockResolvedValue(mockFile)
    const mockParseMesh = vi.fn().mockResolvedValue(mockParsedMesh)
    const mockLoadMesh = vi.fn()

    // Act
    await loadMeshByFilename(
      'waverider.obj',
      mockPickMesh,
      mockParseMesh,
      mockLoadMesh
    )

    // Assert
    expect(mockPickMesh).toHaveBeenCalledWith('waverider.obj')
    expect(mockParseMesh).toHaveBeenCalledWith(mockFile)
    expect(mockLoadMesh).toHaveBeenCalledWith(mockParsedMesh, 'waverider.obj', false)
  })

  it('handles duplicate tag names by showing lump dialog', async () => {
    // Arrange
    const mockFile = new File(['mesh data'], 'test.obj', { type: 'model/obj' })
    const mockParsedMesh = {
      regions: [
        { name: 'wall', tag: 1, meshData: {} as any },
        { name: 'wall', tag: 2, meshData: {} as any } // Duplicate!
      ],
      totalVertices: 100,
      totalFaces: 50,
      globalCenter: [0, 0, 0] as [number, number, number],
      globalScale: 1
    }
    
    const mockPickMesh = vi.fn().mockResolvedValue(mockFile)
    const mockParseMesh = vi.fn().mockResolvedValue(mockParsedMesh)
    const mockLoadMesh = vi.fn()
    const mockShowLumpDialog = vi.fn()

    // Act
    await loadMeshByFilename(
      'test.obj',
      mockPickMesh,
      mockParseMesh,
      mockLoadMesh,
      mockShowLumpDialog
    )

    // Assert: Should show lump dialog instead of loading directly
    expect(mockShowLumpDialog).toHaveBeenCalledWith(mockParsedMesh, 'test.obj')
    expect(mockLoadMesh).not.toHaveBeenCalled()
  })

  it('propagates errors from mesh parsing', async () => {
    // Arrange
    const mockFile = new File(['bad data'], 'corrupt.obj', { type: 'model/obj' })
    const mockPickMesh = vi.fn().mockResolvedValue(mockFile)
    const mockParseMesh = vi.fn().mockRejectedValue(new Error('Parse failed'))
    const mockLoadMesh = vi.fn()

    // Act & Assert
    await expect(
      loadMeshByFilename('corrupt.obj', mockPickMesh, mockParseMesh, mockLoadMesh)
    ).rejects.toThrow('Parse failed')
  })
})
