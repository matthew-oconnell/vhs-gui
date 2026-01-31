// ESP/OCSM FFI Bindings for Rust
// Direct integration with ESP C libraries to replace Python server

#![allow(dead_code)]
#![allow(non_upper_case_globals)]
#![allow(non_camel_case_types)]
#![allow(non_snake_case)]

use std::ffi::{CString, CStr};
use std::os::raw::{c_char, c_int, c_double, c_void};
use std::ptr;

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
        buildStatus: *mut c_int,
        numWarn: *mut c_int
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
}

// Success/error codes
pub const SUCCESS: c_int = 0;

/// Wrapper for an OCSM model
pub struct OcsmModel {
    ptr: *mut c_void,
}

impl OcsmModel {
    /// Load a CSM file
    pub fn load(filename: &str) -> Result<Self, String> {
        let c_filename = CString::new(filename)
            .map_err(|e| format!("Invalid filename: {}", e))?;
        
        let mut modl: *mut c_void = ptr::null_mut();
        
        unsafe {
            let status = ocsmLoad(c_filename.as_ptr(), &mut modl);
            if status != SUCCESS {
                return Err(format!("ocsmLoad failed with status {}", status));
            }
        }
        
        Ok(OcsmModel { ptr: modl })
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
    pub fn build(&mut self) -> Result<BuildResult, String> {
        let mut builtTo: c_int = 0;
        let mut buildStatus: c_int = 0;
        let mut numWarn: c_int = 0;
        
        unsafe {
            let status = ocsmBuild(self.ptr, 0, &mut builtTo, &mut buildStatus, &mut numWarn);
            
            // Error -216 is benign (TOO_MANY_BODYS_ON_STACK)
            if status != SUCCESS && status != -216 && builtTo == 0 {
                return Err(format!("ocsmBuild failed with status {}", status));
            }
        }
        
        Ok(BuildResult {
            built_to: builtTo,
            build_status: buildStatus,
            num_warnings: numWarn,
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
    pub build_status: i32,
    pub num_warnings: i32,
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
