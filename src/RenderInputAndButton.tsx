// 新しいコンポーネントを作成
import React from "react";
import { Box, Input, Button, IconButton } from "@mui/material";
import FolderIcon from "@mui/icons-material/Folder";
import SearchIcon from "@mui/icons-material/Search";
import { SSetting, AEvent } from "./App";
import { open } from "@tauri-apps/api/dialog";

type RenderInputAndButtonProps = {
  dir: string;
  str: string;
  callEvent: (event:AEvent, opt:any) => void;
};

const RenderInputAndButton: React.FC<RenderInputAndButtonProps> = ({
  dir,
  str,
  callEvent,
}) => {
  // フォルダ選択ダイアログを出す関数
  async function selectFolder(dir: string) {
    // Open a selection dialog for image files
    const selected = await open({
      directory: true,
      multiple: false,
      defaultPath: dir,
    });
    if (Array.isArray(selected)) {
      // user selected multiple files
    } else if (selected === null) {
      // user cancelled the selection
    } else {
      // user selected a single file
      console.log(selected);
      callEvent("SetDir", selected);
    }
  }

  return (
    <>
      <Box display="flex" alignItems="center">
        <IconButton
          onClick={() => selectFolder(dir)}
          aria-label="select folder"
        >
          <FolderIcon />
        </IconButton>
        <Input
          id="dir-input"
          onChange={(e: any) => callEvent("SetDir", e.currentTarget.value)}
          placeholder="Enter a directory..."
          value={dir}
          fullWidth={true}
        />
      </Box>
      <Box display="flex" alignItems="center">
        <IconButton
          onClick={() => callEvent("FindFiles", {dir, str})}
          aria-label="select folder"
        >
          <SearchIcon />
        </IconButton>
        <Input
          id="str-input"
          onChange={(e: any) => callEvent("SetStr", e.currentTarget.value)}
          placeholder="Enter a string..."
          value={str}
          fullWidth={true}
        />
      </Box>
      <Button
        variant="contained"
        type="submit"
        onClick={(e: any) => {
          e.preventDefault();
          callEvent("FindFiles", {dir, str});
        }}
      >
        Search
      </Button>
      <Button
        variant="contained"
        type="submit"
        onClick={(e: any) => {
          e.preventDefault();
          callEvent("GetFiles", null);
        }}
      >
        Now Playing
      </Button>
    </>
  );
};

export default RenderInputAndButton;
