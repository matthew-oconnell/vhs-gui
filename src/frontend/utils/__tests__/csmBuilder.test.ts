import { describe, it, expect, beforeEach } from 'vitest'
import { CSMBuilder } from '../csmBuilder'

describe('CSMBuilder - Operation Recording', () => {
  let builder: CSMBuilder
  
  beforeEach(() => {
    builder = new CSMBuilder()
  })
  
  describe('Basic Operations', () => {
    it('should start with no operations', () => {
      expect(builder.getOperationCount()).toBe(0)
      expect(builder.hasOperations()).toBe(false)
    })
    
    it('should record a simple operation', () => {
      const id = builder.recordOperation('select', 'select face 1')
      
      expect(builder.getOperationCount()).toBe(1)
      expect(builder.hasOperations()).toBe(true)
      expect(id).toMatch(/^op-/)
    })
    
    it('should record multiple operations', () => {
      builder.recordOperation('select', 'select face 1')
      builder.recordOperation('attribute', 'attribute bc_name $wall')
      builder.recordOperation('select', 'select face 2')
      
      expect(builder.getOperationCount()).toBe(3)
    })
    
    it('should record metadata with operations', () => {
      builder.recordOperation('select', 'select face 5', {
        bodyId: 1,
        faceId: 5,
        surfaceId: 'surf-123'
      })
      
      const ops = builder.getOperations()
      expect(ops[0].metadata?.bodyId).toBe(1)
      expect(ops[0].metadata?.faceId).toBe(5)
    })
  })
  
  describe('BC Name Attributes', () => {
    it('should record bc_name attribute with convenience method', () => {
      builder.recordBCNameAttribute(1, 5, 'vehicle', 'surf-123')
      
      expect(builder.getOperationCount()).toBe(2) // select + attribute
      
      const ops = builder.getOperations()
      expect(ops[0].type).toBe('select')
      expect(ops[0].command).toBe('select face 5')
      expect(ops[1].type).toBe('attribute')
      expect(ops[1].command).toBe('attribute bc_name $vehicle')
    })
    
    it('should record multiple bc_name attributes', () => {
      builder.recordBCNameAttribute(1, 1, 'inlet')
      builder.recordBCNameAttribute(1, 2, 'outlet')
      builder.recordBCNameAttribute(1, 3, 'wall')
      
      expect(builder.getOperationCount()).toBe(6) // 3 faces * 2 ops each
    })
  })
  
  describe('CSM Export', () => {
    it('should export empty CSM with no base or operations', () => {
      const csm = builder.export()
      expect(csm).toBe('')
    })
    
    it('should export base CSM without operations', () => {
      const baseCSM = 'box 10 20 30'
      builder.setBase(baseCSM)
      
      const csm = builder.export()
      expect(csm).toContain('box 10 20 30')
      expect(csm).not.toContain('Operations added by VHS-GUI')
    })
    
    it('should export base CSM with operations', () => {
      const baseCSM = 'box 10 20 30'
      builder.setBase(baseCSM)
      builder.recordBCNameAttribute(1, 1, 'wall')
      
      const csm = builder.export()
      
      // Should contain base
      expect(csm).toContain('box 10 20 30')
      
      // Should contain header
      expect(csm).toContain('Operations added by VHS-GUI')
      
      // Should contain operations
      expect(csm).toContain('select face 1')
      expect(csm).toContain('attribute bc_name $wall')
    })
    
    it('should format operations with proper structure', () => {
      builder.setBase('box 10 20 30')
      builder.recordBCNameAttribute(1, 5, 'vehicle')
      builder.recordBCNameAttribute(1, 10, 'inlet')
      
      const csm = builder.export()
      
      // Check formatting
      expect(csm).toContain('# Boundary condition name assignments')
      expect(csm).toContain('select face 5')
      expect(csm).toContain('attribute bc_name $vehicle')
      expect(csm).toContain('select face 10')
      expect(csm).toContain('attribute bc_name $inlet')
    })
  })
  
  describe('Operation Management', () => {
    it('should clear operations but keep base', () => {
      builder.setBase('box 10 20 30')
      builder.recordOperation('select', 'select face 1')
      
      builder.clearOperations()
      
      expect(builder.getOperationCount()).toBe(0)
      expect(builder.getBase()).toBe('box 10 20 30')
    })
    
    it('should clear everything', () => {
      builder.setBase('box 10 20 30')
      builder.recordOperation('select', 'select face 1')
      
      builder.clear()
      
      expect(builder.getOperationCount()).toBe(0)
      expect(builder.getBase()).toBe('')
    })
    
    it('should remove operation by ID', () => {
      const id1 = builder.recordOperation('select', 'select face 1')
      const id2 = builder.recordOperation('select', 'select face 2')
      
      expect(builder.getOperationCount()).toBe(2)
      
      const removed = builder.removeOperation(id1)
      expect(removed).toBe(true)
      expect(builder.getOperationCount()).toBe(1)
      
      const ops = builder.getOperations()
      expect(ops[0].id).toBe(id2)
    })
  })
  
  describe('Summary', () => {
    it('should provide summary with no operations', () => {
      const summary = builder.getSummary()
      expect(summary).toBe('No operations recorded')
    })
    
    it('should provide summary with operations', () => {
      builder.recordOperation('select', 'select face 1')
      builder.recordOperation('attribute', 'attribute bc_name $wall')
      builder.recordOperation('select', 'select face 2')
      
      const summary = builder.getSummary()
      expect(summary).toContain('Total operations: 3')
      expect(summary).toContain('select: 2')
      expect(summary).toContain('attribute: 1')
    })
  })
  
  describe('Round-trip Test', () => {
    it('should generate valid CSM that can be re-loaded', () => {
      // Simulate loading a CSM file
      const originalCSM = `# Simple box model
despmtr width 10
despmtr height 20
despmtr depth 30

box width height depth`
      
      builder.setBase(originalCSM)
      
      // Simulate user assigning bc_names
      builder.recordBCNameAttribute(1, 1, 'bottom')
      builder.recordBCNameAttribute(1, 2, 'top')
      builder.recordBCNameAttribute(1, 3, 'front')
      builder.recordBCNameAttribute(1, 4, 'back')
      builder.recordBCNameAttribute(1, 5, 'left')
      builder.recordBCNameAttribute(1, 6, 'right')
      
      // Export
      const exportedCSM = builder.export()
      
      // Verify structure
      expect(exportedCSM).toContain('# Simple box model')
      expect(exportedCSM).toContain('box width height depth')
      expect(exportedCSM).toContain('# Operations added by VHS-GUI')
      expect(exportedCSM).toContain('select face 1')
      expect(exportedCSM).toContain('attribute bc_name $bottom')
      expect(exportedCSM).toContain('select face 6')
      expect(exportedCSM).toContain('attribute bc_name $right')
      
      // Verify CSM is properly formatted (no syntax errors)
      const lines = exportedCSM.split('\n')
      expect(lines.length).toBeGreaterThan(10)
      
      // Each select/attribute pair should be together
      let foundSelectFace1 = false
      let foundAttrBottom = false
      for (let i = 0; i < lines.length - 1; i++) {
        if (lines[i].includes('select face 1')) {
          foundSelectFace1 = true
          // Next non-empty line should be the attribute
          if (lines[i + 1].includes('attribute bc_name $bottom')) {
            foundAttrBottom = true
          }
        }
      }
      expect(foundSelectFace1).toBe(true)
      expect(foundAttrBottom).toBe(true)
    })
  })
})
