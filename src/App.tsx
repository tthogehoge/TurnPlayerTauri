import { useState, useEffect } from "react";
//import reactLogo from "./assets/react.svg";
//import { desktopDir, join } from "@tauri-apps/api/path";
//import { invoke } from "@tauri-apps/api/core";
import {
  //BaseDirectory,
  readTextFile,
  writeTextFile,
  writeFile,
  //exists,
  //mkdir,
} from "@tauri-apps/plugin-fs";
import { convertFileSrc } from "@tauri-apps/api/core";
import {
  createTheme,
  PaletteMode,
  // Stack,
  ThemeProvider,
  Box,
} from "@mui/material";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";
import CircularProgress from "@mui/material/CircularProgress";
import { Player } from "./Player";
import { RadioDrawer } from "./RadioDrawer";
import { RadioInput, SSetting } from "./RadioInput";
import { platform } from "@tauri-apps/plugin-os";
import { Store } from "@tauri-apps/plugin-store";
import { listen } from '@tauri-apps/api/event';
import List from "@mui/material/List";
import ListItemText from "@mui/material/ListItemText";
import { invoke } from "@tauri-apps/api/core";

type SMessage = {
  msg: string;
  line: number;
};

export type Media = {
  path: string;
  name: string;
  date: number;
  url: boolean;
};

export type Files = Array<Media>;

// 設定構造体
export type Config = {
  set: SSetting;
  media: Media;
  pos: number;
  podcast: string;
  volume: number;
};

// 設定デフォルト値
function getDefaultConfig() {
  let config: Config = {
    set: { dir: "", str: "", podcast: "" },
    media: { path: "", name: "", date: 0, url: false },
    pos: 0,
    podcast: "",
    volume: 1.0,
  };
  return config;
}

/*
async function reqPermissions() {
  type PermissionState =
    | "granted"
    | "denied"
    | "prompt"
    | "prompt-with-rationale";

  interface Permissions {
    postNotification: PermissionState;
  }

  // check permission state
  const permission = await invoke<Permissions>("plugin:fs|checkPermissions");

  if (permission.postNotification === "prompt-with-rationale") {
    // show information to the user about why permission is needed
  }

  // request permission
  if (permission.postNotification.startsWith("prompt")) {
    const state = await invoke<Permissions>("plugin:fs|requestPermissions", {
      permissions: ["postNotification"],
    });
    console.log(state.postNotification);
  }
}
*/

// 設定ファイル
const CONFIG_FILE: string = "config.json";
const store = new Store("config.dat");

