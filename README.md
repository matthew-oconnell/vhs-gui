# Vulcan CFD GUI

A web-based graphical user interface for setting up and configuring Computational Fluid Dynamics (CFD) simulations. The application provides intuitive visual interactions for mesh visualization, boundary condition assignment, and comprehensive simulation setup driven by JSON schemas.

## Core Objectives

- **Interactive 3D Mesh Visualization**: Intuitive navigation and manipulation of CFD surface meshes
- **Boundary Condition Configuration**: Visual selection of mesh surfaces and boundary condition assignment
- **Comprehensive Simulation Setup**: Complete interface for configuring all aspects of CFD simulations
- **Schema-Driven Configuration**: Auto-generated UI elements based on JSON schemas and defaults

## Features

✅ **Resizable 3-Panel Layout**
- Left panel with configuration tree (top) and property editor (bottom)
- Large right panel for 3D mesh visualization
- Click and drag resize handles to adjust panel sizes

✅ **Configuration Tree View**
- Hierarchical view of the CFD simulation configuration
- Expandable/collapsible nodes
- Click to select and edit properties

✅ **Property Editor**
- Dynamic forms for editing selected configuration
- Sample form controls (dropdowns, inputs, checkboxes)
- Action buttons for save/reset

✅ **3D Viewport**
- WebGL-powered 3D rendering using Three.js and React Three Fiber
- Interactive camera controls:
  - Left-click + drag to rotate (orbit)
  - Right-click + drag to pan
  - Scroll to zoom
- STL mesh file loading and visualization
- Surface selection via mouse clicking
- Visual highlighting of selected surfaces
- Color-coded mesh regions based on boundary conditions
- Camera presets and reset functionality

✅ **Mesh & Surface Management**
- Load STL mesh files (ASCII and binary formats)
- Automatic surface detection and naming
- Visual surface highlighting on selection
- Boundary condition assignment workflow
- Surface metadata tracking

✅ **Boundary Condition Configuration**
- Create boundary conditions with type-specific wizards
- State-based BC configuration (Dirichlet, Riemann, etc.)
- Wall temperature settings for viscous wall types
- Surface selection and assignment
- Visual feedback in 3D viewer

✅ **Additional Features**
- Initialization regions (box, sphere, cylinder, etc.)
- Visualization probes (point, line, plane, sphere, boundary, volume)
- New project wizard for quick setup
- JSON schema validation
- File save/load functionality
- Settings management

## Tech Stack

- **React 18** with TypeScript
- **Three.js** via React Three Fiber for 3D rendering
- **Vite** for fast development and building
- **react-resizable-panels** for resizable layout
- **Lucide React** for icons

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation
Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Web Application                         │
├──────────────┬──────────────────────┬───────────────────────┤
│  Tree Panel  │   Editor Panel       │   3D Viewer Panel     │
│              │                      │                       │
│  - JSON tree │   - Dynamic forms    │   - WebGL rendering   │
│  - Navigation│   - BC editor        │   - Mesh interaction  │
│  - Search    │   - State wizard     │   - Selection         │
└──────────────┴──────────────────────┴───────────────────────┘
                           │
                           ↓
                  ┌────────────────┐
                  │  State Store   │
                  │   (Zustand)    │
                  └────────────────┘
                           │
                           ↓
                  ┌────────────────┐
                  │ JSON Schema    │
                  │  Validation    │
                  └────────────────┘
```

### Data Model

**Configuration JSON**: Single source of truth for simulation parameters
- Schema-validated structure
- Boundary condition definitions
- Solver settings, material properties, initial conditions
- Initialization regions and visualization probes

**Surface Metadata**: Per-surface boundary conditions and region identifiers
- Boundary condition assignments
- Surface names and IDs
- Visual properties

**Schema Files**: JSON Schema definitions (input.schema.json)
- Configuration structure validation
- Default values specification
- UDevelopment

### Testing

This project uses **Vitest** and **React Testing Library** for testing. See [AGENTS.md](AGENTS.md) for TDD guidelines.

```bash
# Run tests in watch mode
npm test

