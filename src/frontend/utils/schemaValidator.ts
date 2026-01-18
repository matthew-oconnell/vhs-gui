import Ajv, { ErrorObject } from 'ajv';

/**
 * Sanitizes a schema by removing custom non-standard keywords
 * that might cause validation errors
 * 
 * @param schema The original JSON Schema
 * @returns A cleaned schema with non-standard keywords removed
 */
const sanitizeSchema = (schema: Record<string, any>): Record<string, any> => {
  // Clone the schema to avoid modifying the original
  const result = { ...schema };
  
  // List of non-standard keywords to remove
  const nonStandardKeywords = [
    'only for',
    'hidden',
    'examples'
    // Note: We keep 'if', 'then', 'else' as they are valid JSON Schema keywords
  ];
  
  // Function to recursively process schema objects
  const processObject = (obj: Record<string, any>): Record<string, any> => {
    const result: Record<string, any> = {};
    
    // If this object has a $ref, preserve it and don't process further
    // $ref should be the only property in the object
    if (obj.$ref) {
      return { $ref: obj.$ref };
    }
    
    // Process each property
    for (const [key, value] of Object.entries(obj)) {
      // Skip non-standard keywords
      if (nonStandardKeywords.includes(key)) {
        continue;
      }
      
      // Recursively process nested objects
      if (value !== null && typeof value === 'object') {
        if (Array.isArray(value)) {
          // Process arrays
          result[key] = value.map(item => 
            typeof item === 'object' && item !== null ? processObject(item) : item
          );
        } else {
          // Process objects
          result[key] = processObject(value);
        }
      } else {
        result[key] = value;
      }
    }
    
    return result;
  };
  
  // Process the root schema
  return processObject(result);
};

/**
 * Validates data against a JSON Schema
 * 
 * @param schema The JSON Schema to validate against
 * @param data The data to validate
 * @returns An object containing validation result and any errors
 */
export const validateAgainstSchema = (
  schema: Record<string, any>,
  data: any
): { valid: boolean; errors: ErrorObject[] | null | undefined } => {
  // Create Ajv instance with configuration to ignore unknown keywords
  const ajv = new Ajv({ 
    allErrors: true,
    strict: false, // Be lenient about schema format
    validateFormats: false, // Skip format validation
    unknownFormats: 'ignore', // Ignore unknown formats
    validateSchema: false, // Skip meta-schema validation to avoid issues with $ref format
    strictSchema: false, // Don't validate the schema itself strictly
    allowUnionTypes: true // Allow union types
  });
  
  try {
    // Sanitize the schema to remove non-standard keywords
    const cleanedSchema = sanitizeSchema(schema);
    
    console.log('[Validator] Validating data against schema')
    console.log('[Validator] Data keys:', Object.keys(data))
    if (data.HyperSolve) {
      console.log('[Validator] HyperSolve keys:', Object.keys(data.HyperSolve))
    }
    
    // Compile and validate
    const validate = ajv.compile(cleanedSchema);
    const valid = validate(data);
    
    if (!valid && validate.errors) {
      console.log('[Validator] Validation failed with errors:', validate.errors.length)
      console.log('[Validator] First few errors:', validate.errors.slice(0, 5))
    } else {
      console.log('[Validator] Validation passed!')
    }
    
    return {
      valid: !!valid,
      errors: validate.errors
    };
  } catch (error) {
    console.error('Schema validation error:', error);
    return {
      valid: false,
      errors: [{
        keyword: 'schema',
        instancePath: '',
        schemaPath: '',
        params: { error: String(error) },
        message: `Schema validation error: ${error}`
      } as ErrorObject]
    };
  }
};

/**
 * Formats validation errors into human-readable messages
 * 
 * @param errors AJV error objects
 * @returns Array of formatted error messages
 */
/**
 * Represents a validation error with path information
 */
export interface ValidationErrorItem {
  message: string;
  path?: string; // Path to the problematic field (dot notation)
  type?: string; // Type of the expected value (string, number, boolean)
  propertyName?: string; // Name of the property for required fields
  parentPath?: string; // Path to the parent object for required fields
}

/**
 * Format AJV error objects into user-friendly messages with path information
 */
