import React from "react";
import { useEffect, useState, useRef /*, createRef*/ } from "react";
import { Config } from "./App";
/*
import Drawer from "@mui/material/Drawer";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import Adjust from "@mui/icons-material/Adjust";
import MenuIcon from "@mui/icons-material/Menu";
import { Files, Media } from "./App";
import { FileList } from "./FileList";
*/
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

export const WebAudio: React.FC<Props> = ({
  s_loaded,
  //s_volume,
  //s_playname,
  s_url,
  //s_config,
  //s_playing,
  setPlaying,
  /*
  onReady = () => {
    return false;
  },
  onPause = () => {},
  onDefVolumeChange = () => {},
  onNext = () => {},
  onPrev = () => {},
  */
}) => {
  const [audioCtx, setAudioCtx] = useState<AudioContext | null>(null); // ref経由でAudioContext利用
  const audioRef = useRef<HTMLMediaElement>(null);
  /*
  const [source, setSource] = useState<MediaElementAudioSourceNode | null>(
    null
  ); // MediaElementSource
  */
  //const [s_defvolume, setDefVolume] = useState(1.0);

  useEffect(() => {
    if (s_loaded) {
      //setDefVolume(s_config.volume);
    }
  }, [s_loaded]);

  useEffect(() => {
    loadurl(s_url);
  }, [s_url]);

  async function loadurl(url: string) {
    if (audioCtx) {
      const data = await fetch(url);
      const buf = await data.arrayBuffer();
      audioCtx.decodeAudioData(
        buf,
        (buffer: AudioBuffer) => {
          console.log("decode success");
          const source = audioCtx.createBufferSource();
          source.buffer = buffer;
          source.loopEnd = buffer.duration;
          source.connect(audioCtx.destination);
          source.start(0);
        },
        () => {
          console.log("decode error");
        }
      );
    }
  }

  useEffect(() => {
    // 初期化時にAudioContextを作成
    const ctx = audioCtx;
    if (ctx == null) {
      const ctx = new AudioContext();
      setAudioCtx(ctx);
    }
    if (ctx) {
      // createMediaElementSource
      if (audioRef.current) {
        const elementSource = ctx.createMediaElementSource(audioRef.current);
        elementSource.connect(ctx.destination);
        // setSource(elementSource);
      }
    }
    // nodeを接続
    registerShortcut();
  }, []);

  async function registerShortcut() {
    const ua = await platform();
    if (ua == "windows") {
      console.log(ua);
      await unregister("F1");
      await unregister("F2");
      await register("F1", () => {
        setPlaying(false);
      });
      await register("F2", () => {
        setPlaying(true);
      });
    }
  }

  /*
  const scroll_ref = createRef<HTMLDivElement>();

  async function scroollToRef() {
    scroll_ref!.current!.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }
  */

  /*
  // transitionend イベントを待ってから scrollIntoView を実行する
  const handleTransitionEnd = () => {
    if (shouldScroll) {
      scroollToRef();
      setShouldScroll(false); // スクロール後にフラグをリセット
    }
  };
  */

  return (
    <>
      <audio ref={audioRef} controls></audio>
    </>
  );
};