# Run tests once
npm run test:run

# Run with coverage
npm run test:coverage

# Run with UI
npm run test:ui
```

### Schema Maintenance

The GUI is driven by `input.schema.json`. When the schema changes:
- See [whenSchemaChanges.md](whenSchemaChanges.md) for maintenance checklist
- Update hardcoded type arrays (BC types, init region types, viz types)
- See [AGENTS.md](AGENTS.md) for AI collaboration guidelines

### Wizard Format

For creating new configuration wizards, see [WIZARD_FORMAT.md](WIZARD_FORMAT.md) for the declarative JSON format specification.

## User Workflows

### Loading and Inspecting a Mesh
1. Click **File → Open Mesh** and select an STL file
2. Mesh renders in 3D viewport
3. Surfaces detected and listed in Surfaces panel
4. Explore mesh using camera controls

### Setting Boundary Conditions
1. Select a surface in the 3D viewer or Surfaces panel
2. Click **Create Boundary Condition**
3. Choose BC type from dropdown
4. Configure BC-specific parameters (state, wall temperature, etc.)
5. Assign to selected surfaces
6. Surface updates with visual color coding

### Configuring Simulation Parameters
1. Navigate tree panel to a configuration section
2. Editor panel displays current values
3. Modify parameters with real-time validation
4. Use State Wizard for complex state definitions
5. Add initialization regions and visualization probes

### Exporting Configuration
1. Click **File → Save**
2. Configuration validated against schema
3. JSON file written to disk
4. Ready for CFD solver consumption

## Roadmap

### Immediate Priorities
- [ ] Enhanced mesh loading (.csm, .egads, .meshb formats)
- [ ] Dynamic schema parsing to eliminate hardcoded BC types
- [ ] Auto-save with dirty state tracking
- [ ] Undo/redo functionality

### Future Enhancements
- [ ] Configuration templates for common cases
- [ ] Mesh quality visualization
- [ ] Multi-mesh support
- [ ] Solver integration and job monitoring
- [ ] Results preview and post-processing             # Toast notifications
│   ├── store/
│   │   └── appStore.ts                   # Zustand state management
│   ├── utils/
│   │   ├── fileUtils.ts                  # File I/O operations
│   │   ├── meshLoader.ts                 # STL mesh loading
│   │   ├── schemaParser.ts               # Schema parsing utilities
│   │   ├── schemaValidator.ts            # JSON validation
│   │   ├── configTransform.ts            # Data transformations
│   │   └── __tests__/                    # Unit tests
│   ├── types/                            # TypeScript type definitions
│   ├── App.tsx                           # Main app with resizable layout
│   ├── main.tsx                          # Entry point
│   └── index.css                         # Global styles
├── public/
│   └── input.schema.json                 # CFD configuration schema
├── AGENTS.md                             # AI development guidelines
├── whenSchemaChanges.md                  # Schema maintenance checklist
├── WIZARD_FORMAT.md                      # Wizard JSON specification

### Build

```bash
# Create production build
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
vulcan-gui/
├── src/
│   ├── components/
│   │   ├── TreePanel/          # Configuration tree view
│   │   ├── EditorPanel/        # Property editor
│   │   └── Viewport3D/         # 3D mesh viewer
│   ├── App.tsx                 # Main app with layout
│   ├── App.css                 # Layout styles
│   ├── main.tsx                # Entry point
│   └── index.css               # Global styles
├── public/                     # Static assets
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## Next Steps

### WebAssembly Integration
- [ ] Set up Emscripten for C++ compilation
- [ ] Create mesh reader module
- [ ] Integrate WASM with React app
- [ ] Load real CFD mesh files

### UI Enhancements
- [ ] Implement JSON schema-based form generation
- [ ] Add boundary condition assignment workflow
- [ ] Surface selection and highlighting
- [ ] Color-coded mesh regions

### Data Management
- [ ] State management with Zustand
- [ ] JSON schema validation
- [ ] Import/export configuration files
- [ ] Undo/redo functionality

## License

TBD
