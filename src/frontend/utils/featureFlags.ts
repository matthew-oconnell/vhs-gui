/**
 * Feature flag configuration for controlling UI features and schema property visibility
 */

export interface FeatureFlags {
  // Categories that are enabled (shown)
  enabledCategories: Set<string>;
}

// All known categories from the schema
export const KNOWN_CATEGORIES = [
  'vulcan',
  'hypersolve',
  'developer',
  'experimental',
  'mhd',
  'particle',
  'perfect gas',
  'unsteady',
  'sketch-2-solution',
  'structured-adaptation'
] as const;

// Default feature flag configuration
// By default, only 'vulcan' is enabled
export const defaultFeatureFlags: FeatureFlags = {
  enabledCategories: new Set(['vulcan'])
};

// Store the current feature flags
let currentFeatureFlags: FeatureFlags = {
  enabledCategories: new Set(defaultFeatureFlags.enabledCategories)
};

// Listeners for feature flag changes
type FeatureFlagListener = () => void;
const listeners: Set<FeatureFlagListener> = new Set();

/**
 * Subscribe to feature flag changes
 */
export function subscribeToFeatureFlags(listener: FeatureFlagListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Notify all listeners of feature flag changes
 */
function notifyListeners(): void {
  listeners.forEach(listener => listener());
}

// Load saved feature flags from localStorage
const savedFlags = localStorage.getItem('featureFlags');
if (savedFlags) {
  try {
    const parsed = JSON.parse(savedFlags);
    if (parsed.enabledCategories && Array.isArray(parsed.enabledCategories)) {
      currentFeatureFlags.enabledCategories = new Set(parsed.enabledCategories);
    }
  } catch (e) {
    console.error('Failed to load feature flags from localStorage', e);
  }
}

/**
 * Get the current feature flags
 */
export function getFeatureFlags(): FeatureFlags {
  return {
    enabledCategories: new Set(currentFeatureFlags.enabledCategories)
  };
}

/**
 * Update feature flags and save to localStorage
 * @param flags Partial feature flags to update
 */
export function updateFeatureFlags(flags: Partial<FeatureFlags>): void {
  if (flags.enabledCategories) {
    currentFeatureFlags.enabledCategories = new Set(flags.enabledCategories);
  }
  
  // Save to localStorage
  localStorage.setItem('featureFlags', JSON.stringify({
    enabledCategories: Array.from(currentFeatureFlags.enabledCategories)
  }));
  
  // Notify listeners
  notifyListeners();
}

/**
 * Check if a category is enabled
 * @param category The category to check
 */
export function isCategoryEnabled(category: string): boolean {
  return currentFeatureFlags.enabledCategories.has(category);
}

/**
 * Check if a category is hidden (inverse of enabled)
 * @param category The category to check
 */
export function isCategoryHidden(category: string): boolean {
  return !isCategoryEnabled(category);
}

/**
 * Toggle a category on or off
 * @param category The category to toggle
 */
export function toggleCategory(category: string): void {
  if (currentFeatureFlags.enabledCategories.has(category)) {
    currentFeatureFlags.enabledCategories.delete(category);
  } else {
    currentFeatureFlags.enabledCategories.add(category);
  }
  
  // Save to localStorage
  localStorage.setItem('featureFlags', JSON.stringify({
    enabledCategories: Array.from(currentFeatureFlags.enabledCategories)
  }));
  
  // Notify listeners
  notifyListeners();
}
