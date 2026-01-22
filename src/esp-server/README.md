# ESP Gateway Server

A Python FastAPI server that interfaces with ESP (Engineering Sketch Pad) to provide geometry tessellation services.

## Prerequisites

1. **ESP Installation**: You need ESP128 installed. It should already be in `third-party/ESP128/`.

2. **Python Environment**: Python 3.8+ with the ESP Python bindings available.

## Setup

### 1. Set Environment Variables

Before running the server, you must set `ESP_ROOT`:

```bash
export ESP_ROOT=/home/matthew/Projects/vulcan-gui/third-party/ESP128/EngSketchPad
```

You may also need to set library paths:

```bash
export LD_LIBRARY_PATH=$ESP_ROOT/lib:$LD_LIBRARY_PATH
export PYTHONPATH=$ESP_ROOT/lib:$PYTHONPATH
```

### 2. Install Python Dependencies

```bash
cd src/esp-server
pip install -r requirements.txt
```

### 3. Run the Server

```bash
python server.py
```

The server will start on `http://127.0.0.1:8081`.

## API Endpoints

### GET /health

Check server health and ESP availability.

**Response:**
```json
{
  "status": "ok",
  "esp_available": true,
  "esp_root": "/path/to/ESP",
  "message": "ESP is available"
}
```

### POST /csm/build

Build geometry from CSM content and return tessellation.

**Request:**
```json
{
  "csm_content": "# CSM file content\ndespmtr width 10\nbox 0 0 0 width 5 3\nend"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Built 1 bodies with 6 faces",
  "regions": [
    {
      "name": "Body1_Face1",
      "tag": 1001,
      "body": 1,
      "face": 1,
      "vertices": [[0, 0, 0], [10, 0, 0], ...],
      "cells": [[0, 1, 2], [2, 3, 0], ...]
    }
  ],
  "parameters": [
    {
      "name": "width",
      "value": 10.0,
      "type": "scalar"
    }
  ],
  "total_vertices": 24,
  "total_faces": 12
}
```

## Testing

Test with a simple CSM:

```bash
curl -X POST http://127.0.0.1:8081/csm/build \
  -H "Content-Type: application/json" \
  -d '{"csm_content": "box 0 0 0 10 5 3\nend"}'
```

## Troubleshooting

### "ESP/pyOCSM not available"

1. Check `ESP_ROOT` is set correctly
2. Check `LD_LIBRARY_PATH` includes `$ESP_ROOT/lib`
3. Verify ESP was built with Python bindings

### Import errors

Make sure you're using the Python version ESP was built with. The pre-built distribution includes Python 3.12.

```bash
# Use ESP's bundled Python
export PATH=/home/matthew/Projects/vulcan-gui/third-party/ESP128/Python-3.12.10/bin:$PATH
```
