// 新しいコンポーネントを作成
import React from "react";
import { Box, Input, Button } from "@mui/material";
import { SSetting } from "./App";

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
  return (
    <>
      <Box>Search directory</Box>
      <Input
        id="dir-input"
        onChange={(e:any) => setDir(e.currentTarget.value)}
        placeholder="Enter a directory..."
        value={dir}
        fullWidth={true}
      />
      <Box>Search string</Box>
      <Input
        id="str-input"
        onChange={(e:any) => setStr(e.currentTarget.value)}
        placeholder="Enter a string..."
        value={str}
        fullWidth={true}
      />
      <Button
        variant="contained"
        type="submit"
        onClick={(e:any) => {
          e.preventDefault();
          findFiles({ dir, str });
        }}
      >
        find files
      </Button>
      <Button
        variant="contained"
        type="submit"
        onClick={(e:any) => {
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