// Create a variable to hold the schema for property type lookups
let cachedValidationSchema: Record<string, any> | null = null;

export const formatValidationErrors = (errors: ErrorObject[] | null | undefined, schema?: Record<string, any>): ValidationErrorItem[] => {
  // Store schema for property type lookups
  if (schema) {
    cachedValidationSchema = schema;
  }
  if (!errors || errors.length === 0) return [];
  
  return errors.map(error => {
    const path = error.instancePath || '';
    const property = error.params.property || '';
    const fullPath = path + (property ? `/${property}` : '');
    const readablePath = fullPath.replace(/^\//g, '').replace(/\//g, '.') || 'root';
    
    let message: string;
    let navigablePath: string | undefined = readablePath !== 'root' ? readablePath : undefined;
    
    // Define a variable to hold the property type
    let propertyType: string | undefined;
    
    switch (error.keyword) {
      case 'required':
        const missingProp = error.params.missingProperty as string;
        const parentPath = readablePath !== 'root' ? readablePath : '';
        const childPath = parentPath ? `${parentPath}.${missingProp}` : missingProp;
        message = `Missing required property: "${missingProp}"${path ? ` in ${readablePath}` : ''}`;
        navigablePath = parentPath || undefined; // Navigate to parent if missing property
        
        // Default to string for missing properties
        propertyType = 'string';
        
        // Try to find the type in the schema if available
        if (cachedValidationSchema) {
          try {
            // Convert path to schema path format
            const pathParts = parentPath.split('.');
            
            // Navigate through the schema to find the property definition
            let currentSchema = cachedValidationSchema;
            for (const part of pathParts) {
              if (part === 'root') continue;
              
              if (currentSchema.properties && currentSchema.properties[part]) {
                currentSchema = currentSchema.properties[part];
              } else if (currentSchema.items) {
                // Handle array items
                currentSchema = currentSchema.items;
              } else {
                // Can't navigate further
                break;
              }
            }
            
            // Check if we found the parent and it has the property defined
            if (currentSchema.properties && currentSchema.properties[missingProp]) {
              const propSchema = currentSchema.properties[missingProp];
              // Get type from the property schema
              propertyType = Array.isArray(propSchema.type) ? propSchema.type[0] : propSchema.type || 'string';
            }
          } catch (e) {
            console.warn('Error determining property type:', e);
          }
        }
        break;
      case 'type':
        message = `"${readablePath}" should be ${error.params.type}`;
        break;
      case 'enum':
        const allowedValues = error.params.allowedValues as string[];
        message = `"${readablePath}" should be one of: ${allowedValues?.join(', ')}`;
        break;
      case 'minimum':
        message = `"${readablePath}" should be >= ${error.params.limit}`;
        break;
      case 'maximum':
        message = `"${readablePath}" should be <= ${error.params.limit}`;
        break;
      case 'minLength':
        message = `"${readablePath}" should have at least ${error.params.limit} characters`;
        break;
      case 'maxLength':
        message = `"${readablePath}" should have at most ${error.params.limit} characters`;
        break;
      case 'pattern':
        message = `"${readablePath}" does not match pattern: ${error.params.pattern}`;
        break;
      case 'additionalProperties':
        const addProp = error.params.additionalProperty as string;
        message = `"${readablePath}" has unrecognized property: "${addProp}"`;
        break;
      default:
        message = `${error.keyword} validation failed at "${readablePath}": ${JSON.stringify(error.params)}`;
        break;
    }
    
    // Build the result object with enhanced information
    const result: ValidationErrorItem = { message };
    
    // Add navigation path
    if (navigablePath) {
      result.path = navigablePath;
    }
    
    // Add extra data for required property errors to support quick fixes
    if (error.keyword === 'required') {
      const missingProp = error.params.missingProperty as string;
      result.propertyName = missingProp;
      result.parentPath = navigablePath || ''; // Ensure it's not undefined
      result.type = propertyType || 'string'; // Ensure it's not undefined
      
      console.log('Processing required error for quick fix:', {
        missingProp,
        parentPath: result.parentPath,
        type: result.type,
        message: result.message
      });
    }
    
    return result
  });
};
