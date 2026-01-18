/**
 * Vulcan CFD GUI - C++ HTTP Server
 * 
 * Minimal server implementation using cpp-httplib.
 * Serves REST API for mesh conversion and configuration management.
 */

#include "httplib.h"
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
            std::cout << "Vulcan Server - CFD GUI Backend\n\n"
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
    
    // Health check endpoint
    svr.Get("/api/health", [](const httplib::Request&, httplib::Response& res) {
        res.set_content(
            json_object({
                {"status", "ok"},
                {"message", "Vulcan server is running"},
                {"version", "1.0.0"}
            }),
            "application/json"
        );
    });
    
    // API info endpoint
    svr.Get("/api/info", [](const httplib::Request&, httplib::Response& res) {
        std::string json = R"({
  "name": "Vulcan CFD GUI Server",
  "version": "1.0.0",
  "description": "HTTP backend for mesh conversion and configuration management",
  "endpoints": ["/api/health", "/api/info"]
})";
        res.set_content(json, "application/json");
    });
    
    // Root endpoint
    svr.Get("/", [](const httplib::Request&, httplib::Response& res) {
        res.set_content("Vulcan CFD GUI Server - Use /api/health to check status", "text/plain");
    });
    
    // Log server startup
    std::cout << "\n=================================================\n"
              << "  Vulcan CFD GUI Server v1.0.0\n"
              << "=================================================\n"
              << "  Starting server...\n"
              << "  Host: " << host << "\n"
              << "  Port: " << port << "\n"
              << "  URL:  http://" << host << ":" << port << "\n"
              << "=================================================\n\n";
    std::cout << "Press Ctrl+C to stop the server.\n\n";
    
    // Start server
    svr.listen(host.c_str(), port);
    
    return 0;
}
