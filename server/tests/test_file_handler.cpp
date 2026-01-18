/**
 * Tests for file handling utilities
 */

#include "catch.hpp"
#include "../src/file_handler.hpp"
#include <filesystem>
#include <fstream>

using namespace vulcan;

TEST_CASE("Session ID generation", "[file_handler]") {
    SECTION("Generates non-empty ID") {
        std::string id = generateSessionId();
        REQUIRE_FALSE(id.empty());
    }
    
    SECTION("Generates unique IDs") {
        std::string id1 = generateSessionId();
        std::string id2 = generateSessionId();
        REQUIRE(id1 != id2);
    }
    
    SECTION("ID format contains timestamp and random component") {
        std::string id = generateSessionId();
        REQUIRE(id.find('_') != std::string::npos);
    }
}

TEST_CASE("File extension detection", "[file_handler]") {
    SECTION("Extracts common extensions") {
        REQUIRE(getFileExtension("mesh.meshb") == "meshb");
        REQUIRE(getFileExtension("model.egads") == "egads");
        REQUIRE(getFileExtension("geometry.csm") == "csm");
        REQUIRE(getFileExtension("surface.stl") == "stl");
        REQUIRE(getFileExtension("mesh.obj") == "obj");
    }
    
    SECTION("Handles files without extension") {
        REQUIRE(getFileExtension("noext") == "");
    }
    
    SECTION("Handles multiple dots") {
        REQUIRE(getFileExtension("my.mesh.file.stl") == "stl");
    }
}

TEST_CASE("Mesh format validation", "[file_handler]") {
    SECTION("Accepts supported formats") {
        REQUIRE(isSupportedMeshFormat("meshb") == true);
        REQUIRE(isSupportedMeshFormat("egads") == true);
        REQUIRE(isSupportedMeshFormat("csm") == true);
        REQUIRE(isSupportedMeshFormat("obj") == true);
        REQUIRE(isSupportedMeshFormat("stl") == true);
    }
    
    SECTION("Rejects unsupported formats") {
        REQUIRE(isSupportedMeshFormat("txt") == false);
        REQUIRE(isSupportedMeshFormat("json") == false);
        REQUIRE(isSupportedMeshFormat("") == false);
    }
}

TEST_CASE("File size formatting", "[file_handler]") {
    SECTION("Formats bytes") {
        REQUIRE(formatFileSize(0) == "0.00 B");
        REQUIRE(formatFileSize(512) == "512.00 B");
    }
    
    SECTION("Formats kilobytes") {
        REQUIRE(formatFileSize(1024) == "1.00 KB");
        REQUIRE(formatFileSize(2048) == "2.00 KB");
    }
    
    SECTION("Formats megabytes") {
        REQUIRE(formatFileSize(1024 * 1024) == "1.00 MB");
        REQUIRE(formatFileSize(5 * 1024 * 1024) == "5.00 MB");
    }
    
    SECTION("Formats gigabytes") {
        REQUIRE(formatFileSize(1024ULL * 1024 * 1024) == "1.00 GB");
    }
}

TEST_CASE("File saving", "[file_handler]") {
    const std::string testContent = "Test mesh data content";
    const std::string testFilename = "test.meshb";
    const std::string sessionId = "test_session_123";
    
    SECTION("Saves file successfully") {
        std::string savedPath = saveUploadedFile(testContent, testFilename, sessionId);
        
        // Verify file exists
        REQUIRE(std::filesystem::exists(savedPath));
        
        // Verify file content
        std::ifstream inFile(savedPath);
        std::string readContent((std::istreambuf_iterator<char>(inFile)),
                               std::istreambuf_iterator<char>());
        REQUIRE(readContent == testContent);
        
        // Cleanup
        std::filesystem::remove_all(
            std::filesystem::temp_directory_path() / "vulcan" / "uploads" / sessionId
        );
    }
    
    SECTION("Creates directory structure") {
        std::string savedPath = saveUploadedFile(testContent, testFilename, sessionId);
        
        // Verify directory structure exists
        auto uploadDir = std::filesystem::temp_directory_path() / "vulcan" / "uploads" / sessionId;
        REQUIRE(std::filesystem::exists(uploadDir));
        REQUIRE(std::filesystem::is_directory(uploadDir));
        
        // Cleanup
        std::filesystem::remove_all(
            std::filesystem::temp_directory_path() / "vulcan" / "uploads" / sessionId
        );
    }
}
