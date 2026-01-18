import React, { useState } from 'react';
import './ValidationErrorDialog.css';

// Define error item type with path information
interface ErrorItem {
  message: string;
  path?: string; // JSON path to the problematic field
  type?: string; // Type of the expected value (string, number, boolean)
  propertyName?: string; // Name of the property for required fields
  parentPath?: string; // Path to the parent object for required fields
}

interface ValidationErrorDialogProps {
  errors: ErrorItem[];
  onCancel: () => void;
  onContinue: () => void;
  onNavigateToError?: (path: string) => void;
  onQuickFix?: (parentPath: string, propertyName: string, value: any) => void;
  title?: string;
}

const ValidationErrorDialog: React.FC<ValidationErrorDialogProps> = ({
  errors,
  onCancel,
  onContinue,
  onNavigateToError,
  onQuickFix,
  title = 'Validation Errors'
}) => {
  // Track inline edit values
  const [inlineValues, setInlineValues] = useState<Record<string, any>>({});
  // Prevent closing when clicking on the dialog itself
  const handleDialogClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div className="validation-dialog-backdrop" onClick={onCancel}>
      <div className="validation-dialog" onClick={handleDialogClick}>
        <div className="validation-dialog-header">
          <h2>{title}</h2>
        </div>
        
        <div className="validation-dialog-body">
          <p>The configuration has the following validation errors:</p>
          
          <ul className="error-list">
            {errors.map((error, index) => {
              // Check if this is a 'missing required property' that we can fix inline
              const isMissingProperty = error.message.includes('Missing required property') && 
                                        error.propertyName && 
                                        error.parentPath !== undefined && 
                                        onQuickFix;
              
              // For debugging
              if (error.message.includes('Missing required property')) {
                console.log('Missing property error:', {
                  message: error.message,
                  propertyName: error.propertyName,
                  parentPath: error.parentPath,
                  type: error.type || 'string'
                });
              }
              
              // Set up inline editing key
              const editKey = `${error.parentPath}-${error.propertyName}`;
              
              // Initialize the value in our state object if needed
              if (isMissingProperty && !(editKey in inlineValues)) {
                // Set appropriate default values based on type
                if (error.type === 'boolean') {
                  inlineValues[editKey] = false;
                } else if (error.type === 'number') {
                  inlineValues[editKey] = 0;
                } else if (error.type === 'integer') {
                  inlineValues[editKey] = 0;
                } else if (error.type === 'array') {
                  inlineValues[editKey] = [];
                } else if (error.type === 'object') {
                  inlineValues[editKey] = {};
                } else {
                  // Default to empty string for strings and unknown types
                  inlineValues[editKey] = '';
                }
              }
              
              return (
                <li key={index} className={isMissingProperty ? 'with-quick-fix' : ''}>
                  <span className="error-icon">⚠️</span>
                  <div className="error-content">
                    <div className="error-message">
                      {error.path && onNavigateToError ? (
                        <>
                          <strong 
                            className="error-path"
                            onClick={() => onNavigateToError(error.path || '')}
                          >
                            {error.path}:
                          </strong>{' '}
                          {error.message}
                        </>
                      ) : (
                        <strong>{error.message}</strong>
                      )}
                    </div>
                    
                    {isMissingProperty && (
                      <div className="quick-fix-container">
                        <span className="quick-fix-label">Quick fix:</span>
                        {(() => {
                          // Render appropriate input based on type
                          switch(error.type) {
                            case 'boolean':
                              return (
                                <select 
                                  className="quick-fix-input"
                                  value={inlineValues[editKey] ? 'true' : 'false'}
                                  onChange={(e) => {
                                    const newValues = { ...inlineValues };
                                    newValues[editKey] = e.target.value === 'true';
                                    setInlineValues(newValues);
                                  }}
                                >
                                  <option value="true">true</option>
                                  <option value="false">false</option>
                                </select>
                              );
                            
                            case 'number':
                            case 'integer':
                              return (
                                <input 
                                  type="number" 
                                  className="quick-fix-input"
                                  value={inlineValues[editKey]} 
                                  step={error.type === 'integer' ? 1 : 'any'}
                                  onChange={(e) => {
                                    const newValues = { ...inlineValues };
                                    newValues[editKey] = error.type === 'integer' ? 
                                      Math.round(e.target.valueAsNumber || 0) : 
                                      e.target.valueAsNumber || 0;
                                    setInlineValues(newValues);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && onQuickFix && error.propertyName) {
                                      e.preventDefault();
                                      const parentPath = error.parentPath !== undefined ? error.parentPath : '';
                                      onQuickFix(parentPath, error.propertyName, inlineValues[editKey]);
                                    }
                                  }}
                                />
                              );
                            
                            case 'object':
                              return (
                                <div className="quick-fix-complex">
                                  <small>Add an empty object</small>
                                </div>
                              );
                            
                            case 'array':
                              return (
                                <div className="quick-fix-complex">
                                  <small>Add an empty array</small>
                                </div>
                              );
                              
                            default: // string and other types
                              return (
                                <input 
                                  type="text" 
                                  className="quick-fix-input"
                                  value={inlineValues[editKey]} 
                                  placeholder={`Enter ${error.propertyName}`}
                                  onChange={(e) => {
                                    const newValues = { ...inlineValues };
                                    newValues[editKey] = e.target.value;
                                    setInlineValues(newValues);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && onQuickFix && error.propertyName) {
                                      e.preventDefault();
                                      const parentPath = error.parentPath !== undefined ? error.parentPath : '';
                                      console.log(`Enter key pressed: ${error.propertyName} in ${parentPath}`, inlineValues[editKey]);
                                      onQuickFix(parentPath, error.propertyName, inlineValues[editKey]);
                                    }
                                  }}
                                />
                              );
                          }
                        })()}
                        <button 
                          className="quick-fix-button"
                          onClick={() => {
                            if (onQuickFix && error.propertyName) {
                              // Ensure parentPath is defined, using empty string as fallback
                              const parentPath = error.parentPath !== undefined ? error.parentPath : '';
                              console.log(`Quick fix button clicked: ${error.propertyName} in ${parentPath}`, inlineValues[editKey]);
                              onQuickFix(parentPath, error.propertyName, inlineValues[editKey]);
                            } else {
                              console.error('Cannot apply quick fix, missing data:', { 
                                onQuickFix: !!onQuickFix,
                                parentPath: error.parentPath,
                                propertyName: error.propertyName 
                              });
                            }
                          }}
                        >
                          Add
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          
          <p>Do you want to save the file anyway?</p>
        </div>
        
        <div className="validation-dialog-footer">
          <button className="cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="continue" onClick={onContinue}>
            Save Anyway
          </button>
        </div>
      </div>
    </div>
  );
};

export default ValidationErrorDialog;