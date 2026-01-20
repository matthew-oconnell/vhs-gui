/**
 * Mesh conversion utilities
 * 
 * Converts various mesh formats to JSON representation
 * for frontend visualization
 */

#pragma once

#include <string>
#include <vector>
#include <fstream>
#include <sstream>
#include <map>
#include <cmath>
#include <stdexcept>

namespace vhs {

/**
 * Represents a single mesh region/surface
 */
struct MeshRegion {
    std::string name;
    int tag;
    std::vector<std::vector<double>> vertices;  // [[x,y,z], ...]
    std::vector<std::vector<int>> cells;        // [[i1,i2,i3], ...]
};

/**
 * Complete mesh data structure
 */
struct MeshData {
    std::vector<MeshRegion> regions;
    int totalVertices;
    int totalFaces;
    std::vector<double> globalCenter;  // [x, y, z]
    double globalScale;
};

/**
 * Parse OBJ file and extract mesh data
 * 
 * Supports:
 * - v (vertices)
 * - f (faces)
 * - g (groups)
 * - o (objects with tag info)
 * 
 * @param filePath Path to OBJ file
 * @return Parsed mesh data
 */
inline MeshData parseOBJFile(const std::string& filePath) {
    std::ifstream file(filePath);
    if (!file.is_open()) {
        throw std::runtime_error("Failed to open file: " + filePath);
    }
    
    MeshData meshData;
    std::vector<std::vector<double>> globalVertices;  // All vertices (1-indexed)
    
    std::string currentGroup = "default";
    int currentTag = 1;
    std::map<std::string, MeshRegion> regions;
    
    std::string line;
    while (std::getline(file, line)) {
        // Trim whitespace
        size_t start = line.find_first_not_of(" \t\r\n");
        if (start == std::string::npos || line[start] == '#') continue;
        
        std::istringstream iss(line);
        std::string cmd;
        iss >> cmd;
        
        if (cmd == "v") {
            // Vertex: v x y z
            double x, y, z;
            iss >> x >> y >> z;
            globalVertices.push_back({x, y, z});
            
        } else if (cmd == "g") {
            // Group: g groupName
            iss >> currentGroup;
            if (currentGroup.empty()) currentGroup = "default";
            
        } else if (cmd == "o") {
            // Object: o tag_1 (extract tag number)
            std::string objName;
            iss >> objName;
            
            // Extract tag number from "tag_N" format
            size_t underscorePos = objName.find('_');
            if (underscorePos != std::string::npos) {
                try {
                    currentTag = std::stoi(objName.substr(underscorePos + 1));
                } catch (...) {
                    currentTag = 1;
                }
            }
            
        } else if (cmd == "f") {
            // Face: f v1 v2 v3 or f v1/vt1/vn1 v2/vt2/vn2 v3/vt3/vn3
            std::string regionKey = currentGroup + "_" + std::to_string(currentTag);
            
            if (regions.find(regionKey) == regions.end()) {
                regions[regionKey] = MeshRegion{currentGroup, currentTag, {}, {}};
            }
            
            std::vector<int> faceIndices;
            std::string vertex;
            while (iss >> vertex) {
                // Parse vertex index (handle v, v/vt, v/vt/vn formats)
                size_t slashPos = vertex.find('/');
                std::string indexStr = (slashPos != std::string::npos) 
                    ? vertex.substr(0, slashPos) 
                    : vertex;
                int idx = std::stoi(indexStr) - 1;  // Convert to 0-indexed
                faceIndices.push_back(idx);
            }
            
            // Triangulate if quad (simple fan triangulation)
            if (faceIndices.size() == 3) {
                regions[regionKey].cells.push_back(faceIndices);
            } else if (faceIndices.size() == 4) {
                regions[regionKey].cells.push_back({faceIndices[0], faceIndices[1], faceIndices[2]});
                regions[regionKey].cells.push_back({faceIndices[0], faceIndices[2], faceIndices[3]});
            }
        }
    }
    
    file.close();
    
    // Calculate bounding box and center
    if (globalVertices.empty()) {
        throw std::runtime_error("No vertices found in OBJ file");
    }
    
    double minX = globalVertices[0][0], maxX = globalVertices[0][0];
    double minY = globalVertices[0][1], maxY = globalVertices[0][1];
    double minZ = globalVertices[0][2], maxZ = globalVertices[0][2];
    
    for (const auto& v : globalVertices) {
        minX = std::min(minX, v[0]); maxX = std::max(maxX, v[0]);
        minY = std::min(minY, v[1]); maxY = std::max(maxY, v[1]);
        minZ = std::min(minZ, v[2]); maxZ = std::max(maxZ, v[2]);
    }
    
    double centerX = (minX + maxX) / 2.0;
    double centerY = (minY + maxY) / 2.0;
    double centerZ = (minZ + maxZ) / 2.0;
    
    double sizeX = maxX - minX;
    double sizeY = maxY - minY;
    double sizeZ = maxZ - minZ;
    double maxDim = std::max({sizeX, sizeY, sizeZ});
    double scale = (maxDim > 0) ? (10.0 / maxDim) : 1.0;
    
    meshData.globalCenter = {centerX, centerY, centerZ};
    meshData.globalScale = scale;
    
    // Build region vertex lists (transform vertices)
    int totalFaces = 0;
    for (auto& [key, region] : regions) {
        // Collect unique vertices used by this region
        std::map<int, int> globalToLocal;
        
        for (const auto& cell : region.cells) {
            for (int globalIdx : cell) {
                if (globalToLocal.find(globalIdx) == globalToLocal.end()) {
                    int localIdx = region.vertices.size();
                    globalToLocal[globalIdx] = localIdx;
                    
                    // Transform vertex
                    const auto& v = globalVertices[globalIdx];
                    double x = (v[0] - centerX) * scale;
                    double y = (v[1] - centerY) * scale;
                    double z = (v[2] - centerZ) * scale;
                    region.vertices.push_back({x, y, z});
                }
            }
        }
        
        // Remap cell indices to local vertex indices
        for (auto& cell : region.cells) {
            for (int& idx : cell) {
                idx = globalToLocal[idx];
            }
        }
        
        totalFaces += region.cells.size();
        meshData.regions.push_back(region);
    }
    
    meshData.totalVertices = globalVertices.size();
    meshData.totalFaces = totalFaces;
    
    return meshData;
}

/**
 * Convert MeshData to JSON string
 */
inline std::string meshDataToJSON(const MeshData& mesh) {
    std::ostringstream json;
    json.precision(6);
    json << std::fixed;
    
    json << "{\n";
    json << "  \"totalVertices\": " << mesh.totalVertices << ",\n";
    json << "  \"totalFaces\": " << mesh.totalFaces << ",\n";
    json << "  \"globalCenter\": [" 
         << mesh.globalCenter[0] << ", " 
         << mesh.globalCenter[1] << ", " 
         << mesh.globalCenter[2] << "],\n";
    json << "  \"globalScale\": " << mesh.globalScale << ",\n";
    json << "  \"regions\": [\n";
    
    for (size_t r = 0; r < mesh.regions.size(); r++) {
        const auto& region = mesh.regions[r];
        json << "    {\n";
        json << "      \"name\": \"" << region.name << "\",\n";
        json << "      \"tag\": " << region.tag << ",\n";
        
        // Vertices
        json << "      \"vertices\": [\n";
        for (size_t i = 0; i < region.vertices.size(); i++) {
            const auto& v = region.vertices[i];
            json << "        [" << v[0] << ", " << v[1] << ", " << v[2] << "]";
            if (i < region.vertices.size() - 1) json << ",";
            json << "\n";
        }
        json << "      ],\n";
        
        // Cells
        json << "      \"cells\": [\n";
        for (size_t i = 0; i < region.cells.size(); i++) {
            const auto& c = region.cells[i];
            json << "        [" << c[0] << ", " << c[1] << ", " << c[2] << "]";
            if (i < region.cells.size() - 1) json << ",";
            json << "\n";
        }
        json << "      ]\n";
        
        json << "    }";
        if (r < mesh.regions.size() - 1) json << ",";
        json << "\n";
    }
    
    json << "  ]\n";
    json << "}\n";
    
    return json.str();
}

/**
 * Convert mesh file to JSON
 * Currently supports OBJ format, will be extended for meshb/egads/csm
 * 
 * @param inputPath Path to input mesh file
 * @param extension File extension (obj, meshb, etc.)
 * @return JSON string representation of mesh
 */
inline std::string convertMeshToJSON(const std::string& inputPath, const std::string& extension) {
    if (extension == "obj") {
        MeshData mesh = parseOBJFile(inputPath);
        return meshDataToJSON(mesh);
    } else if (extension == "meshb" || extension == "egads" || extension == "csm") {
        // Placeholder for future mesh library integration
        throw std::runtime_error("Format not yet implemented: " + extension + 
                                ". Will integrate C++ mesh libraries here.");
    } else if (extension == "stl") {
        // Could implement STL parser here
        throw std::runtime_error("STL format not yet implemented");
    } else {
        throw std::runtime_error("Unsupported format: " + extension);
    }
}

} // namespace vulcan
