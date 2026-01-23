/**
 * Utility functions for parsing CSM (OpenCSM) files
 */

/**
 * Parse CSM content and extract import/restore statements
 * 
 * Detects:
 * - import filename (external file)
 * - restore filename (external file, NOT stored bodies)
 * 
 * Note: "restore" can restore either:
 * 1. A previously stored body (e.g., "store vehicle" then "restore vehicle")
 * 2. An external file
 * 
 * This function excludes stored body names from the import list.
 * 
 * @param csmContent The CSM file content
 * @returns Array of imported filenames (excluding stored body names)
 */
export const parseCSMImports = (csmContent: string): string[] => {
  const imports = new Set<string>()
  const storedBodies = new Set<string>()
  
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
