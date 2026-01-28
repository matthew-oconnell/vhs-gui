# Boundary Condition Type Name Hints

This file helps the GUI automatically select the appropriate boundary condition type based on surface tag names.

## Format

```
# Comments start with #
keyword -> boundary_condition_type
```

- **keyword**: A word or phrase (case-insensitive) that might appear in surface tag names
- **boundary_condition_type**: The exact BC type name from the schema

## How It Works

When you create a boundary condition for a surface:
1. The dialog looks at the surface's tag name (e.g., "inlet", "wall", "outlet")
2. It searches this file for matching keywords
3. If a match is found, it automatically selects the corresponding BC type

## Examples

- Surface named "inlet" → auto-selects "subsonic inflow"
- Surface named "outlet" → auto-selects "supersonic outflow"  
- Surface named "wall" → auto-selects "no slip wall"
- Surface named "symmetry" → auto-selects "symmetry"

## Ordering

More specific keywords should come **first** in the file since they're tried in order.

Good:
```
subsonic_outlet -> subsonic outflow
outlet -> supersonic outflow
```

Bad (generic "outlet" would always match first):
```
outlet -> supersonic outflow
subsonic_outlet -> subsonic outflow
```

## Maintenance

When the schema adds new boundary condition types:
1. Add intuitive keyword mappings here
2. Think about common names users might give to surfaces
3. Use underscores or spaces in keywords to match CAD naming conventions
4. Add multiple aliases for the same BC type if needed

## See Also

- `src/frontend/utils/bcTypeHintLoader.ts` - Loads and parses this file
- `docs/whenSchemaChanges.md` - Full documentation on schema-dependent code
