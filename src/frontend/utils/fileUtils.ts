/**
 * Utility functions for file operations
 */

import { stripJsonComments } from './jsonComments'
import { migrateConfigToFlatStructure, isOldFormat, migrateBCTypes } from './configMigration'

/**
 * Saves data as a JSON file and prompts the user to select a save location
 * 
 * @param data The data to be saved as JSON
 * @param defaultFilename Default filename suggestion for the save dialog
 * @returns Promise that resolves when save is complete
 */
export const saveAsJson = async (data: any, defaultFilename: string = 'config.json'): Promise<void> => {
  try {
    // Ensure we're saving in the new flat format
    const dataToSave = isOldFormat(data) ? migrateConfigToFlatStructure(data) : data
    
    // Convert data to a formatted JSON string
    const jsonString = JSON.stringify(dataToSave, null, 2);
    
    // Create a Blob with the JSON data
    const blob = new Blob([jsonString], { type: 'application/json' });
    
    // Create a FileSystemWritableFileStream to write to
    const fileHandle = await window.showSaveFilePicker({
      suggestedName: defaultFilename,
      types: [
        {
          description: 'JSON Files',
          accept: {
            'application/json': ['.json'],
          },
        },
      ],
    });
    
    // Create a FileSystemWritableFileStream to write to
    const writable = await fileHandle.createWritable();
    
    // Write the contents of the file
    await writable.write(blob);
    
    // Close the file and write the contents to disk
    await writable.close();
    
    return Promise.resolve();
  } catch (error) {
    // If user cancels the save dialog, this will catch the exception
    if ((error as Error).name !== 'AbortError') {
      console.error('Error saving file:', error);
    }
    return Promise.reject(error);
  }
};

/**
 * Fallback method for browsers that don't support the File System Access API
 * Creates a download of the JSON data
 * 
 * @param data The data to be saved as JSON
 * @param filename Default filename for the download
 */
export const downloadJson = (data: any, filename: string = 'config.json'): void => {
  // Ensure we're saving in the new flat format
  const dataToSave = isOldFormat(data) ? migrateConfigToFlatStructure(data) : data
  
  // Convert data to a JSON string
  const jsonString = JSON.stringify(dataToSave, null, 2);
  
  // Create a Blob with the JSON data
  const blob = new Blob([jsonString], { type: 'application/json' });
  
  // Create a URL for the Blob
  const url = URL.createObjectURL(blob);
  
  // Create a temporary anchor element
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  
  // Append the link to the body, click it, and remove it
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the URL object
  URL.revokeObjectURL(url);
};

/**
 * Save JSON data with browser detection for the best available method
 * 
 * @param data The data to be saved
 * @param filename Default filename suggestion
 * @returns Promise that resolves when save is complete
 */
export const saveJsonFile = async (data: any, filename: string = 'config.json'): Promise<void> => {
  try {
    // Check if the File System Access API is available
    if ('showSaveFilePicker' in window) {
      return saveAsJson(data, filename);
    } else {
      // Fallback for browsers that don't support the File System Access API
      downloadJson(data, filename);
      return Promise.resolve();
    }
  } catch (error) {
    console.error('Error saving file:', error);
    return Promise.reject(error);
  }
};

/**
 * Opens a file picker dialog and reads a JSON file
 * 
 * @returns Promise that resolves with the parsed JSON data, or null if user cancels
 * @throws Error if JSON parsing fails or file reading fails
 */
export const openJsonFile = async (): Promise<any> => {
  const result = await openJsonFileWithHandle()
  return result?.config ?? null
}

/**
 * Opens a file picker dialog and reads a JSON file, returning both the config and file handle
 * 
 * @returns Promise that resolves with { config, fileHandle }, or null if user cancels
 * @throws Error if JSON parsing fails or file reading fails
 */
