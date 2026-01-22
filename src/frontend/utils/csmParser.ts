/**
 * Utility functions for parsing CSM (OpenCSM) files
 */

/**
 * Parse CSM content and extract import/restore statements
 * 
 * Detects:
 * - import filename
 * - restore filename
 * 
 * @param csmContent The CSM file content
 * @returns Array of imported filenames
 */
export const parseCSMImports = (csmContent: string): string[] => {
  const imports = new Set<string>()
  
  // Match "import filename" or "restore filename"
  // CSM commands are case-insensitive, but filenames preserve case
  const importRegex = /^\s*(?:import|restore)\s+(\S+)/gim
  
  let match
  while ((match = importRegex.exec(csmContent)) !== null) {
    const filename = match[1]
    imports.add(filename)
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
