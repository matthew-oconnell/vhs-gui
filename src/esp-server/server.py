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


if __name__ == "__main__":
    import uvicorn
    
    print("=" * 60)
    print("ESP Gateway Server")
    print("=" * 60)
    print(f"ESP_ROOT: {ESP_ROOT or 'NOT SET'}")
    print(f"ESP Available: {check_esp_available()}")
    print("=" * 60)
    
    uvicorn.run(app, host="127.0.0.1", port=8081)
