// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::path;

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn find_files(dir: &str) -> Vec<path::PathBuf> {
    let mut files: Vec<path::PathBuf> = Vec::new();

    let dir = std::fs::read_dir(dir);
    if let Ok(dir) = dir {
        for item in dir.into_iter() {
            if let Ok(item) = item {
                let path = item.path();
                if path.is_file() {
                    let ext = path.extension();
                    if ext.is_some() && ext.unwrap() == "mp4" {
                        files.push(path);
                    }
                }
            }
        }
    }
    files
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![find_files])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
