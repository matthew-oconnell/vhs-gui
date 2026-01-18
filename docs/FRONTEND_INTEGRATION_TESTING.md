# Frontend Integration Testing Guide

This document describes how to test the frontend integration with the C++ backend server.

## Setup

### 1. Start the Backend Server

```bash
cd server/build
./vulcan_server
```

Server should start on `http://127.0.0.1:8080`

### 2. Start the Frontend

```bash
# In project root
npm run dev
```

Frontend should start on `http://localhost:3000`

## Test Scenarios

### Scenario 1: Backend Available - Load Mesh with Backend

**Steps:**
1. Ensure backend server is running (check `http://127.0.0.1:8080/api/health`)
2. Open frontend at `http://localhost:3000`
3. Click "File" → "Load Mesh"
4. Select `waverider.obj` file
5. Check browser console

**Expected Results:**
- Console shows: `[Mesh Parser] Parsing with backend: waverider.obj`
- Console shows: `[Backend API] Uploading mesh: waverider.obj`
- Console shows: `[Backend API] Upload successful, sessionId: <some-id>`
- Console shows: `[Backend API] Conversion successful: 50516 vertices, 101032 faces`
- Console shows: `[Mesh Parser] Backend parsing successful: 50516 vertices`
- 3D viewer displays the waverider mesh
- Surfaces panel shows all mesh regions

### Scenario 2: Backend Unavailable - Fallback to Browser Parsing

**Steps:**
1. Stop the backend server: `pkill vulcan_server`
2. Reload frontend page
3. Click "File" → "Load Mesh"
4. Select `waverider.obj` file
5. Check browser console

**Expected Results:**
- Console shows: `[Mesh Parser] Parsing with backend: waverider.obj`
- Console shows: `[Backend API] Health check failed: <error>`
- Console shows: `[Mesh Parser] Backend unavailable, falling back to browser parsing`
- Console shows: `[Mesh Parser] Starting to parse file: waverider.obj`
- Mesh still loads successfully (using browser-side OBJ parser)
- 3D viewer displays the mesh correctly

### Scenario 3: Backend Error - Fallback to Browser Parsing

**Steps:**
1. Start backend server
2. Modify `.env` to use wrong port: `VITE_API_URL=http://127.0.0.1:9999`
3. Restart frontend (`npm run dev`)
4. Click "File" → "Load Mesh"
5. Select a mesh file

**Expected Results:**
- Console shows: `[Backend API] Health check failed: <network error>`
- Console shows: `[Mesh Parser] Backend unavailable, falling back to browser parsing`
- Mesh loads successfully using browser parser
- No user-facing errors

### Scenario 4: Load Config with Mesh (Auto-Load)

**Steps:**
1. Ensure backend is running
2. Have `waverider.json` config file that references `waverider.obj`
3. Click "File" → "Open"
4. Select `waverider.json`
5. When prompted, select directory containing both files
6. Check console

**Expected Results:**
- Config loads successfully
- Mesh auto-loads using backend API
- Console shows backend upload/conversion logs
- Surfaces are populated from mesh
- Boundary conditions are transformed (surface names → tag numbers)

### Scenario 5: STL File Loading (Format Support)

**Steps:**
1. Backend running
2. Load an STL file
3. Check console

**Expected Results:**
- Backend accepts STL format
- Mesh converts successfully
- Single region created (STL has no multi-region support)

## Debugging

### Check Backend Health

```bash
curl http://127.0.0.1:8080/api/health
# Should return: {"status":"ok","message":"Vulcan server is running","version":"1.0.0"}
```

### Check Backend Logs

Backend prints to terminal where `vulcan_server` is running:
- File upload events
- Conversion requests
- Errors

### Check Frontend Network Requests

Open browser DevTools → Network tab:
- Look for POST to `/api/mesh/upload`
- Look for GET to `/api/mesh/convert/{sessionId}`
- Check response status codes (200 = success)
- Inspect response payloads

### Check Upload Directory

```bash
ls -lh server/build/uploads/
```

Should see timestamped directories with uploaded mesh files.

## Common Issues

### Issue: "Backend unavailable" even though server is running

**Solution:**
- Check `.env` file has correct `VITE_API_URL`
- Restart frontend dev server after changing `.env`
- Check CORS if running on different domains
- Verify server port with `curl http://127.0.0.1:8080/api/health`

### Issue: Mesh loads but looks corrupted

**Solution:**
- Check backend conversion output: `curl http://127.0.0.1:8080/api/mesh/convert/{sessionId}`
- Compare vertex/face counts between backend and frontend logs
- Verify mesh adapter is converting data correctly
- Check for NaN or Infinity values in coordinates

### Issue: Backend crashes or returns 500 error

**Solution:**
- Check backend terminal for C++ errors
- Verify mesh file format is valid
- Check file size (very large files might timeout)
- Review backend logs for parsing errors

## Performance Comparison

### Browser Parsing (waverider.obj)
- **Parse time:** ~500-1000ms
- **Memory:** High (JavaScript object overhead)

### Backend Parsing (waverider.obj)
- **Parse time:** ~50-100ms (10x faster)
- **Memory:** Low (C++ efficiency)
- **Transfer time:** ~100-200ms (3MB upload + 5MB JSON download)

**Total time with backend:** ~300-400ms (still faster for large meshes)

## Next Steps

After verifying integration:
1. Test with proprietary mesh formats (.meshb, .egads, .csm) once C++ libraries integrated
2. Add progress indicators for large file uploads
3. Implement session cleanup (TTL for uploaded files)
4. Add file size limits and validation
5. Consider streaming for very large meshes
