/**
 * Basic server tests
 */

#include "catch.hpp"
#include <string>

// Helper function to test (example)
std::string greet(const std::string& name) {
    return "Hello, " + name + "!";
}

TEST_CASE("Basic functionality tests", "[server]") {
    SECTION("String concatenation works") {
        REQUIRE(greet("World") == "Hello, World!");
        REQUIRE(greet("Vulcan") == "Hello, Vulcan!");
    }
    
    SECTION("Empty string handling") {
        REQUIRE(greet("") == "Hello, !");
    }
}

TEST_CASE("Server configuration", "[config]") {
    SECTION("Default port is valid") {
        int default_port = 8080;
        REQUIRE(default_port > 0);
        REQUIRE(default_port < 65536);
    }
    
    SECTION("Default host is localhost") {
        std::string default_host = "127.0.0.1";
        REQUIRE(default_host == "127.0.0.1");
    }
}

// TODO: Add HTTP endpoint tests once server is refactored into testable components
// For now, these basic tests verify that Catch2 is working correctly
