import { describe, it, expect } from 'vitest'
import { extractRootSolverKey } from '../schemaUtils'

describe('schemaUtils', () => {
  describe('extractRootSolverKey', () => {
    it('should extract Vulcan from required array', () => {
      const schema = {
        required: ['mesh filename', 'Vulcan']
      }
      
      expect(extractRootSolverKey(schema)).toBe('Vulcan')
    })
    
    it('should extract HyperSolve from required array', () => {
      const schema = {
        required: ['mesh filename', 'HyperSolve']
      }
      
      expect(extractRootSolverKey(schema)).toBe('HyperSolve')
    })
    
    it('should return null if no known solver key found', () => {
      const schema = {
        required: ['mesh filename', 'something else']
      }
      
      expect(extractRootSolverKey(schema)).toBeNull()
    })
    
    it('should return null if required is not an array', () => {
      const schema = {
        required: 'mesh filename'
      }
      
      expect(extractRootSolverKey(schema)).toBeNull()
    })
    
    it('should return null if schema is invalid', () => {
      expect(extractRootSolverKey(null)).toBeNull()
      expect(extractRootSolverKey(undefined)).toBeNull()
      expect(extractRootSolverKey({})).toBeNull()
    })
    
    it('should return first known solver key when multiple present', () => {
      const schema = {
        required: ['mesh filename', 'Vulcan', 'HyperSolve']
      }
      
      // Should return Vulcan because it appears first in KNOWN_SOLVER_KEYS
      expect(extractRootSolverKey(schema)).toBe('Vulcan')
    })
  })
})
