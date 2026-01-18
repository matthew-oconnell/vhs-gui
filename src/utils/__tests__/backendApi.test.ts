/**
 * Tests for backend API client
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { uploadMeshToBackend, convertMesh, checkBackendHealth } from '../backendApi'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch as any

describe('Backend API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('uploadMeshToBackend', () => {
    it('uploads file and returns session ID', async () => {
      const mockResponse = {
        success: true,
        sessionId: '123_456',
        filename: 'test.obj',
        extension: 'obj',
        size: '1.0 KB',
        sizeBytes: 1024,
        path: '/tmp/test.obj',
        message: 'Upload successful'
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const file = new File(['test'], 'test.obj', { type: 'application/octet-stream' })
      const result = await uploadMeshToBackend(file)

      expect(result.sessionId).toBe('123_456')
      expect(result.filename).toBe('test.obj')
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/mesh/upload'),
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('throws error on upload failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Invalid file' })
      })

      const file = new File(['test'], 'test.txt', { type: 'text/plain' })
      
      await expect(uploadMeshToBackend(file)).rejects.toThrow('Invalid file')
    })
  })

  describe('convertMesh', () => {
    it('converts mesh and returns data', async () => {
      const mockMeshData = {
        totalVertices: 100,
        totalFaces: 50,
        globalCenter: [0, 0, 0],
        globalScale: 1.0,
        regions: [
          {
            name: 'region1',
            tag: 1,
            vertices: [[0, 0, 0], [1, 0, 0], [0, 1, 0]],
            cells: [[0, 1, 2]]
          }
        ]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockMeshData
      })

      const result = await convertMesh('123_456')

      expect(result.totalVertices).toBe(100)
      expect(result.regions).toHaveLength(1)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/mesh/convert/123_456')
      )
    })

    it('throws error on conversion failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Conversion failed' })
      })

      await expect(convertMesh('invalid')).rejects.toThrow('Conversion failed')
    })
  })

  describe('checkBackendHealth', () => {
    it('returns true when backend is healthy', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true
      })

      const result = await checkBackendHealth()
      expect(result).toBe(true)
    })

    it('returns false when backend is unreachable', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await checkBackendHealth()
      expect(result).toBe(false)
    })
  })
})
