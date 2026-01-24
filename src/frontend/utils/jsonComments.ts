/**
 * Utility functions for handling JSON files with comments
 */

/**
 * Strips // and # comments from JSON text while preserving comment markers inside strings
 * 
 * This function processes JSON text line by line, removing comments that appear
 * after // or # markers, but only when those markers are outside of quoted strings.
 * This allows users to write JSON configuration files with inline comments.
 * 
 * Supported comment styles:
 * - C-style: // comment to end of line
 * - Shell-style: # comment to end of line
 * 
 * String preservation:
 * - URLs like "https://example.com" are preserved
 * - Color codes like "#FF0000" are preserved
 * - Escaped quotes like "text with \" quote" are handled correctly
 * 
 * @param jsonText - Raw JSON text potentially containing comments
 * @returns Clean JSON text with comments removed, ready for JSON.parse()
 * 
 * @example
 * ```typescript
 * const input = '{"key": "value" // this is a comment}'
 * const cleaned = stripJsonComments(input)
 * // cleaned = '{"key": "value" }'
 * const parsed = JSON.parse(cleaned)
 * ```
 */
export const stripJsonComments = (jsonText: string): string => {
  const lines = jsonText.split('\n')
  
  const cleanedLines = lines.map(line => {
    let inString = false
    let escapeNext = false
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      
      // Handle escape sequences
      if (escapeNext) {
        escapeNext = false
        continue
      }
      
      if (char === '\\') {
        escapeNext = true
        continue
      }
      
      // Track string boundaries
      if (char === '"') {
        inString = !inString
        continue
      }
      
      // Only process comment markers when outside strings
      if (!inString) {
        // Check for C-style // comment
        if (char === '/' && i + 1 < line.length && line[i + 1] === '/') {
          // Return everything before the comment, trimming trailing whitespace
          return line.substring(0, i).trimEnd()
        }
        
        // Check for shell-style # comment
        if (char === '#') {
          // Return everything before the comment, trimming trailing whitespace
          return line.substring(0, i).trimEnd()
        }
      }
    }
    
    // No comment found, return original line
    return line
  })
  
  return cleanedLines.join('\n')
}
