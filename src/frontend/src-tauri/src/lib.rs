// ESP FFI bindings and commands (only when ESP libraries are available)
#[cfg(esp_enabled)]
mod esp_ffi;
#[cfg(esp_enabled)]
mod esp_commands;
#[cfg(esp_enabled)]
mod csm_generator;

// File operations module (always available)
mod file_commands;

#[cfg(esp_enabled)]
use esp_commands::EspState;
use std::sync::Mutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let mut builder = tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init());
  
  // Only add ESP functionality if libraries are available
  #[cfg(esp_enabled)]
  {
    println!("🔧 ESP ENABLED - Registering ESP commands");
    builder = builder
      .manage(EspState {
        model: Mutex::new(None),
      })
      .invoke_handler(tauri::generate_handler![
        esp_commands::load_csm_file,
        esp_commands::get_model_info,
        esp_commands::update_parameter,
        esp_commands::update_face_bc_names,
        esp_commands::close_model,
        file_commands::save_project_config,
        file_commands::save_project_config_as,
      ]);
  }
  
  #[cfg(esp_disabled)]
  {
    println!("⚠️  ESP DISABLED - No ESP commands registered");
    builder = builder.invoke_handler(tauri::generate_handler![
      file_commands::save_project_config,
      file_commands::save_project_config_as,
    ]);
  }
  
  builder
    .setup(|app| {
      // Set ESP_ROOT environment variable for ESP libraries
      #[cfg(esp_enabled)]
      {
        use std::path::PathBuf;
        
        // Determine ESP_ROOT path
        // 1. Try compile-time environment variable (absolute path)
        // 2. Try resolving relative to executable location
        // 3. Fall back to hardcoded absolute path (development)
        
        let esp_root_path = if let Some(env_root) = option_env!("ESP_ROOT") {
          PathBuf::from(env_root)
        } else {
          // Compute from executable location
          let exe_path = std::env::current_exe()
            .expect("Failed to get executable path");
          let exe_dir = exe_path.parent()
            .expect("Failed to get executable directory");
          
          // Navigate: src/frontend/src-tauri/target/debug -> project root
          exe_dir
            .parent()  // target
            .and_then(|p| p.parent())  // src-tauri
            .and_then(|p| p.parent())  // frontend
            .and_then(|p| p.parent())  // src
            .and_then(|p| p.parent())  // project root
            .map(|p| p.join("third-party/ESP128/EngSketchPad"))
            .unwrap_or_else(|| {
              // Development fallback - use absolute path
              PathBuf::from("/home/matthew/Projects/vulcan-gui/third-party/ESP128/EngSketchPad")
            })
        };
        
        let esp_root_str = esp_root_path.to_str()
          .expect("Invalid ESP_ROOT path encoding");
        
        // Set ESP environment variables for runtime library loading
        std::env::set_var("ESP_ROOT", esp_root_str);
        
        // ESP_UDC_PATH tells ESP where to find User-Defined Component (UDP) libraries
        let esp_lib_path = esp_root_path.join("lib");
        if let Some(esp_lib_str) = esp_lib_path.to_str() {
          std::env::set_var("ESP_UDC_PATH", esp_lib_str);
          
          // Also add to LD_LIBRARY_PATH for dynamic linking (safety measure)
          // RPATH should handle this, but ESP might dlopen() additional libraries
          let occ_lib_path = esp_root_path.parent()
            .map(|p| p.join("OpenCASCADE-7.8.1/lib"));
          
          let mut lib_paths = vec![esp_lib_str.to_string()];
          if let Some(occ_path) = occ_lib_path.and_then(|p| p.to_str().map(String::from)) {
            lib_paths.push(occ_path);
          }
          
          // Prepend to existing LD_LIBRARY_PATH if it exists
          if let Ok(existing) = std::env::var("LD_LIBRARY_PATH") {
            lib_paths.push(existing);
          }
          
          let ld_library_path = lib_paths.join(":");
          std::env::set_var("LD_LIBRARY_PATH", &ld_library_path);
          
          println!("🔧 ESP_ROOT = {}", esp_root_str);
          println!("🔧 ESP_UDC_PATH = {}", esp_lib_str);
          println!("🔧 LD_LIBRARY_PATH = {}", ld_library_path);
        }
        
        // Warn if path doesn't exist
        if !esp_root_path.exists() {
          eprintln!("⚠️  WARNING: ESP_ROOT does not exist: {}", esp_root_str);
          eprintln!("⚠️  ESP will fail to load UDP libraries!");
        } else if !esp_lib_path.exists() {
          eprintln!("⚠️  WARNING: ESP lib directory does not exist: {}", esp_lib_path.display());
          eprintln!("⚠️  ESP will fail to load UDP libraries!");
        } else {
          println!("✅ ESP environment configured");
        }
      }
      
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
