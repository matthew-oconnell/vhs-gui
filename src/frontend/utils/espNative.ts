// Frontend API for ESP geometry operations via Tauri
// Replaces espApi.ts which called Python server

import { invoke } from '@tauri-apps/api/core'

export interface GeometryData {
  branches: number
  parameters: Parameter[]
  bodies: Body[]
}

export interface Parameter {
  name: string
  value: number
  type_: number
}

export interface Body {
  index: number
  type_: number
  nodes: number
  edges: number
  faces: number
}

/**
 * Load and build a CSM file using native ESP libraries
 * Replaces Python server endpoint: POST /build-csm
 */
export async function loadCSMFile(path: string): Promise<GeometryData> {
  return await invoke<GeometryData>('load_csm_file', { path })
}

/**
 * Get current model information
 */
export async function getModelInfo(): Promise<GeometryData> {
  return await invoke<GeometryData>('get_model_info')
}

/**
 * Update a parameter value and rebuild geometry
 */
export async function updateParameter(
  paramName: string,
  newValue: number
): Promise<GeometryData> {
  return await invoke<GeometryData>('update_parameter', {
    paramName,
    newValue,
  })
}

/**
 * Close the current model
 */
export async function closeModel(): Promise<void> {
  await invoke('close_model')
}

/**
 * Check if ESP is available (libraries linked)
 */
export async function checkESPAvailable(): Promise<boolean> {
  try {
    // Try to get model info - if ESP isn't linked, this will fail
    await invoke('get_model_info')
    return true
  } catch (error) {
    // Expected if no model loaded, but ESP should still be available
    // Real failure would be "command not found"
    const msg = String(error)
    return !msg.includes('not found') && !msg.includes('unknown variant')
  }
}
