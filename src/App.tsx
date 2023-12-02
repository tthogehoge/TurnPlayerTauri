import { useState, useEffect, useRef, createRef } from "react";
//import reactLogo from "./assets/react.svg";
//import { desktopDir, join } from "@tauri-apps/api/path";
import {
  BaseDirectory,
  readTextFile,
  writeTextFile,
  exists,
  createDir,
} from "@tauri-apps/api/fs";
import { invoke, convertFileSrc } from "@tauri-apps/api/tauri";
import ReactPlayer from "react-player";
import {
  // Box,
  createTheme,
  PaletteMode,
  // Stack,
  ThemeProvider,
} from "@mui/material";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Container from "@mui/material/Container";
import Button from "@mui/material/Button";
import Input from "@mui/material/Input";
import Typography from "@mui/material/Typography";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import { FileList } from "./FileList";

type SSetting = {
  dir: string,
  str: string,
};

export type Media = {
  path: string,
  name: string,
  date: string,
};

export type Files = Array<Media>;

export type FuncSetMedia = (media:Media) => void;


// 設定構造体
type Config = {
  set: SSetting,
  media: Media,
  pos: number,
};

// 設定デフォルト値
function getDefaultConfig() {
  let config : Config = {
    set:{dir:"",str:""},
    media: {path:"",name:"",date:""},
    pos:0
  };
  return config;
}

// 設定ファイル
const CONFIG_FILE : string = "config.json"

function App() {
  const [s_dir, setDir] = useState("");
  const [s_str, setStr] = useState("");
  const [s_url, setUrl] = useState("");
  const [s_loaded, setLoaded] = useState(false);
  const [s_playing, setPlaying] = useState(false);
  const [s_playname, setPlayname] = useState("");
  const [s_files, setFiles] = useState<Files | null>(null);
  const [s_config, setConfig] = useState<Config>(getDefaultConfig());
  const [mode, /*setMode*/] = useState<PaletteMode>("light");
  const darkTheme = createTheme({
    palette: {
      mode,
    },
  });
  const scroll_ref = createRef<HTMLDivElement>();

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
    setDir(config.set.dir);
    setStr(config.set.str);
    if(config.set.dir != ""){
      findFiles(config.set);
    }
    if(config.media.path != ""){
      updateFileName(config.media);
    }
    setLoaded(true);
  }

  function funcSetMedia(media:Media){
    setMedia(media);
    setPlaying(true);
    scroollToTop();
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
        e.name == s_playname
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

  async function findFiles(set:SSetting) {
    // Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
    var f = await invoke<Files>("find_files", { set })
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
    scroollToRef();
  }

  async function scroollToTop(){
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function scroollToRef(){
    scroll_ref!.current!.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
  }

  async function setMedia(media:Media){
    s_config.pos = 0;
    s_config.media = media;
    setConfig(s_config);
    saveConfig();
    updateFileName(media);
  }

  async function updateFileName(media:Media) {
    setPlayname(media.name);
    const new_url = convertFileSrc(media.path)
    setUrl(new_url);
  }

  return (
    <ThemeProvider theme={darkTheme}>
      <AppBar position="static" color="primary">
        <Toolbar>
          <Typography>React Player</Typography>
        </Toolbar>
      </AppBar>
    <Container>
      <p>{s_playname}</p>
      <ReactPlayer
        ref={player}
        url={s_url}
        playing={s_playing}
        controls={true}
        onReady={()=>{onPlayerReady()}}
        onEnded={()=>{onPlayerEnded()}}
        onPause={()=>{onPlayerPause()}}
      />

      search directory
      <Input
        id="dir-input"
        onChange={ (e) => setDir(e.currentTarget.value) }
        placeholder="Enter a directory..."
        value={s_dir}
      />
      search string
      <Input
        id="str-input"
        onChange={ (e) => setStr(e.currentTarget.value) }
        placeholder="Enter a string..."
        value={s_str}
      />
      <Button variant="contained" type="submit"
        onClick={(e) => {
          e.preventDefault();
          s_config.set.dir = s_dir;
          s_config.set.str = s_str;
          setConfig(s_config);
          saveConfig();
          findFiles(s_config.set);
        }}
      >find files</Button>

      <Button variant="contained" type="submit"
        onClick={(e) => {
          e.preventDefault();
          getFiles();
        }}
      >get files</Button>

      <FileList files={s_files} name={s_config.media.name} funcsetmedia={funcSetMedia} ref={scroll_ref} />
    </Container>
    </ThemeProvider>
  );
}

export default App;
