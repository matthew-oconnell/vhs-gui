# Feature Tag Metadata

This file provides metadata about feature tags used in the `"only for"` schema field to control visibility of configuration options.

## Purpose

The upstream schema uses `"only for"` arrays to restrict when certain features appear in the GUI. However, the schema doesn't distinguish between:
- **Product tags** (e.g., "vulcan", "hypersolve") - which product families support this feature
- **UI visibility tags** (e.g., "advanced", "experimental") - whether to show/hide by default
- **Tag matching strategy** - whether ALL tags or ANY tag must be enabled

This metadata file provides that additional context without modifying the upstream schema.

## Format

```
# Comments start with #
tag_name = category

[require-all-tags]
feature_name
```

- **tag_name**: The tag from schema's `"only for"` array
- **category**: Either `product` or `visibility`
- **[require-all-tags]**: Section listing features that need ALL product tags enabled

## Examples

```
# Tag definitions
vulcan = product
experimental = visibility

# Features requiring ALL tags
[require-all-tags]
mesh adaptation
```

## Tag Categories

### Product Tags
Tags that identify which product family/solver supports a feature:
- `vulcan` - Vulcan solver features
- `hypersolve` - HyperSolve solver features
- `sketch-2-solution` - Sketch-2-Solution workflow features
- `mhd` - MHD physics features
- `particle` - Particle physics features
- `perfect gas` - Perfect gas model features
- `unsteady` - Unsteady/time-accurate simulation features
- `structured-adaptation` - Structured mesh adaptation features

**Matching behavior:** By default, features with multiple product tags require **ALL** to be enabled (AND logic).

### UI Visibility Tags
Tags intenance

**When the upstream schema adds new tags:**

1. **Add the tag to the file:**
   ```
   new-tag = product    # or = visibility
   ```

2. **If it's a feature that needs ALL tags:**
   ```
   [require-all-tags]
   new feature name
   ```

3. **Update `featureFlags.ts`:** Add to `KNOWN_CATEGORIES` array

4. **Update Settings UI:** Add checkbox in `SettingsDialog.tsx`
2. **Check `"only for"` usage in schema:**
   - If a feature has multiple product tags and should require ALL, add to `[match-strategy: all]`
   - If it should show with ANY tag (unusual), add to `[match-strategy: any]`

3. **Update the Settings UI groups:**
   - Edit `SettingsDialog.tsx` to add new tags to appropriate UI sections
   - See: `docs/whenSchemaChanges.md` for details

## Current Known Issues

- **Mesh Adaptation:** Has `["hypersolve", "vulcan", "sketch-2-solution"]` and requires ALL three
- User expectation: Enabling "vulcan" + "sketch-2-solution" should show mesh adaptation
- Current behavior: Only shows if ALL three are enabled (including hypersolve)

## See Also

- `docs/whenSchemaChanges.md` - Maintenance checklist when schema updates
- `public/bcTypeNameHints.txt` - Similar metadata for boundary condition types
