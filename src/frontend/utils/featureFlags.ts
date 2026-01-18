/**
 * Feature flag configuration for controlling UI features and schema property visibility
 */

export interface FeatureFlags {
  // Show advanced features in the UI
  showAdvancedFeatures: boolean;
  
  // Categories to show/hide
  hiddenCategories: string[];
}

// Default feature flag configuration
export const defaultFeatureFlags: FeatureFlags = {
  showAdvancedFeatures: false,
  hiddenCategories: ['developer', 'experimental']
};

// Store the current feature flags
let currentFeatureFlags: FeatureFlags = { ...defaultFeatureFlags };

/**
 * Get the current feature flags
 */
export function getFeatureFlags(): FeatureFlags {
  return { ...currentFeatureFlags };
}

/**
 * Update feature flags
 * @param flags Partial feature flags to update
 */
export function updateFeatureFlags(flags: Partial<FeatureFlags>): void {
  currentFeatureFlags = {
    ...currentFeatureFlags,
    ...flags
  };
}

/**
 * Check if a category is hidden
 * @param category The category to check
 */
export function isCategoryHidden(category: string): boolean {
  return currentFeatureFlags.hiddenCategories.includes(category);
}

/**
 * Check if advanced features should be shown
 */
export function showAdvancedFeatures(): boolean {
  return currentFeatureFlags.showAdvancedFeatures;
}
