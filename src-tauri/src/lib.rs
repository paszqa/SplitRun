#[cfg_attr(mobile, tauri::mobile_entry_point)]
use serde::Serialize;
use device_query::{DeviceQuery, DeviceState, Keycode};
use std::collections::HashSet;
use std::sync::{Arc, Mutex};

// Global state for tracking pressed keys
type GlobalKeyState = Arc<Mutex<HashSet<Keycode>>>;

#[derive(Serialize)]
struct FsEntry {
  name: String,
  path: String,
  is_dir: bool,
  is_file: bool,
}

#[tauri::command]
fn write_text_file(path: String, contents: String) -> Result<(), String> {
  std::fs::write(path, contents).map_err(|e| e.to_string())
}

#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
  std::fs::read_to_string(path).map_err(|e| e.to_string())
}

#[tauri::command]
fn list_dir(path: String) -> Result<Vec<FsEntry>, String> {
  let rd = std::fs::read_dir(&path).map_err(|e| e.to_string())?;
  let mut out = Vec::new();
  for entry in rd {
    let entry = entry.map_err(|e| e.to_string())?;
    let meta = entry.metadata().map_err(|e| e.to_string())?;
    let p = entry.path();
    out.push(FsEntry {
      name: entry.file_name().to_string_lossy().to_string(),
      path: p.to_string_lossy().to_string(),
      is_dir: meta.is_dir(),
      is_file: meta.is_file(),
    });
  }
  Ok(out)
}

#[tauri::command]
fn home_dir() -> Result<String, String> {
  if let Ok(h) = std::env::var("HOME") { return Ok(h); }
  std::env::current_dir()
    .map_err(|e| e.to_string())
    .map(|p| p.to_string_lossy().to_string())
}

#[tauri::command]
fn make_parent_dirs(path: String) -> Result<(), String> {
  use std::path::Path;
  let p = Path::new(&path);
  if let Some(parent) = p.parent() {
    std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
  }
  Ok(())
}

#[tauri::command]
fn read_image_as_base64(path: String) -> Result<String, String> {
use std::fs;
use std::path::Path;
use base64::{Engine as _, engine::general_purpose};  let image_data = fs::read(&path).map_err(|e| e.to_string())?;
    let base64_data = general_purpose::STANDARD.encode(&image_data);  // Determine MIME type from file extension
  let extension = Path::new(&path)
    .extension()
    .and_then(|s| s.to_str())
    .unwrap_or("")
    .to_lowercase();
  
  let mime_type = match extension.as_str() {
    "png" => "image/png",
    "jpg" | "jpeg" => "image/jpeg",
    "gif" => "image/gif",
    "bmp" => "image/bmp",
    "svg" => "image/svg+xml",
    "webp" => "image/webp",
    "ico" => "image/x-icon",
    _ => "image/png" // default fallback
  };
  
  Ok(format!("data:{};base64,{}", mime_type, base64_data))
}

#[tauri::command]
fn check_global_keys(
  previous_keys: tauri::State<GlobalKeyState>
) -> Result<Vec<String>, String> {
  let device_state = DeviceState::new();
  let current_keys: HashSet<Keycode> = device_state.get_keys().into_iter().collect();
  
  let mut prev_keys = previous_keys.lock().map_err(|e| e.to_string())?;
  
  // Find newly pressed keys (present in current but not in previous)
  let new_keys: Vec<String> = current_keys
    .difference(&prev_keys)
    .map(|key| format!("{:?}", key))
    .collect();
  
  // Update the previous keys state
  *prev_keys = current_keys;
  
  Ok(new_keys)
}

pub fn run() {
  tauri::Builder::default()
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
  .manage(GlobalKeyState::new(Mutex::new(HashSet::new())))
  .plugin(tauri_plugin_dialog::init())
  .plugin(tauri_plugin_fs::init())
  .invoke_handler(tauri::generate_handler![write_text_file, read_text_file, list_dir, home_dir, make_parent_dirs, read_image_as_base64, check_global_keys])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
