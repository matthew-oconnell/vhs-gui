/**
 * CSM Builder - Records user operations and generates CSM files
 * 
 * This class treats VHS-GUI as a CSM script builder, recording every
 * operation the user makes and enabling export of procedurally-generated CSM.
 */

export interface CSMOperation {
  id: string
  type: 'select' | 'attribute' | 'primitive' | 'boolean' | 'transform' | 'comment'
  command: string
  timestamp: number
  metadata?: {
    bodyId?: number
    faceId?: number
    surfaceId?: string
    description?: string
  }
}

export class CSMBuilder {
  private baseCSM: string = ''
  private operations: CSMOperation[] = []
  
  /**
   * Set the base CSM content (from loaded file)
   */
  setBase(csm: string) {
    this.baseCSM = csm
  }
  
  /**
   * Get the base CSM content
   */
  getBase(): string {
    return this.baseCSM
  }
  
  /**
   * Record a new operation
   */
  recordOperation(
    type: CSMOperation['type'], 
    command: string, 
    metadata?: CSMOperation['metadata']
  ): string {
    const id = `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    this.operations.push({
      id,
      type,
      command,
      timestamp: Date.now(),
      metadata
    })
    
    console.log('[CSMBuilder] Recorded operation:', { id, type, command, metadata })
    return id
  }
  
  /**
   * Record setting a bc_name attribute on a face
   * This is a convenience method that records both the select and attribute operations
   */
  recordBCNameAttribute(bodyId: number, faceId: number, bcName: string, surfaceId?: string): void {
    // Record select face operation
    this.recordOperation('select', `select face ${faceId}`, {
      bodyId,
      faceId,
      surfaceId,
      description: `Select face ${faceId} on body ${bodyId}`
    })
    
    // Record attribute operation
    this.recordOperation('attribute', `attribute bc_name $${bcName}`, {
      bodyId,
      faceId,
      surfaceId,
      description: `Set bc_name to "${bcName}"`
    })
  }
  
  /**
   * Record an import statement (for STEP files)
   */
  recordImport(filePath: string, metadata?: { description?: string }): string {
    return this.recordOperation('primitive', `import ${filePath}`, {
      description: metadata?.description || `Import geometry from ${filePath}`
    })
  }
  
  /**
   * Record a mark statement
   */
  recordMark(metadata?: { description?: string }): string {
    return this.recordOperation('primitive', 'mark', {
      description: metadata?.description || 'Mark current position on geometry stack'
    })
  }
  
  /**
   * Record a sphere primitive
   */
  recordSphere(
    x: number, 
    y: number, 
    z: number, 
    radius: number,
    metadata?: { description?: string }
  ): string {
    return this.recordOperation('primitive', `sphere ${x} ${y} ${z} ${radius}`, {
      description: metadata?.description || `Create sphere at (${x}, ${y}, ${z}) with radius ${radius}`
    })
  }
  
  /**
   * Record a restore statement
   */
  recordRestore(metadata?: { description?: string }): string {
    return this.recordOperation('boolean', 'restore .', {
      description: metadata?.description || 'Restore geometry from mark'
    })
  }
  
  /**
   * Record a subtract boolean operation
   */
  recordSubtract(metadata?: { description?: string }): string {
    return this.recordOperation('boolean', 'subtract', {
      description: metadata?.description || 'Subtract top geometry from second'
    })
  }
  
  /**
   * Record a union boolean operation
   */
  recordUnion(metadata?: { description?: string }): string {
    return this.recordOperation('boolean', 'union', {
      description: metadata?.description || 'Union top two geometries'
    })
  }
  
  /**
   * Record an intersect boolean operation
   */
  recordIntersect(metadata?: { description?: string }): string {
    return this.recordOperation('boolean', 'intersect', {
      description: metadata?.description || 'Intersect top two geometries'
    })
  }
  
  /**
   * Export CSM with all recorded operations
   */
  export(): string {
    let csm = this.baseCSM.trimEnd()
    
    // Add header comment if we have operations
    if (this.operations.length > 0) {
      csm += '\n\n# ===================================================================\n'
      csm += '# Operations added by VHS-GUI\n'
      csm += `# Generated: ${new Date().toISOString()}\n`
      csm += `# Total operations: ${this.operations.length}\n`
      csm += '# ===================================================================\n\n'
    }
    
    // Add operations in sequence (no grouping - attributes must follow their geometry)
    for (const op of this.operations) {
      csm += this.formatOperation(op) + '\n'
    }
    
    return csm
  }
  
  /**
   * Format a single operation with proper indentation
   */
  private formatOperation(op: CSMOperation): string {
    const lines = op.command.split('\n')
    
    if (lines.length === 1) {
      return lines[0]
    }
    
    // Multi-line operation - indent continuation lines
    return lines.map((line, i) => 
      i === 0 ? line : '  ' + line
    ).join('\n')
  }
  
  /**
   * Clear all operations (keeps base CSM)
   */
  clearOperations() {
    console.log('[CSMBuilder] Clearing', this.operations.length, 'operations')
    this.operations = []
  }
  
  /**
   * Clear everything (base + operations)
   */
  clear() {
    console.log('[CSMBuilder] Clearing base CSM and', this.operations.length, 'operations')
    this.baseCSM = ''
    this.operations = []
  }
  
  /**
   * Get all operations (for debugging/inspection)
   */
  getOperations(): CSMOperation[] {
    return [...this.operations]
  }
  
  /**
   * Get operation count
   */
  getOperationCount(): number {
    return this.operations.length
  }
  
  /**
   * Check if there are any operations
   */
  hasOperations(): boolean {
    return this.operations.length > 0
  }
  
  /**
   * Remove an operation by ID
   */
  removeOperation(id: string): boolean {
    const index = this.operations.findIndex(op => op.id === id)
    if (index !== -1) {
      this.operations.splice(index, 1)
      console.log('[CSMBuilder] Removed operation:', id)
      return true
    }
    return false
  }
  
  /**
   * Get a summary of operations
   */
  getSummary(): string {
    if (this.operations.length === 0) {
      return 'No operations recorded'
    }
    
    const summary: string[] = []
    summary.push(`Total operations: ${this.operations.length}`)
    
    const typeCounts = new Map<string, number>()
    for (const op of this.operations) {
      typeCounts.set(op.type, (typeCounts.get(op.type) || 0) + 1)
    }
    
    for (const [type, count] of typeCounts.entries()) {
      summary.push(`  ${type}: ${count}`)
    }
    
    return summary.join('\n')
  }
}
