import React from "react";
import { createRef } from "react";
import Drawer from "@mui/material/Drawer";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import Adjust from "@mui/icons-material/Adjust";
import MenuIcon from "@mui/icons-material/Menu";
import { Files, FuncSetMedia } from "./App";
import { FileList } from "./FileList";

type Props = {
  drawerOpen: boolean;
  setDrawerOpen: (drawerOpen: boolean) => void;
  s_medias: Files | null;
  name: string;
  shouldScroll: boolean;
  setShouldScroll: (shouldscroll: boolean) => void;
  funcsetmedia: FuncSetMedia;
};

export const RadioDrawer: React.FC<Props> = ({
  drawerOpen,
  setDrawerOpen,
  s_medias,
  name,
  shouldScroll,
  setShouldScroll,
  funcsetmedia,
}) => {
  const scroll_ref = createRef<HTMLDivElement>();

  async function scroollToRef() {
    scroll_ref!.current!.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }

  // transitionend イベントを待ってから scrollIntoView を実行する
  const handleTransitionEnd = () => {
    if (shouldScroll) {
      scroollToRef();
      setShouldScroll(false); // スクロール後にフラグをリセット
    }
  };

  return (
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
        name={name}
        funcsetmedia={funcsetmedia}
        ref={scroll_ref}
      />
    </Drawer>
  );
};
