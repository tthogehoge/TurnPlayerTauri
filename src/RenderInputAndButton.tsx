// 新しいコンポーネントを作成
import React from "react";
import { Box, Input, Button, IconButton } from "@mui/material";
import FolderIcon from "@mui/icons-material/Folder";
import { SSetting } from "./App";
import { open } from "@tauri-apps/api/dialog";

type RenderInputAndButtonProps = {
  dir: string;
  str: string;
  setDir: (dir: string) => void;
  setStr: (str: string) => void;
  findFiles: (set: SSetting) => void;
  getFiles: () => void;
};

const RenderInputAndButton: React.FC<RenderInputAndButtonProps> = ({
  dir,
  str,
  setDir,
  setStr,
  findFiles,
  getFiles,
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
      setDir(selected);
    }
  }

  return (
    <>
      <Box display="flex" alignItems="center">
        <Box>DIR: </Box>
        <Input
          id="dir-input"
          onChange={(e: any) => setDir(e.currentTarget.value)}
          placeholder="Enter a directory..."
          value={dir}
          fullWidth={true}
        />
        <IconButton
          onClick={() => selectFolder(dir)}
          aria-label="select folder"
        >
          <FolderIcon />
        </IconButton>
      </Box>
      <Box display="flex" alignItems="center">
        <Box>TEXT: </Box>
        <Input
          id="str-input"
          onChange={(e: any) => setStr(e.currentTarget.value)}
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
          findFiles({ dir, str });
        }}
      >
        find files
      </Button>
      <Button
        variant="contained"
        type="submit"
        onClick={(e: any) => {
          e.preventDefault();
          getFiles();
        }}
      >
        get files
      </Button>
    </>
  );
};

export default RenderInputAndButton;
