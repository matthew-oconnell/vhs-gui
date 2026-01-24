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

  describe('JSON files with comments', () => {
    it('loads JSON file with // comments', async () => {
      // Arrange: JSON with C-style comments
      const mockFile = createMockFile(
        '{"key": "value"} // this is a comment',
        'commented.json'
      )

      const mockFileHandle = {
        getFile: vi.fn().mockResolvedValue(mockFile)
      }

      globalThis.showOpenFilePicker = vi.fn().mockResolvedValue([mockFileHandle])

      // Act
      const result = await openJsonFile()

      // Assert: Comments should be stripped, JSON should parse
      expect(result).toEqual({ key: 'value' })
    })

    it('loads JSON file with # comments', async () => {
      // Arrange: JSON with shell-style comments
      const mockFile = createMockFile(
        '{"key": "value"} # this is a comment',
        'commented.json'
      )

      const mockFileHandle = {
        getFile: vi.fn().mockResolvedValue(mockFile)
      }

      globalThis.showOpenFilePicker = vi.fn().mockResolvedValue([mockFileHandle])

      // Act
      const result = await openJsonFile()

      // Assert: Comments should be stripped, JSON should parse
      expect(result).toEqual({ key: 'value' })
    })

    it('preserves URLs in string values', async () => {
      // Arrange: JSON with URL containing //
      const mockFile = createMockFile(
        '{"url": "https://example.com/path"}',
        'urls.json'
      )

      const mockFileHandle = {
        getFile: vi.fn().mockResolvedValue(mockFile)
      }

      globalThis.showOpenFilePicker = vi.fn().mockResolvedValue([mockFileHandle])

      // Act
      const result = await openJsonFile()

      // Assert: URL should be preserved exactly
      expect(result.url).toBe('https://example.com/path')
    })

    it('preserves color codes with # in strings', async () => {
      // Arrange: JSON with color code containing #
      const mockFile = createMockFile(
        '{"color": "#FF0000", "name": "red"}',
        'colors.json'
      )

      const mockFileHandle = {
        getFile: vi.fn().mockResolvedValue(mockFile)
      }

      globalThis.showOpenFilePicker = vi.fn().mockResolvedValue([mockFileHandle])

      // Act
      const result = await openJsonFile()

      // Assert: Color code should be preserved
      expect(result.color).toBe('#FF0000')
      expect(result.name).toBe('red')
    })

    it('loads complete CFD configuration with mixed comments', async () => {
      // Arrange: Realistic CFD config with both comment styles
      const cfdConfig = `{
  "mesh filename": "waverider.csm",  // geometry file
  "HyperSolve": {
    "boundary conditions": [
      { "type": "no slip", "mesh boundary tags": 1 },  # wall
      { "type": "riemann", "mesh boundary tags": 2 }   // freestream
    ],
    "states": {
      "freestream": {
        "mach number": 8.0  # hypersonic
      }
    }
  }
}`

      const mockFile = createMockFile(cfdConfig, 'config.json')

      const mockFileHandle = {
        getFile: vi.fn().mockResolvedValue(mockFile)
      }

      globalThis.showOpenFilePicker = vi.fn().mockResolvedValue([mockFileHandle])

      // Act
      const result = await openJsonFile()

      // Assert: All data should be parsed correctly
      expect(result['mesh filename']).toBe('waverider.csm')
      expect(result.HyperSolve['boundary conditions']).toHaveLength(2)
      expect(result.HyperSolve['boundary conditions'][0].type).toBe('no slip')
      expect(result.HyperSolve.states.freestream['mach number']).toBe(8.0)
    })

    it('handles URLs with comments on same line', async () => {
      // Arrange: URL in string with comment after
      const mockFile = createMockFile(
        '{"website": "https://example.com"} // main site',
        'config.json'
      )

      const mockFileHandle = {
        getFile: vi.fn().mockResolvedValue(mockFile)
      }

      globalThis.showOpenFilePicker = vi.fn().mockResolvedValue([mockFileHandle])

      // Act
      const result = await openJsonFile()

      // Assert: URL preserved, comment stripped
      expect(result.website).toBe('https://example.com')
    })
  })
})
