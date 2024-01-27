import React from "react";
import { useEffect, useRef, useContext } from "react";
import { Config, FuncPlayList, FuncSaveConfig } from "./App";
import ReactPlayer from "react-player";
import { Box } from "@mui/material";
import IconButton from "@mui/material/IconButton";
import SkipPreviousIcon from "@mui/icons-material/SkipPrevious";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import Slider from "@mui/material/Slider";
import { register, unregister } from "@tauri-apps/api/globalShortcut";
import { configContext } from "./App";

type Props = {
  s_volume: number;
  s_playname: string;
  s_url: string;
  s_config: Config;
  s_playing: boolean;
  saveConfig: FuncSaveConfig;
  playList: FuncPlayList;
  setPlaying: (playing: boolean) => void;
  onReady?: () => boolean;
};

export const Player: React.FC<Props> = ({
  s_volume,
  s_playname,
  s_url,
  s_config,
  s_playing,
  saveConfig,
  playList,
  setPlaying,
  onReady = () => {
    return false;
  },
}) => {
  const { s_defvolume, setDefVolume } = useContext(configContext);

  useEffect(() => {
    registerShortcut();
  }, []);

  async function registerShortcut() {
    await unregister("F1");
    await unregister("F2");
    await register("F1", () => {
      setPlaying(false);
    });
    await register("F2", () => {
      setPlaying(true);
    });
  }

  // react player
  const player = useRef<ReactPlayer>(null);

  async function onPlayerReady() {
    if (onReady()) {
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
      saveConfig(s_config);
    }
  }

  async function onPlayerEnded() {
    playList(1);
  }

  const handleVolumeChange = (_: any, newvalue: any) => {
    setDefVolume(newvalue);
    const cfg = s_config;
    cfg.volume = newvalue;
    saveConfig(cfg);
  };

  return (
    <div>
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
    </div>
  );
};
