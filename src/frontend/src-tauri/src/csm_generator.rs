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
    fn test_generate_empty_map() {
        let face_bc_names = HashMap::new();
        
        let commands = generate_face_attribute_commands(&face_bc_names, 1);
        
        assert_eq!(commands, "");
    }
    
    #[test]
    fn test_insert_into_simple_csm() {
        let csm = "sphere 0 0 0 100\nimport waverider.stp\nsubtract\n";
        let commands = "select face 1\nattribute bc_name $farfield\n";
        
        let result = insert_face_attributes(csm, commands);
        
        let expected = "sphere 0 0 0 100\nimport waverider.stp\nsubtract\n\n\
                       select face 1\nattribute bc_name $farfield\n";
        assert_eq!(result, expected);
    }
    
    #[test]
    fn test_insert_before_trailing_comments() {
        let csm = "sphere 0 0 0 100\nsubtract\n# End of file\n";
        let commands = "select face 1\nattribute bc_name $wall\n";
        
        let result = insert_face_attributes(csm, commands);
        
        let expected = "sphere 0 0 0 100\nsubtract\n\n\
                       select face 1\nattribute bc_name $wall\n# End of file\n";
        assert_eq!(result, expected);
    }
    
    #[test]
    fn test_insert_before_end_statement() {
        let csm = "sphere 0 0 0 100\nsubtract\nEND\n";
        let commands = "select face 1\nattribute bc_name $inlet\n";
        
        let result = insert_face_attributes(csm, commands);
        
        let expected = "sphere 0 0 0 100\nsubtract\n\n\
                       select face 1\nattribute bc_name $inlet\nEND\n";
        assert_eq!(result, expected);
    }
    
    #[test]
    fn test_insert_preserves_existing_commands() {
        let csm = "sphere 0 0 0 100\nset dx @xmax-@xmin\nbox @xmin @ymin @zmin dx dx dx\nsubtract\n";
        let commands = "select face 2 3\nattribute bc_name $symmetry\n";
        
        let result = insert_face_attributes(csm, commands);
        
        assert!(result.contains("sphere 0 0 0 100"));
        assert!(result.contains("set dx @xmax-@xmin"));
        assert!(result.contains("box @xmin @ymin @zmin dx dx dx"));
        assert!(result.contains("subtract"));
        assert!(result.contains("select face 2 3"));
        assert!(result.contains("attribute bc_name $symmetry"));
    }
}
