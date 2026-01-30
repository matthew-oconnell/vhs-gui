# VHS GUI

A web-based graphical user interface for setting up and configuring Computational Fluid Dynamics (CFD) simulations. The application provides intuitive visual interactions for mesh visualization, boundary condition assignment, and comprehensive simulation setup driven by JSON schemas.

## Core Objectives

- **Interactive 3D Mesh Visualization**: Intuitive navigation and manipulation of CFD mesh tags
- **Boundary Condition Configuration**: Visual selection of mesh tags and boundary condition assignment
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
- Multi-format mesh loading via backend (OBJ, STL, meshb, egads, csm)
- Tag selection via mouse clicking
- Visual highlighting of selected tags
- Color-coded mesh regions based on boundary conditions
- Camera presets and reset functionality

✅ **Mesh & Tag Management**
- Load mesh files via C++ backend (.obj, .stl, .meshb, .egads, .csm)
- Automatic tag detection and naming
- Visual tag highlighting on selection
- Boundary condition assignment workflow
- Tag metadata tracking

✅ **Boundary Condition Configuration**
- Create boundary conditions with type-specific wizards
- State-based BC configuration (Dirichlet, Riemann, etc.)
- Wall temperature settings for viscous wall types
- Tag selection and assignment
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

## Architecture

**Single-Server Design**: The C++ backend serves both the React frontend (static files) AND the mesh processing API. Users run one server on port 8080.

**Critical Requirement**: The C++ server is **required** for all mesh loading. The browser cannot parse mesh files - all mesh processing happens via the backend API.

**Supported Formats**:
- `.obj` - Wavefront OBJ (implemented, tested)
- `.stl` - STereoLithography (implemented, tested)
- `.meshb`, `.egads`, `.csm` - Proprietary CFD formats (placeholders for future implementation)

## Getting Started

### Prerequisites

- **Node.js 18+** and npm (for building frontend only)
- **CMake 3.15+** and C++17 compiler (for server)
- **Git** for version control

### Quick Start

```bash
# Clone and build everything
git clone https://github.com/matthew-oconnell/vhs-gui.git
cd vhs-gui
./build.sh

# Start the server
npm run start

# Or manually:
cd server/build
./vulcan_server
# Visit http://127.0.0.1:8080
```

**That's it! One build script, one server, zero hassle.**

### Development Workflow

#### Common Commands

```bash
# Build everything from scratch
./build.sh
# OR: npm run build:full

# Start the server (after building)
npm run start

# Quick frontend rebuild (after React changes)
npm run build:frontend

# Create distribution package for end users
npm run dist

# Run tests
npm test
npm run test:run      # Run once (CI mode)
npm run test:coverage # With coverage report
```

#### Development Mode

For active development, you can use hot-reload:

```bash
# Terminal 1: Start backend server
cd server/build
./vulcan_server

# Terminal 2: Start Vite dev server with hot-reload
npm run dev
# Visit http://localhost:5173
```

**Note:** Dev mode (`npm run dev`) uses Vite's dev server with hot-reload but requires the backend running separately for mesh loading.

**Workflow:**
- ✅ One server (port 8080)
- ✅ Fast rebuilds (~2-3 seconds)
- ✅ No port juggling
- ❌ No hot module reload (must manually refresh browser)

#### Advanced Development (Hot Reload)

If you need instant hot reloading:

```bash
# Terminal 1: C++ backend (API only)
cd server/build
./vulcan_server

# Terminal 2: Vite dev server (React with HMR)
npm run dev

# Visit: http://localhost:5173 (Vite dev server)
```

**Trade-offs:**
- ✅ Instant hot reload
- ✅ React Fast Refresh
- ⚠️ Must configure VITE_API_URL=http://127.0.0.1:8080 in .env
- ❌ Two servers to manage
- ❌ CORS complexity

### Scripts

