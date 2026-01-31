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
import base64
import re
import io
import threading
import queue
import select
from contextlib import redirect_stdout, redirect_stderr
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
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

# CORS for frontend access (including Tauri)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://127.0.0.1:3000", 
        "http://localhost:5173", 
        "http://127.0.0.1:5173",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "tauri://localhost",  # Tauri desktop app
        "https://tauri.localhost"  # Tauri alternative origin
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
    build_log: list[str] = []  # Captured stdout/stderr during build


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


class CSMBuildWithDepsRequest(BaseModel):
    """Request to build geometry from CSM with dependency files"""
    csm_content: str
    dependencies: dict[str, str]  # filename -> base64 encoded content
    tess_params: Optional[dict] = None


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


@app.post("/csm/build-with-deps-stream")
async def build_csm_with_deps_stream(request: CSMBuildWithDepsRequest):
    """
    Build geometry from CSM with streaming output (Server-Sent Events).
    Yields progress updates line-by-line as pyOCSM generates them.
    """
    if not check_esp_available():
        raise HTTPException(
            status_code=503,
            detail="ESP/pyOCSM not available. Set ESP_ROOT environment variable."
        )
    
    async def event_generator():
        try:
            from pyOCSM import ocsm
            from pyEGADS import egads
            
            # Create temp directory for CSM and dependencies
            tmpdir = tempfile.mkdtemp(prefix='csm_build_')
            
            try:
                # Write dependency files
                for filename, base64_content in request.dependencies.items():
                    dep_path = os.path.join(tmpdir, filename)
                    file_content = base64.b64decode(base64_content)
                    with open(dep_path, 'wb') as f:
                        f.write(file_content)
                    
                    msg = json.dumps({"type": "log", "message": f"Dependency: {filename} ({len(file_content)} bytes)"})
                    yield f"data: {msg}\n\n"
                
                # Process CSM content (replace import paths)
                modified_csm_content = request.csm_content
                store_pattern = r'^\s*store\s+(\S+)'
                stored_objects = set(re.findall(store_pattern, request.csm_content, flags=re.IGNORECASE|re.MULTILINE))
                
                for filename in request.dependencies.keys():
                    abs_path = os.path.join(tmpdir, filename)
                    # Match both quoted and unquoted filenames: import "file.step" or import file.step
                    escaped_filename = re.escape(filename)
                    import_pattern = r'(import\s+)"?' + escaped_filename + r'"?'
                    modified_csm_content = re.sub(import_pattern, r'\1' + abs_path, modified_csm_content, flags=re.IGNORECASE)
                    
                    basename = os.path.basename(filename)
                    if basename not in stored_objects:
                        restore_pattern = r'(restore\s+)"?' + escaped_filename + r'"?'
                        modified_csm_content = re.sub(restore_pattern, r'\1' + abs_path, modified_csm_content, flags=re.IGNORECASE)
                
                # Write CSM file
                csm_path = os.path.join(tmpdir, 'main.csm')
                with open(csm_path, 'w') as f:
                    f.write(modified_csm_content)
                
                msg = json.dumps({"type": "log", "message": "Building geometry..."})
                yield f"data: {msg}\n\n"
                
                # Create pipe for capturing output
                read_fd, write_fd = os.pipe()
                output_queue = queue.Queue()
                
                # Thread to read from pipe and put lines in queue
                def read_output():
                    try:
                        os.set_blocking(read_fd, False)  # Non-blocking reads
                        buffer = ""
                        while True:
                            try:
                                chunk = os.read(read_fd, 4096).decode('utf-8', errors='replace')
                                if not chunk:
                                    break
                                buffer += chunk
                                while '\n' in buffer:
                                    line, buffer = buffer.split('\n', 1)
                                    if line.strip():
                                        output_queue.put(line)
                            except BlockingIOError:
                                # No data available, sleep briefly
                                import time
                                time.sleep(0.01)
                        # Put remaining buffer
                        if buffer.strip():
                            output_queue.put(buffer)
                        output_queue.put(None)  # Signal completion
                    finally:
                        os.close(read_fd)
                
                reader_thread = threading.Thread(target=read_output, daemon=True)
                reader_thread.start()
                
                # Redirect stdout/stderr to pipe
                stdout_fd = sys.stdout.fileno()
                stderr_fd = sys.stderr.fileno()
                stdout_dup = os.dup(stdout_fd)
                stderr_dup = os.dup(stderr_fd)
                
                sys.stdout.flush()
                sys.stderr.flush()
                os.dup2(write_fd, stdout_fd)
                os.dup2(write_fd, stderr_fd)
                os.close(write_fd)
                
                # Build in background thread
                build_error = [None]
                build_result = [None]
                
                def build_model():
                    try:
                        modl = ocsm.Ocsm(csm_path)
                        modl.Build(0, 0)
                        build_result[0] = modl
                    except Exception as e:
                        build_error[0] = str(e)
                
                build_thread = threading.Thread(target=build_model, daemon=True)
                build_thread.start()
                
                # Stream output lines as they arrive
                while True:
                    try:
                        line = output_queue.get(timeout=0.1)
                        if line is None:  # Reader thread finished
                            break
                        # Send line as SSE event
                        msg = json.dumps({"type": "log", "message": line})
                        yield f"data: {msg}\n\n"
                    except queue.Empty:
                        if not build_thread.is_alive():
                            break
                
                # Wait for build thread to complete
                build_thread.join(timeout=5)
                
                # Restore stdout/stderr (this closes the pipe write end)
                sys.stdout.flush()
                sys.stderr.flush()
                os.dup2(stdout_dup, stdout_fd)
                os.dup2(stderr_dup, stderr_fd)
                os.close(stdout_dup)
                os.close(stderr_dup)
                
                # Now wait for reader to finish reading remaining output
                reader_thread.join(timeout=2)
                
                # Drain any remaining messages from queue
                while True:
                    try:
                        line = output_queue.get_nowait()
                        if line is None:
                            break
                        msg = json.dumps({"type": "log", "message": line})
                        yield f"data: {msg}\n\n"
                    except queue.Empty:
                        break
                
                if build_error[0]:
                    msg = json.dumps({"type": "error", "message": str(build_error[0])})
                    yield f"data: {msg}\n\n"
                    return
                
                modl = build_result[0]
                if not modl:
                    msg = json.dumps({"type": "error", "message": "Build failed"})
                    yield f"data: {msg}\n\n"
                    return
                
                # Extract tessellation
                model_info = modl.Info()
                nbody = model_info[2]
                
                msg = json.dumps({"type": "log", "message": f"Processing {nbody} bodies..."})
                yield f"data: {msg}\n\n"
                
                regions = []
                for ibody in range(1, nbody + 1):
                    try:
                        body_ego = modl.GetEgo(ibody, ocsm.BODY, 0)
                        tess_ego = modl.GetEgo(ibody, ocsm.BODY, 1)
                        if not body_ego or not tess_ego:
                            continue
                        
                        faces = body_ego.getBodyTopos(egads.FACE)
                        nface = len(faces)
                        
                        for iface in range(1, nface + 1):
                            try:
                                face_data = tess_ego.getTessFace(iface)
                                xyz = face_data[0]
                                tris = face_data[4]
                                
                                if not xyz or not tris:
                                    continue
                                
                                vertices = [[float(v[0]), float(v[1]), float(v[2])] for v in xyz]
                                cells = [[int(t[0]-1), int(t[1]-1), int(t[2]-1)] for t in tris]
                                
                                bc_name = None
                                try:
                                    face_ego = faces[iface - 1]
                                    # attributeRet("bc_name") returns the string directly
                                    bc_attr = face_ego.attributeRet("bc_name")
                                    if bc_attr is not None:
                                        bc_name = str(bc_attr)
                                except Exception as e:
                                    # Silent fail - bc_name will be None
                                    pass
                                
                                regions.append({
                                    "name": f"Body{ibody}_Face{iface}",
                                    "tag": (ibody - 1) * 1000 + iface,  # Unique tag per face
                                    "body": ibody,
                                    "face": iface,
                                    "vertices": vertices,
                                    "cells": cells,
                                    "bc_name": bc_name
                                })
                            except:
                                continue
                    except:
                        continue
                
                # Send final result
                result = {
                    "type": "complete",
                    "data": {
                        "success": True,
                        "message": f"Built {nbody} bodies with {len(regions)} faces",
                        "regions": regions,
                        "parameters": [],
                        "total_vertices": sum(len(r['vertices']) for r in regions),
                        "total_faces": sum(len(r['cells']) for r in regions)
                    }
                }
                yield f"data: {json.dumps(result)}\n\n"
                
            finally:
                # Clean up temp directory
                import shutil
                shutil.rmtree(tmpdir, ignore_errors=True)
                
        except Exception as e:
            msg = json.dumps({"type": "error", "message": str(e)})
            yield f"data: {msg}\n\n"
    
    return StreamingResponse(
        event_generator(), 
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "*"
        }
    )


