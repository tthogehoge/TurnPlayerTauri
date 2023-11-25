import { useState, useEffect, useRef } from "react";
import reactLogo from "./assets/react.svg";
import { desktopDir, join } from "@tauri-apps/api/path";
import {
  BaseDirectory,
  readTextFile,
  writeTextFile,
  exists,
  createDir,
} from "@tauri-apps/api/fs";
import { invoke, convertFileSrc } from "@tauri-apps/api/tauri";
import ReactPlayer from "react-player";
import "./App.css";

type Media = {
  path: string,
  name: string,
};

type Files = Array<Media>;

// 設定構造体
type Config = {
  dir: string,
  path: string,
  pos: number,
};

// 設定デフォルト値
function getDefaultConfig() {
  let config : Config = {
    dir:"",
    path:"path",
    pos:0
  };
  return config;
}

// 設定ファイル
const CONFIG_FILE : string = "config.json"

function App() {
  const [s_dir, setDir] = useState("");
  const [s_url, setUrl] = useState("");
  const [s_loaded, setLoaded] = useState(false);
  const [s_playing, setPlaying] = useState(false);
  const [s_playpath, setPlaypath] = useState("");
  const [s_files, setFiles] = useState<Files | null>(null);
  const [s_config, setConfig] = useState<Config>(getDefaultConfig());

  // react player
  const player = useRef<ReactPlayer>(null);

  // 初回実行
  useEffect( () => {
    loadConfig();
  },[]);

  async function loadConfig() {
    var config = s_config;
    try {
      // var curdir = await invoke<string>("get_current_dir");
      // 設定ファイルの読み込み
      const profileBookStr = await readTextFile(CONFIG_FILE, {
        dir: BaseDirectory.App,
      });
      // パース
      config = JSON.parse(profileBookStr) as Config;
      setConfig(config);
    } catch (error) {
      // 初回はファイルがないのでエラー
      console.warn(error);
      setConfig(getDefaultConfig());
    }
    setDir(config.dir);
    if(config.dir != ""){
      findFiles(config.dir);
    }
    if(config.path != ""){
      updateFileName(config.path);
    }
    setLoaded(true);
  }

  async function saveConfig() {
    // ディレクトリ存在チェック
    const ext = await exists("", { dir: BaseDirectory.App });
    if (!ext) {
      await createDir("", { dir: BaseDirectory.App });
    }
    // 設定ファイルへの書き出し
    await writeTextFile(CONFIG_FILE, JSON.stringify(s_config), {
      dir: BaseDirectory.App,
    });
  }

  async function onPlayerReady() {
    if(s_loaded){
      setLoaded(false);
      if(player.current){
        if(s_config.pos != 0){
          player.current.seekTo(s_config.pos, "seconds");
        }
      }
    }
  }

  async function onPlayerPause() {
    if(player.current){
      s_config.pos = player.current.getCurrentTime();
      setConfig(s_config);
      saveConfig();
    }
  }

  async function onPlayerEnded() {
    if(s_files){
      let idx = s_files.findIndex((e)=>(
        e.path == s_playpath
      ));
      if(idx!=-1 && idx != undefined){
        idx++;
        if(idx >= s_files.length){
          idx = 0;
        }
        setMedia(s_files[idx]);
        setPlaying(true);
      }
    }
  }

  async function findFiles(dir:string) {
    // Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
    var f = await invoke<Files>("find_files", { dir })
    .catch( err=> {
      console.error(err);
      return null;
    });
    setFiles(f);
  }

  async function getFiles() {
    // Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
    var f = await invoke<Files>("get_files")
    .catch( err=> {
      console.error(err);
      return null;
    });
    setFiles(f);
  }

  async function setMedia(media:Media){
    s_config.pos = 0;
    s_config.path = media.path;
    setConfig(s_config);
    saveConfig();
    updateFileName(media.path);
  }

  const file_list = s_files ? <ul>
    {s_files.map(f => {
      return <li key={f.path} onClick={()=>{
        setMedia(f);
      }}>{f.name}</li>
    })
    }
  </ul> : null;

  async function updateFileName(s:string) {
    setPlaypath(s);
    const new_url = convertFileSrc(s)
    setUrl(new_url);
  }

  return (
    <div className="container">
      <h1>React Player</h1>
      <p>{s_playpath}</p>
      <ReactPlayer
        ref={player}
        url={s_url}
        playing={s_playing}
        controls={true}
        onReady={()=>{onPlayerReady()}}
        onEnded={()=>{onPlayerEnded()}}
        onPause={()=>{onPlayerPause()}}
      />

      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          s_config.dir = s_dir;
          setConfig(s_config);
          saveConfig();
          findFiles(s_dir);
        }}
      >
        <input
          id="dir-input"
          onChange={ (e) => setDir(e.currentTarget.value) }
          placeholder="Enter a directory..."
          value={s_dir}
        />
        <button type="submit">find files</button>
      </form>

      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          getFiles();
        }}
      >
        <button type="submit">get files</button>
      </form>

      {file_list}

    </div>
  );
}

export default App;
