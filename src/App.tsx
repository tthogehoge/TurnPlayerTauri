import { useState, useEffect } from "react";
import reactLogo from "./assets/react.svg";
import { desktopDir, join } from "@tauri-apps/api/path";
import { invoke, convertFileSrc } from "@tauri-apps/api/tauri";
import ReactPlayer from "react-player";
import "./App.css";

function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [dir, setDir] = useState("");
  const [url, setUrl] = useState("https://youtu.be/eqZQbFOhCGI");
  const [src, setSrc] = useState<string>("");

  async function findFiles() {
    // Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
    var files = await invoke("find_files", { dir });
  }

  async function updateFileName() {
    const desktopPath = await desktopDir();
    const new_url = convertFileSrc(await join(desktopPath, src))
    setUrl(new_url);
  }

  return (
    <div className="container">
      <h1>Tauri Testへようこそ!</h1>

      <div className="row">
        <a href="https://vitejs.dev" target="_blank">
          <img src="/vite.svg" className="logo vite" alt="Vite logo" />
        </a>
        <a href="https://tauri.app" target="_blank">
          <img src="/tauri.svg" className="logo tauri" alt="Tauri logo" />
        </a>
        <a href="https://reactjs.org" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>

      <p>Click on the Tauri, Vite, and React logos to learn more.</p>

      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          findFiles();
        }}
      >
        <input
          id="greet-input"
          onChange={(e) => setDir(e.currentTarget.value)}
          placeholder="Enter a directory..."
        />
        <button type="submit">file find</button>
      </form>

      <p>{greetMsg}</p>

      <>
        <ReactPlayer url={url} controls={true}/>
        <form
        onSubmit={(e) => {
          e.preventDefault();
          updateFileName();
        }}
        >
        <input type="text" value={src} onChange={e => setSrc(e.target.value)}/>
        <button type="submit">Open</button>
        </form>
      </>
    </div>
  );
}

export default App;