function App() {
  const [s_loaded, setLoaded] = useState(false);
  const [s_playing, setPlaying] = useState(false);
  const [s_playname, setPlayname] = useState("");
  const [s_url, setUrl] = useState<string|MediaStream>("");
  const [s_medias, setMedias] = useState<Files | null>(null);
  const [s_config, setConfig] = useState<Config>(getDefaultConfig());
  const [s_volume, setVolume] = useState(1.0);
  const [mode /*setMode*/] = useState<PaletteMode>("light");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [shouldScroll, setShouldScroll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [s_msglist, setMsgList] = useState(Array<string>);
  const darkTheme = createTheme({
    palette: {
      mode,
    },
  });

  listen<SMessage>('message', (event) => {
    let ary = s_msglist;
    ary.push(`msg ${event.payload.msg} @ ${event.payload.line}`);
    setMsgList(ary);
  });

  // スピナーを画面いっぱいに表示するためのスタイルを追加します
  const spinnerStyle: React.CSSProperties = {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: 9999,
  };

  // 初回実行
  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    var config: Config = { ...s_config };
    const ua = await platform();
    console.log(ua);
    try {
      // var curdir = await invoke<string>("get_current_dir");
      // 設定ファイルの読み込み
      if (ua == "android") {
        /*
        reqPermissions();
        const profileBookStr = await readTextFile(CONFIG_FILE, {
          baseDir: BaseDirectory.AppData,
        });
        config = JSON.parse(profileBookStr) as Config;
        */
        /*
        const profileBookStr = (await store.get(CONFIG_FILE)) as string;
        config = JSON.parse(profileBookStr) as Config;
        */
        config = (await store.get(CONFIG_FILE)) as Config;
        if (config.media.path == null) {
          config.media.path = "";
          config.media.name = "";
          config.media.date = 0;
          config.media.url = false;
        }
      } else {
        const profileBookStr = await readTextFile(CONFIG_FILE);
        config = JSON.parse(profileBookStr) as Config;
      }
      setConfig(config);
    } catch (error) {
      // 初回はファイルがないのでエラー
      console.warn(error);
      setConfig(getDefaultConfig());
    }
    if (config.media.path != "") {
      updateFileName(config.media);
      if (!config.media.url) {
        setVolume(config.volume);
      } else {
        setVolume(1.0);
      }
    }
    setLoaded(true);
  }

  function funcSetMedia(media: Media) {
    setMedia(media);
    setPlaying(true);
    scroollToTop();
    setDrawerOpen(false);
  }

  async function saveConfig() {
    const ua = await platform();
    console.log(ua);
    if (ua == "android") {
      /*
      // ディレクトリ存在チェック
      try {
        const ext = await exists("", { baseDir: BaseDirectory.AppData });
        if (!ext) {
          await mkdir("", { baseDir: BaseDirectory.AppData });
        }
      } catch (error) {
        console.warn(error);
      }
      // write test
      try {
        await writeTextFile(CONFIG_FILE, JSON.stringify(s_config), {
          baseDir: BaseDirectory.AppData,
        });
      } catch (error) {
        console.warn("write test");
        console.warn(error);
      }
      // write test 2
      try {
        await writeTextFile(CONFIG_FILE, JSON.stringify(s_config));
      } catch (error) {
        console.warn("write test2");
        console.warn(error);
      }
      */
      // write test 3
      try {
        /*
        await store.set(CONFIG_FILE, JSON.stringify(s_config));
        */
        await store.set(CONFIG_FILE, s_config);
        await store.save();
      } catch (error) {
        console.warn("write test3");
        console.warn(error);
      }
    } else {
      // 設定ファイルへの書き出し
      await writeTextFile(CONFIG_FILE, JSON.stringify(s_config));
    }
  }

  function updateSSetting(ssetting: SSetting) {
    let c = { ...s_config };
    c.set = ssetting;
    setConfig(c);
    saveConfig();
  }

  function playList(shift: number) {
    if (s_medias) {
      let idx = s_medias.findIndex((e) => e.name == s_playname);
      if (idx != -1 && idx != undefined) {
        idx += shift;
        if (idx >= s_medias.length) {
          idx = 0;
        }
        setMedia(s_medias[idx]);
        setPlaying(true);
      }
    }
  }

  function scrollToCurrent() {
    setShouldScroll(true);
    setDrawerOpen(true);
  }

  async function scroollToTop() {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function setMedia(media: Media) {
    let c = { ...s_config };
    c.pos = 0;
    c.media = media;
    setConfig(c);
    saveConfig();
    updateFileName(media);
  }

  async function updateFileName(media: Media) {
    setPlayname(media.name);
    let new_url: string|MediaStream = media.path;
    if (!media.url) {
      let path = media.path;
      // modifyの必要があるかチェック
      await invoke<boolean>("check_modify_mp4", {path}).catch(
        (err) => {
          console.error(err);
        }
      );
      new_url = convertFileSrc(media.path);
      /*
      var needmodify = await invoke<boolean>("check_mp4", {path}).catch(
        (err) => {
          console.error(err);
        }
      );
      console.log(needmodify);
      if(needmodify){
        var dat = await invoke<Uint8Array>("trans_mp4", {path}).catch(
          (err) => {
            console.error(err);
          }
        )
        console.log(dat);
        if(dat){
          var ret = await writeFile(path, dat).catch(
            (err) => {
              console.error(err);
            }
          );
          console.log(ret);
          new_url = convertFileSrc(media.path);
        }
      }else{
        new_url = convertFileSrc(media.path);
        const res = await fetch(new_url);
        const dat = await res.arrayBuffer();
        var actx = new window.AudioContext();
        var sdest = actx.createMediaStreamDestination();
        var src = actx.createBufferSource();
        actx.decodeAudioData(dat, function(buffer) {
          src.buffer = buffer;
          src.connect(sdest);
          src.start();
        });
        new_url = sdest.stream;
      }
      */
      setVolume(s_config.volume);
    } else {
      setVolume(1.0);
    }
    setUrl(new_url);
  }

  return (
    <ThemeProvider theme={darkTheme}>
      <AppBar position="sticky" color="primary">
        <Toolbar>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="menu"
            onClick={() => {
              setShouldScroll(true);
              setDrawerOpen(true);
            }}
          >
            <MenuIcon />
          </IconButton>
          <Typography>
            {new Date(s_config.media.date * 1000).toLocaleDateString()}:{" "}
            {s_playname}
          </Typography>
        </Toolbar>
      </AppBar>

      {/* spinner */}
      {loading && (
        <div style={spinnerStyle}>
          <CircularProgress />
        </div>
      )}

      {/* 左のdrawer */}
      <RadioDrawer
        drawerOpen={drawerOpen}
        setDrawerOpen={setDrawerOpen}
        s_medias={s_medias}
        name={s_config.media.name}
        shouldScroll={shouldScroll}
        setShouldScroll={setShouldScroll}
        funcsetmedia={funcSetMedia}
      />

      <Container>
        {/* radio input */}
        <RadioInput
          s_loaded={s_loaded}
          s_config={s_config}
          onUpdateSSetting={updateSSetting}
          setMedias={setMedias}
          setLoading={setLoading}
          scrollToCurrent={scrollToCurrent}
        />

        {/* player */}
        <Player
          s_loaded={s_loaded}
          s_volume={s_volume}
          s_playname={s_playname}
          s_url={s_url}
          s_config={s_config}
          s_playing={s_playing}
          setPlaying={setPlaying}
          onReady={() => {
            if (s_loaded) {
              setLoaded(false);
              return true;
            } else {
              return false;
            }
          }}
          onPause={(pos: number) => {
            const cfg = { ...s_config };
            cfg.pos = pos;
            setConfig(cfg);
            saveConfig();
          }}
          onDefVolumeChange={(volume: number) => {
            const cfg = { ...s_config };
            cfg.volume = volume;
            setConfig(cfg);
            saveConfig();
          }}
          onNext={() => {
            playList(1);
          }}
          onPrev={() => {
            playList(-1);
          }}
        />
        <Box display="flex" alignItems="center">
          <List>
            {
              s_msglist.map((f) => {
                return (
                  <ListItemText>{f}</ListItemText>
                )
              })
            }
          </List>
        </Box>
      </Container>
    </ThemeProvider>
  );
}

export default App;
