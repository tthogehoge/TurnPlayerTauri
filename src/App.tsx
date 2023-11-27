import { useState, useEffect, useRef } from "react";
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
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";

type Media = {
  path: string,
  name: string,
  date: string,
};

type Files = Array<Media>;

// 設定構造体
type Config = {
  dir: string,
  media: Media,
  pos: number,
};

// 設定デフォルト値
function getDefaultConfig() {
  let config : Config = {
    dir:"",
    media: {path:"",name:"",date:""},
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
  const [s_playname, setPlayname] = useState("");
  const [s_files, setFiles] = useState<Files | null>(null);
  const [s_config, setConfig] = useState<Config>(getDefaultConfig());
  const [mode, /*setMode*/] = useState<PaletteMode>("light");
  const darkTheme = createTheme({
    palette: {
      mode,
    },
  });

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
    if(config.media.path != ""){
      updateFileName(config.media);
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
    s_config.media = media;
    setConfig(s_config);
    saveConfig();
    updateFileName(media);
  }

  const file_list = s_files ? <List>
    {s_files.map(f => {
      let sel = false;
      if(f.name == s_config.media.name){
        sel = true;
      }
      return <ListItem button selected={sel}>
      <ListItemText key={f.path} onClick={()=>{
        setMedia(f);
      }}>{f.name}</ListItemText>
      </ListItem>
    })
    }
  </List> : null;

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

      <Input
        id="dir-input"
        onChange={ (e) => setDir(e.currentTarget.value) }
        placeholder="Enter a directory..."
        value={s_dir}
      />
      <Button variant="contained" type="submit"
        onClick={(e) => {
          e.preventDefault();
          s_config.dir = s_dir;
          setConfig(s_config);
          saveConfig();
          findFiles(s_dir);
        }}
      >find files</Button>

      <Button variant="contained" type="submit"
        onClick={(e) => {
          e.preventDefault();
          getFiles();
        }}
      >get files</Button>

      {file_list}
    </Container>
    </ThemeProvider>
  );
}

export default App;
