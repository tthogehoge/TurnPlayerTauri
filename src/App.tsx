import { useState, useEffect } from "react";
//import reactLogo from "./assets/react.svg";
//import { desktopDir, join } from "@tauri-apps/api/path";
import {
  BaseDirectory,
  readTextFile,
  writeTextFile,
  exists,
  createDir,
} from "@tauri-apps/api/fs";
import { convertFileSrc } from "@tauri-apps/api/tauri";
import {
  createTheme,
  PaletteMode,
  // Stack,
  ThemeProvider,
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

// 設定ファイル
const CONFIG_FILE: string = "config.json";

function App() {
  const [s_loaded, setLoaded] = useState(false);
  const [s_playing, setPlaying] = useState(false);
  const [s_playname, setPlayname] = useState("");
  const [s_url, setUrl] = useState("");
  const [s_medias, setMedias] = useState<Files | null>(null);
  const [s_config, setConfig] = useState<Config>(getDefaultConfig());
  const [s_volume, setVolume] = useState(1.0);
  const [mode /*setMode*/] = useState<PaletteMode>("light");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [shouldScroll, setShouldScroll] = useState(false);
  const [loading, setLoading] = useState(false);
  const darkTheme = createTheme({
    palette: {
      mode,
    },
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
    var config = s_config;
    try {
      // var curdir = await invoke<string>("get_current_dir");
      // 設定ファイルの読み込み
      const profileBookStr = await readTextFile(CONFIG_FILE);
      // パース
      config = JSON.parse(profileBookStr) as Config;
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
    // ディレクトリ存在チェック
    const ext = await exists("", { dir: BaseDirectory.App });
    if (!ext) {
      await createDir("", { dir: BaseDirectory.App });
    }
    // 設定ファイルへの書き出し
    await writeTextFile(CONFIG_FILE, JSON.stringify(s_config));
  }

  function updateSSetting(ssetting: SSetting) {
    let c = s_config;
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
    s_config.pos = 0;
    s_config.media = media;
    setConfig(s_config);
    saveConfig();
    updateFileName(media);
  }

  async function updateFileName(media: Media) {
    setPlayname(media.name);
    let new_url = media.path;
    if (!media.url) {
      new_url = convertFileSrc(media.path);
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
            const cfg = s_config;
            cfg.pos = pos;
            setConfig(cfg);
            saveConfig();
          }}
          onDefVolumeChange={(volume: number) => {
            const cfg = s_config;
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

        {/* radio input */}
        <RadioInput
          s_loaded={s_loaded}
          s_config={s_config}
          onUpdateSSetting={updateSSetting}
          setMedias={setMedias}
          setLoading={setLoading}
          scrollToCurrent={scrollToCurrent}
        />
      </Container>
    </ThemeProvider>
  );
}

export default App;
