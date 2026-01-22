"""
ESP Gateway Server

A FastAPI server that interfaces with ESP/pyOCSM to:
1. Load CSM files
2. Build geometry
3. Return tessellated surfaces for visualization

Requires ESP_ROOT environment variable to be set.
"""

import os
import sys
import json
import tempfile
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np

# Check ESP_ROOT before importing pyOCSM
ESP_ROOT = os.environ.get("ESP_ROOT")
if not ESP_ROOT:
    print("WARNING: ESP_ROOT not set. Set it to your ESP installation path.")
    print("Example: export ESP_ROOT=/home/matthew/Projects/vulcan-gui/third-party/ESP128/EngSketchPad")
else:
    # Add ESP Python modules to path (pyOCSM, pyEGADS are in pyESP directory)
    sys.path.insert(0, os.path.join(ESP_ROOT, "pyESP"))
    # Also add lib for shared libraries
    sys.path.insert(0, os.path.join(ESP_ROOT, "lib"))

app = FastAPI(
    title="ESP Gateway Server",
    description="Gateway to ESP/OpenCSM for geometry tessellation",
    version="1.0.0"
)

# CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://127.0.0.1:3000", 
        "http://localhost:5173", 
        "http://127.0.0.1:5173",
        "http://localhost:8080",
        "http://127.0.0.1:8080"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class CSMBuildRequest(BaseModel):
    """Request to build geometry from CSM content"""
    csm_content: str
    tess_params: Optional[dict] = None  # Optional tessellation parameters


class TessellationResponse(BaseModel):
    """Response containing tessellated geometry"""
    success: bool
    message: str
    regions: list  # List of surface regions with vertices/triangles
    parameters: list  # Design parameters from the CSM
    total_vertices: int
    total_faces: int


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    esp_available: bool
    esp_root: Optional[str]
    message: str


class BCNameUpdate(BaseModel):
    """BC name update for a specific face"""
    body: int
    face: int
    bc_name: str


class ExportCSMRequest(BaseModel):
    """Request to export CSM with updated bc_names"""
    csm_content: str
    bc_name_updates: list[BCNameUpdate]


class ExportCSMResponse(BaseModel):
    """Response containing updated CSM content"""
    success: bool
    message: str
    csm_content: str


