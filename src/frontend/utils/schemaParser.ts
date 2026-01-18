export interface TreeNode {
  id: string
  label: string
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'ref'
  children?: TreeNode[]
  expanded?: boolean
  description?: string
  required?: boolean
  default?: any
  schemaType?: string
  enum?: any[]
}

interface SchemaProperty {
  type?: string | string[]
  description?: string
  default?: any
  properties?: Record<string, SchemaProperty>
  items?: SchemaProperty
  additionalProperties?: boolean | SchemaProperty
  $ref?: string
  oneOf?: SchemaProperty[]
  anyOf?: SchemaProperty[]
  allOf?: SchemaProperty[]
  enum?: any[]
  hidden?: boolean
  required?: string[]
  'only for'?: string[] | string  // Properties tagged with specific categories
}

interface Schema {
  properties?: Record<string, SchemaProperty>
  definitions?: Record<string, SchemaProperty>
  required?: string[]
}

let cachedSchema: Schema | null = null

// Helper function to check if a node is POD (Plain Old Data)
function isPODNode(node: TreeNode): boolean {
  return node.type === 'string' || 
         node.type === 'number' || 
         node.type === 'boolean' ||
         (node.type as string) === 'integer' ||
         (node.type === 'array' && !hasObjectItems(node))
}

// Helper function to check if an array contains objects
function hasObjectItems(node: TreeNode): boolean {
  // If it has children that are objects, it's an array of objects
  if (node.children && node.children.length > 0) {
    return node.children.some(child => child.type === 'object')
  }
  // Check schemaType for primitive arrays
  const schemaType = node.schemaType
  return schemaType === 'object' || (typeof schemaType === 'string' && schemaType.includes('object'))
}

export function buildTreeFromSchema(
  schema: Schema,
  requiredFields: string[] = []
): TreeNode[] {
  // Cache the full schema for reference resolution
  cachedSchema = schema
  
  if (!schema || !schema.properties) {
    return []
  }

  const properties = schema.properties
  const nodes: TreeNode[] = []
  const globalPODFields: TreeNode[] = []

  for (const [key, prop] of Object.entries(properties)) {
    const property = prop as SchemaProperty
    
    // Skip hidden properties
    if (property.hidden) {
      continue
    }

    const isRequired = requiredFields.includes(key)
    const node = createNodeFromProperty(key, property, `root.${key}`, isRequired, true)
    
    if (node) {
      // Check if this is a POD field at root level
      if (isPODNode(node)) {
        globalPODFields.push(node)
      } else {
        nodes.push(node)
      }
    }
  }

  // If there are global POD fields, create a "Global" node to contain them
  if (globalPODFields.length > 0) {
    const globalNode: TreeNode = {
      id: 'root.global',
      label: 'Global',
      type: 'object',
      description: 'Global configuration options',
      children: globalPODFields,
      expanded: false,
      required: false
    }
    nodes.unshift(globalNode) // Add at the beginning
  }

  return nodes
}

function resolveReference(ref: string): SchemaProperty | null {
  if (!cachedSchema || !ref.startsWith('#/definitions/')) {
    return null
  }
  
  const defName = ref.replace('#/definitions/', '')
  return cachedSchema.definitions?.[defName] || null
}

import { getFeatureFlags, isCategoryHidden } from './featureFlags';

// Function to check if a property should be hidden based on "only for"
function shouldHideProperty(property: SchemaProperty): boolean {
  if (!property['only for']) return false;
  
  // Get current feature flags to check what categories to hide
  const { showAdvancedFeatures } = getFeatureFlags();
  
  // If showing advanced features, don't hide anything based on category
  if (showAdvancedFeatures) return false;
  
  // Convert to array if it's a single string
  const onlyFor = Array.isArray(property['only for']) ? 
    property['only for'] : [property['only for']];
  
  // Check if any category should be hidden
  return onlyFor.some(category => isCategoryHidden(category));
}

