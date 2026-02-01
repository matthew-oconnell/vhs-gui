use std::env;
use std::path::PathBuf;

fn main() {
  // Declare custom cfg flags for conditional ESP compilation
  println!("cargo::rustc-check-cfg=cfg(esp_enabled)");
  println!("cargo::rustc-check-cfg=cfg(esp_disabled)");
  
  // Link ESP libraries
  link_esp_libraries();
  
  // Standard Tauri build
  tauri_build::build()
}

fn link_esp_libraries() {
    // Get project root (go up from src/frontend/src-tauri to project root)
    let manifest_dir = env::var("CARGO_MANIFEST_DIR").unwrap();
    let project_root = PathBuf::from(&manifest_dir)
        .parent()  // src/frontend
        .unwrap()
        .parent()  // src
        .unwrap()
        .parent()  // project root
        .unwrap()
        .to_path_buf();
    
    let esp_root = project_root.join("third-party/ESP128/EngSketchPad");
    let occ_root = project_root.join("third-party/ESP128/OpenCASCADE-7.8.1");
    
    let esp_lib = esp_root.join("lib");
    let occ_lib = occ_root.join("lib");
    
    // Debug output
    println!("cargo:warning=Checking for ESP at: {:?}", esp_lib);
    println!("cargo:warning=ESP lib exists: {}", esp_lib.exists());
    
    // Check if ESP is installed
    if !esp_lib.exists() {
        println!("cargo:warning=ESP libraries not found at {:?}", esp_lib);
        println!("cargo:warning=Skipping ESP linking. Install ESP to enable geometry features.");
        println!("cargo:rustc-cfg=esp_disabled");
        return;
    }
    
    println!("cargo:warning=✅ ESP ENABLED - Linking ESP libraries");
    println!("cargo:rustc-cfg=esp_enabled");
    
    println!("cargo:rerun-if-changed=src/esp_ffi.rs");
    println!("cargo:rerun-if-changed=src/esp_commands.rs");
    
    // Add library search paths
    println!("cargo:rustc-link-search=native={}", esp_lib.display());
    println!("cargo:rustc-link-search=native={}", occ_lib.display());
    
    // Link ESP libraries
    println!("cargo:rustc-link-lib=dylib=ocsm");
    println!("cargo:rustc-link-lib=dylib=egads");
    
    // Link OpenCASCADE libraries (required by EGADS)
    let occ_libs = [
        "TKernel", "TKMath", "TKG2d", "TKG3d",
        "TKGeomBase", "TKGeomAlgo",
        "TKBRep", "TKTopAlgo",
        "TKPrim", "TKBool", "TKBO",
        "TKFillet", "TKOffset", "TKShHealing",
        "TKDESTEP", "TKDEIGES",
    ];
    
    for lib in &occ_libs {
        println!("cargo:rustc-link-lib=dylib={}", lib);
    }
    
    // System libraries
    println!("cargo:rustc-link-lib=dylib=pthread");
    println!("cargo:rustc-link-lib=dylib=dl");
    println!("cargo:rustc-link-lib=dylib=m");
    
    // Set RPATH so executable can find libraries at runtime
    // Use $ORIGIN to make it relative to the executable location
    println!("cargo:rustc-link-arg=-Wl,-rpath,{}", esp_lib.display());
    println!("cargo:rustc-link-arg=-Wl,-rpath,{}", occ_lib.display());
    
    // IMPORTANT: Don't use --enable-new-dtags
    // RUNPATH (created by --enable-new-dtags) doesn't propagate to dlopen() calls
    // ESP uses dlopen() to load UDP libraries, so we need RPATH, not RUNPATH
    println!("cargo:rustc-link-arg=-Wl,--disable-new-dtags");  // Force RPATH instead of RUNPATH
}
