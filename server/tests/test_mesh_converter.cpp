/**
 * Tests for mesh conversion
 */

#include "catch.hpp"
#include "../src/mesh_converter.hpp"
#include <fstream>
#include <filesystem>

using namespace vulcan;

// Helper to create a simple OBJ file for testing
std::string createTestOBJ(const std::string& path) {
    std::ofstream file(path);
    file << "# Test OBJ file\n";
    file << "v 0.0 0.0 0.0\n";
    file << "v 1.0 0.0 0.0\n";
    file << "v 0.0 1.0 0.0\n";
    file << "v 1.0 1.0 0.0\n";
    file << "g surface1\n";
    file << "o tag_1\n";
    file << "f 1 2 3\n";
    file << "f 2 4 3\n";
    file.close();
    return path;
}

TEST_CASE("OBJ file parsing", "[mesh_converter]") {
    const std::string testFile = "/tmp/test_mesh.obj";
    createTestOBJ(testFile);
    
    SECTION("Parses vertices correctly") {
        MeshData mesh = parseOBJFile(testFile);
        REQUIRE(mesh.totalVertices == 4);
    }
    
    SECTION("Parses faces correctly") {
        MeshData mesh = parseOBJFile(testFile);
        REQUIRE(mesh.totalFaces == 2);
    }
    
    SECTION("Creates regions") {
        MeshData mesh = parseOBJFile(testFile);
        REQUIRE(mesh.regions.size() > 0);
        REQUIRE(mesh.regions[0].name == "surface1");
        REQUIRE(mesh.regions[0].tag == 1);
    }
    
    SECTION("Handles missing file") {
        REQUIRE_THROWS_AS(parseOBJFile("/nonexistent/file.obj"), std::runtime_error);
    }
    
    // Cleanup
    std::filesystem::remove(testFile);
}

TEST_CASE("Mesh to JSON conversion", "[mesh_converter]") {
    const std::string testFile = "/tmp/test_mesh2.obj";
    createTestOBJ(testFile);
    
    SECTION("Produces valid JSON structure") {
        MeshData mesh = parseOBJFile(testFile);
        std::string json = meshDataToJSON(mesh);
        
        // Check for key JSON elements
        REQUIRE(json.find("\"totalVertices\"") != std::string::npos);
        REQUIRE(json.find("\"totalFaces\"") != std::string::npos);
        REQUIRE(json.find("\"regions\"") != std::string::npos);
        REQUIRE(json.find("\"vertices\"") != std::string::npos);
        REQUIRE(json.find("\"cells\"") != std::string::npos);
    }
    
    SECTION("Includes region metadata") {
        MeshData mesh = parseOBJFile(testFile);
        std::string json = meshDataToJSON(mesh);
        
        REQUIRE(json.find("\"name\"") != std::string::npos);
        REQUIRE(json.find("\"tag\"") != std::string::npos);
        REQUIRE(json.find("surface1") != std::string::npos);
    }
    
    // Cleanup
    std::filesystem::remove(testFile);
}

TEST_CASE("Full conversion pipeline", "[mesh_converter]") {
    const std::string testFile = "/tmp/test_mesh3.obj";
    createTestOBJ(testFile);
    
    SECTION("Converts OBJ to JSON") {
        std::string json = convertMeshToJSON(testFile, "obj");
        REQUIRE_FALSE(json.empty());
        REQUIRE(json.find("\"regions\"") != std::string::npos);
    }
    
    SECTION("Rejects unsupported formats") {
        REQUIRE_THROWS_AS(convertMeshToJSON(testFile, "xyz"), std::runtime_error);
    }
    
    SECTION("Placeholder for future formats") {
        REQUIRE_THROWS_WITH(
            convertMeshToJSON(testFile, "meshb"),
            Catch::Matchers::Contains("not yet implemented")
        );
    }
    
    // Cleanup
    std::filesystem::remove(testFile);
}
