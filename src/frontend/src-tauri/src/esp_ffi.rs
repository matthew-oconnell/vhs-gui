// ESP/OCSM FFI Bindings for Rust
// Direct integration with ESP C libraries to replace Python server

#![allow(dead_code)]
#![allow(non_upper_case_globals)]
#![allow(non_camel_case_types)]
#![allow(non_snake_case)]

use std::ffi::{CString, CStr};
use std::os::raw::{c_char, c_int, c_double, c_void};
use std::ptr;

// Libc for chdir
extern "C" {
    fn chdir(path: *const c_char) -> c_int;
    fn getcwd(buf: *mut c_char, size: usize) -> *mut c_char;
}

// ESP installation path (adjust as needed)
const ESP_ROOT: &str = "../../third-party/ESP128/EngSketchPad";

// Link against ESP libraries
#[link(name = "ocsm")]
#[link(name = "egads")]
extern "C" {

    // Core OCSM functions
    fn ocsmLoad(filename: *const c_char, modl: *mut *mut c_void) -> c_int;
    fn ocsmFree(modl: *mut c_void) -> c_int;
    fn ocsmInfo(
        modl: *mut c_void,
        nbranch: *mut c_int,
        npmtr: *mut c_int,
        nbody: *mut c_int
    ) -> c_int;
    fn ocsmBuild(
        modl: *mut c_void,
        buildTo: c_int,
        builtTo: *mut c_int,
        nbody: *mut c_int,         // (in) allocated size, (out) actual count on stack
        body: *mut c_int           // (out) array of body indices on stack (LIFO)
    ) -> c_int;
    
    // Tessellation
    fn ocsmTessellate(
        modl: *mut c_void,
        ibody: c_int  // Body index (1:nbody) or 0 for all on stack
    ) -> c_int;
    
    // Parameter access
    fn ocsmGetPmtr(
        modl: *mut c_void,
        ipmtr: c_int,
        type_: *mut c_int,
        nrow: *mut c_int,
        ncol: *mut c_int,
        name: *mut c_char
    ) -> c_int;
    fn ocsmGetValu(
        modl: *mut c_void,
        ipmtr: c_int,
        irow: c_int,
        icol: c_int,
        value: *mut c_double,
        dot: *mut c_double
    ) -> c_int;
    
    // Body/geometry access
    fn ocsmGetBody(
        modl: *mut c_void,
        ibody: c_int,
        type_: *mut c_int,
        ichld: *mut c_int,
        ileft: *mut c_int,
        irite: *mut c_int,
        vals: *mut c_double,
        nnode: *mut c_int,
        nedge: *mut c_int,
        nface: *mut c_int
    ) -> c_int;
    
    // Get EGADS objects (body, tessellation, etc.)
    fn ocsmGetEgo(
        modl: *mut c_void,
        ibody: c_int,
        seltype: c_int,  // OCSM_BODY, OCSM_NODE, OCSM_EDGE, or OCSM_FACE
        iselect: c_int,  // 0=body, 1=tessellation, 2=context, 3=ebody, 4=etess for ebody
        the_ego: *mut *mut c_void
    ) -> c_int;
    
    // EGADS tessellation functions
    fn EG_makeTessBody(
        object: *mut c_void,      // EGADS body object
        params: *const c_double,  // Tessellation parameters [angle, relSide, relSag]
        tess: *mut *mut c_void    // Output: tessellation object
    ) -> c_int;
    
    fn EG_getTessFace(
        tess: *mut c_void,
        face_index: c_int,
        plen: *mut c_int,
        xyz: *mut *const c_double,
        uv: *mut *const c_double,
        ptype: *mut *const c_int,
        pindex: *mut *const c_int,
        tlen: *mut c_int,
        tris: *mut *const c_int,
        tric: *mut *const c_int
    ) -> c_int;
    
    // EGADS topology and attribute functions
    fn EG_getBodyTopos(
        body: *mut c_void,
        src: *mut c_void,  // Can be null
        oclass: c_int,     // Object class (FACE = 5)
        ntopo: *mut c_int, // Output: number of topology objects
        topos: *mut *mut *mut c_void  // Output: array of topology objects
    ) -> c_int;
    
    fn EG_attributeRet(
        obj: *mut c_void,
        name: *const c_char,
        atype: *mut c_int,
        len: *mut c_int,
        ints: *mut *const c_int,
        reals: *mut *const c_double,
        str: *mut *const c_char
    ) -> c_int;
    
    fn EG_free(ptr: *mut c_void);
}

