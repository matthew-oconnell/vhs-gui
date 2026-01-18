/**
 * Utility functions for loading configurations with mesh auto-loading
 */

/**
 * Load config and automatically load mesh if config specifies one
 * 
 * @param config - The loaded configuration object
 * @param loadMeshByName - Function to call to load mesh by filename
 * @returns The configuration object
 */
export const loadConfigWithMesh = async (
  config: any,
  loadMeshByName: (filename: string) => Promise<void>
): Promise<any> => {
  // Check if config has a mesh filename
  const meshFilename = config['mesh filename']
  
  // Handle empty or missing mesh filename
  if (!meshFilename) {
    return config
  }
  
  // Get the actual filename string (handle array or string)
  let filename: string
  if (Array.isArray(meshFilename)) {
    // If array, use first item
    if (meshFilename.length === 0) {
      return config
    }
    filename = meshFilename[0]
  } else {
    filename = meshFilename
  }
  
  // Don't load for empty strings
  if (filename === '') {
    return config
  }
  
  // Automatically load the mesh
  await loadMeshByName(filename)
  
  return config
}