export const openJsonFileWithHandle = async (): Promise<{ config: any; fileHandle: FileSystemFileHandle } | null> => {
  try {
    // Check if the File System Access API is available
    if (!('showOpenFilePicker' in window)) {
      throw new Error('File System Access API is not supported in this browser');
    }

    // Open file picker dialog
    const [fileHandle] = await window.showOpenFilePicker({
      types: [
        {
          description: 'JSON Files',
          accept: {
            'application/json': ['.json']
          }
        }
      ]
    });

    // Get the file
    const file = await fileHandle.getFile();
    
    // Read the file content as text
    const text = await file.text();
    
    // Strip comments from JSON text
    const cleanedText = stripJsonComments(text);
    
    // Parse JSON
    const rawConfig = JSON.parse(cleanedText);
    
    // Auto-migrate if old format detected
    let config = rawConfig
    if (isOldFormat(config)) {
      console.log('[fileUtils] Detected old nested format, auto-migrating to flat structure')
      config = migrateConfigToFlatStructure(config)
    }
    
    // Auto-migrate deprecated BC types
    config = migrateBCTypes(config)
    
    return { config, fileHandle }
  } catch (error) {
    // If user cancels the file picker, return null instead of throwing
    if ((error as Error).name === 'AbortError') {
      return null;
    }
    
    // Re-throw other errors (parsing errors, file read errors, etc.)
    throw error;
  }
};

/**
 * Prompts user to select a directory and returns the directory handle
 * This is used to get access to the directory containing the config file
 * so we can automatically load mesh files from the same directory
 * 
 * @returns Promise that resolves with directory handle, or null if user cancels
 * @throws Error if Directory Picker API not supported
 */
export const promptForDirectoryAccess = async (): Promise<FileSystemDirectoryHandle | null> => {
  try {
    // Check if the Directory Picker API is available
    if (!('showDirectoryPicker' in window)) {
      throw new Error('Directory Picker API is not supported in this browser');
    }

    // Prompt user to select the directory
    const directoryHandle = await window.showDirectoryPicker({
      mode: 'read' // We only need read access
    });

    return directoryHandle;
  } catch (error) {
    // If user cancels, return null
    if ((error as Error).name === 'AbortError') {
      return null;
    }
    
    // Re-throw other errors
    throw error;
  }
};

/**
 * Opens a file picker dialog and reads a JSON file, also returning directory handle
 * 
 * @returns Promise that resolves with config and directory handle, or null if user cancels
 * @throws Error if JSON parsing fails or file reading fails
 */
export const openJsonFileWithDirectory = async (): Promise<{ config: any; directoryHandle: FileSystemDirectoryHandle } | null> => {
  try {
    // Check if the File System Access API is available
    if (!('showOpenFilePicker' in window)) {
      throw new Error('File System Access API is not supported in this browser');
    }

    // Open file picker dialog
    const [fileHandle] = await window.showOpenFilePicker({
      types: [
        {
          description: 'JSON Files',
          accept: {
            'application/json': ['.json']
          }
        }
      ]
    });

    // Get the file
    const file = await fileHandle.getFile();
    
    // Read the file content as text
    const text = await file.text();
    
    // Strip comments from JSON text
    const cleanedText = stripJsonComments(text);
    
    // Parse JSON (will throw if invalid)
    const config = JSON.parse(cleanedText);
    
    // Get the directory handle (parent directory of the file)
    // @ts-ignore - FileSystemFileHandle may have parent access in some browsers
    let directoryHandle: FileSystemDirectoryHandle | null = null;
    
    // Try to get parent directory (non-standard but works in some browsers)
    if ('getParent' in fileHandle && typeof (fileHandle as any).getParent === 'function') {
      try {
        directoryHandle = await (fileHandle as any).getParent();
      } catch (e) {
        console.warn('Could not get parent directory:', e);
      }
    }
    
    // Fallback: use the directory picker API if available
    if (!directoryHandle) {
      // We need to store the directory handle - for now return the fileHandle
      // The calling code can request directory access if needed
      directoryHandle = fileHandle as any; // Will handle in calling code
    }
    
    return { config, directoryHandle };
  } catch (error) {
    // If user cancels the file picker, return null instead of throwing
    if ((error as Error).name === 'AbortError') {
      return null;
    }
    
    // Re-throw other errors (parsing errors, file read errors, etc.)
    throw error;
  }
};