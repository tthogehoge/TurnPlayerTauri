import React from "react";
import { useState, useEffect, useRef } from "react";
import { Config } from "./App";
import ReactPlayer from "react-player";
import { Box } from "@mui/material";
import IconButton from "@mui/material/IconButton";
import SkipPreviousIcon from "@mui/icons-material/SkipPrevious";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import Slider from "@mui/material/Slider";
import { register, unregister } from "@tauri-apps/plugin-global-shortcut";
import { platform } from "@tauri-apps/plugin-os";

type Props = {
  s_loaded: boolean;
  s_volume: number;
  s_playname: string;
  s_url: string;
  s_config: Config;
  s_playing: boolean;
  setPlaying: (playing: boolean) => void;
  onReady?: () => boolean;
  onPause?: (time: number) => void;
  onDefVolumeChange?: (volume: number) => void;
  onNext?: () => void;
  onPrev?: () => void;
};

export const Player: React.FC<Props> = ({
  s_loaded,
  s_volume,
  s_playname,
  s_url,
  s_config,
  s_playing,
  setPlaying,
  onReady = () => {
    return false;
  },
  onPause = () => {},
  onDefVolumeChange = () => {},
  onNext = () => {},
  onPrev = () => {},
}) => {
  const [s_defvolume, setDefVolume] = useState(1.0);

  useEffect(() => {
    if (s_loaded) {
      setDefVolume(s_config.volume);
    }
  }, [s_loaded]);

  useEffect(() => {
    registerShortcut();
  }, []);

  async function registerShortcut() {
    const ua = await platform();
    if (ua == "windows") {
      console.log(ua);
      try{
        await unregister("F1");
        await unregister("F2");
      }catch(e){
        console.log(e);
      }
      try{
        await register("F1", () => {
          setPlaying(false);
        });
        await register("F2", () => {
          setPlaying(true);
        });
      }catch(e){
        console.log(e);
      }
    }
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

  const handleVolumeChange = (_: any, newvalue: any) => {
    setDefVolume(newvalue);
    onDefVolumeChange(newvalue);
  };

  return (
    <div>
      <Box component="p">{s_playname}</Box>
      {/* player */}
      <Box display="flex" alignItems="center">
        <IconButton sx={{ height: "100%" }} onClick={() => onPrev()}>
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
            onNext();
          }}
          onPause={() => {
            setPlaying(false);
            if (player.current) {
              onPause(player.current.getCurrentTime());
            }
          }}
          onPlay={() => {
            setPlaying(true);
          }}
        />
        <IconButton sx={{ height: "100%" }} onClick={() => onNext()}>
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
