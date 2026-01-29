import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getFileType, getFileIcon, readDirectoryRecursive } from '../projectFileUtils'

describe('projectFileUtils', () => {
  describe('getFileType', () => {
    it('identifies JSON config files', () => {
      expect(getFileType('config.json')).toBe('config')
      expect(getFileType('settings.json')).toBe('config')
    })

    it('identifies mesh files', () => {
      expect(getFileType('mesh.obj')).toBe('mesh')
      expect(getFileType('model.stl')).toBe('mesh')
      expect(getFileType('surface.meshb')).toBe('mesh')
    })

    it('identifies CAD files', () => {
      expect(getFileType('model.csm')).toBe('cad')
      expect(getFileType('geometry.stp')).toBe('cad')
      expect(getFileType('part.step')).toBe('cad')
    })

    it('identifies reaction model files', () => {
      expect(getFileType('reac_mod.H2_7x7')).toBe('reaction')
    })

    it('returns unknown for unrecognized extensions', () => {
      expect(getFileType('readme.txt')).toBe('unknown')
      expect(getFileType('script.py')).toBe('unknown')
      expect(getFileType('noextension')).toBe('unknown')
    })

    it('handles uppercase extensions', () => {
      expect(getFileType('CONFIG.JSON')).toBe('config')
      expect(getFileType('MESH.OBJ')).toBe('mesh')
    })
  })

  describe('getFileIcon', () => {
    it('returns appropriate icons for each file type', () => {
      expect(getFileIcon('config')).toBe('file-json')
      expect(getFileIcon('mesh')).toBe('box')
      expect(getFileIcon('cad')).toBe('pen-tool')
      expect(getFileIcon('reaction')).toBe('flame')
      expect(getFileIcon('unknown')).toBe('file')
      expect(getFileIcon('folder')).toBe('folder')
    })
  })

  describe('readDirectoryRecursive', () => {
    let mockDirectoryHandle: FileSystemDirectoryHandle

    beforeEach(() => {
      // Mock a simple directory structure
      const mockFileHandles = new Map<string, FileSystemFileHandle | FileSystemDirectoryHandle>()
      
      // Mock file handle
      const createMockFile = (name: string): FileSystemFileHandle => ({
        kind: 'file',
        name,
        getFile: vi.fn().mockResolvedValue(new File([], name)),
        createWritable: vi.fn(),
        isSameEntry: vi.fn(),
        queryPermission: vi.fn(),
        requestPermission: vi.fn(),
      } as unknown as FileSystemFileHandle)

      // Mock directory handle
      const createMockDirectory = (name: string, entries: Map<string, any>): FileSystemDirectoryHandle => ({
        kind: 'directory',
        name,
        getDirectoryHandle: vi.fn(),
        getFileHandle: vi.fn(),
        removeEntry: vi.fn(),
        resolve: vi.fn(),
        values: () => entries.values(),
        keys: () => entries.keys(),
        entries: () => entries.entries(),
        [Symbol.asyncIterator]: async function* () {
          for (const [key, value] of entries) {
            yield [key, value]
          }
        },
        isSameEntry: vi.fn(),
        queryPermission: vi.fn(),
        requestPermission: vi.fn(),
      } as unknown as FileSystemDirectoryHandle)

      // Create mock structure:
      // project/
      //   config.json
      //   mesh.obj
      //   subfolder/
      //     model.csm
      const subfolderEntries = new Map()
      subfolderEntries.set('model.csm', createMockFile('model.csm'))
      
      const subfolder = createMockDirectory('subfolder', subfolderEntries)
      
      mockFileHandles.set('config.json', createMockFile('config.json'))
      mockFileHandles.set('mesh.obj', createMockFile('mesh.obj'))
      mockFileHandles.set('subfolder', subfolder)

      mockDirectoryHandle = createMockDirectory('project', mockFileHandles)
    })

    it('reads files and directories recursively', async () => {
      const result = await readDirectoryRecursive(mockDirectoryHandle)

      expect(result).toHaveLength(3)
      
      // Check for config.json
      const configFile = result.find(item => item.name === 'config.json')
      expect(configFile).toBeDefined()
      expect(configFile?.type).toBe('file')
      expect(configFile?.fileType).toBe('config')

      // Check for mesh.obj
      const meshFile = result.find(item => item.name === 'mesh.obj')
      expect(meshFile).toBeDefined()
      expect(meshFile?.type).toBe('file')
      expect(meshFile?.fileType).toBe('mesh')

      // Check for subfolder
      const subfolder = result.find(item => item.name === 'subfolder')
      expect(subfolder).toBeDefined()
      expect(subfolder?.type).toBe('directory')
      expect(subfolder?.children).toHaveLength(1)
      
      // Check nested file
      const nestedFile = subfolder?.children?.[0]
      expect(nestedFile?.name).toBe('model.csm')
      expect(nestedFile?.fileType).toBe('cad')
    })

    it('handles empty directories', async () => {
      const emptyDir = {
        kind: 'directory',
        name: 'empty',
        [Symbol.asyncIterator]: async function* () {
          // No entries
        },
      } as unknown as FileSystemDirectoryHandle

      const result = await readDirectoryRecursive(emptyDir)
      expect(result).toEqual([])
    })

    it('sorts directories first, then files alphabetically', async () => {
      const result = await readDirectoryRecursive(mockDirectoryHandle)
      
      // Directories should come first
      const directories = result.filter(item => item.type === 'directory')
      const files = result.filter(item => item.type === 'file')
      
      expect(directories).toHaveLength(1)
      expect(files).toHaveLength(2)
      
      // Check order: subfolder, then config.json, then mesh.obj
      expect(result[0].name).toBe('subfolder')
      expect(result[1].name).toBe('config.json')
      expect(result[2].name).toBe('mesh.obj')
    })
  })
})
