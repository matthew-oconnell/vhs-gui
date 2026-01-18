cmake_minimum_required(VERSION 3.15)
project(VulcanServer VERSION 1.0.0 LANGUAGES CXX)

# C++17 standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Compiler warnings
if(CMAKE_CXX_COMPILER_ID MATCHES "GNU|Clang")
    add_compile_options(-Wall -Wextra -Wpedantic)
endif()

# Find dependencies
find_package(Threads REQUIRED)

# Include directories
include_directories(${CMAKE_CURRENT_SOURCE_DIR}/include)

# Server executable
add_executable(vulcan_server
    src/main.cpp
)

target_link_libraries(vulcan_server
    PRIVATE
    Threads::Threads
)

# Enable testing
enable_testing()

# Tests executable
add_executable(vulcan_tests
    tests/test_main.cpp
    tests/test_server.cpp
    tests/test_file_handler.cpp
)

target_link_libraries(vulcan_tests
    PRIVATE
    Threads::Threads
)

# Register tests with CTest
add_test(NAME VulcanServerTests COMMAND vulcan_tests)

# Installation
install(TARGETS vulcan_server
    RUNTIME DESTINATION bin
)

# Print build configuration
message(STATUS "Build type: ${CMAKE_BUILD_TYPE}")
message(STATUS "C++ compiler: ${CMAKE_CXX_COMPILER_ID} ${CMAKE_CXX_COMPILER_VERSION}")
message(STATUS "C++ standard: ${CMAKE_CXX_STANDARD}")
