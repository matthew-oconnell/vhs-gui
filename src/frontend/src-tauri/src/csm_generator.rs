/// CSM (Engineering Sketch Pad) file generator for face attributes
///
/// This module handles generating CSM commands to set bc_name attributes
/// on specific faces of a geometry. Since ESP boolean operations destroy
/// attributes from source bodies, we must use SELECT FACE + ATTRIBUTE
/// commands after the final geometry is created.

use std::collections::HashMap;

/// Generate SELECT FACE and ATTRIBUTE commands for a single body
///
/// # Arguments
/// * `face_bc_names` - Map of face_index (1-based) to bc_name string
/// * `body_index` - The body number in the CSM file (1-based, typically final body on stack)
///
/// # Returns
/// String containing CSM commands like:
/// ```csm
/// select face 1 3 5
/// attribute bc_name $farfield
/// select face 2
/// attribute bc_name $wall
/// ```
pub fn generate_face_attribute_commands(
    face_bc_names: &HashMap<usize, String>,
    body_index: usize,
) -> String {
    // Group faces by bc_name to minimize SELECT commands
    let mut bc_to_faces: HashMap<String, Vec<usize>> = HashMap::new();
    
    for (face_idx, bc_name) in face_bc_names {
        bc_to_faces
            .entry(bc_name.clone())
            .or_insert_with(Vec::new)
            .push(*face_idx);
    }
    
    // Generate commands, sorted by bc_name for deterministic output
    let mut bc_names: Vec<_> = bc_to_faces.keys().collect();
    bc_names.sort();
    
    let mut commands = String::new();
    for bc_name in bc_names {
        let mut faces = bc_to_faces[bc_name].clone();
        faces.sort();
        
        // SELECT FACE command
        commands.push_str("select face");
        for face_idx in &faces {
            commands.push_str(&format!(" {}", face_idx));
        }
        commands.push('\n');
        
        // ATTRIBUTE command
        commands.push_str(&format!("attribute bc_name ${}\n", bc_name));
    }
    
    commands
}

