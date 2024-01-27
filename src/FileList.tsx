import { forwardRef } from "react";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import { v4 as uuidv4 } from 'uuid';
import { Files, Media } from "./App";

type Props = {
  files: Files | null;
  name: string;
  funcsetmedia: (media: Media) => void;
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
              <ListItemButton key={uuidv4()} selected={sel} ref={refsel}>
                <ListItemText
                  onClick={() => {
                    if(f.path != "") funcsetmedia(f);
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
