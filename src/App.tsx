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
import { fetch, ResponseType } from "@tauri-apps/api/http";
import ReactPlayer from "react-player";
import {
  Box,
  createTheme,
  PaletteMode,
  Divider,
  // Stack,
  ThemeProvider,
} from "@mui/material";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Container from "@mui/material/Container";
import Drawer from "@mui/material/Drawer";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";
import Adjust from "@mui/icons-material/Adjust";
import SkipPreviousIcon from "@mui/icons-material/SkipPrevious";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import CircularProgress from "@mui/material/CircularProgress";
import { FileList } from "./FileList";
import RenderInputAndButton from "./RenderInputAndButton";
import { Input } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import Slider from "@mui/material/Slider";

export type SSetting = {
  dir: string;
  str: string;
};

export type Media = {
  path: string;
  name: string;
  date: number;
  url: boolean;
};

export type Files = Array<Media>;

export type FuncSetMedia = (media: Media) => void;

export type AEvent = "SetDir" | "SetStr" | "FindFiles" | "GetFiles";

// 設定構造体
type Config = {
  set: SSetting;
  media: Media;
  pos: number;
  podcast: string;
  volume: number;
};

// 設定デフォルト値
function getDefaultConfig() {
  let config: Config = {
    set: { dir: "", str: "" },
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
  const [s_dir, setDir] = useState("");
  const [s_str, setStr] = useState("");
  const [s_url, setUrl] = useState("");
  const [s_loaded, setLoaded] = useState(false);
  const [s_playing, setPlaying] = useState(false);
  const [s_playname, setPlayname] = useState("");
  const [s_files, setFiles] = useState<Files | null>(null);
  const [s_urls, setUrls] = useState<Files | null>(null);
  const [s_medias, setMedias] = useState<Files | null>(null);
  const [s_config, setConfig] = useState<Config>(getDefaultConfig());
  const [s_volume, setVolume] = useState(1.0);
  const [s_defvolume, setDefVolume] = useState(1.0);
  const [mode /*setMode*/] = useState<PaletteMode>("light");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [shouldScroll, setShouldScroll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [s_podcast, setPodcast] = useState("");
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

  const scroll_ref = createRef<HTMLDivElement>();

  // react player
  const player = useRef<ReactPlayer>(null);

  // 初回実行
  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    updateFiles();
  }, [s_files, s_urls]);

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
    setDefVolume(config.volume);
    setDir(config.set.dir);
    setStr(config.set.str);
    if (config.set.dir != "") {
      findFiles(config.set);
    }
    if (config.media.path != "") {
      updateFileName(config.media);
      if (!config.media.url) {
        setVolume(config.volume);
      } else {
        setVolume(1.0);
      }
    }
    setPodcast(config.podcast);
    fetchPodcastData(config.podcast);
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
    await writeTextFile(CONFIG_FILE, JSON.stringify(s_config), {
      dir: BaseDirectory.App,
    });
  }

  async function onPlayerReady() {
    if (s_loaded) {
      setLoaded(false);
      if (player.current) {
        if (s_config.pos != 0) {
          player.current.seekTo(s_config.pos, "seconds");
        }
      }
    }
  }

  async function onPlayerPause() {
    if (player.current) {
      s_config.pos = player.current.getCurrentTime();
      setConfig(s_config);
      saveConfig();
    }
  }

  async function onPlayerEnded() {
    playList(1);
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

  async function findFiles(set: SSetting) {
    setLoading(true);
    // Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
    var f = await invoke<Files>("find_files", { set }).catch((err) => {
      console.error(err);
      return null;
    });
    setFiles(f);
    setLoading(false);
  }

  async function getFiles() {
    // Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
    var f = await invoke<Files>("get_files").catch((err) => {
      console.error(err);
      return null;
    });
    setFiles(f);
    setShouldScroll(true);
    setDrawerOpen(true);
  }

  function updateFiles() {
    let m: Files = [];
    if (s_files != null) m = s_files;
    if (s_urls != null) m = m.concat(s_urls);
    m = m.sort((a, b) => a.date - b.date);
    setMedias(m);
  }

  async function scroollToTop() {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function scroollToRef() {
    scroll_ref!.current!.scrollIntoView({
      behavior: "smooth",
      block: "center",
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

  async function callEvent(event: AEvent, opt: any) {
    switch (event) {
      case "SetDir":
        setDir(opt);
        break;
      case "SetStr":
        setStr(opt);
        break;
      case "FindFiles":
        let set: SSetting = opt;
        let c = s_config;
        c.set.dir = set.dir;
        c.set.str = set.str;
        setConfig(c);
        saveConfig();
        findFiles(opt);
        break;
      case "GetFiles":
        getFiles();
        break;
    }
  }

  // ポッドキャストのデータを取得するための関数
  async function fetchPodcastData(url: string) {
    // https://getrssfeed.com/　でRSSを抜き出す
    // ポッドキャストのデータを取得する処理を記述する
    // 例えば、外部APIからデータを取得する場合はここにAPIリクエストを行うコードを記述する
    // 取得したデータは適切な形式に整形して返す
    // 例: const podcastData = await fetch('https://example.com/api/podcast').then(res => res.json());
    const podcastData = await fetch(url, {
      method: "GET",
      responseType: ResponseType.Text,
    });
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(
      podcastData.data as string,
      "text/xml"
    );
    console.log(xmlDoc);
    const urls: Files = [];
    const items = xmlDoc.getElementsByTagName("item");
    for (let i = 0; i < items.length; i++) {
      const title =
        items[i].getElementsByTagName("title")[0].childNodes[0].nodeValue;
      const pubdate =
        items[i].getElementsByTagName("pubDate")[0].childNodes[0].nodeValue;
      const enclosure = items[i].getElementsByTagName("enclosure")[0];
      const url = enclosure.getAttribute("url");
      const media: Media = {
        path: url || "",
        name: title || "",
        date: new Date(pubdate as string).getTime() / 1000 || 0,
        url: true,
      };
      urls.push(media);
      console.log(media);
    }
    setUrls(urls);
    // 取得したデータを返す
    return podcastData;
  }

  // transitionend イベントを待ってから scrollIntoView を実行する
  const handleTransitionEnd = () => {
    if (shouldScroll) {
      scroollToRef();
      setShouldScroll(false); // スクロール後にフラグをリセット
    }
  };

  const handleVolumeChange = (_: any, newvalue: any) => {
    setDefVolume(newvalue);
    const cfg = s_config;
    cfg.volume = newvalue;
    setConfig(cfg);
    saveConfig();
  };

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
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onTransitionEnd={handleTransitionEnd}
      >
        {/* drawerの一番上 */}
        <AppBar position="sticky" color="primary">
          <Toolbar>
            {/* 閉じるボタン */}
            <IconButton
              size="large"
              edge="start"
              color="inherit"
              aria-label="menu"
              onClick={() => setDrawerOpen(false)}
              sx={{ marginRight: "auto" }}
            >
              <MenuIcon />
            </IconButton>

            {/* 現在位置にスクロール */}
            <IconButton
              size="large"
              edge="start"
              color="inherit"
              aria-label="menu"
              onClick={() => scroollToRef()}
              sx={{ marginRight: "auto" }}
              style={{ width: "100%" }}
            >
              <Adjust />
            </IconButton>
          </Toolbar>
        </AppBar>

        {/* ファイルリスト */}
        <FileList
          files={s_medias}
          name={s_config.media.name}
          funcsetmedia={funcSetMedia}
          ref={scroll_ref}
        />
      </Drawer>

      <Container>
        <Box component="p">{s_playname}</Box>
        {/* player */}
        <Box display="flex" alignItems="center">
          <IconButton sx={{ height: "100%" }} onClick={() => playList(-1)}>
            <SkipPreviousIcon />
          </IconButton>
          <ReactPlayer
            ref={player}
            url={s_url}
            playing={s_playing}
            controls={true}
            volume={s_volume}
            onReady={() => {
              onPlayerReady();
            }}
            onEnded={() => {
              onPlayerEnded();
            }}
            onPause={() => {
              setPlaying(false);
              onPlayerPause();
            }}
            onPlay={() => {
              setPlaying(true);
            }}
          />
          <IconButton sx={{ height: "100%" }} onClick={() => playList(1)}>
            <SkipNextIcon />
          </IconButton>
        </Box>

        {/* player UI */}
        <Box display="flex" alignItems="center">
          <IconButton onClick={() => setPlaying(!s_playing)} sx={{ flex: 1 }}>
            {s_playing ? <PauseIcon /> : <PlayArrowIcon />}
          </IconButton>
          <Slider
            sx={{ width: "20%" }}
            min={0}
            max={1.0}
            step={0.01}
            value={s_defvolume}
            onChange={handleVolumeChange}
          />
        </Box>

        {/* podcast */}
        <Box display="flex" alignItems="center">
          <IconButton
            onClick={() => {
              let c = s_config;
              c.podcast = s_podcast;
              setConfig(c);
              saveConfig();
              fetchPodcastData(s_podcast);
            }}
            aria-label="select folder"
          >
            <SearchIcon />
          </IconButton>
          <Input
            id="str-input"
            onChange={(e: any) => setPodcast(e.currentTarget.value)}
            placeholder="Enter a podcast url..."
            value={s_podcast}
            fullWidth={true}
          />
        </Box>

        <Divider />

        {/* 入力ボタン */}
        <RenderInputAndButton dir={s_dir} str={s_str} callEvent={callEvent} />

        <Divider />
      </Container>
    </ThemeProvider>
  );
}

export default App;