function createNodeFromProperty(
  key: string,
  property: SchemaProperty,
  path: string,
  required: boolean = false,
  isRootLevel: boolean = false
): TreeNode | null {
  // Hide property if it's marked for developers only or experimental
  if (property.hidden || shouldHideProperty(property)) {
    return null;
  }
  
  // Handle $ref - resolve and expand it
  if (property.$ref) {
    const resolved = resolveReference(property.$ref)
    if (resolved) {
      // Create node from resolved reference
      const node = createNodeFromProperty(key, resolved, path, required, isRootLevel)
      if (node) {
        // Keep the ref info for display
        node.schemaType = property.$ref
      }
      return node
    }
    
    // Fallback if reference can't be resolved
    return {
      id: path,
      label: key,
      type: 'ref',
      description: property.description,
      required,
      schemaType: property.$ref
    }
  }

  // Handle allOf - merge all schemas together
  if (property.allOf) {
    const merged: SchemaProperty = {}
    
    for (const schema of property.allOf) {
      let resolvedSchema = schema
      
      // Resolve $ref if present
      if (schema.$ref) {
        const resolved = resolveReference(schema.$ref)
        if (resolved) {
          resolvedSchema = resolved
        }
      }
      
      // Merge properties
      if (resolvedSchema.properties) {
        merged.properties = { ...merged.properties, ...resolvedSchema.properties }
      }
      
      // Merge required arrays
      if (resolvedSchema.required) {
        merged.required = [...(merged.required || []), ...resolvedSchema.required]
      }
      
      // Copy other properties from first schema
      if (!merged.type && resolvedSchema.type) merged.type = resolvedSchema.type
      if (!merged.description && resolvedSchema.description) merged.description = resolvedSchema.description
      if (!merged.default && resolvedSchema.default) merged.default = resolvedSchema.default
    }
    
    return createNodeFromProperty(key, merged, path, required, isRootLevel)
  }

  // Handle oneOf/anyOf - use the first option for now
  if (property.oneOf || property.anyOf) {
    const options = property.oneOf || property.anyOf
    if (options && options.length > 0) {
      return createNodeFromProperty(key, options[0], path, required, isRootLevel)
    }
  }

  const propType = Array.isArray(property.type) ? property.type[0] : property.type

  // Handle object type
  if (propType === 'object') {
    const children: TreeNode[] = []
    
    if (property.properties) {
      const childRequired = property.required || []
      for (const [childKey, childProp] of Object.entries(property.properties)) {
        const childProperty = childProp as SchemaProperty
        if (!childProperty.hidden) {
          const childNode = createNodeFromProperty(
            childKey,
            childProperty,
            `${path}.${childKey}`,
            childRequired.includes(childKey),
            false
          )
          if (childNode) {
            // Only add non-POD children to the tree
            // POD fields will be shown in the property editor instead
            if (!isPODNode(childNode)) {
              children.push(childNode)
            }
          }
        }
      }
    }

    return {
      id: path,
      label: key,
      type: 'object',
      children: children.length > 0 ? children : undefined,
      expanded: false,
      description: property.description,
      required,
      default: property.default
    }
  }

  // Handle array type
  if (propType === 'array') {
    const children: TreeNode[] = []
    
    // If array items have a $ref, expand it
    if (property.items?.$ref) {
      const resolved = resolveReference(property.items.$ref)
      if (resolved) {
        const itemNode = createNodeFromProperty('[items]', resolved, `${path}[items]`, false, false)
        if (itemNode) {
          children.push(itemNode)
        }
      }
    }
    
    return {
      id: path,
      label: key,
      type: 'array',
      description: property.description,
      required,
      default: property.default,
      schemaType: property.items?.$ref || property.items?.type as string,
      children: children.length > 0 ? children : undefined,
      expanded: false
    }
  }

  // Handle primitive types
  return {
    id: path,
    label: key,
    type: (propType || 'string') as any,
    description: property.description,
    required,
    default: property.default,
    enum: property.enum
  }
}
