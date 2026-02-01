// Tauri commands for ESP geometry operations
// Replaces Python ESP server functionality

use crate::esp_ffi::{OcsmModel, FaceTessellation};
use crate::csm_generator::{generate_face_attribute_commands, insert_face_attributes};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use std::collections::HashMap;
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
    pub regions: Vec<Region>,  // Add mesh data for 3D rendering
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Region {
    pub name: String,
    pub tag: i32,
    pub body: i32,
    pub face: i32,
    pub vertices: Vec<[f64; 3]>,  // [[x,y,z], ...]
    pub cells: Vec<[i32; 3]>,      // [[v1,v2,v3], ...]
    pub bc_name: Option<String>,
}

/// Load and build CSM file
#[tauri::command]
pub async fn load_csm_file(
    path: String,
    state: State<'_, EspState>
) -> Result<GeometryData, String> {
    let total_start = std::time::Instant::now();
    
    // Load CSM file with absolute path - ESP should resolve dependencies relative to CSM location
    let load_start = std::time::Instant::now();
    let mut model = OcsmModel::load(&path)?;
    let load_end = std::time::Instant::now();
    println!("⏱️  [Performance] CSM load (ocsmLoad): {:?}", load_end.duration_since(load_start));
    
    // Get model info before building
    let info = model.info()?;
    
    // Build geometry
    let build_start = std::time::Instant::now();
    let build_result = model.build()?;
    let build_end = std::time::Instant::now();
    println!("⏱️  [Performance] Geometry build (ocsmBuild): {:?}", build_end.duration_since(build_start));
    
    if build_result.built_to == 0 {
        return Err("Build failed - no geometry created".to_string());
    }
    
    println!("🔧 Build complete: {} bodies on stack", build_result.bodies_on_stack.len());
    println!("   Body indices: {:?}", build_result.bodies_on_stack);
    
    // Get updated info after build
    let info_after = model.info()?;
    
    // Extract all parameters
    let param_start = std::time::Instant::now();
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
    let param_end = std::time::Instant::now();
    println!("⏱️  [Performance] Parameter extraction: {:?}", param_end.duration_since(param_start));
    
    // Note: ocsmTessellate() is optional - EG_makeTessBody will create tessellation
    // But calling it may set up internal state needed by OCSM
    let tess_start = std::time::Instant::now();
    println!("🔧 Preparing model tessellation...");
    match model.tessellate(0) {  // 0 = all bodies
        Ok(_) => {
            let tess_end = std::time::Instant::now();
            println!("✅ ocsmTessellate completed in {:?}", tess_end.duration_since(tess_start));
            println!("⏱️  [Performance] ocsmTessellate: {:?}", tess_end.duration_since(tess_start));
        },
        Err(e) => {
            eprintln!("⚠️  ocsmTessellate failed: {} (will try EG_makeTessBody anyway)", e);
        }
    }
    
    // Extract tessellations for bodies actually on the stack
    // Use the body indices returned by ocsmBuild, not all created bodies
    let extraction_start = std::time::Instant::now();
    let mut bodies = Vec::new();
    let mut regions = Vec::new();
    let mut global_tag = 1;  // Unique tag for each face
    
    eprintln!("🔧 Extracting {} bodies from stack", build_result.bodies_on_stack.len());
    
    for &ibody in &build_result.bodies_on_stack {
        let body_start = std::time::Instant::now();
        eprintln!("   Processing body index {}", ibody);
        
        // Try to get body info - skip if it fails (intermediate construction geometry)
        let body_info = match model.get_body(ibody) {
            Ok(info) => info,
            Err(e) => {
                eprintln!("   ⚠️  Skipping body {} (not accessible): {}", ibody, e);
                continue;
            }
        };
        
        bodies.push(Body {
            index: ibody,
            type_: body_info.type_,
            nodes: body_info.nodes,
            edges: body_info.edges,
            faces: body_info.faces,
        });
        
        // Extract tessellation mesh for rendering
        let tess_extract_start = std::time::Instant::now();
        match model.get_body_tessellation(ibody) {
            Ok(face_meshes) => {
                let tess_extract_end = std::time::Instant::now();
                eprintln!("   ✅ Extracted {} faces from body {} in {:?}", face_meshes.len(), ibody, tess_extract_end.duration_since(tess_extract_start));
                eprintln!("   ⏱️  [Performance] get_body_tessellation({}): {:?}", ibody, tess_extract_end.duration_since(tess_extract_start));
                for face_mesh in face_meshes {
                    // Use bc_name if available, otherwise generate default name
                    let region_name = face_mesh.bc_name.clone()
                        .unwrap_or_else(|| format!("Body{}_Face{}", ibody, face_mesh.face_index));
                    
                    regions.push(Region {
                        name: region_name.clone(),
                        tag: global_tag,
                        body: ibody,
                        face: face_mesh.face_index,
                        vertices: face_mesh.vertices,
                        cells: face_mesh.triangles,
                        bc_name: face_mesh.bc_name,
                    });
                    
                    global_tag += 1;
                }
            },
            Err(e) => {
                eprintln!("   ⚠️  Failed to extract tessellation for body {}: {}", ibody, e);
            }
        }
    }
    let extraction_end = std::time::Instant::now();
    
    println!("🎉 Extraction complete: {} regions from {} bodies", regions.len(), bodies.len());
    println!("⏱️  [Performance] Total body extraction: {:?}", extraction_end.duration_since(extraction_start));
    
    // Store model in state for future operations
    *state.model.lock().unwrap() = Some(model);
    
    let total_end = std::time::Instant::now();
    println!("⏱️  [Performance] TOTAL load_csm_file: {:?}", total_end.duration_since(total_start));
    
    Ok(GeometryData {
        branches: info_after.branches,
        parameters,
        bodies,
        regions,
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
    
    // If no model loaded, return empty geometry data (ESP is available, just no model)
    let model = match model_guard.as_ref() {
        Some(m) => m,
        None => {
            return Ok(GeometryData {
                branches: 0,
                parameters: vec![],
                bodies: vec![],
                regions: vec![],
            });
        }
    };
    
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
        regions: vec![],  // get_model_info doesn't extract tessellation
    })
}

