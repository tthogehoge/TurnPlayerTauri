// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command

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
    #[error(transparent)]
    StrError(#[from] std::num::ParseIntError),
    #[error("other")]
    Other,
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

#[derive(Serialize, Deserialize, Clone)]
struct Media {
    path: String,
    name: String,
    #[serde(with = "ts_seconds")]
    date: DateTime<Utc>,
}

#[derive(Serialize, Deserialize, Clone)]
struct SSetting {
    dir: String,
    str: String,
}

use chrono::DateTime;
use chrono::Local;
use chrono::LocalResult;
use chrono::TimeZone;
use chrono::Utc;
use once_cell::sync::Lazy;
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
//use chrono::{Datelike, Timelike};
use chrono::serde::ts_seconds;

static MEDIAS: Lazy<Mutex<Vec<Media>>> = Lazy::new(|| Mutex::new(vec![]));

// なぜかandroidのreactplayerで再生できないのでcoverを削除してみる
fn modify_mp4(path: &std::path::PathBuf) {
    if let Some(filename) = path.file_name() {
        let filename = filename.to_string_lossy().to_string();
        let tag = mp4ameta::Tag::read_from_path(path.clone());
        match tag {
            Ok(tag) => {
                // tag check
                /*
                println!("mp4 tag: {}", filename.clone());
                let data = tag.data();
                for datum in data {
                    if let Some(dat) = datum.1.clone().into_string() {
                        println!("id {}, {}", datum.0.to_string(), dat);
                    }else{
                        println!("id {}, [dat]", datum.0.to_string());
                    }
                }
                */

                // なぜかandroidのreactplayerで再生できないのでcoverを削除してみる
                if let Some(_) = tag.artwork() {
                    let mut newtag = tag.clone();
                    newtag.remove_artworks();
                    //let _ = std::fs::copy(path.clone(), filename.clone());
                    if let Err(r) = newtag.write_to_path(path.clone()) {
                        println!("mp4 tag write fail: {}", r);
                    } else {
                        println!("mp4 tag write ok");
                    }
                }
            }
            Err(tag) => println!("mp4 ng: {} {}", filename.clone(), tag),
        }
    }
}

fn find_files_core(set: SSetting) -> Result<Vec<Media>, Error> {
    let mut files: Vec<Media> = Vec::new();
    let sstring = set.str.split_whitespace();
    /*
    let mut min_year = 9999;
    let mut max_year = 0;
    */

    let readdir = std::fs::read_dir(set.dir)?;
    for item in readdir.into_iter() {
        let path = item?.path();
        if path.is_dir() {
            let sub_dirs = find_files_core(SSetting {
                dir: path.to_string_lossy().to_string(),
                str: set.str.clone(),
            });
            if let Ok(sub_dirs) = sub_dirs {
                files.extend(sub_dirs);
            }
        } else if path.is_file() {
            if let Some(ext) = path.extension() {
                let ext = ext.to_string_lossy().to_string();
                if ext == "mp4" || ext == "m4a" {
                    let pathstr = path.to_string_lossy().to_string();
                    if let Some(filename) = path.file_name() {
                        let filename = filename.to_string_lossy().to_string();

                        // なぜかandroidのreactplayerで再生できないのでcoverを削除してみる->無意味
                        // modify_mp4(&path);

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
                                        //println!("{}/{}/{} {}:{}:{}", &caps[0], &caps[1], &caps[2], &caps[3], &caps[4], &caps[5])
                                        let year: i32 = caps[0][0..4].to_string().parse()?;
                                        let month: u32 = caps[0][4..6].to_string().parse()?;
                                        let day: u32 = caps[0][6..8].to_string().parse()?;
                                        let hour: u32 = caps[0][8..10].to_string().parse()?;
                                        let min: u32 = caps[0][10..12].to_string().parse()?;
                                        let sec: u32 = caps[0][12..14].to_string().parse()?;
                                        let ddt = Local
                                            .with_ymd_and_hms(year, month, day, hour, min, sec);
                                        if let LocalResult::Single(ddt) = ddt {
                                            dt = ddt;
                                            ok = true;
                                        }
                                    }
                                    None => {}
                                }
                            }
                            if !ok {
                                let meta = path.metadata()?;
                                let mtime = meta.modified()?;
                                let mtime: DateTime<Local> = mtime.into();
                                dt = mtime;
                            }
                            /*
                            if dt.year() < min_year{
                                min_year = dt.year();
                            }
                            if dt.year() > max_year{
                                max_year = dt.year();
                            }
                            */
                            let media = Media {
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
    println!("search start");
    //let mut files: Vec<Media> = Vec::new();
    let mut files = find_files_core(set)?;

    // 最後にソート
    println!("sort start");
    files.sort_by(|a, b| a.date.timestamp().cmp(&b.date.timestamp()));

    // MEDIASに登録
    println!("regist start");
    if let Ok(mut ary) = MEDIAS.lock() {
        ary.clone_from(&files);
    }

    println!("return");
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|_app| {
            #[cfg(desktop)]
            let _ = _app
                .handle()
                .plugin(tauri_plugin_global_shortcut::Builder::new().build());
            Ok(())
        })
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_keep_screen_on::init())
        .invoke_handler(tauri::generate_handler![
            get_current_dir,
            find_files,
            get_files
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
