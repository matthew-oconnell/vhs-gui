// ESP FFI bindings and commands (only when ESP libraries are available)
#[cfg(esp_enabled)]
mod esp_ffi;
#[cfg(esp_enabled)]
mod esp_commands;

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
    builder = builder
      .manage(EspState {
        model: Mutex::new(None),
      })
      .invoke_handler(tauri::generate_handler![
        esp_commands::load_csm_file,
        esp_commands::get_model_info,
        esp_commands::update_parameter,
        esp_commands::close_model,
      ]);
  }
  
  #[cfg(esp_disabled)]
  {
    builder = builder.invoke_handler(tauri::generate_handler![]);
  }
  
  builder
    .setup(|app| {
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
