/**
 * Utility to extract the root solver key from JSON schema
 * 
 * The schema's "required" array contains the root solver name
 * (e.g., "Vulcan", "HyperSolve", etc.)
 */

const KNOWN_SOLVER_KEYS = ['Vulcan', 'HyperSolve', 'vulcan', 'hypersolve']

/**
 * Extract the root solver key from schema required array
 * @param schema - JSON schema object
 * @returns The root solver key (e.g., 'Vulcan' or 'HyperSolve') or null if not found
 */
export const extractRootSolverKey = (schema: any): string | null => {
  if (!schema || typeof schema !== 'object') {
    return null
  }

  const required = schema.required
  if (!Array.isArray(required)) {
    return null
  }

  // Find the first known solver key in the required array
  for (const key of required) {
    if (KNOWN_SOLVER_KEYS.includes(key)) {
      return key
    }
  }

  return null
}

/**
 * Load schema and extract root solver key
 * @param schemaPath - Path to schema file (default: '/schemas/input.schema.json')
 * @returns Object with schema and rootSolverKey
 */
export const loadSchemaWithSolverKey = async (
  schemaPath: string = '/schemas/input.schema.json'
): Promise<{ schema: any; rootSolverKey: string | null }> => {
  const response = await fetch(schemaPath)
  const schema = await response.json()
  const rootSolverKey = extractRootSolverKey(schema)
  
  console.log('[SchemaUtils] Detected root solver key:', rootSolverKey)
  
  return { schema, rootSolverKey }
}
