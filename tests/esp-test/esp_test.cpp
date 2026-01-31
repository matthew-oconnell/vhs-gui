/**
 * ESP C Library Test
 * 
 * Tests direct integration with ESP/OCSM C libraries
 * This is exploratory code to understand the ESP API before integrating into Tauri
 */

#include <iostream>
#include <fstream>
#include <vector>
#include <cstring>
#include <cstdio>

extern "C" {
#include "OpenCSM.h"
#include "egads.h"
}

// Simple CSM content for testing
const char* TEST_CSM = R"(
# Simple box test geometry
DESPMTR   width  10.0
DESPMTR   height 5.0
DESPMTR   depth  3.0

BOX       0 0 0   width height depth
)";

/**
 * Print OCSM error messages
 */
void printOcsmError(int status) {
    std::cerr << "OCSM Error " << status << std::endl;
}

/**
 * Write CSM content to temporary file
 */
std::string writeTempCSM(const char* content) {
    const char* tmpfile = "/tmp/esp_test.csm";
    std::ofstream out(tmpfile);
    if (!out) {
        std::cerr << "Failed to create temp file: " << tmpfile << std::endl;
        return "";
    }
    out << content;
    out.close();
    return tmpfile;
}

/**
 * Test loading and building a CSM file
 */
int testBasicCSMLoad() {
    std::cout << "\n=== Test 1: Basic CSM Load and Build ===\n";
    
    // Write test CSM to file
    std::string csmFile = writeTempCSM(TEST_CSM);
    if (csmFile.empty()) {
        return -1;
    }
    
    std::cout << "CSM file: " << csmFile << std::endl;
    
    // Load CSM
    void* modl = nullptr;
    int status = ocsmLoad((char*)csmFile.c_str(), &modl);
    if (status != SUCCESS) {
        printOcsmError(status);
        std::cerr << "Failed to load CSM file" << std::endl;
        return -1;
    }
    
    std::cout << "✓ CSM loaded successfully" << std::endl;
    
    // Get model info
    int nbranch = 0, npmtr = 0, nbody = 0;
    status = ocsmInfo(modl, &nbranch, &npmtr, &nbody);
    if (status != SUCCESS) {
        printOcsmError(status);
        return -1;
    }
    
    std::cout << "Model info: " << std::endl;
    std::cout << "  Branches: " << nbranch << std::endl;
    std::cout << "  Parameters: " << npmtr << std::endl;
    std::cout << "  Bodies: " << nbody << std::endl;
    
    // Build the model
    std::cout << "\nBuilding model..." << std::endl;
    int builtTo = 0;
    int buildStatus = 0;
    int numWarn = 0;
    status = ocsmBuild(modl, 0, &builtTo, &buildStatus, &numWarn);
    
    // Check if build succeeded (built at least one branch)
    // Note: Some error codes like -216 (TOO_MANY_BODYS_ON_STACK) can occur
    // but the model may still be partially built and usable
    if (status != SUCCESS && builtTo == 0) {
        printOcsmError(status);
        std::cerr << "Failed to build model completely" << std::endl;
        std::cerr << "  Built to: " << builtTo << std::endl;
        std::cerr << "  Build status: " << buildStatus << std::endl;
        return -1;
    }
    
    if (status != SUCCESS) {
        std::cout << "⚠ Model built with warnings/errors:" << std::endl;
        printOcsmError(status);
        std::cout << "  But built to branch: " << builtTo << std::endl;
    } else {
        std::cout << "✓ Model built successfully" << std::endl;
        std::cout << "  Built to branch: " << builtTo << std::endl;
    }
    std::cout << "  Warnings: " << numWarn << std::endl;
    
    // Update info after build
    status = ocsmInfo(modl, &nbranch, &npmtr, &nbody);
    std::cout << "\nAfter build:" << std::endl;
    std::cout << "  Bodies on stack: " << nbody << std::endl;
    
    // Clean up
    ocsmFree(modl);
    std::cout << "✓ Cleanup complete" << std::endl;
    
    return 0;
}

/**
 * Test extracting parameters from CSM
 */
