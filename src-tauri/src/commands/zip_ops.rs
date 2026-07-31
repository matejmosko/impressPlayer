use std::fs::File;
use std::io::{Read, Write};
use std::path::PathBuf;
use zip::ZipArchive;

#[tauri::command]
pub fn extract_zip(zip_path: String, dest_dir: String) -> Result<Vec<String>, String> {
    let zip_file = File::open(&zip_path).map_err(|e| format!("Failed to open zip: {}", e))?;
    let mut archive =
        ZipArchive::new(zip_file).map_err(|e| format!("Failed to read zip archive: {}", e))?;
    let dest = PathBuf::from(&dest_dir);
    let mut extracted = Vec::new();

    for i in 0..archive.len() {
        let mut file = archive
            .by_index(i)
            .map_err(|e| format!("Failed to read zip entry: {}", e))?;
        let outpath = dest.join(file.mangled_name());

        if file.is_dir() {
            std::fs::create_dir_all(&outpath)
                .map_err(|e| format!("Failed to create dir: {}", e))?;
        } else {
            if let Some(parent) = outpath.parent() {
                std::fs::create_dir_all(parent)
                    .map_err(|e| format!("Failed to create parent dir: {}", e))?;
            }
            let mut outfile =
                File::create(&outpath).map_err(|e| format!("Failed to create file: {}", e))?;
            let mut buf = Vec::new();
            file.read_to_end(&mut buf)
                .map_err(|e| format!("Failed to read zip entry: {}", e))?;
            outfile
                .write_all(&buf)
                .map_err(|e| format!("Failed to write file: {}", e))?;
        }
        extracted.push(outpath.to_string_lossy().to_string());
    }

    Ok(extracted)
}