// OCSM constants for ocsmGetEgo seltype parameter
const OCSM_NODE: c_int = 600;
const OCSM_EDGE: c_int = 601;
const OCSM_FACE: c_int = 602;
const OCSM_BODY: c_int = 603;

// EGADS constants for topology classes
const FACE: c_int = 5;  // Face topology class (from egads.h)

// Success/error codes
pub const SUCCESS: c_int = 0;

/// Wrapper for an OCSM model
pub struct OcsmModel {
    ptr: *mut c_void,
    working_dir: String,  // Store the directory where CSM file is located
}

impl OcsmModel {
    /// Load a CSM file
    /// 
    /// IMPORTANT: ESP loads imported files (like .stp) during build(), not during load().
    /// We must keep the working directory set to the CSM file's directory for the
    /// entire lifetime of the model, not just during ocsmLoad().
    pub fn load(filename: &str) -> Result<Self, String> {
        use std::path::Path;
        
        let path = Path::new(filename);
        let parent_dir = path.parent()
            .ok_or_else(|| "Invalid file path".to_string())?;
        let file_name = path.file_name()
            .and_then(|n| n.to_str())
            .ok_or_else(|| "Invalid filename".to_string())?;
        
        // Store the CSM file's directory as the working directory
        let working_dir = parent_dir.to_str()
            .ok_or_else(|| "Invalid directory path encoding".to_string())?
            .to_string();
        
        // Change to CSM file's directory so ESP can find dependency files
        let c_parent_dir = CString::new(working_dir.as_str())
            .map_err(|e| format!("Invalid directory path: {}", e))?;
        
        unsafe {
            if chdir(c_parent_dir.as_ptr()) != 0 {
                return Err("Failed to change directory".to_string());
            }
        }
        
        // Load CSM using just the filename (we're in the right directory now)
        let c_filename = CString::new(file_name)
            .map_err(|e| format!("Invalid filename: {}", e))?;
        
        let mut modl: *mut c_void = ptr::null_mut();
        
        let status = unsafe { ocsmLoad(c_filename.as_ptr(), &mut modl) };
        
        if status != SUCCESS {
            Err(format!("ocsmLoad failed with status {}", status))
        } else {
            // Keep working directory set - build() will need it!
            Ok(OcsmModel { ptr: modl, working_dir })
        }
    }
    
    /// Get model information
    pub fn info(&self) -> Result<ModelInfo, String> {
        let mut nbranch: c_int = 0;
        let mut npmtr: c_int = 0;
        let mut nbody: c_int = 0;
        
        unsafe {
            let status = ocsmInfo(self.ptr, &mut nbranch, &mut npmtr, &mut nbody);
            if status != SUCCESS {
                return Err(format!("ocsmInfo failed with status {}", status));
            }
        }
        
        Ok(ModelInfo {
            branches: nbranch,
            parameters: npmtr,
            bodies: nbody,
        })
    }
    
    /// Build the geometry model
    /// 
    /// IMPORTANT: ESP loads imported files (like .stp) during this call.
    /// We must be in the CSM file's directory when this runs.
    pub fn build(&mut self) -> Result<BuildResult, String> {
        let total_build_start = std::time::Instant::now();
        
        // Ensure we're in the correct directory for ESP to find imported files
        let chdir_start = std::time::Instant::now();
        let c_working_dir = CString::new(self.working_dir.as_str())
            .map_err(|e| format!("Invalid working directory: {}", e))?;
        
        unsafe {
            if chdir(c_working_dir.as_ptr()) != 0 {
                return Err("Failed to change to working directory for build".to_string());
            }
        }
        let chdir_end = std::time::Instant::now();
        eprintln!("  ⏱️  [Build Detail] chdir setup: {:?}", chdir_end.duration_since(chdir_start));
        
        let mut builtTo: c_int = 0;
        let mut nbody: c_int = 100;  // Allocate space for up to 100 bodies
        let mut bodies = vec![0i32; 100];
        
        eprintln!("  🔨 Calling ESP ocsmBuild (this executes CSM script + imports STEP files)...");
        let ocsm_start = std::time::Instant::now();
        unsafe {
            let status = ocsmBuild(
                self.ptr, 
                0,  // buildTo: 0 = build all
                &mut builtTo, 
                &mut nbody, 
                bodies.as_mut_ptr()
            );
            
            let ocsm_end = std::time::Instant::now();
            eprintln!("  ⏱️  [Build Detail] ocsmBuild C call: {:?}", ocsm_end.duration_since(ocsm_start));
            
            // Error -216 is benign (TOO_MANY_BODYS_ON_STACK)
            if status != SUCCESS && status != -216 && builtTo == 0 {
                return Err(format!("ocsmBuild failed with status {}", status));
            }
        }
        
        // Truncate to actual number of bodies
        let cleanup_start = std::time::Instant::now();
        bodies.truncate(nbody as usize);
        
        eprintln!("🔍 ocsmBuild returned nbody={}, body array={:?}", nbody, bodies);
        
        let total_build_end = std::time::Instant::now();
        eprintln!("  ⏱️  [Build Detail] Post-processing: {:?}", total_build_end.duration_since(cleanup_start));
        eprintln!("  ⏱️  [Build Detail] Total build() wrapper: {:?}", total_build_end.duration_since(total_build_start));
        
        Ok(BuildResult {
            built_to: builtTo,
            bodies_on_stack: bodies,
        })
    }
    