def check_esp_available() -> bool:
    """Check if ESP/pyOCSM is available"""
    try:
        from pyOCSM import ocsm
        return True
    except ImportError:
        return False


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Check server health and ESP availability"""
    esp_available = check_esp_available()
    return HealthResponse(
        status="ok",
        esp_available=esp_available,
        esp_root=ESP_ROOT,
        message="ESP is available" if esp_available else "ESP/pyOCSM not available - check ESP_ROOT"
    )


@app.post("/csm/build", response_model=TessellationResponse)
async def build_csm(request: CSMBuildRequest):
    """
    Build geometry from CSM content and return tessellation.
    
    The CSM content is written to a temp file, loaded by pyOCSM,
    built, and the resulting tessellation is extracted.
    """
    if not check_esp_available():
        raise HTTPException(
            status_code=503,
            detail="ESP/pyOCSM not available. Set ESP_ROOT environment variable."
        )
    
    try:
        from pyOCSM import ocsm
        from pyEGADS import egads
        
        # Write CSM to temp file (pyOCSM requires file path)
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csm', delete=False) as f:
            f.write(request.csm_content)
            csm_path = f.name
        
        try:
            # Load the CSM file
            modl = ocsm.Ocsm(csm_path)
            
            # Build all geometry
            modl.Build(0, 0)
            
            # Get model info: (nbrch, npmtr, nbody)
            model_info = modl.Info()
            npmtr = model_info[1]
            nbody = model_info[2]
            
            # Extract design parameters
            # GetPmtr returns: (type, nrow, ncol, name)
            parameters = []
            for ipmtr in range(1, npmtr + 1):
                pmtr_info = modl.GetPmtr(ipmtr)
                if pmtr_info[0] == ocsm.DESPMTR:  # Only design parameters
                    nrow = pmtr_info[1]
                    ncol = pmtr_info[2]
                    name = pmtr_info[3]
                    
                    # Get value(s)
                    if nrow == 1 and ncol == 1:
                        value = modl.GetValu(ipmtr, 1, 1)
                        parameters.append({
                            "name": name,
                            "value": value[0],
                            "type": "scalar"
                        })
                    else:
                        # Array parameter
                        values = []
                        for i in range(1, nrow + 1):
                            row = []
                            for j in range(1, ncol + 1):
                                val = modl.GetValu(ipmtr, i, j)
                                row.append(val[0])
                            values.append(row)
                        parameters.append({
                            "name": name,
                            "value": values,
                            "type": "array",
                            "nrow": nrow,
                            "ncol": ncol
                        })
            
            # Extract tessellation from bodies
            # Note: nbody includes intermediate construction bodies (sketches, etc.)
            # Only final bodies have valid tessellation - we need to skip ones that fail
            regions = []
            total_vertices = 0
            total_faces = 0
            
            for ibody in range(1, nbody + 1):
                # Try to get body ego (selector=0) and tessellation ego (selector=1)
                # Many bodies are intermediate construction geometry without tessellation
                try:
                    body_ego = modl.GetEgo(ibody, ocsm.BODY, 0)
                except:
                    continue  # Skip bodies that don't have geometry
                    
                try:
                    tess_ego = modl.GetEgo(ibody, ocsm.BODY, 1)
                except:
                    continue  # Skip bodies without tessellation
                
                if body_ego is None or tess_ego is None:
                    continue
                
                # Get faces from body topology
                try:
                    faces = body_ego.getBodyTopos(egads.FACE)
                    nface = len(faces)
                except:
                    continue
                
                # Get tessellation for each face
                for iface in range(1, nface + 1):
                    try:
                        # getTessFace returns: (xyz, uv, ptype, pindex, tris, tric)
                        # xyz: list of (x,y,z) tuples - vertex coords
                        # tris: list of (v1,v2,v3) tuples - triangle indices (1-based)
                        # tric: list of (n1,n2,n3) tuples - neighbor info (not needed)
                        face_data = tess_ego.getTessFace(iface)
                        
                        xyz = face_data[0]   # List of (x,y,z) tuples
                        tris = face_data[4]  # List of (v1,v2,v3) tuples (1-indexed)
                        
                        if not xyz or not tris:
                            continue
                        
                        nvert = len(xyz)
                        ntri = len(tris)
                        
                        # Convert vertex tuples to flat list of [x,y,z] arrays
                        vertices = []
                        for v in xyz:
                            vertices.append([float(v[0]), float(v[1]), float(v[2])])
                        
                        # Convert triangle tuples to 0-indexed cells
                        cells = []
                        for t in tris:
                            # ESP uses 1-based indexing, convert to 0-based
                            cells.append([int(t[0]) - 1, int(t[1]) - 1, int(t[2]) - 1])
                        
                        # Try to get face name from attributes
                        face_name = f"Body{ibody}_Face{iface}"
                        bc_name = None
                        try:
                            face_ego = faces[iface - 1]  # 0-indexed array
                            
                            # Get _name attribute
                            attr = face_ego.attributeRet("_name")
                            if attr is not None:
                                # attributeRet returns the string directly for string attributes
                                face_name = str(attr)
                            
                            # Try to get bc_name attribute
                            bc_attr = face_ego.attributeRet("bc_name")
                            if bc_attr is not None:
                                # attributeRet returns the string directly for string attributes
                                bc_name = str(bc_attr)
                        except Exception as e:
                            print(f"Warning: Could not get attributes for Body {ibody} Face {iface}: {e}")
                            pass
                        
                        regions.append({
                            "name": face_name,
                            "tag": ibody * 100000 + iface,  # Unique tag (supports 99,999 faces per body)
                            "body": ibody,
                            "face": iface,
                            "vertices": vertices,
                            "cells": cells,
                            "bc_name": bc_name
                        })
                        
                        total_vertices += nvert
                        total_faces += ntri
                        
                    except Exception as e:
                        print(f"Warning: Could not get tessellation for Body {ibody} Face {iface}: {e}")
                        continue
            
            return TessellationResponse(
                success=True,
                message=f"Built {nbody} bodies with {len(regions)} faces",
                regions=regions,
                parameters=parameters,
                total_vertices=total_vertices,
                total_faces=total_faces
            )
            
        finally:
            # Clean up temp file
            os.unlink(csm_path)
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to build CSM: {str(e)}"
        )


@app.post("/csm/update-parameter")
async def update_parameter(request: dict):
    """
    Update a design parameter and rebuild.
    
    This is a placeholder for future parameter modification support.
    """
    raise HTTPException(
        status_code=501,
        detail="Parameter update not yet implemented"
    )


@app.post("/csm/export-with-bc-names", response_model=ExportCSMResponse)
async def export_with_bc_names(request: ExportCSMRequest):
    """
    Export CSM file with updated bc_name attributes.
    
    Takes original CSM content and a list of bc_name updates,
    applies them using pyOCSM attribute manipulation,
    and returns the updated CSM content.
    """
    if not check_esp_available():
        raise HTTPException(
            status_code=503,
            detail="ESP/pyOCSM not available. Set ESP_ROOT environment variable."
        )
    
    try:
        from pyOCSM import ocsm
        from pyEGADS import egads
        
        # Write original CSM to temp file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csm', delete=False) as f:
            f.write(request.csm_content)
            input_path = f.name
        
        # Output path for modified CSM
        output_path = input_path.replace('.csm', '_updated.csm')
        
        try:
            # Load the CSM
            modl = ocsm.Ocsm(input_path)
            
            # Build geometry
            modl.Build(0, 0)
            
            # Update bc_name attributes for each face
            for update in request.bc_name_updates:
                try:
                    # Get the body EGO
                    body_ego = modl.GetEgo(update.body, ocsm.BODY, 0)
                    if body_ego is None:
                        print(f"Warning: Body {update.body} not found, skipping")
                        continue
                    
                    # Get the specific face
                    faces = body_ego.getBodyTopos(egads.FACE)
                    if update.face < 1 or update.face > len(faces):
                        print(f"Warning: Face {update.face} not found in body {update.body}, skipping")
                        continue
                    
                    face_ego = faces[update.face - 1]  # Faces are 1-indexed in ESP
                    
                    # Set the bc_name attribute on the face
                    face_ego.attributeSet("bc_name", egads.ATTRSTRING, update.bc_name)
                    
                except Exception as e:
                    print(f"Warning: Failed to update face {update.body}/{update.face}: {e}")
                    continue
            
            # Save the model with updated attributes
            # pyOCSM doesn't have a direct "save" that preserves attributes in CSM text,
            # so we need to reconstruct the CSM with updated attributes
            
            # Read the original CSM and update bc_name attributes via text replacement
            lines = request.csm_content.split('\n')
            updated_lines = []
            
            # Build a map of (body, face) -> bc_name from updates
            bc_map = {(u.body, u.face): u.bc_name for u in request.bc_name_updates}
            
            current_body = 1  # Track which body we're in
            i = 0
            
            while i < len(lines):
                line = lines[i]
                trimmed = line.strip()
                
                # Check for select face statement
                select_match = None
                if trimmed:
                    import re
                    select_match = re.match(r'^select\s+face\s+(\d+)', trimmed, re.IGNORECASE)
                
                if select_match:
                    face_num = int(select_match.group(1))
                    updated_lines.append(line)
                    
                    # Check if next line is existing bc_name attribute
                    if i + 1 < len(lines):
                        next_trimmed = lines[i + 1].strip()
                        if re.match(r'^attribute\s+bc_name', next_trimmed, re.IGNORECASE):
                            i += 1  # Skip existing bc_name
                    
                    # Add updated bc_name if we have one
                    bc_name = bc_map.get((current_body, face_num))
                    if bc_name:
                        indent = re.match(r'^(\s*)', line).group(1) if re.match(r'^(\s*)', line) else ''
                        updated_lines.append(f"{indent}attribute bc_name ${bc_name}")
                else:
                    updated_lines.append(line)
                
                i += 1
            
            updated_content = '\n'.join(updated_lines)
            
            return ExportCSMResponse(
                success=True,
                message=f"Updated {len(request.bc_name_updates)} bc_name attributes",
                csm_content=updated_content
            )
            
        finally:
            # Clean up temp files
            import os
            if os.path.exists(input_path):
                os.unlink(input_path)
            if os.path.exists(output_path):
                os.unlink(output_path)
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to export CSM: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    
    print("=" * 60)
    print("ESP Gateway Server")
    print("=" * 60)
    print(f"ESP_ROOT: {ESP_ROOT or 'NOT SET'}")
    print(f"ESP Available: {check_esp_available()}")
    print("=" * 60)
    
    uvicorn.run(app, host="127.0.0.1", port=8081)
