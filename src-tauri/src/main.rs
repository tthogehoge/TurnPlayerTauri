// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// create the error type that represents all errors possible in our program
#[derive(Debug, thiserror::Error)]
enum Error {
  #[error(transparent)]
  Io(#[from] std::io::Error)
}

// we must manually implement serde::Serialize
impl serde::Serialize for Error {
  fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
  where
    S: serde::ser::Serializer,
  {
    serializer.serialize_str(self.to_string().as_ref())
  }
}

#[derive(Serialize,Deserialize)]
struct Media {
    path: String,
    name: String,
}

use serde::{Serialize, Deserialize};

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn find_files(dir: &str) -> Result<Vec<Media>, Error> {
    let mut files: Vec<Media> = Vec::new();

    let readdir = std::fs::read_dir(dir)?; 
    for item in readdir.into_iter() {
        let path = item?.path();
        if path.is_file() {
            if let Some(ext) = path.extension() {
                let ext = ext.to_string_lossy().to_string();
                if ext == "mp4" || ext == "m4a" {
                    let pathstr=path.to_string_lossy().to_string();
                    if let Some(filename) = path.file_name() {
                        let media = Media{
                            path: pathstr,
                            name: filename.to_string_lossy().to_string(),
                        };
                        files.push(media);
                    }
                }
            }
        }
    }

    Ok(files)
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![find_files])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
