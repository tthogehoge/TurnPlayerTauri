import { forwardRef } from "react";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import { Files, FuncSetMedia } from "./App";

type Props = {
  files: Files | null;
  name: string;
  funcsetmedia: FuncSetMedia;
};

export const FileList = forwardRef<HTMLDivElement, Props>(
  ({ files, name, funcsetmedia }, ref) => {
    if (files == null) {
      return null;
    } else {
      return (
        <List>
          {files.map((f) => {
            let sel = f.name == name;
            let refsel = sel ? ref : null;
            return (
              <ListItemButton key={f.path} selected={sel} ref={refsel}>
                <ListItemText
                  onClick={() => {
                    funcsetmedia(f);
                  }}
                >
                  {f.name}
                </ListItemText>
              </ListItemButton>
            );
          })}
        </List>
      );
    }
  }
);
