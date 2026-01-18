import { describe, it, expect, vi, beforeEach } from 'vitest'
import { openJsonFile } from '../fileUtils'

// Helper to create a mock File with text() method
const createMockFile = (content: string, filename: string): File => {
  const file = new File([content], filename, { type: 'application/json' })
  // Add text() method to the mock File
  Object.defineProperty(file, 'text', {
    value: vi.fn().mockResolvedValue(content),
    writable: true
  })
  return file
}

describe('openJsonFile', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks()
  })

  describe('successful file loading', () => {
    it('parses and returns valid JSON configuration', async () => {
      // Arrange: Create a mock JSON file with valid configuration
      const mockConfigData = {
        'mesh filename': 'test.obj',
        HyperSolve: {
          'boundary conditions': [
            { type: 'no slip', 'mesh boundary tags': ['wall'] }
          ],
          states: {
            'freestream': {
              'mach number': 0.8,
              temperature: 300,
              pressure: 101325
            }
          }
        }
      }

      const mockFile = createMockFile(
        JSON.stringify(mockConfigData),
        'config.json'
      )

      const mockFileHandle = {
        getFile: vi.fn().mockResolvedValue(mockFile)
      }

      globalThis.showOpenFilePicker = vi.fn().mockResolvedValue([mockFileHandle])

      // Act: Open the file
      const result = await openJsonFile()

      // Assert: Should return parsed JSON
      expect(result).toEqual(mockConfigData)
      expect(globalThis.showOpenFilePicker).toHaveBeenCalledWith({
        types: [
          {
            description: 'JSON Files',
            accept: {
              'application/json': ['.json']
            }
          }
        ]
      })
      expect(mockFileHandle.getFile).toHaveBeenCalled()
    })

    it('handles empty configuration object', async () => {
      // Arrange: Empty but valid JSON
      const mockFile = createMockFile('{}', 'empty.json')

      const mockFileHandle = {
        getFile: vi.fn().mockResolvedValue(mockFile)
      }

      globalThis.showOpenFilePicker = vi.fn().mockResolvedValue([mockFileHandle])

      // Act
      const result = await openJsonFile()

      // Assert
      expect(result).toEqual({})
    })

    it('handles complex nested JSON structures', async () => {
      // Arrange: Complex nested configuration
      const complexConfig = {
        HyperSolve: {
          thermodynamics: {
            species: ['N2', 'O2', 'NO'],
            'chemical nonequilibrium': true
          },
          'time accuracy': {
            type: 'fixed timestep',
            timestep: 0.001,
            cfl: 1.0
          }
        }
      }

      const mockFile = createMockFile(
        JSON.stringify(complexConfig),
        'complex.json'
      )

      const mockFileHandle = {
        getFile: vi.fn().mockResolvedValue(mockFile)
      }

      globalThis.showOpenFilePicker = vi.fn().mockResolvedValue([mockFileHandle])

      // Act
      const result = await openJsonFile()

      // Assert
      expect(result).toEqual(complexConfig)
      expect(result.HyperSolve.thermodynamics.species).toHaveLength(3)
    })
  })

  describe('error handling', () => {
    it('throws error when JSON is invalid', async () => {
      // Arrange: Invalid JSON content
      const mockFile = createMockFile(
        '{ invalid json: missing quotes }',
        'bad.json'
      )

      const mockFileHandle = {
        getFile: vi.fn().mockResolvedValue(mockFile)
      }

      globalThis.showOpenFilePicker = vi.fn().mockResolvedValue([mockFileHandle])

      // Act & Assert: Should throw a parsing error
      await expect(openJsonFile()).rejects.toThrow()
    })

    it('throws error when JSON is malformed', async () => {
      // Arrange: Malformed JSON (unclosed braces)
      const mockFile = createMockFile(
        '{"key": "value"',
        'malformed.json'
      )

      const mockFileHandle = {
        getFile: vi.fn().mockResolvedValue(mockFile)
      }

      globalThis.showOpenFilePicker = vi.fn().mockResolvedValue([mockFileHandle])

      // Act & Assert
      await expect(openJsonFile()).rejects.toThrow()
    })

    it('returns null when user cancels file picker', async () => {
      // Arrange: User clicks "Cancel" in file picker
      const abortError = new Error('User cancelled')
      abortError.name = 'AbortError'
      
      globalThis.showOpenFilePicker = vi.fn().mockRejectedValue(abortError)

      // Act
      const result = await openJsonFile()

      // Assert: Should return null (not throw)
      expect(result).toBeNull()
    })

    it('throws error when file reading fails', async () => {
      // Arrange: File handle exists but file read fails
      const mockFileHandle = {
        getFile: vi.fn().mockRejectedValue(new Error('File read error'))
      }

      globalThis.showOpenFilePicker = vi.fn().mockResolvedValue([mockFileHandle])

      // Act & Assert
      await expect(openJsonFile()).rejects.toThrow('File read error')
    })
  })

  describe('browser compatibility fallback', () => {
    it('throws error when File System Access API is not supported', async () => {
      // Arrange: Browser doesn't support showOpenFilePicker
      const originalPicker = globalThis.showOpenFilePicker
      // @ts-ignore - Testing error condition
      globalThis.showOpenFilePicker = undefined

      // Act & Assert
      await expect(openJsonFile()).rejects.toThrow()

      // Cleanup
      globalThis.showOpenFilePicker = originalPicker
    })
  })

  describe('file type validation', () => {
    it('only accepts JSON files in file picker dialog', async () => {
      // Arrange
      const mockFile = createMockFile('{"test": true}', 'config.json')

      const mockFileHandle = {
        getFile: vi.fn().mockResolvedValue(mockFile)
      }

      globalThis.showOpenFilePicker = vi.fn().mockResolvedValue([mockFileHandle])

      // Act
      await openJsonFile()

      // Assert: Check file picker was called with JSON filter
      expect(globalThis.showOpenFilePicker).toHaveBeenCalledWith(
        expect.objectContaining({
          types: expect.arrayContaining([
            expect.objectContaining({
              description: 'JSON Files',
              accept: expect.objectContaining({
                'application/json': expect.arrayContaining(['.json'])
              })
            })
          ])
        })
      )
    })
  })
})
