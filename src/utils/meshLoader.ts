/**
 * Utility for loading mesh files with automatic filename prompting
 */

import { ParsedMesh } from './meshParser'

/**
 * Load a mesh file from a directory handle by filename
 * 
 * @param filename - The mesh filename to load
 * @param directoryHandle - Directory handle where mesh file should be
 * @param parseMeshFile - Function to parse the mesh file
 * @param loadMesh - Function to load parsed mesh into app
 * @param showLumpDialog - Optional function to handle duplicate tag names
 * @returns true if mesh loaded successfully, false if file not found
 */
export const loadMeshFromDirectory = async (
  filename: string,
  directoryHandle: FileSystemDirectoryHandle,
  parseMeshFile: (file: File) => Promise<ParsedMesh>,
  loadMesh: (parsedMesh: ParsedMesh, filename: string, lump: boolean) => void,
  showLumpDialog?: (parsedMesh: ParsedMesh, filename: string) => void
): Promise<boolean> => {
  try {
    // Try to get the mesh file from the directory
    const fileHandle = await directoryHandle.getFileHandle(filename);
    const file = await fileHandle.getFile();
    
    // Parse the mesh
    const parsedMesh = await parseMeshFile(file);
    
    // Check for duplicate tag names
    const tagNames = new Set<string>();
    const hasDuplicates = parsedMesh.regions.some(region => {
      if (tagNames.has(region.name)) {
        return true;
      }
      tagNames.add(region.name);
      return false;
    });
    
    if (hasDuplicates && showLumpDialog) {
      // Show lump dialog for user to choose
      showLumpDialog(parsedMesh, filename);
    } else {
      // Load mesh directly
      loadMesh(parsedMesh, filename, false);
    }
    
    return true;
  } catch (error) {
    // File not found or access denied
    console.warn(`Could not load mesh file "${filename}" from directory:`, error);
    return false;
  }
};

/**
 * Load a mesh file by prompting user to select it
 * 
 * @param filename - The expected mesh filename
 * @param pickMeshFile - Function to show file picker with filename hint
 * @param parseMeshFile - Function to parse the mesh file
 * @param loadMesh - Function to load parsed mesh into app
 * @param showLumpDialog - Optional function to handle duplicate tag names
 */
export const loadMeshByFilename = async (
  filename: string,
  pickMeshFile: (hint?: string) => Promise<File | null>,
  parseMeshFile: (file: File) => Promise<ParsedMesh>,
  loadMesh: (parsedMesh: ParsedMesh, filename: string, lump: boolean) => void,
  showLumpDialog?: (parsedMesh: ParsedMesh, filename: string) => void
): Promise<void> => {
  // Prompt user to select the mesh file (pass filename as hint)
  const file = await pickMeshFile(filename)
  
  if (!file) {
    // User cancelled
    return
  }
  
  // Parse the mesh
  const parsedMesh = await parseMeshFile(file)
  
  // Check for duplicate tag names
  const tagNames = new Set<string>()
  const hasDuplicates = parsedMesh.regions.some(region => {
    if (tagNames.has(region.name)) {
      return true
    }
    tagNames.add(region.name)
    return false
  })
  
  if (hasDuplicates && showLumpDialog) {
    // Show lump dialog for user to choose
    showLumpDialog(parsedMesh, file.name)
  } else {
    // Load mesh directly
    loadMesh(parsedMesh, file.name, false)
  }
}