    /// Get parameter name and info
    pub fn get_parameter(&self, index: i32) -> Result<ParameterInfo, String> {
        let mut type_: c_int = 0;
        let mut nrow: c_int = 0;
        let mut ncol: c_int = 0;
        let mut name_buf = vec![0u8; 256];
        
        unsafe {
            let status = ocsmGetPmtr(
                self.ptr,
                index,
                &mut type_,
                &mut nrow,
                &mut ncol,
                name_buf.as_mut_ptr() as *mut c_char
            );
            
            if status != SUCCESS {
                return Err(format!("ocsmGetPmtr failed with status {}", status));
            }
        }
        
        // Convert C string to Rust string
        let name = String::from_utf8_lossy(&name_buf)
            .trim_end_matches('\0')
            .to_string();
        
        Ok(ParameterInfo {
            name,
            type_: type_,
            rows: nrow,
            cols: ncol,
        })
    }
    
    /// Get parameter value
    pub fn get_value(&self, index: i32, row: i32, col: i32) -> Result<f64, String> {
        let mut value: c_double = 0.0;
        let mut dot: c_double = 0.0;
        
        unsafe {
            let status = ocsmGetValu(self.ptr, index, row, col, &mut value, &mut dot);
            if status != SUCCESS {
                return Err(format!("ocsmGetValu failed with status {}", status));
            }
        }
        
        Ok(value)
    }
    
    /// Get body topology information
    pub fn get_body(&self, index: i32) -> Result<BodyInfo, String> {
        let mut type_: c_int = 0;
        let mut ichld: c_int = 0;
        let mut ileft: c_int = 0;
        let mut irite: c_int = 0;
        let mut vals = vec![0.0; 10];
        let mut nnode: c_int = 0;
        let mut nedge: c_int = 0;
        let mut nface: c_int = 0;
        
        unsafe {
            let status = ocsmGetBody(
                self.ptr,
                index,
                &mut type_,
                &mut ichld,
                &mut ileft,
                &mut irite,
                vals.as_mut_ptr(),
                &mut nnode,
                &mut nedge,
                &mut nface
            );
            
            if status != SUCCESS {
                return Err(format!("ocsmGetBody failed with status {}", status));
            }
        }
        
        Ok(BodyInfo {
            type_: type_,
            nodes: nnode,
            edges: nedge,
            faces: nface,
        })
    }
    
    /// Tessellate the model bodies
    /// 
    /// Must be called after ocsmBuild() and before extracting tessellation data.
    /// Pass 0 to tessellate all bodies on the stack, or specific body index.
    pub fn tessellate(&self, body_index: i32) -> Result<(), String> {
        unsafe {
            let status = ocsmTessellate(self.ptr, body_index);
            if status != SUCCESS {
                return Err(format!("ocsmTessellate failed with status {}", status));
            }
        }
        Ok(())
    }
    
