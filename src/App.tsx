import { useState, useEffect } from "react";
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

type Config = {
  dir: string,
  path: string,
  pos: string,
};

type Files = Array<Media>;

function getDefaultConfig() {
  let config : Config = {
    dir:"",
    path:"path",
    pos:"pos"
  };
  return config;
}

function App() {
  const [s_dir, setDir] = useState("");
  const [s_url, setUrl] = useState("");
  const [s_files, setFiles] = useState<Files | null>(null);
  const [s_config, setConfig] = useState<Config>(getDefaultConfig());

  // 初回実行
  useEffect( () => {
    loadConfig();
  },[]);

  async function loadConfig() {
    try {
      var curdir = await invoke<string>("get_current_dir");
      // 設定ファイルの読み込み
      const profileBookStr = await readTextFile("config.json", {
        dir: BaseDirectory.App,
      });
      // パース
      const configFile = JSON.parse(profileBookStr) as Config;
      setConfig(configFile);
    } catch (error) {
      // 初回はファイルがないのでエラー
      console.warn(error);
      setConfig(getDefaultConfig());
    }
    setDir(s_config.dir);
    if(s_config.dir != ""){
      findFiles();
    }
  }

  async function saveConfig() {
    // ディレクトリ存在チェック
    const ext = await exists("", { dir: BaseDirectory.App });
    if (!ext) {
      await createDir("", { dir: BaseDirectory.App });
    }
    // 設定ファイルへの書き出し
    await writeTextFile("config.json", JSON.stringify(s_config), {
      dir: BaseDirectory.App,
    });
  }

  async function findFiles() {
    // Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
    var f = await invoke<Files>("find_files", { dir:s_dir })
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

  const file_list = s_files ? <ul>
    {s_files.map(f => {
      return <li key={f.path} onClick={()=>{
        updateFileName(f.path);
      }}>{f.name}</li>
    })
    }
  </ul> : null;

  async function updateFileName(s:string) {
    const new_url = convertFileSrc(s)
    setUrl(new_url);
  }

  return (
    <div className="container">
      <h1>React Player</h1>
      <ReactPlayer url={s_url} controls={true}/>

      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          s_config.dir = s_dir;
          setConfig(s_config);
          saveConfig();
          findFiles();
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
