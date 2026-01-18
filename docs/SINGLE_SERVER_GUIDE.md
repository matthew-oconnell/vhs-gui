# ✅ Single Server Achievement Unlocked!

## What We Did

**Combined two servers into ONE:**
- ❌ Before: Vite dev server (port 3000) + C++ server (port 8080)
- ✅ After: C++ server only (port 8080) serving both frontend + API

## How It Works

### Production Mode (ONE SERVER)
```bash
./build-production.sh
cd server/build && ./vulcan_server
# Visit: http://127.0.0.1:8080
```

**What happens:**
1. Builds React → `dist/`
2. Compiles C++ server
3. Copies `dist/` to `server/build/public/`
4. Server serves static files + API endpoints

### Server Architecture

```cpp
// In main.cpp
svr.set_mount_point("/", publicDir.string());  // Serve static files
svr.set_file_request_handler([...]);           // SPA routing fallback

// Routes:
// /                    → public/index.html
// /assets/*            → public/assets/*  
// /api/health          → API handler
// /api/mesh/upload     → API handler
// /any-spa-route       → public/index.html (SPA fallback)
```

### Development Mode (TWO SERVERS)

Still available for hot reloading:
```bash
# Terminal 1: Backend
./vulcan_server

# Terminal 2: Frontend  
npm run dev
```

## Benefits

✅ **Simpler deployment** - One binary, one port
✅ **No CORS issues** - Same origin for API + frontend
✅ **Faster production** - Optimized bundle served by C++
✅ **Single SSL cert** - Only need HTTPS on one server
✅ **Easier firewall** - Open only port 8080

## File Structure

```
server/build/
├── vulcan_server           # Single executable
├── uploads/                # Mesh upload directory
└── public/                 # React build (copied by build script)
    ├── index.html
    ├── assets/
    │   ├── index-DYNVlEL8.js    (1.3MB)
    │   └── index-DU3e6mmS.css   (40KB)
    └── schemas/
        └── input.schema.json

src/frontend/public/
└── schemas/
    └── input.schema.json   # Source schema (copied to build)
```

## Testing

```bash
# Health check (API)
curl http://127.0.0.1:8080/api/health

# Frontend (HTML)
curl http://127.0.0.1:8080/

# Static asset
curl http://127.0.0.1:8080/assets/index-DYNVlEL8.js

# Upload mesh
curl -X POST -F "mesh=@waverider.obj" http://127.0.0.1:8080/api/mesh/upload
```

All working from ONE server! 🎉

## Performance

| Metric | Dev (2 servers) | Prod (1 server) |
|--------|----------------|-----------------|
| Ports | 2 (3000, 8080) | 1 (8080) |
| Processes | 2 | 1 |
| Bundle | Dev build | Optimized (minified) |
| HMR | ✅ Yes | ❌ No |
| Speed | Faster dev | Faster load |

## What Changed

1. **server/src/main.cpp** - Added static file serving
2. **build-production.sh** - Automated build script
3. **.env.production** - Empty API_URL for same-origin
4. **README.md** - Updated documentation

## Next Steps

- [ ] Add HTTPS/SSL support
- [ ] Add gzip compression for static files
- [ ] Add caching headers for assets
- [ ] Add health check endpoint for load balancers
- [ ] Deploy to shared server for team access