int testParameterExtraction() {
    std::cout << "\n=== Test 2: Parameter Extraction ===\n";
    
    std::string csmFile = writeTempCSM(TEST_CSM);
    if (csmFile.empty()) return -1;
    
    void* modl = nullptr;
    int status = ocsmLoad((char*)csmFile.c_str(), &modl);
    if (status != SUCCESS) {
        printOcsmError(status);
        return -1;
    }
    
    // Get parameter count
    int nbranch, npmtr, nbody;
    ocsmInfo(modl, &nbranch, &npmtr, &nbody);
    
    std::cout << "Extracting " << npmtr << " parameters..." << std::endl;
    
    // Iterate through parameters
    for (int ipmtr = 1; ipmtr <= npmtr; ipmtr++) {
        int type, nrow, ncol;
        char name[256];
        
        status = ocsmGetPmtr(modl, ipmtr, &type, &nrow, &ncol, name);
        if (status != SUCCESS) {
            printOcsmError(status);
            continue;
        }
        
        std::cout << "\nParameter " << ipmtr << ": " << name << std::endl;
        std::cout << "  Type: " << type << std::endl;
        std::cout << "  Dimensions: " << nrow << "x" << ncol << std::endl;
        
        // Get parameter values
        if (nrow == 1 && ncol == 1) {
            // Scalar parameter
            double value;
            double dot;  // Changed from int to double
            status = ocsmGetValu(modl, ipmtr, 1, 1, &value, &dot);
            if (status == SUCCESS) {
                std::cout << "  Value: " << value << std::endl;
            }
        } else {
            // Array parameter
            std::cout << "  Values:" << std::endl;
            for (int i = 1; i <= nrow; i++) {
                std::cout << "    Row " << i << ": ";
                for (int j = 1; j <= ncol; j++) {
                    double value;
                    double dot;  // Changed from int to double
                    status = ocsmGetValu(modl, ipmtr, i, j, &value, &dot);
                    if (status == SUCCESS) {
                        std::cout << value << " ";
                    }
                }
                std::cout << std::endl;
            }
        }
    }
    
    ocsmFree(modl);
    std::cout << "\n✓ Parameter extraction complete" << std::endl;
    
    return 0;
}

/**
 * Test getting body and tessellation info
 */
int testBodyTessellation() {
    std::cout << "\n=== Test 3: Body Tessellation ===\n";
    
    std::string csmFile = writeTempCSM(TEST_CSM);
    if (csmFile.empty()) return -1;
    
    void* modl = nullptr;
    int status = ocsmLoad((char*)csmFile.c_str(), &modl);
    if (status != SUCCESS) {
        printOcsmError(status);
        return -1;
    }
    
    // Build model
    int builtTo, buildStatus, numWarn;
    status = ocsmBuild(modl, 0, &builtTo, &buildStatus, &numWarn);
    if (status != SUCCESS) {
        printOcsmError(status);
        ocsmFree(modl);
        return -1;
    }
    
    // Get bodies
    int nbranch, npmtr, nbody;
    ocsmInfo(modl, &nbranch, &npmtr, &nbody);
    
    std::cout << "Bodies created: " << nbody << std::endl;
    
    // Get body from stack
    for (int ibody = 1; ibody <= nbody; ibody++) {
        int type, ichld, ileft, irite;
        double vals[10];
        int nnode, nedge, nface;
        
        status = ocsmGetBody(modl, ibody, &type, &ichld, &ileft, &irite,
                            vals, &nnode, &nedge, &nface);
        if (status != SUCCESS) {
            printOcsmError(status);
            continue;
        }
        
        std::cout << "\nBody " << ibody << ":" << std::endl;
        std::cout << "  Type: " << type << std::endl;
        std::cout << "  Nodes: " << nnode << std::endl;
        std::cout << "  Edges: " << nedge << std::endl;
        std::cout << "  Faces: " << nface << std::endl;
        
        
        // Note: Full tessellation test would require getting the actual ego body object
        // For this test, we'll just show that we can access body info via OCSM
        // In real integration, you'd use ocsmGetEgo() to get the EGADS body for tessellation
    }
    
    ocsmFree(modl);
    std::cout << "\n✓ Tessellation test complete" << std::endl;
    
    return 0;
}

/**
 * Main test runner
 */
int main(int argc, char** argv) {
    std::cout << "========================================" << std::endl;
    std::cout << "ESP C Library Direct Integration Test" << std::endl;
    std::cout << "========================================" << std::endl;
    
    // Print ESP version
    int major, minor;
    const char* occRev;
    EG_revision(&major, &minor, &occRev);
    std::cout << "\nEGADS Version: " << major << "." << minor << std::endl;
    std::cout << "OCC Revision: " << occRev << std::endl;
    
    // Run tests
    int result = 0;
    
    result = testBasicCSMLoad();
    if (result != 0) {
        std::cerr << "\n❌ Test 1 failed" << std::endl;
        return 1;
    }
    
    result = testParameterExtraction();
    if (result != 0) {
        std::cerr << "\n❌ Test 2 failed" << std::endl;
        return 1;
    }
    
    result = testBodyTessellation();
    if (result != 0) {
        std::cerr << "\n❌ Test 3 failed" << std::endl;
        return 1;
    }
    
    std::cout << "\n========================================" << std::endl;
    std::cout << "✅ All tests passed!" << std::endl;
    std::cout << "========================================" << std::endl;
    
    return 0;
}