@app.post("/csm/build-with-deps", response_model=TessellationResponse)
async def build_csm_with_deps(request: CSMBuildWithDepsRequest):
    """
    Build geometry from CSM content with dependency files (e.g., imported .stp files).
    
    The CSM and all dependency files are written to the same temp directory,
    allowing relative import statements to resolve correctly.
    """
    if not check_esp_available():
        raise HTTPException(
            status_code=503,
            detail="ESP/pyOCSM not available. Set ESP_ROOT environment variable."
        )
    
    try:
        from pyOCSM import ocsm
        from pyEGADS import egads
        
        # Capture stdout and stderr during build
        stdout_capture = io.StringIO()
        stderr_capture = io.StringIO()
        build_log = []
        
        # Create temp directory for CSM and dependencies
        tmpdir = tempfile.mkdtemp(prefix='csm_build_')
        
        try:
            # Write all dependency files FIRST
            for filename, base64_content in request.dependencies.items():
                dep_path = os.path.join(tmpdir, filename)
                
                # Decode base64 content
                file_content = base64.b64decode(base64_content)
                
                # Write as binary (works for both text and binary files)
                with open(dep_path, 'wb') as f:
                    f.write(file_content)
                
                print(f"[ESP] Dependency written: {dep_path} ({len(file_content)} bytes)")
                build_log.append(f"Dependency written: {filename} ({len(file_content)} bytes)")
                
                # Verify file exists and is readable
                if os.path.exists(dep_path):
                    file_size = os.path.getsize(dep_path)
                    print(f"[ESP]   Verified: {dep_path} exists ({file_size} bytes)")
                else:
                    print(f"[ESP]   ERROR: {dep_path} does not exist after writing!")
            
            # Replace relative import paths with absolute paths in CSM content
            # This ensures EGADS can find the files
            modified_csm_content = request.csm_content
            
            # First extract 'store' statements to identify internal objects vs. file dependencies
            store_pattern = r'^\s*store\s+(\S+)'
            stored_objects = set(re.findall(store_pattern, request.csm_content, flags=re.IGNORECASE|re.MULTILINE))
            print(f"[ESP] Identified stored objects: {stored_objects}")
            
            # Now process dependencies
            for filename in request.dependencies.keys():
                abs_path = os.path.join(tmpdir, filename)
                
                # 1. Always update import statements with absolute paths
                # Match both quoted and unquoted filenames: import "file.step" or import file.step
                escaped_filename = re.escape(filename)
                import_pattern = r'(import\s+)\"?' + escaped_filename + r'\"?'
                modified_csm_content = re.sub(import_pattern, r'\1' + abs_path, modified_csm_content, flags=re.IGNORECASE)
                print(f"[ESP] Replaced 'import {filename}' with 'import {abs_path}' in CSM")
                
                # 2. Only update restore statements for actual files, not internal objects
                basename = os.path.basename(filename)
                if basename not in stored_objects:  # Skip if this is a stored object name
                    restore_pattern = r'(restore\s+)\"?' + escaped_filename + r'\"?'
                    modified_csm_content = re.sub(restore_pattern, r'\1' + abs_path, modified_csm_content, flags=re.IGNORECASE)
                    print(f"[ESP] Replaced 'restore {filename}' with 'restore {abs_path}' in CSM")
                else:
                    print(f"[ESP] Preserving 'restore {filename}' as it matches a stored object name")
            
            # Write modified CSM file
            csm_path = os.path.join(tmpdir, 'main.csm')
            with open(csm_path, 'w') as f:
                f.write(modified_csm_content)
            
            print(f"[ESP] CSM written to: {csm_path}")
            
            # List all files in temp directory for debugging
            print(f"[ESP] Temp directory contents:")
            for item in os.listdir(tmpdir):
                item_path = os.path.join(tmpdir, item)
                size = os.path.getsize(item_path)
                print(f"[ESP]   - {item} ({size} bytes)")
            
            # Capture pyOCSM/EGADS output using OS-level file descriptor redirection
            # (pyOCSM is a C extension that writes directly to stdout/stderr, bypassing Python's sys.stdout)
            build_log.append("Building geometry...")
            print("[ESP] Starting pyOCSM build...")
            
            # Create temp file to capture output
            output_fd, output_path = tempfile.mkstemp(suffix='.log', text=True)
            
            # Save original stdout/stderr file descriptors
            stdout_fd = sys.stdout.fileno()
            stderr_fd = sys.stderr.fileno()
            stdout_dup = os.dup(stdout_fd)
            stderr_dup = os.dup(stderr_fd)
            
            try:
                # Flush Python's buffers before redirecting
                sys.stdout.flush()
                sys.stderr.flush()
                
                # Redirect stdout and stderr to temp file
                os.dup2(output_fd, stdout_fd)
                os.dup2(output_fd, stderr_fd)
                
                # Build the model (output goes to temp file)
                modl = ocsm.Ocsm(csm_path)
                modl.Build(0, 0)
                
                # Flush to temp file and restore original stdout/stderr immediately
                sys.stdout.flush()
                sys.stderr.flush()
                os.dup2(stdout_dup, stdout_fd)
                os.dup2(stderr_dup, stderr_fd)
                
                # Close the duplicated FDs and the temp file write FD
                os.close(stdout_dup)
                os.close(stderr_dup)
                os.close(output_fd)
                
                # Now we can safely read from the temp file
                with open(output_path, 'r') as f:
                    captured_output = f.read()
                
                # Parse output into log lines
                output_lines = captured_output.split('\n')
                for line in output_lines:
                    if line.strip():
                        build_log.append(line)
                
                print(f"[ESP] Captured {len([l for l in output_lines if l.strip()])} output lines")
                print(f"[ESP] Total build_log entries: {len(build_log)}")
                
            except Exception as e:
                # Make sure to restore stdout/stderr even on error
                try:
                    os.dup2(stdout_dup, stdout_fd)
                    os.dup2(stderr_dup, stderr_fd)
                    os.close(stdout_dup)
                    os.close(stderr_dup)
                except:
                    pass
                raise
            finally:
                # Clean up temp file
                try:
                    if os.path.exists(output_path):
                        os.unlink(output_path)
                except:
                    pass

            
            # Get model info
            model_info = modl.Info()
            npmtr = model_info[1]
            nbody = model_info[2]
            
            print(f"[ESP] Built model: {npmtr} parameters, {nbody} bodies")
            
            # Extract design parameters
            parameters = []
            for ipmtr in range(1, npmtr + 1):
                pmtr_info = modl.GetPmtr(ipmtr)
                if pmtr_info[0] == ocsm.DESPMTR:
                    nrow = pmtr_info[1]
                    ncol = pmtr_info[2]
                    name = pmtr_info[3]
                    
                    if nrow == 1 and ncol == 1:
                        value = modl.GetValu(ipmtr, 1, 1)
                        parameters.append({
                            "name": name,
                            "value": value[0],
                            "type": "scalar"
                        })
                    else:
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
            
            # Extract tessellation (same logic as /csm/build)
            regions = []
            total_vertices = 0
            total_faces = 0
            
            print(f"[ESP] Processing {nbody} bodies...")
            
            for ibody in range(1, nbody + 1):
                try:
                    body_ego = modl.GetEgo(ibody, ocsm.BODY, 0)
                except Exception as e:
                    print(f"[ESP] Body {ibody}: No body ego - {e}")
                    continue
                    
                try:
                    tess_ego = modl.GetEgo(ibody, ocsm.BODY, 1)
                except Exception as e:
                    print(f"[ESP] Body {ibody}: No tessellation ego - {e}")
                    continue
                
                if body_ego is None or tess_ego is None:
                    print(f"[ESP] Body {ibody}: Skipping (ego is None)")
                    continue
                
                try:
                    faces = body_ego.getBodyTopos(egads.FACE)
                    nface = len(faces)
                    print(f"[ESP] Body {ibody}: {nface} faces")
                except Exception as e:
                    print(f"[ESP] Body {ibody}: Cannot get faces - {e}")
                    continue
                
                for iface in range(1, nface + 1):
                    try:
                        face_data = tess_ego.getTessFace(iface)
                        
                        xyz = face_data[0]
                        tris = face_data[4]
                        
                        if not xyz or not tris:
                            continue
                        
                        nvert = len(xyz)
                        ntri = len(tris)
                        
                        vertices = []
                        for v in xyz:
                            vertices.append([float(v[0]), float(v[1]), float(v[2])])
                        
                        cells = []
                        for t in tris:
                            cells.append([int(t[0]) - 1, int(t[1]) - 1, int(t[2]) - 1])
                        
                        face_name = f"Body{ibody}_Face{iface}"
                        bc_name = None
                        try:
                            face_ego = faces[iface - 1]
                            
                            attr = face_ego.attributeRet("_name")
                            if attr is not None:
                                face_name = str(attr)
                            
                            bc_attr = face_ego.attributeRet("bc_name")
                            if bc_attr is not None:
                                bc_name = str(bc_attr)
                        except Exception as e:
                            print(f"[ESP] Warning: Could not get attributes for Body {ibody} Face {iface}: {e}")
                            pass
                        
                        print(f"[ESP]   Face {iface}: {face_name}, bc_name={bc_name}, {nvert} verts, {ntri} tris")
                        
                        regions.append({
                            "name": face_name,
                            "tag": ibody * 100000 + iface,
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
            
            print(f"[ESP] Extracted {len(regions)} regions, {total_vertices} vertices, {total_faces} faces")
            build_log.append(f"Extracted {len(regions)} faces from {nbody} bodies")
            
            return TessellationResponse(
                success=True,
                message=f"Built {nbody} bodies with {len(regions)} faces (with {len(request.dependencies)} dependencies)",
                regions=regions,
                parameters=parameters,
                total_vertices=total_vertices,
                total_faces=total_faces,
                build_log=build_log
            )
            
        finally:
            # Clean up temp directory and all files
            import shutil
            shutil.rmtree(tmpdir, ignore_errors=True)
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to build CSM with dependencies: {str(e)}"
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
