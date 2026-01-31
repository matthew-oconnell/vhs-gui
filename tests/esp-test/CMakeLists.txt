cmake_minimum_required(VERSION 3.15)
project(ESP_Test VERSION 1.0.0 LANGUAGES CXX C)

# C++17 standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# ESP installation directory
set(ESP_ROOT "${CMAKE_SOURCE_DIR}/../../third-party/ESP128/EngSketchPad" 
    CACHE PATH "Path to ESP installation")

# OpenCASCADE directory (EGADS depends on it)
set(OCC_ROOT "${CMAKE_SOURCE_DIR}/../../third-party/ESP128/OpenCASCADE-7.8.1"
    CACHE PATH "Path to OpenCASCADE installation")

message(STATUS "ESP_ROOT: ${ESP_ROOT}")
message(STATUS "OCC_ROOT: ${OCC_ROOT}")

# Check if ESP exists
if(NOT EXISTS "${ESP_ROOT}")
    message(FATAL_ERROR "ESP not found at ${ESP_ROOT}. Please set ESP_ROOT.")
endif()

if(NOT EXISTS "${OCC_ROOT}")
    message(FATAL_ERROR "OpenCASCADE not found at ${OCC_ROOT}. Please set OCC_ROOT.")
endif()

# Include directories
include_directories(
    ${ESP_ROOT}/include
)

# Library directories
link_directories(
    ${ESP_ROOT}/lib
    ${OCC_ROOT}/lib
)

# Test executable
add_executable(esp_test esp_test.cpp)

# Link ESP libraries
# Order matters - libocsm.so depends on libegads.so, libegads.so depends on OpenCASCADE
target_link_libraries(esp_test
    PRIVATE
    ocsm        # OpenCSM library
    egads       # EGADS geometry kernel
    # OpenCASCADE libraries (core dependencies for EGADS)
    # Kernel and math
    TKernel TKMath
    # Geometry foundations
    TKG2d TKG3d TKGeomBase TKGeomAlgo
    # Topology and BRep
    TKBRep TKTopAlgo
    # Modeling operations
    TKPrim TKBool TKBO TKFillet TKOffset TKShHealing
    # Data exchange (for STEP/IGES if needed)
    TKDESTEP TKDEIGES
    # System libraries
    pthread dl m
)

# Set RPATH so executable can find shared libraries
set_target_properties(esp_test PROPERTIES
    BUILD_RPATH "${ESP_ROOT}/lib:${OCC_ROOT}/lib"
    INSTALL_RPATH "${ESP_ROOT}/lib:${OCC_ROOT}/lib"
)

# Copy test to bin directory for convenience
install(TARGETS esp_test DESTINATION bin)

# Print build info
message(STATUS "Build type: ${CMAKE_BUILD_TYPE}")
message(STATUS "CXX Compiler: ${CMAKE_CXX_COMPILER}")
message(STATUS "Libraries: ocsm, egads")
