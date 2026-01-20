/**
 * File handling utilities for mesh uploads
 */

#pragma once

#include <string>
#include <fstream>
#include <sstream>
#include <random>
#include <iomanip>
#include <filesystem>
#include <chrono>

namespace vhs {

/**
 * Generate a unique session ID for file uploads
 */
inline std::string generateSessionId() {
    // Use timestamp + random number for uniqueness
    auto now = std::chrono::system_clock::now();
    auto timestamp = std::chrono::duration_cast<std::chrono::milliseconds>(
        now.time_since_epoch()
    ).count();
    
    std::random_device rd;
    std::mt19937 gen(rd());
    std::uniform_int_distribution<> dis(1000, 9999);
    
    std::ostringstream oss;
    oss << timestamp << "_" << dis(gen);
    return oss.str();
}

/**
 * Save uploaded file data to disk
 * 
 * @param data File content
 * @param filename Original filename
 * @param sessionId Unique session identifier
 * @return Full path to saved file
 */
inline std::string saveUploadedFile(
    const std::string& data,
    const std::string& filename,
    const std::string& sessionId
) {
    namespace fs = std::filesystem;
    
    // Create upload directory structure: /tmp/vhs/uploads/{sessionId}/
    fs::path uploadDir = fs::temp_directory_path() / "vhs" / "uploads" / sessionId;
    fs::create_directories(uploadDir);
    
    // Save file
    fs::path filePath = uploadDir / filename;
    std::ofstream outFile(filePath, std::ios::binary);
    if (!outFile) {
        throw std::runtime_error("Failed to create file: " + filePath.string());
    }
    
    outFile.write(data.data(), data.size());
    outFile.close();
    
    return filePath.string();
}

/**
 * Get file extension from filename
 */
inline std::string getFileExtension(const std::string& filename) {
    size_t dotPos = filename.find_last_of('.');
    if (dotPos == std::string::npos) {
        return "";
    }
    return filename.substr(dotPos + 1);
}

/**
 * Check if file extension is supported mesh format
 */
inline bool isSupportedMeshFormat(const std::string& extension) {
    return extension == "meshb" || 
           extension == "egads" || 
           extension == "csm" ||
           extension == "obj" ||
           extension == "stl";
}

/**
 * Get file size in human-readable format
 */
inline std::string formatFileSize(size_t bytes) {
    const char* units[] = {"B", "KB", "MB", "GB"};
    int unit = 0;
    double size = static_cast<double>(bytes);
    
    while (size >= 1024.0 && unit < 3) {
        size /= 1024.0;
        unit++;
    }
    
    std::ostringstream oss;
    oss << std::fixed << std::setprecision(2) << size << " " << units[unit];
    return oss.str();
}

} // namespace vhs
