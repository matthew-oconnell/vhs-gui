// Tauri commands for ESP geometry operations
// Replaces Python ESP server functionality

use crate::esp_ffi::{OcsmModel, ModelInfo, ParameterInfo, BodyInfo};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

/// Shared state for the loaded model
pub struct EspState {
    pub model: Mutex<Option<OcsmModel>>,
}

/// Geometry data returned to frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeometryData {
    pub branches: i32,
    pub parameters: Vec<Parameter>,
    pub bodies: Vec<Body>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Parameter {
    pub name: String,
    pub value: f64,
    pub type_: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Body {
    pub index: i32,
    pub type_: i32,
    pub nodes: i32,
    pub edges: i32,
    pub faces: i32,
}

/// Load and build CSM file
#[tauri::command]
pub async fn load_csm_file(
    path: String,
    state: State<'_, EspState>
) -> Result<GeometryData, String> {
    // Load CSM file
    let mut model = OcsmModel::load(&path)?;
    
    // Get model info before building
    let info = model.info()?;
    
    // Build geometry
    let build_result = model.build()?;
    if build_result.built_to == 0 {
        return Err("Build failed - no geometry created".to_string());
    }
    
    // Get updated info after build
    let info_after = model.info()?;
    
    // Extract all parameters
    let mut parameters = Vec::new();
    for i in 1..=info.parameters {
        let param_info = model.get_parameter(i)?;
        
        // Get value (assuming 1x1 for simplicity - handle arrays later)
        let value = model.get_value(i, 1, 1).unwrap_or(0.0);
        
        parameters.push(Parameter {
            name: param_info.name,
            value,
            type_: param_info.type_,
        });
    }
    
    // Extract all bodies
    let mut bodies = Vec::new();
    for i in 1..=info_after.bodies {
        let body_info = model.get_body(i)?;
        
        bodies.push(Body {
            index: i,
            type_: body_info.type_,
            nodes: body_info.nodes,
            edges: body_info.edges,
            faces: body_info.faces,
        });
    }
    
    // Store model in state for future operations
    *state.model.lock().unwrap() = Some(model);
    
    Ok(GeometryData {
        branches: info_after.branches,
        parameters,
        bodies,
    })
}

/// Update a parameter value and rebuild
#[tauri::command]
pub async fn update_parameter(
    param_name: String,
    new_value: f64,
    state: State<'_, EspState>
) -> Result<GeometryData, String> {
    let mut model_guard = state.model.lock().unwrap();
    let model = model_guard.as_mut()
        .ok_or("No model loaded")?;
    
    // TODO: Find parameter by name, set value, rebuild
    // This requires ocsmSetValu() binding
    
    Err("Not yet implemented - need ocsmSetValu binding".to_string())
}

/// Get current model info without rebuilding
#[tauri::command]
pub async fn get_model_info(
    state: State<'_, EspState>
) -> Result<GeometryData, String> {
    let model_guard = state.model.lock().unwrap();
    let model = model_guard.as_ref()
        .ok_or("No model loaded")?;
    
    let info = model.info()?;
    
    // Extract parameters
    let mut parameters = Vec::new();
    for i in 1..=info.parameters {
        let param_info = model.get_parameter(i)?;
        let value = model.get_value(i, 1, 1).unwrap_or(0.0);
        
        parameters.push(Parameter {
            name: param_info.name,
            value,
            type_: param_info.type_,
        });
    }
    
    // Extract bodies
    let mut bodies = Vec::new();
    for i in 1..=info.bodies {
        let body_info = model.get_body(i)?;
        
        bodies.push(Body {
            index: i,
            type_: body_info.type_,
            nodes: body_info.nodes,
            edges: body_info.edges,
            faces: body_info.faces,
        });
    }
    
    Ok(GeometryData {
        branches: info.branches,
        parameters,
        bodies,
    })
}

/// Close current model
#[tauri::command]
pub async fn close_model(state: State<'_, EspState>) -> Result<(), String> {
    *state.model.lock().unwrap() = None;
    Ok(())
}
