import React from "react";
import { useEffect, useRef } from "react";
import { Box } from "@mui/material";
import { Howl, Howler} from 'howler';

type Props = {
  url: string;
  playing: boolean;
  volume: number;
  onReady?: () => void;
  onEnded?: () => void;
  onPause?: () => void;
  onPlay?: () => void;
};

export const HPlayer: React.FC<Props> = ({
  url,
  playing,
  volume,
  onReady = () => {},
  onEnded = () => {},
  onPause = () => {},
  onPlay = () => {},
}) => {
  const player = useRef<Howl|null>(null);

  useEffect(() => {
    if(player.current){
        player.current.unload();
    }
    player.current = new Howl({
        src:[url],
    onload: () => {
        onReady();
    },
    onend: () => {
        onEnded();
    },
    onpause: () => {
        onPause();
    },
    onplay: () => {
        onPlay();
    }
    });
  }, [url]);

  useEffect(() => {
    if(player.current){
        if(playing){
            player.current.play();
        }else{
            player.current.pause();
        }
    }
  }, [playing]);

  useEffect(() => {
    Howler.volume(volume)
  }, [volume]);

  return (
    <div>
      {/* player UI */}
      <Box display="flex" alignItems="center">
      </Box>
    </div>
  );
};