    /// Extract tessellation mesh from a body using EGADS API
    /// 
    /// IMPORTANT: ocsmBuild() already creates tessellation automatically.
    /// We retrieve the existing tessellation (iselect=1), not create a new one!
    pub fn get_body_tessellation(&self, body_index: i32) -> Result<Vec<FaceTessellation>, String> {
        let total_start = std::time::Instant::now();
        
        unsafe {
            // Get the pre-existing tessellation created by ocsmBuild()
            // Python version does: tess_ego = modl.GetEgo(ibody, ocsm.BODY, 1)
            let tess_start = std::time::Instant::now();
            let mut tess: *mut c_void = ptr::null_mut();
            
            eprintln!("🔍 Calling ocsmGetEgo(modl={:?}, ibody={}, seltype={}, iselect=1)", 
                      self.ptr, body_index, OCSM_BODY);
            
            let status = ocsmGetEgo(
                self.ptr,
                body_index,
                OCSM_BODY,  // Requesting body-level object
                1,          // iselect=1 means the tessellation object (already created by ocsmBuild!)
                &mut tess
            );
            
            let tess_end = std::time::Instant::now();
            eprintln!("🔍 ocsmGetEgo(iselect=1) returned status={}, tess ptr={:?}", status, tess);
            eprintln!("    ⏱️  [Tess Detail] Get existing tessellation: {:?}", tess_end.duration_since(tess_start));
            
            if status != SUCCESS || tess.is_null() {
                return Err(format!("Failed to get tessellation for body {}: status {}", body_index, status));
            }
            
            // Also get the body object to extract face attributes
            let mut body: *mut c_void = ptr::null_mut();
            let status = ocsmGetEgo(
                self.ptr,
                body_index,
                OCSM_BODY,
                0,  // iselect=0 means the body object itself
                &mut body
            );
            
            if status != SUCCESS || body.is_null() {
                return Err(format!("Failed to get body object for body {}: status {}", body_index, status));
            }
            
            // Get all face objects from the body to extract bc_name attributes
            let mut nfaces: c_int = 0;
            let mut faces: *mut *mut c_void = ptr::null_mut();
            let status = EG_getBodyTopos(body, ptr::null_mut(), FACE, &mut nfaces, &mut faces);
            
            if status != SUCCESS {
                eprintln!("⚠️  Failed to get face topology for body {}: status {}", body_index, status);
            }
            
            // Get body info to know how many faces there are
            let body_info = self.get_body(body_index)?;
            let nfaces_from_body = body_info.faces;
            
            let mut face_meshes = Vec::new();
            
            // Extract tessellation for each face (1-indexed in EGADS)
            let face_extract_start = std::time::Instant::now();
            for iface in 1..=nfaces_from_body {
                let mut plen: c_int = 0;  // Number of points
                let mut xyz: *const c_double = ptr::null();  // Point coordinates
                let mut uv: *const c_double = ptr::null();   // UV parameters
                let mut ptype: *const c_int = ptr::null();   // Point types
                let mut pindex: *const c_int = ptr::null();  // Point indices
                let mut tlen: c_int = 0;  // Number of triangles
                let mut tris: *const c_int = ptr::null();    // Triangle indices
                let mut tric: *const c_int = ptr::null();    // Triangle neighbors
                
                let status = EG_getTessFace(
                    tess,
                    iface,
                    &mut plen,
                    &mut xyz,
                    &mut uv,
                    &mut ptype,
                    &mut pindex,
                    &mut tlen,
                    &mut tris,
                    &mut tric
                );
                
                if status != SUCCESS {
                    // Skip faces with no tessellation
                    continue;
                }
                
                // Extract vertices (xyz has plen*3 doubles: x1,y1,z1, x2,y2,z2, ...)
                let mut vertices = Vec::new();
                for i in 0..plen as usize {
                    let x = *xyz.offset((i * 3) as isize);
                    let y = *xyz.offset((i * 3 + 1) as isize);
                    let z = *xyz.offset((i * 3 + 2) as isize);
                    vertices.push([x, y, z]);
                }
                
                // Extract triangles (tris has tlen*3 ints, 1-indexed)
                let mut triangles = Vec::new();
                for i in 0..tlen as usize {
                    let v1 = (*tris.offset((i * 3) as isize) - 1) as i32;  // Convert to 0-based
                    let v2 = (*tris.offset((i * 3 + 1) as isize) - 1) as i32;
                    let v3 = (*tris.offset((i * 3 + 2) as isize) - 1) as i32;
                    triangles.push([v1, v2, v3]);
                }
                
                // Try to extract bc_name attribute from this face
                let bc_name = if !faces.is_null() && (iface as usize) <= nfaces as usize {
                    self.get_face_bc_name(*faces.offset((iface - 1) as isize))
                } else {
                    None
                };
                
                face_meshes.push(FaceTessellation {
                    body_index,
                    face_index: iface,
                    vertices,
                    triangles,
                    bc_name,
                });
            }
            let face_extract_end = std::time::Instant::now();
            eprintln!("    ⏱️  [Tess Detail] Face extraction loop ({} faces): {:?}", nfaces_from_body, face_extract_end.duration_since(face_extract_start));
            
            // Free the faces array allocated by EG_getBodyTopos
            if !faces.is_null() {
                EG_free(faces as *mut c_void);
            }
            
            let total_end = std::time::Instant::now();
            eprintln!("    ⏱️  [Tess Detail] Total get_body_tessellation: {:?}", total_end.duration_since(total_start));
            
            Ok(face_meshes)
        }
    }
    
