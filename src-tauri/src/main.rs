// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// create the error type that represents all errors possible in our program
#[derive(Debug, thiserror::Error)]
enum Error {
  #[error(transparent)]
  Io(#[from] std::io::Error),
  /*
  #[error(transparent)]
  Regex_From(#[from] <regex::Regex as TryFrom>::Error),
  #[error(transparent)]
  Regex_Into(#[from] <regex::Regex as TryInto>::Error),
  #[error(transparent)]
  Regex_Future(#[from] <regex::Regex as futures_core::future::TryFuture>::Error),
  #[error(transparent)]
  Regex_Stream(#[from] <regex::Regex as futures_core::stream::TryStream>::Error),
  */
  #[error("other")]
  Other
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

#[derive(Serialize,Deserialize,Clone)]
struct Media {
    path: String,
    name: String,
    #[serde(with="ts_seconds")]
    date: DateTime<Utc>,
}

#[derive(Serialize,Deserialize,Clone)]
struct SSetting {
    dir: String,
    str: String,
}

use chrono::TimeZone;
use serde::{Serialize, Deserialize};
use once_cell::sync::Lazy;
use std::sync::Mutex;
use regex::Regex;
use chrono::DateTime;
use chrono::Local;
use chrono::Utc;
use chrono::serde::ts_seconds;

static MEDIAS: Lazy<Mutex<Vec<Media>>> = Lazy::new(|| Mutex::new(vec![]));

fn find_files_core(set: SSetting) -> Result<Vec<Media>, Error> {
    let mut files: Vec<Media> = Vec::new();
    let sstring = set.str.split_whitespace();

    let readdir = std::fs::read_dir(set.dir)?; 
    for item in readdir.into_iter() {
        let path = item?.path();
        if path.is_dir() {
            let sub_dirs = find_files_core(SSetting { dir: path.to_string_lossy().to_string(), str: set.str.clone() });
            if let Ok(sub_dirs) = sub_dirs {
                files.extend(sub_dirs);
            }
        }else if path.is_file() {
            if let Some(ext) = path.extension() {
                let ext = ext.to_string_lossy().to_string();
                if ext == "mp4" || ext == "m4a" {
                    let pathstr=path.to_string_lossy().to_string();
                    if let Some(filename) = path.file_name() {
                        let filename = filename.to_string_lossy().to_string();
                        // let ok = filename.contains(&set.str);
                        let mut ok = true;
                        for word in sstring.clone().into_iter() {
                            if !filename.contains(word) {
                                ok = false;
                                break;
                            }
                        }
                        if ok {
                            let mut dt: DateTime<Local> = Local::now();
                            let mut ok = false;
                            let re = Regex::new(r"(\d{14})");
                            if let Ok(re) = re {
                                match re.captures(&filename) {
                                    Some(caps) => {
                                        let d = DateTime::parse_from_str(&caps[0], "%Y%m%d%H%M%S");
                                        if let Ok(d) = d {
                                            dt = d.with_timezone(&Local);
                                            ok = true;
                                        }
                                    },
                                    None => {
                                    }
                                }
                            }
                            if !ok {
                                let meta = path.metadata()?;
                                let mtime = meta.modified()?;
                                let mtime: DateTime<Local> = mtime.into();
                                dt = mtime;
                            }
                            let media = Media{
                                path: pathstr,
                                name: filename,
                                date: Utc.from_utc_datetime(&dt.naive_utc()),
                            };
                            files.push(media);
                        }
                    }
                }
            }
        }
    }
    Ok(files)
}

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn find_files(set: SSetting) -> Result<Vec<Media>, Error> {
    //let mut files: Vec<Media> = Vec::new();
    let mut files = find_files_core(set)?;

    // 最後にソート
    files.sort_by(|a,b|
        a.date.cmp(&b.date)
    );

    // MEDIASに登録
    if let Ok(mut ary) = MEDIAS.lock() {
        ary.clone_from(&files);
    }

    Ok(files)
}

#[tauri::command]
fn get_files() -> Result<Vec<Media>, Error> {
    let files: Vec<Media> = Vec::new();
    if let Ok(ary) = MEDIAS.lock() {
        let files = ary.clone();
        return Ok(files);
    }
    Ok(files)
}

#[tauri::command]
fn get_current_dir() -> Result<String, Error> {
    let exe_path = std::env::current_exe()?;
    let dir = exe_path.parent();
    if let Some(dpath) = dir {
        let ret = dpath.to_string_lossy().to_string();
        return Ok(ret);
    }
    Err(Error::Other)
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_current_dir,
            find_files,
            get_files
            ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
