import { describe, it, expect, vi, beforeEach } from 'vitest'
import { loadConfigWithMesh } from '../configLoader'

describe('loadConfigWithMesh', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('config loading without mesh', () => {
    it('loads config without mesh filename and does not load mesh', async () => {
      // Arrange: Config without mesh filename
      const mockConfig = {
        HyperSolve: {
          'boundary conditions': [],
          states: {}
        }
      }
      
      const mockLoadMeshByName = vi.fn()

      // Act
      const result = await loadConfigWithMesh(
        mockConfig,
        mockLoadMeshByName
      )

      // Assert: Should return config, not load mesh
      expect(result).toEqual(mockConfig)
      expect(mockLoadMeshByName).not.toHaveBeenCalled()
    })
  })

  describe('config loading with mesh filename', () => {
    it('automatically loads mesh when config has mesh filename', async () => {
      // Arrange: Config with mesh filename
      const mockConfig = {
        'mesh filename': 'test.obj',
        HyperSolve: {
          'boundary conditions': [],
          states: {}
        }
      }
      
      const mockLoadMeshByName = vi.fn().mockResolvedValue(undefined)

      // Act
      await loadConfigWithMesh(
        mockConfig,
        mockLoadMeshByName
      )

      // Assert: Should automatically load mesh with correct filename
      expect(mockLoadMeshByName).toHaveBeenCalledWith('test.obj')
    })

    it('loads mesh with correct filename', async () => {
      // Arrange
      const mockConfig = {
        'mesh filename': 'waverider.obj',
        HyperSolve: {}
      }
      
      const mockLoadMeshByName = vi.fn().mockResolvedValue(undefined)

      // Act
      await loadConfigWithMesh(
        mockConfig,
        mockLoadMeshByName
      )

      // Assert: Should call load mesh with filename
      expect(mockLoadMeshByName).toHaveBeenCalledWith('waverider.obj')
    })

    it('handles mesh filename as array (uses first item)', async () => {
      // Arrange: Schema allows array of mesh filenames
      const mockConfig = {
        'mesh filename': ['mesh1.obj', 'mesh2.obj'],
        HyperSolve: {}
      }
      
      const mockLoadMeshByName = vi.fn().mockResolvedValue(undefined)

      // Act
      await loadConfigWithMesh(
        mockConfig,
        mockLoadMeshByName
      )

      // Assert: Should use first mesh filename
      expect(mockLoadMeshByName).toHaveBeenCalledWith('mesh1.obj')
    })
  })

  describe('error handling', () => {
    it('propagates errors from mesh loading', async () => {
      // Arrange
      const mockConfig = {
        'mesh filename': 'bad.obj',
        HyperSolve: {}
      }
      
      const mockLoadMeshByName = vi.fn().mockRejectedValue(new Error('Mesh load failed'))

      // Act & Assert: Should propagate error
      await expect(
        loadConfigWithMesh(mockConfig, mockLoadMeshByName)
      ).rejects.toThrow('Mesh load failed')
    })
  })

  describe('edge cases', () => {
    it('handles empty mesh filename string', async () => {
      // Arrange
      const mockConfig = {
        'mesh filename': '',
        HyperSolve: {}
      }
      
      const mockLoadMeshByName = vi.fn()

      // Act
      await loadConfigWithMesh(
        mockConfig,
        mockLoadMeshByName
      )

      // Assert: Should not load for empty string
      expect(mockLoadMeshByName).not.toHaveBeenCalled()
    })

    it('handles empty mesh filename array', async () => {
      // Arrange
      const mockConfig = {
        'mesh filename': [],
        HyperSolve: {}
      }
      
      const mockLoadMeshByName = vi.fn()

      // Act
      await loadConfigWithMesh(
        mockConfig,
        mockLoadMeshByName
      )

      // Assert: Should not load for empty array
      expect(mockLoadMeshByName).not.toHaveBeenCalled()
    })
  })
})
