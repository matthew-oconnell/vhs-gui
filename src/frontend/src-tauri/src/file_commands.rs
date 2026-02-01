use serde_json::Value;
use std::fs;
use std::path::PathBuf;
use tauri::command;

/// Save project configuration to a JSON file
/// 
/// # Arguments
/// * `config_data` - The configuration data as JSON value
/// * `file_path` - Absolute path where to save the JSON file
/// 
/// # Returns
/// * `Result<String, String>` - Ok with the saved file path, or Err with error message
#[command]
pub async fn save_project_config(
    config_data: Value,
    file_path: String,
) -> Result<String, String> {
    // Validate that we have valid JSON
    if config_data.is_null() {
        return Err("Configuration data is null".to_string());
    }

    // Convert to pretty-printed JSON
    let json_string = serde_json::to_string_pretty(&config_data)
        .map_err(|e| format!("Failed to serialize configuration: {}", e))?;

    // Ensure the parent directory exists
    let path = PathBuf::from(&file_path);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create directory {}: {}", parent.display(), e))?;
    }

    // Write to file
    fs::write(&path, json_string)
        .map_err(|e| format!("Failed to write file {}: {}", file_path, e))?;

    Ok(file_path)
}

/// Save project configuration with a save dialog
/// 
/// Uses Tauri's dialog plugin to show a save file picker, then saves the configuration
/// 
/// # Arguments
/// * `config_data` - The configuration data as JSON value
/// * `default_filename` - Optional default filename to suggest
/// 
/// # Returns
/// * `Result<Option<String>, String>` - Ok(Some(path)) if saved, Ok(None) if canceled, Err on error
#[command]
pub async fn save_project_config_as(
    app_handle: tauri::AppHandle,
    config_data: Value,
    default_filename: Option<String>,
) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::{DialogExt, FilePath};

    let filename = default_filename.unwrap_or_else(|| "config.json".to_string());

    // Show save dialog
    let file_path = app_handle
        .dialog()
        .file()
        .add_filter("JSON Files", &["json"])
        .set_file_name(&filename)
        .blocking_save_file();

    match file_path {
        Some(FilePath::Path(path)) => {
            // User selected a file path
            let path_str = path.to_string_lossy().to_string();
            save_project_config(config_data, path_str.clone()).await?;
            Ok(Some(path_str))
        }
        Some(FilePath::Url(_)) => {
            Err("URL-based file paths are not supported".to_string())
        }
        None => {
            // User canceled the dialog
            Ok(None)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use std::fs;
    use tempfile::TempDir;

    #[tokio::test]
    async fn test_save_project_config_creates_file() {
        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("test_config.json");
        let file_path_str = file_path.to_string_lossy().to_string();

        let config = json!({
            "HyperSolve": {
                "boundary conditions": [],
                "states": {}
            }
        });

        let result = save_project_config(config.clone(), file_path_str.clone()).await;

        assert!(result.is_ok());
        assert_eq!(result.unwrap(), file_path_str);
        assert!(file_path.exists());

        // Verify content
        let saved_content = fs::read_to_string(&file_path).unwrap();
        let saved_json: Value = serde_json::from_str(&saved_content).unwrap();
        assert_eq!(saved_json, config);
    }

    #[tokio::test]
    async fn test_save_project_config_pretty_print() {
        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("pretty_config.json");
        let file_path_str = file_path.to_string_lossy().to_string();

        let config = json!({
            "HyperSolve": {
                "boundary conditions": [
                    {"type": "no slip", "mesh boundary tags": 1}
                ]
            }
        });

        save_project_config(config, file_path_str).await.unwrap();

        let saved_content = fs::read_to_string(&file_path).unwrap();
        
        // Should be pretty-printed (contains newlines)
        assert!(saved_content.contains('\n'));
        assert!(saved_content.contains("  ")); // Indentation
    }

    #[tokio::test]
    async fn test_save_project_config_creates_parent_directories() {
        let temp_dir = TempDir::new().unwrap();
        let nested_path = temp_dir.path().join("nested/deep/config.json");
        let file_path_str = nested_path.to_string_lossy().to_string();

        let config = json!({"test": "data"});

        let result = save_project_config(config, file_path_str).await;

        assert!(result.is_ok());
        assert!(nested_path.exists());
        assert!(nested_path.parent().unwrap().exists());
    }

    #[tokio::test]
    async fn test_save_project_config_null_data_fails() {
        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("null_test.json");
        let file_path_str = file_path.to_string_lossy().to_string();

        let result = save_project_config(Value::Null, file_path_str).await;

        assert!(result.is_err());
        assert!(result.unwrap_err().contains("null"));
    }

    #[tokio::test]
    async fn test_save_project_config_overwrites_existing() {
        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("overwrite_test.json");
        let file_path_str = file_path.to_string_lossy().to_string();

        // Write initial content
        fs::write(&file_path, "old content").unwrap();

        let config = json!({"new": "content"});
        save_project_config(config.clone(), file_path_str).await.unwrap();

        let saved_content = fs::read_to_string(&file_path).unwrap();
        let saved_json: Value = serde_json::from_str(&saved_content).unwrap();
        assert_eq!(saved_json, config);
        assert!(!saved_content.contains("old content"));
    }

    #[tokio::test]
    async fn test_save_project_config_complex_structure() {
        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("complex_config.json");
        let file_path_str = file_path.to_string_lossy().to_string();

        let config = json!({
            "HyperSolve": {
                "boundary conditions": [
                    {
                        "type": "dirichlet",
                        "mesh boundary tags": [1, 2, 3],
                        "state": {
                            "pressure": 101325.0,
                            "temperature": 300.0,
                            "velocity": [100.0, 0.0, 0.0]
                        }
                    }
                ],
                "states": {
                    "farfield": {
                        "pressure": 101325.0,
                        "temperature": 300.0
                    }
                },
                "solver": {
                    "type": "steady",
                    "cfl": 1.0
                }
            }
        });

        save_project_config(config.clone(), file_path_str).await.unwrap();

        let saved_content = fs::read_to_string(&file_path).unwrap();
        let saved_json: Value = serde_json::from_str(&saved_content).unwrap();
        assert_eq!(saved_json, config);
    }
}