/// Close current model
#[tauri::command]
pub async fn close_model(state: State<'_, EspState>) -> Result<(), String> {
    *state.model.lock().unwrap() = None;
    Ok(())
}

/// Update bc_name attributes for selected faces in the CSM file
///
/// Generates SELECT FACE + ATTRIBUTE commands and inserts them into the CSM file.
/// The modified CSM is saved back to disk and the model is reloaded to apply changes.
///
/// # Arguments
/// * `csm_path` - Path to the CSM file
/// * `face_bc_names` - Map of face indices (1-based) to bc_name strings
///
/// # Returns
/// Success or error message
#[tauri::command]
pub async fn update_face_bc_names(
    csm_path: String,
    face_bc_names: HashMap<usize, String>,
    state: State<'_, EspState>,
) -> Result<String, String> {
    // Read current CSM file
    let csm_content = std::fs::read_to_string(&csm_path)
        .map_err(|e| format!("Failed to read CSM file: {}", e))?;
    
    // Generate face attribute commands (body_index not used yet, pass 1)
    let commands = generate_face_attribute_commands(&face_bc_names, 1);
    
    // Insert commands into CSM
    let modified_csm = insert_face_attributes(&csm_content, &commands);
    
    // Write modified CSM back to file
    std::fs::write(&csm_path, modified_csm)
        .map_err(|e| format!("Failed to write CSM file: {}", e))?;
    
    // Reload the model to apply changes
    let _geometry = load_csm_file(csm_path.clone(), state).await?;
    
    Ok(format!("Updated bc_names for {} faces", face_bc_names.len()))
}