| Script | Purpose |
|--------|---------|
| `./build-production.sh` | Full build (React + C++) |
| `./rebuild-frontend.sh` | Quick React-only rebuild |
| `npm run dev` | Vite dev server (optional) |

### Typical Session

```bash
# First time setup
./build-production.sh
cd server/build
./vulcan_server

# Open http://127.0.0.1:8080
# Edit src/App.tsx
# Rebuild + restart:
./rebuild-frontend.sh && pkill vulcan_server && ./vulcan_server
```

### Backend Server Features

The C++ backend provides:
- **Fast mesh parsing** for large files (C++ performance vs JavaScript)
- **Support for additional formats**: .meshb, .egads, .csm (placeholders ready for integration)
- **Session-based uploads** for managing multiple mesh files
- **RESTful API** for mesh operations

See [server/README.md](server/README.md) for full API documentation.

### Environment Configuration

Create a `.env` file (or copy `.env.example`):

```bash
# Backend API URL (default: http://127.0.0.1:8080)
VITE_API_URL=http://127.0.0.1:8080
```

## Architecture

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
              ┌────────────┴────────────┐
              ↓                         ↓
     ┌────────────────┐        ┌───────────────┐
     │ JSON Schema    │        │  Backend API  │
     │  Validation    │        │  (REQUIRED)   │
     └────────────────┘        └───────────────┘
                                        │
                                        ↓
                               ┌─────────────────┐
                               │  C++ Server     │
                               │  - Mesh Parser  │
                               │  - File Upload  │
                               │  - Conversion   │
                               │  - Static Files │
                               └─────────────────┘
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

**Schema Files**: JSON Schema definitions (src/frontend/public/schemas/input.schema.json)
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
- See [docs/whenSchemaChanges.md](docs/whenSchemaChanges.md) for maintenance checklist
- Update hardcoded type arrays (BC types, init region types, viz types)
- See [AGENTS.md](AGENTS.md) for AI collaboration guidelines

## User Workflows

### Loading and Inspecting a Mesh
1. Click **File → Open Mesh** and select an STL file
2. Mesh renders in 3D viewport
3. Tags detected and listed in Tags panel
4. Explore mesh using camera controls

### Setting Boundary Conditions
1. Select a tag in the 3D viewer or Tags panel
2. Click **Create Boundary Condition**
3. Choose BC type from dropdown
4. Configure BC-specific parameters (state, wall temperature, etc.)
5. Assign to selected tags
6. Tag updates with visual color coding

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
- [ ] Results preview and post-processing

### Build

```bash
# Create production build
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
vhs-gui/
├── src/
│   ├── frontend/               # React application
│   │   ├── components/         # UI components
│   │   ├── store/             # State management
│   │   ├── utils/             # Helper functions & tests
│   │   ├── types/             # TypeScript definitions
│   │   ├── App.tsx            # Main app
│   │   ├── main.tsx           # Entry point
│   │   ├── index.html         # Vite entry point
│   │   ├── package.json       # npm dependencies
│   │   ├── vite.config.ts     # Vite build config
│   │   ├── tsconfig.json      # TypeScript config
│   │   └── tsconfig.node.json # TypeScript config for Vite
│   ├── server/                # C++ backend
│   │   ├── src/               # C++ source
│   │   ├── tests/             # C++ tests
│   │   ├── build/             # CMake build output
│   │   └── CMakeLists.txt     # Build configuration
│   └── scripts/               # Build scripts
│       ├── rebuild-frontend.sh
│       └── create-distribution.sh
├── public/                    # Static assets
├── docs/                      # Documentation
├── build.sh                   # Main build script
├── AGENTS.md                  # AI development guidelines
└── README.md
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
- [ ] Tag selection and highlighting
- [ ] Color-coded mesh regions

### Data Management
- [ ] State management with Zustand
- [ ] JSON schema validation
- [ ] Import/export configuration files
- [ ] Undo/redo functionality

## License

TBD
