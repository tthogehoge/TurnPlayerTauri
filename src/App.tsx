import { useState, useEffect } from "react";
import reactLogo from "./assets/react.svg";
import { desktopDir, join } from "@tauri-apps/api/path";
import { invoke, convertFileSrc } from "@tauri-apps/api/tauri";
import ReactPlayer from "react-player";
import "./App.css";

type Files = Array<string>;

function App() {
  const [dir, setDir] = useState("");
  const [url, setUrl] = useState("https://youtu.be/eqZQbFOhCGI");
  const [files, setFiles] = useState<Files | null>(null);

  async function findFiles() {
    // Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
    var files = await invoke<Files>("find_files", { dir })
    .catch( err=> { console.error(err); return null; });
    setFiles(files);
  }

  const file_list = files ? <ul>
    {files.map(f => {
      return <li key={f} onClick={()=>{
        updateFileName(f);
      }}>{f}</li>
    })
    }
  </ul> : null;

  async function updateFileName(s:string) {
    const new_url = convertFileSrc(s)
    setUrl(new_url);
  }

  return (
    <div className="container">
      <h1>React Player</h1>
      <ReactPlayer url={url} controls={true}/>

      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          findFiles();
        }}
      >
        <input
          id="dir-input"
          onChange={(e) => setDir(e.currentTarget.value)}
          placeholder="Enter a directory..."
        />
        <button type="submit">file find</button>
      </form>

      {file_list}

    </div>
  );
}

export default App;