    /// Extract bc_name attribute from a face object
    fn get_face_bc_name(&self, face: *mut c_void) -> Option<String> {
        unsafe {
            if face.is_null() {
                return None;
            }
            
            let attr_name = CString::new("bc_name").ok()?;
            let mut atype: c_int = 0;
            let mut len: c_int = 0;
            let mut ints: *const c_int = ptr::null();
            let mut reals: *const c_double = ptr::null();
            let mut str_ptr: *const c_char = ptr::null();
            
            let status = EG_attributeRet(
                face,
                attr_name.as_ptr(),
                &mut atype,
                &mut len,
                &mut ints,
                &mut reals,
                &mut str_ptr
            );
            
            // EGADS attribute types: 1=int, 2=double, 3=string
            if status == SUCCESS && atype == 3 && !str_ptr.is_null() {
                let c_str = CStr::from_ptr(str_ptr);
                match c_str.to_str() {
                    Ok(s) => Some(s.to_string()),
                    Err(_) => None
                }
            } else {
                None
            }
        }
    }
}

impl Drop for OcsmModel {
    fn drop(&mut self) {
        if !self.ptr.is_null() {
            unsafe {
                ocsmFree(self.ptr);
            }
        }
    }
}

// Safe to send between threads (OCSM models are thread-safe after loading)
unsafe impl Send for OcsmModel {}

/// Model metadata
#[derive(Debug, Clone)]
pub struct ModelInfo {
    pub branches: i32,
    pub parameters: i32,
    pub bodies: i32,
}

/// Build operation result
#[derive(Debug, Clone)]
pub struct BuildResult {
    pub built_to: i32,
    pub bodies_on_stack: Vec<i32>,  // Actual body indices on the stack (LIFO)
}

/// Parameter metadata
#[derive(Debug, Clone)]
pub struct ParameterInfo {
    pub name: String,
    pub type_: i32,
    pub rows: i32,
    pub cols: i32,
}

/// Body topology information
#[derive(Debug, Clone)]
pub struct BodyInfo {
    pub type_: i32,
    pub nodes: i32,
    pub edges: i32,
    pub faces: i32,
}

/// Face tessellation mesh data
#[derive(Debug, Clone)]
pub struct FaceTessellation {
    pub body_index: i32,
    pub face_index: i32,
    pub vertices: Vec<[f64; 3]>,  // [[x,y,z], ...]
    pub triangles: Vec<[i32; 3]>,  // [[v1,v2,v3], ...] (0-based indices)
    pub bc_name: Option<String>,   // Boundary condition name from ESP attribute
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::io::Write;

    #[test]
    fn test_load_simple_csm() {
        // Create temporary CSM file
        let csm_content = r#"
# Test box
DESPMTR width 10.0
DESPMTR height 5.0
DESPMTR depth 3.0

BOX 0 0 0 width height depth
"#;
        
        let mut file = fs::File::create("/tmp/test_esp_ffi.csm").unwrap();
        file.write_all(csm_content.as_bytes()).unwrap();
        
        // Load model
        let model = OcsmModel::load("/tmp/test_esp_ffi.csm").unwrap();
        
        // Check info
        let info = model.info().unwrap();
        assert_eq!(info.parameters, 3);
        assert_eq!(info.branches, 1);
        
        // Clean up
        fs::remove_file("/tmp/test_esp_ffi.csm").ok();
    }
}
