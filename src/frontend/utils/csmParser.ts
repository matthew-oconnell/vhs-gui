/**
 * Utility functions for parsing CSM (OpenCSM) files
 */

/**
 * Parse CSM content and extract import/restore statements
 * 
 * Detects:
 * - import filename (external file)
 * - restore filename (external file, NOT stored bodies or special tokens)
 * 
 * Note: "restore" can restore either:
 * 1. A previously stored body (e.g., "store vehicle" then "restore vehicle")
 * 2. An external file (e.g., "restore part.stp")
 * 3. Special tokens (e.g., "restore ." means restore marked body from stack)
 * 
 * This function excludes:
 * - Stored body names
 * - Special CSM tokens: "." (mark stack), ".." (parent), etc.
 * 
 * @param csmContent The CSM file content
 * @returns Array of imported filenames (excluding stored bodies and special tokens)
 */
export const parseCSMImports = (csmContent: string): string[] => {
  const imports = new Set<string>()
  const storedBodies = new Set<string>()
  
  // CSM special tokens that are NOT file imports
  const specialTokens = new Set([
    '.',   // Current mark stack / last marked body
    '..',  // Parent in hierarchy (if supported)
    '@',   // Parameter reference prefix (though usually followed by name)
  ])
  
  // First, find all stored body names
  const storeRegex = /^\s*store\s+(\S+)/gim
  let match
  while ((match = storeRegex.exec(csmContent)) !== null) {
    storedBodies.add(match[1])
  }
  
  // Match "import filename" or "restore filename"
  // CSM commands are case-insensitive, but filenames preserve case
  const importRegex = /^\s*(?:import|restore)\s+(\S+)/gim
  
  while ((match = importRegex.exec(csmContent)) !== null) {
    const filename = match[1]
    
    // Exclude special CSM tokens (e.g., "restore ." means restore marked body)
    if (specialTokens.has(filename)) {
      continue
    }
    
    // Exclude stored body names (e.g., "restore vehicle" after "store vehicle")
    if (!storedBodies.has(filename)) {
      imports.add(filename)
    }
  }
  
  return Array.from(imports)
}

/**
 * Extract the base filename from a path (handles / and \ separators)
 * 
 * @param path File path (may include directory separators)
 * @returns Base filename
 */
export const getBasename = (path: string): string => {
  const parts = path.split(/[/\\]/)
  return parts[parts.length - 1]
}

/**
 * Check if a CSM file has any import/restore statements
 * 
 * @param csmContent The CSM file content
 * @returns True if CSM imports other files
 */
export const hasImports = (csmContent: string): boolean => {
  return parseCSMImports(csmContent).length > 0
}
