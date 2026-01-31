/**
 * VHS GUI - C++ HTTP Server
 * 
 * Minimal server implementation using cpp-httplib.
 * Serves REST API for mesh conversion and configuration management.
 */

#include "httplib.h"
#include "file_handler.hpp"
#include "mesh_converter.hpp"
#include <iostream>
#include <string>
#include <sstream>

// Simple JSON builder helper
std::string json_object(const std::vector<std::pair<std::string, std::string>>& pairs) {
    std::ostringstream oss;
    oss << "{";
    for (size_t i = 0; i < pairs.size(); ++i) {
        oss << "\"" << pairs[i].first << "\":\"" << pairs[i].second << "\"";
        if (i < pairs.size() - 1) oss << ",";
    }
    oss << "}";
    return oss.str();
}

int main(int argc, char* argv[]) {
    // Parse command-line arguments
    int port = 8080;
    std::string host = "127.0.0.1"; // localhost only for now
    
    // Simple argument parsing
    for (int i = 1; i < argc; i++) {
        std::string arg = argv[i];
        if (arg == "--port" && i + 1 < argc) {
            port = std::stoi(argv[++i]);
        } else if (arg == "--host" && i + 1 < argc) {
            host = argv[++i];
        } else if (arg == "--help" || arg == "-h") {
            std::cout << "VHS Server - CFD GUI Backend\n\n"
                      << "Usage: " << argv[0] << " [options]\n\n"
                      << "Options:\n"
                      << "  --port <port>    Port to bind to (default: 8080)\n"
                      << "  --host <host>    Host to bind to (default: 127.0.0.1)\n"
                      << "  --help, -h       Show this help message\n\n"
                      << "Examples:\n"
                      << "  " << argv[0] << "\n"
                      << "  " << argv[0] << " --port 3000\n"
                      << "  " << argv[0] << " --host 0.0.0.0 --port 8080\n";
            return 0;
        }
    }
    
    // Create HTTP server
    httplib::Server svr;
    
    // CORS middleware - allow all origins for Tauri compatibility
    svr.set_pre_routing_handler([](const httplib::Request& req, httplib::Response& res) {
        res.set_header("Access-Control-Allow-Origin", "*");
        res.set_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        res.set_header("Access-Control-Allow-Headers", "Content-Type, Authorization");
        
        // Handle OPTIONS preflight requests
        if (req.method == "OPTIONS") {
            res.status = 204; // No Content
            return httplib::Server::HandlerResponse::Handled;
        }
        
        return httplib::Server::HandlerResponse::Unhandled;
    });
    
    // Health check endpoint
    svr.Get("/api/health", [](const httplib::Request&, httplib::Response& res) {
        res.set_content(
            json_object({
                {"status", "ok"},
                {"message", "VHS server is running"},
                {"version", "1.0.0"}
            }),
            "application/json"
        );
    });
    
    // API info endpoint
    svr.Get("/api/info", [](const httplib::Request&, httplib::Response& res) {
        std::string json = R"({
  "name": "VHS GUI Server",
  "version": "1.0.0",
  "description": "HTTP backend for mesh conversion and configuration management",
  "endpoints": ["/api/health", "/api/info"]
})";
        res.set_content(json, "application/json");
    });
    
    // Root endpoint
    svr.Get("/", [](const httplib::Request&, httplib::Response& res) {
        res.set_content("VHS GUI Server - Use /api/health to check status", "text/plain");
    });
    
    // Mesh upload endpoint
    svr.Post("/api/mesh/upload", [](const httplib::Request& req, httplib::Response& res) {
        // Check if file was uploaded
        if (!req.form.has_file("mesh")) {
            res.status = 400;
            res.set_content(R"({"error":"No file uploaded","field":"mesh"})", "application/json");
            return;
        }
        
        // Get uploaded file
        const auto& file = req.form.get_file("mesh");
        std::string filename = file.filename;
        std::string content = file.content;
        
        // Validate file extension
        std::string ext = vhs::getFileExtension(filename);
        if (!vhs::isSupportedMeshFormat(ext)) {
            std::ostringstream error;
            error << R"({"error":"Unsupported file format","extension":")" << ext 
                  << R"(","supported":["meshb","egads","csm","obj","stl"]})";
            res.status = 400;
            res.set_content(error.str(), "application/json");
            return;
        }
        
        // Generate session ID and save file
        std::string sessionId = vhs::generateSessionId();
        std::string savedPath;
        
        try {
            savedPath = vhs::saveUploadedFile(content, filename, sessionId);
        } catch (const std::exception& e) {
            std::ostringstream error;
            error << R"({"error":"Failed to save file","message":")" << e.what() << R"("})";
            res.status = 500;
            res.set_content(error.str(), "application/json");
            return;
        }
        
        // Build success response
        std::ostringstream response;
        response << "{\n"
                 << R"(  "success": true,)" << "\n"
                 << R"(  "sessionId": ")" << sessionId << "\",\n"
                 << R"(  "filename": ")" << filename << "\",\n"
                 << R"(  "extension": ")" << ext << "\",\n"
                 << R"(  "size": ")" << vhs::formatFileSize(content.size()) << "\",\n"
                 << R"(  "sizeBytes": )" << content.size() << ",\n"
                 << R"(  "path": ")" << savedPath << "\",\n"
                 << R"(  "message": "File uploaded successfully. Conversion pending.")" << "\n"
                 << "}";
        
        res.set_content(response.str(), "application/json");
        std::cout << "[UPLOAD] " << filename << " (" << vhs::formatFileSize(content.size()) 
                  << ") -> Session: " << sessionId << std::endl;
    });
    
    // Mesh conversion endpoint
    svr.Get(R"(/api/mesh/convert/(.+))", [](const httplib::Request& req, httplib::Response& res) {
        std::string sessionId = req.matches[1];
        
        // Find the mesh file in the session directory
        namespace fs = std::filesystem;
        fs::path sessionDir = fs::temp_directory_path() / "vhs" / "uploads" / sessionId;
        
        if (!fs::exists(sessionDir)) {
            res.status = 404;
            res.set_content(R"({"error":"Session not found","sessionId":")" + sessionId + R"("})", 
                          "application/json");
            return;
        }
        
        // Find first supported mesh file in directory
        std::string meshFile;
        std::string extension;
        for (const auto& entry : fs::directory_iterator(sessionDir)) {
            if (entry.is_regular_file()) {
                extension = vhs::getFileExtension(entry.path().filename().string());
                if (vhs::isSupportedMeshFormat(extension)) {
                    meshFile = entry.path().string();
                    break;
                }
            }
        }
        
        if (meshFile.empty()) {
            res.status = 404;
            res.set_content(R"({"error":"No mesh file found in session"})", "application/json");
            return;
        }
        
        // Convert mesh to JSON
        try {
            std::cout << "[CONVERT] Session: " << sessionId << " | File: " 
                      << fs::path(meshFile).filename().string() << " | Format: " << extension << std::endl;
            
            std::string meshJSON = vhs::convertMeshToJSON(meshFile, extension);
            
            res.set_content(meshJSON, "application/json");
            
            std::cout << "[CONVERT] Success | " << meshJSON.size() << " bytes" << std::endl;
            
        } catch (const std::exception& e) {
            std::ostringstream error;
            error << R"({"error":"Conversion failed","message":")" << e.what() << R"("})";
            res.status = 500;
            res.set_content(error.str(), "application/json");
            
            std::cout << "[CONVERT] Failed: " << e.what() << std::endl;
        }
    });
    
    // ========================================================================
    // Static File Serving
    // ========================================================================
    
    // Serve static files from public/ directory
    // This allows serving the React app from the same server
    namespace fs = std::filesystem;
    fs::path publicDir = fs::current_path() / "public";
    
    if (fs::exists(publicDir)) {
        std::cout << "Static files directory found: " << publicDir << "\n";
        
        // Mount static file handler
        // This serves all files from public/ directory at the root path
        svr.set_mount_point("/", publicDir.string());
        
        // SPA fallback: serve index.html for routes that don't match files
        svr.set_error_handler([publicDir](const httplib::Request& req, httplib::Response& res) {
            // Only apply SPA routing to GET requests that aren't API calls
            if (req.method != "GET" || req.path.find("/api/") == 0) {
                return;
            }
            
            // For 404s on paths without extensions (SPA routes), serve index.html
            if (res.status == 404 && req.path.find('.') == std::string::npos) {
                fs::path indexPath = publicDir / "index.html";
                if (fs::exists(indexPath)) {
                    std::ifstream file(indexPath);
                    std::string content((std::istreambuf_iterator<char>(file)),
                                      std::istreambuf_iterator<char>());
                    res.status = 200;
                    res.set_content(content, "text/html");
                }
            }
        });
    } else {
        std::cout << "Static files directory not found: " << publicDir << "\n";
        std::cout << "Serving API endpoints only.\n";
    }
    
    // Log server startup
    std::cout << "\n=================================================\n"
              << "  VHS GUI Server v1.0.0\n"
              << "=================================================\n"
              << "  Starting server...\n"
              << "  Host: " << host << "\n"
              << "  Port: " << port << "\n"
              << "  URL:  http://" << host << ":" << port << "\n"
              << "-------------------------------------------------\n";
    
    if (fs::exists(publicDir)) {
        std::cout << "  Mode: Full Stack (API + Frontend)\n";
        std::cout << "  Static: " << publicDir << "\n";
    } else {
        std::cout << "  Mode: API Only\n";
    }
    
    std::cout << "=================================================\n\n"
              << "API Endpoints:\n"
              << "  - GET  /api/health\n"
              << "  - GET  /api/info\n"
              << "  - POST /api/mesh/upload\n"
              << "  - GET  /api/mesh/convert/{sessionId}\n\n";
    
    if (fs::exists(publicDir)) {
        std::cout << "Frontend:\n"
                  << "  - /             (React app)\n"
                  << "  - /*            (SPA routing)\n\n";
    }
    
    std::cout << "Press Ctrl+C to stop the server.\n\n";
    
    // Start server
    svr.listen(host.c_str(), port);
    
    return 0;
}