/// Insert face attribute commands into an existing CSM file
///
/// Inserts the SELECT FACE + ATTRIBUTE commands at the end of the CSM file,
/// before any trailing comments or end statements.
///
/// # Arguments
/// * `csm_content` - The existing CSM file content
/// * `commands` - The generated face attribute commands
///
/// # Returns
/// Modified CSM content with attribute commands inserted
pub fn insert_face_attributes(csm_content: &str, commands: &str) -> String {
    // Find insertion point: after the last geometry command, before END or trailing comments
    let lines: Vec<&str> = csm_content.lines().collect();
    
    // Find last non-empty, non-comment line
    let mut insert_idx = lines.len();
    for (i, line) in lines.iter().enumerate().rev() {
        let trimmed = line.trim();
        if !trimmed.is_empty() && !trimmed.starts_with('#') && !trimmed.to_uppercase().starts_with("END") {
            insert_idx = i + 1;
            break;
        }
    }
    
    let mut result = String::new();
    for (i, line) in lines.iter().enumerate() {
        result.push_str(line);
        result.push('\n');
        
        if i == insert_idx - 1 {
            result.push('\n');
            result.push_str(commands);
        }
    }
    
    result
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::esp_ffi::OcsmModel;
    use std::env;
    use std::fs;
    use std::path::PathBuf;
    
    /// Helper to get a temporary test directory
    fn get_test_dir() -> PathBuf {
        let mut path = env::temp_dir();
        path.push("csm_generator_tests");
        fs::create_dir_all(&path).unwrap();
        path
    }
    
    // String generation tests (fast, no ESP dependencies)
    // These validate the CSM command generation logic
    
    #[test]
    fn test_generate_single_face_attribute() {
        let mut face_bc_names = HashMap::new();
        face_bc_names.insert(1, "farfield".to_string());
        
        let commands = generate_face_attribute_commands(&face_bc_names, 1);
        
        assert_eq!(commands, "select face 1\nattribute bc_name $farfield\n");
    }
    
    #[test]
    fn test_generate_multiple_faces_same_bc() {
        let mut face_bc_names = HashMap::new();
        face_bc_names.insert(1, "farfield".to_string());
        face_bc_names.insert(5, "farfield".to_string());
        face_bc_names.insert(10, "farfield".to_string());
        
        let commands = generate_face_attribute_commands(&face_bc_names, 1);
        
        assert_eq!(commands, "select face 1 5 10\nattribute bc_name $farfield\n");
    }
    
    #[test]
    fn test_generate_multiple_bc_names() {
        let mut face_bc_names = HashMap::new();
        face_bc_names.insert(1, "farfield".to_string());
        face_bc_names.insert(2, "wall".to_string());
        face_bc_names.insert(3, "farfield".to_string());
        face_bc_names.insert(4, "symmetry".to_string());
        
        let commands = generate_face_attribute_commands(&face_bc_names, 1);
        
        // Should be sorted alphabetically by bc_name
        let expected = "select face 1 3\nattribute bc_name $farfield\n\
                       select face 4\nattribute bc_name $symmetry\n\
                       select face 2\nattribute bc_name $wall\n";
        assert_eq!(commands, expected);
    }
    
    #[test]
    fn test_insert_into_simple_csm() {
        let csm = "sphere 0 0 0 100\nsubtract\n";
        let commands = "select face 1\nattribute bc_name $farfield\n";
        
        let result = insert_face_attributes(csm, commands);
        
        let expected = "sphere 0 0 0 100\nsubtract\n\n\
                       select face 1\nattribute bc_name $farfield\n";
        assert_eq!(result, expected);
    }
    
    // ESP integration tests (validate library behavior against real ESP/EGADS)
    //
    // TODO: These tests currently fail because OCSM branch attributes (created by SELECT FACE + ATTRIBUTE)
    // are not accessible through the EGADS API (EG_getBodyTopos + EG_attributeRet).
    // We need to either:
    // 1. Use OCSM API (ocsmGetAttr) to get branch attributes and map them to face indices
    // 2. Find a way to transfer OCSM branch attributes to EGADS attributes
    // 3. Use ESP's higher-level API if one exists for this
    //
    // For now, these tests document the expected behavior and serve as integration tests
    // once we implement proper attribute extraction.
    
    #[test]
    #[ignore]  // Ignored until OCSM attribute extraction is implemented
    fn test_esp_attributes_lost_in_boolean_without_select() {
        let test_dir = get_test_dir();
        let csm_path = test_dir.join("test_attr_lost.csm");
        
        // CSM with attributes BEFORE boolean (wrong way - attributes get lost)
        let csm_wrong = "\
sphere 0 0 0 100
attribute bc_name $outer

sphere 0 0 0 50
attribute bc_name $inner

subtract
";
        fs::write(&csm_path, csm_wrong).unwrap();
        
        // Load and build model
        let mut model = OcsmModel::load(csm_path.to_str().unwrap()).unwrap();
        let build_result = model.build().unwrap();
        
        // Need to tessellate before extracting faces
        model.tessellate(0).unwrap(); // 0 = tessellate all bodies
        
        // Get last body on stack (result of subtract)
        let last_body_idx = build_result.bodies_on_stack.last().copied().unwrap() as i32;
        let faces = model.get_body_tessellation(last_body_idx).unwrap();
        
        // CRITICAL ASSUMPTION: Attributes should be LOST because they were on source bodies
        // The final body from SUBTRACT doesn't inherit bc_name from the source spheres
        let mut found_outer = false;
        let mut found_inner = false;
        
        for face_mesh in &faces {
            if let Some(bc) = &face_mesh.bc_name {
                if bc == "outer" { found_outer = true; }
                if bc == "inner" { found_inner = true; }
            }
        }
        
        // This validates our ESP_BC_NAME_GUIDE.md documentation:
        // Attributes on source bodies ARE LOST in boolean operations
        assert!(!found_outer, "Expected 'outer' attribute to be lost in boolean operation");
        assert!(!found_inner, "Expected 'inner' attribute to be lost in boolean operation");
        
        fs::remove_file(csm_path).ok();
    }
    
    #[test]
    #[ignore]  // Ignored until OCSM attribute extraction is implemented
    fn test_esp_select_face_preserves_attributes() {
        let test_dir = get_test_dir();
        let csm_path = test_dir.join("test_select_face.csm");
        
        // CSM with SELECT FACE AFTER boolean (correct way)
        let csm_correct = "\
sphere 0 0 0 100
sphere 0 0 0 50
subtract

select face 1
attribute bc_name $farfield

select face 2
attribute bc_name $symmetry
";
        fs::write(&csm_path, csm_correct).unwrap();
        
        // Load and build model
        let mut model = OcsmModel::load(csm_path.to_str().unwrap()).unwrap();
        let build_result = model.build().unwrap();
        model.tessellate(0).unwrap(); // 0 = tessellate all bodies
        
        // Get tessellation for final body
        let last_body_idx = build_result.bodies_on_stack.last().copied().unwrap() as i32;
        let faces = model.get_body_tessellation(last_body_idx).unwrap();
        
        // Attributes applied via SELECT FACE should be present
        let mut found_farfield = false;
        let mut found_symmetry = false;
        
        for (i, face_mesh) in faces.iter().enumerate() {
            if let Some(bc) = &face_mesh.bc_name {
                eprintln!("Face {}: bc_name = {}", i+1, bc);
                if bc == "farfield" { found_farfield = true; }
                if bc == "symmetry" { found_symmetry = true; }
            }
        }
        
        // This validates the correct SELECT FACE approach
        assert!(found_farfield, "Expected 'farfield' attribute on face 1");
        assert!(found_symmetry, "Expected 'symmetry' attribute on face 2");
        
        fs::remove_file(csm_path).ok();
    }
    
    #[test]
    #[ignore]  // Ignored until OCSM attribute extraction is implemented
    fn test_generated_csm_works_with_esp() {
        let test_dir = get_test_dir();
        let csm_path = test_dir.join("test_generated.csm");
        
        // Start with basic geometry (no attributes)
        let base_csm = "\
sphere 0 0 0 100
sphere 0 0 0 50
subtract
";
        
        // Generate attribute commands
        let mut face_bc_names = HashMap::new();
        face_bc_names.insert(1, "outer_face".to_string());
        face_bc_names.insert(2, "inner_face".to_string());
        
        let commands = generate_face_attribute_commands(&face_bc_names, 1);
        let final_csm = insert_face_attributes(base_csm, &commands);
        
        eprintln!("Generated CSM:\n{}", final_csm);
        
        // Write and load through ESP
        fs::write(&csm_path, final_csm).unwrap();
        
        let mut model = OcsmModel::load(csm_path.to_str().unwrap()).unwrap();
        let build_result = model.build().unwrap();
        model.tessellate(0).unwrap(); // 0 = tessellate all bodies
        
        let last_body_idx = build_result.bodies_on_stack.last().copied().unwrap() as i32;
        let faces = model.get_body_tessellation(last_body_idx).unwrap();
        
        // Verify our generated CSM correctly applies attributes
        let mut found_outer = false;
        let mut found_inner = false;
        
        for face_mesh in &faces {
            if let Some(bc) = &face_mesh.bc_name {
                if bc == "outer_face" { found_outer = true; }
                if bc == "inner_face" { found_inner = true; }
            }
        }
        
        assert!(found_outer, "Generated CSM should set 'outer_face' attribute");
        assert!(found_inner, "Generated CSM should set 'inner_face' attribute");
        
        fs::remove_file(csm_path).ok();
    }
    
    #[test]
    #[ignore]  // Ignored until OCSM attribute extraction is implemented
    fn test_multiple_faces_same_attribute_via_select() {
        let test_dir = get_test_dir();
        let csm_path = test_dir.join("test_multi_select.csm");
        
        // Box has 6 faces - tag 3 of them as "symmetry"
        let mut face_bc_names = HashMap::new();
        face_bc_names.insert(1, "symmetry".to_string());
        face_bc_names.insert(3, "symmetry".to_string());
        face_bc_names.insert(5, "symmetry".to_string());
        face_bc_names.insert(2, "inlet".to_string());
        
        let commands = generate_face_attribute_commands(&face_bc_names, 1);
        
        // Should use "select face 1 3 5" for symmetry (grouped)
        assert!(commands.contains("select face 1 3 5"), 
                "Should group faces with same bc_name in single SELECT");
        
        let base_csm = "box 0 0 0 10 10 10\n";
        let final_csm = insert_face_attributes(base_csm, &commands);
        
        fs::write(&csm_path, final_csm).unwrap();
        
        let mut model = OcsmModel::load(csm_path.to_str().unwrap()).unwrap();
        let build_result = model.build().unwrap();
        model.tessellate(0).unwrap(); // 0 = tessellate all bodies
        
        let last_body_idx = build_result.bodies_on_stack.last().copied().unwrap() as i32;
        let faces = model.get_body_tessellation(last_body_idx).unwrap();
        
        // Count how many faces have "symmetry"
        let symmetry_count = faces.iter()
            .filter(|f| f.bc_name.as_deref() == Some("symmetry"))
            .count();
        
        assert_eq!(symmetry_count, 3, "Should have 3 faces with 'symmetry' attribute");
        
        fs::remove_file(csm_path).ok();
    }
}
