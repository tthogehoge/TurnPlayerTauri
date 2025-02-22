// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command

use byteorder::ReadBytesExt;
use chrono::DateTime;
use chrono::Local;
use chrono::LocalResult;
use chrono::TimeZone;
use chrono::Utc;
use once_cell::sync::Lazy;
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::io::Read;
use std::io::Write;
use std::io::Seek;
use std::io::BufReader;
use std::io::BufWriter;
use std::sync::Mutex;
use std::fs;
use std::fs::OpenOptions;
use tauri_plugin_fs::Fs;
use tauri_plugin_fs::FsExt;
//use chrono::{Datelike, Timelike};
use chrono::serde::ts_seconds;
use tauri::{AppHandle, Emitter};
use std::collections::HashMap;

// create the error type that represents all errors possible in our program
#[derive(Debug, thiserror::Error)]
enum Error {
    #[error(transparent)]
    IoError(#[from] std::io::Error),
    #[error(transparent)]
    StrError(#[from] std::num::ParseIntError),
    #[error(transparent)]
    UtfError(#[from] std::string::FromUtf8Error),
    #[error(transparent)]
    RegexError(#[from] regex::Error),
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

#[derive(Serialize, Deserialize, Clone)]
struct SMessage {
    msg: String,
    line: u32,
}

static MEDIAS: Lazy<Mutex<Vec<Media>>> = Lazy::new(|| Mutex::new(vec![]));

#[warn(dead_code)]
fn tell_message(app: &AppHandle, str: String, lineno: u32)
{
    let msg = SMessage {
        msg: str,
        line: lineno
    };
    if app.emit("message", msg).is_err() {
        println!("emit error");
    }
}

// androidのreactplayerで再生できないデータを判定
// - 最後にゴミがある
// - ftyp moov free mdatの順になっていない
#[tauri::command]
fn check_mp4(app: AppHandle, path: String) -> Result<bool,Error> {
    let mut ret = true;
    let meta = fs::metadata(&path)?;
    let mut file = OpenOptions::new().read(true).open(&path)?;

    let mut offset = 0;
    let size = meta.len();

    let mut keys = Vec::new();

    while offset < size {
        // 4byte取得 -> box size
        file.seek(std::io::SeekFrom::Start(offset))?;
        let bsize = file.read_u32::<byteorder::BigEndian>()? as u64;
        // 4byte取得 -> key
        let mut keybuf = [0u8; 4];
        file.read_exact(&mut keybuf)?;
        let key;
        match String::from_utf8(keybuf.to_vec()) {
            Ok(v) => {
                key = v;
            },
            Err(_v) => {
                key = "____".to_string();
            }
        }
        println!("{}<{} {} {}", offset, size, bsize, key);

        if offset + bsize <= size {
            // key
            keys.push(key);
            offset += bsize;
        }else{
            tell_message(&app, format!("need to delete: {}", path), line!());
            ret = false;
            break;
        }
    }

    let mut mdat = false;
    for k in keys {
        println!("key {}", k);
        if k=="mdat" {
            println!("mdat");
            mdat = true;
        }
        if k=="moov" && mdat==true {
            println!("moov need to reorder");
            tell_message(&app, format!("need to reorder: {}", path), line!());
            ret = false;
        }
    }
    ret = false;

    return Ok(ret);
}

// androidのreactplayerで再生できないので修正データを作成
// - 最後にゴミを削除
// - ftyp moov free mdatの順に変更
#[tauri::command]
fn trans_mp4(_app: AppHandle, path: String) -> Result<Vec<u8>,Error> {
    let meta = fs::metadata(&path)?;
    let mut file = BufReader::new(std::fs::File::open(&path)?);
    // let mut file = OpenOptions::new().read(true).write(true).open(path)?;

    let mut offset = 0;
    let size = meta.len();

    let mut hash = HashMap::new();
    let mut keys = Vec::new();

    while offset < size {
        // 4byte取得 -> box size
        file.seek(std::io::SeekFrom::Start(offset))?;
        let bsize = file.read_u32::<byteorder::BigEndian>()? as u64;
        // 4byte取得 -> key
        let mut keybuf = [0u8; 4];
        file.read_exact(&mut keybuf)?;
        let key;
        match String::from_utf8(keybuf.to_vec()) {
            Ok(v) => {
                key = v;
            },
            Err(_v) => {
                key = "____".to_string();
            }
        }

        if offset + bsize <= size {
            // data read
            let mut buf2: Vec<u8> = vec![0; bsize as usize];
            let mut bs = buf2.as_mut_slice();
            file.seek(std::io::SeekFrom::Start(offset))?;
            file.read_exact(&mut bs)?;
            hash.insert(key.clone(), buf2);
            // key
            keys.push(key);
            offset += bsize;
        }else{
            break;
        }
    }

    let mut ret = Vec::new();
    if let Some(dat) = hash.get("ftyp") {
        ret.extend(dat);
    }
    else { return Err(Error::Other) }

    if let Some(dat) = hash.get("free") {
        ret.extend(dat);
    }
    else { return Err(Error::Other) }

    if let Some(dat) = hash.get("moov") {
        ret.extend(dat);
    }
    else { return Err(Error::Other) }

    if let Some(dat) = hash.get("mdat") {
        ret.extend(dat);
    }
    else { return Err(Error::Other) }

    Ok(ret)
}

#[tauri::command]
fn check_modify_mp4(app: AppHandle, path: String) -> Result<bool,Error> {
    let ret = check_mp4(app.clone(), path.clone())?;
    if ret {
        tell_message(&app, format!("no need to modify: {}", path), line!());
        return Ok(true); // no need to modify
    }
    println!("trans");
    let Ok(mut dat) = trans_mp4(app.clone(), path.clone()) else {
        tell_message(&app, format!("trans fail"), line!());
        return Err(Error::Other);
    };

    println!("write start {}", dat.len());
    //let file = tauri_plugin_fs::OpenOptions::new().write(true).open(path)?;
    let Ok(mut file) = OpenOptions::new().write(true).open(path) else {
        tell_message(&app, format!("open fail"), line!());
        return Err(Error::Other);
    };
    let Ok(_) = file.set_len(dat.len() as u64) else {
        tell_message(&app, format!("set len fail"), line!());
        return Err(Error::Other);
    };
    // let mut file = BufWriter::new(file);
    let Ok(_) = file.write_all(dat.as_mut_slice()) else {
        tell_message(&app, format!("write fail"), line!());
        return Err(Error::Other);
    };
    println!("write end");
    return Ok(true);
}

// filenameからdatetimeを得る
fn getdate_fromfile(_app: &AppHandle, filename: &String) -> Result<DateTime<Local>, Error>
{
    let mut dt: DateTime<Local> = Local::now();
    let re = Regex::new(r"(\d{14})")?;
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
            } else {
                return Err(Error::Other);
            }
        }
        None => {}
    }
    /*
    if dt.year() < min_year{
        min_year = dt.year();
    }
    if dt.year() > max_year{
        max_year = dt.year();
    }
    */
    Ok(dt)
}

fn make_media(app: &AppHandle, path: &std::path::PathBuf, setstr: &String) -> Result<Media, Error> {
    let Some(ext) = path.extension() else {
        return Err(Error::Other);
    };

    let ext = ext.to_string_lossy().to_string();
    if ext == "mp4" || ext == "m4a" {
    } else {
        return Err(Error::Other);
    }

    let pathstr = path.to_string_lossy().to_string();
    let Some(filename) = path.file_name() else {
        return Err(Error::Other);
    };
    let filename = filename.to_string_lossy().to_string();

    /*
    // androidのreactplayerで再生できないのでm4aファイルをmodify
    if ext=="m4a" {
        match check_modify_mp4(&app, &path) {
            Ok(ret) => {
                if ret {
                    // tell_message(&app, format!("check ok: {}", filename), line!());
                }else{
                    tell_message(&app, format!("length modified: {}", filename), line!());
                }
            },
            Err(err) => {
                tell_message(&app, format!("io error: {}: {}", filename, err.to_string()), line!());
            }
        }
    }
    */

    // search対象チェック
    let sstring = setstr.split_whitespace();
    // let ok = filename.contains(&set.str);
    for word in sstring.clone().into_iter() {
        if !filename.contains(word) {
            return Err(Error::Other);
        }
    }

    // 日付を取得/無いならmodified time
    let dt;
    match getdate_fromfile(&app, &filename) {
        Ok(ret) => {
            dt = ret;
        },
        Err(_err)=> {
            let meta = path.metadata()?;
            let mtime = meta.modified()?;
            let mtime: DateTime<Local> = mtime.into();
            dt = mtime;
        }
    }

    // データ作成
    let media = Media {
        path: pathstr,
        name: filename,
        date: Utc.from_utc_datetime(&dt.naive_utc()),
    };

    Ok(media)
}

fn find_files_core(app: &AppHandle, set: SSetting) -> Result<Vec<Media>, Error> {
    let mut files: Vec<Media> = Vec::new();
    /*
    let mut min_year = 9999;
    let mut max_year = 0;
    */

    let scope = app.fs_scope();
    scope.allow_directory(&set.dir, true);

    let readdir = std::fs::read_dir(set.dir)?;
    for item in readdir.into_iter() {
        let path = item?.path();
        if path.is_dir() {
            let sub_dirs = find_files_core(app, SSetting {
                dir: path.to_string_lossy().to_string(),
                str: set.str.clone(),
            });
            if let Ok(sub_dirs) = sub_dirs {
                files.extend(sub_dirs);
            }
        } else if path.is_file() {
            if let Ok(media) = make_media(&app, &path, &set.str) {
                files.push(media);
            } else {
                println!("not target: {}", path.to_string_lossy());
            }
        }
    }
    Ok(files)
}

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn find_files(app: AppHandle, set: SSetting) -> Result<Vec<Media>, Error> {
    println!("search start");
    //let mut files: Vec<Media> = Vec::new();
    let mut files = find_files_core(&app, set)?;

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
fn get_files(_app: AppHandle) -> Result<Vec<Media>, Error> {
    let files: Vec<Media> = Vec::new();
    if let Ok(ary) = MEDIAS.lock() {
        let files = ary.clone();
        return Ok(files);
    }
    Ok(files)
}

#[tauri::command]
fn get_current_dir(_app: AppHandle) -> Result<String, Error> {
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
            get_files,
            check_mp4,
            trans_mp4,
            check_modify_mp4,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
