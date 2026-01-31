// ESP FFI bindings and commands
mod esp_ffi;
mod esp_commands;

use esp_commands::EspState;
use std::sync::Mutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .manage(EspState {
      model: Mutex::new(None),
    })
    .invoke_handler(tauri::generate_handler![
      esp_commands::load_csm_file,
      esp_commands::get_model_info,
      esp_commands::update_parameter,
      esp_commands::close_model,
    ])
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
