import React from "react";
import { useState, useEffect } from "react";
import SearchIcon from "@mui/icons-material/Search";
import { Config, Files, Media, SSetting, AEvent } from "./App";
import { invoke } from "@tauri-apps/api/tauri";
import { fetch, ResponseType } from "@tauri-apps/api/http";
import {
  Box,
  Input,
  IconButton,
  Divider,
  // Stack,
} from "@mui/material";
import RenderInputAndButton from "./RenderInputAndButton";

type Props = {
  s_loaded: boolean;
  s_config: Config;
  setConfig: (config: Config) => void;
  saveConfig: () => void;
  setMedias: (files: Files | null) => void;
  setLoading?: (loading: boolean) => void;
  scrollToCurrent?: () => void;
};

export const RadioInput: React.FC<Props> = ({
  s_loaded,
  s_config,
  setConfig,
  saveConfig,
  setMedias,
  setLoading = () => {},
  scrollToCurrent = () => {},
}) => {
  const [s_dir, setDir] = useState("");
  const [s_str, setStr] = useState("");
  const [s_podcast, setPodcast] = useState("");
  const [s_files, setFiles] = useState<Files | null>(null);
  const [s_urls, setUrls] = useState<Files | null>(null);

  useEffect(() => {
    if (s_loaded) {
      setDir(s_config.set.dir);
      setStr(s_config.set.str);
      if (s_config.set.dir != "") {
        findFiles(s_config.set);
      }
      setPodcast(s_config.podcast);
      fetchPodcastData(s_config.podcast);
    }
  }, [s_loaded]);

  useEffect(() => {
    updateFiles();
  }, [s_files, s_urls]);

  async function callEvent(event: AEvent, opt: any) {
    switch (event) {
      case "SetDir":
        setDir(opt);
        break;
      case "SetStr":
        setStr(opt);
        break;
      case "FindFiles":
        let set: SSetting = opt;
        let c = s_config;
        c.set.dir = set.dir;
        c.set.str = set.str;
        setConfig(c);
        saveConfig();
        findFiles(opt);
        break;
      case "GetFiles":
        getFiles();
        break;
    }
  }

  async function findFiles(set: SSetting) {
    setLoading(true);
    // Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
    var f = await invoke<Files>("find_files", { set }).catch((err) => {
      console.error(err);
      return null;
    });
    setFiles(f);
    setLoading(false);
  }

  async function getFiles() {
    // Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
    var f = await invoke<Files>("get_files").catch((err) => {
      console.error(err);
      return null;
    });
    setFiles(f);
    scrollToCurrent();
  }

  function updateFiles() {
    let m: Files = [];
    if (s_files != null) m = s_files;
    if (s_urls != null) m = m.concat(s_urls);
    m = m.sort((a, b) => a.date - b.date);
    setMedias(m);
  }

  // ポッドキャストのデータを取得するための関数
  async function fetchPodcastData(url: string) {
    // https://getrssfeed.com/　でRSSを抜き出す
    // ポッドキャストのデータを取得する処理を記述する
    // 例えば、外部APIからデータを取得する場合はここにAPIリクエストを行うコードを記述する
    // 取得したデータは適切な形式に整形して返す
    // 例: const podcastData = await fetch('https://example.com/api/podcast').then(res => res.json());
    const podcastData = await fetch(url, {
      method: "GET",
      responseType: ResponseType.Text,
    });
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(
      podcastData.data as string,
      "text/xml"
    );
    console.log(xmlDoc);
    const urls: Files = [];
    const items = xmlDoc.getElementsByTagName("item");
    for (let i = 0; i < items.length; i++) {
      const title =
        items[i].getElementsByTagName("title")[0].childNodes[0].nodeValue;
      const pubdate =
        items[i].getElementsByTagName("pubDate")[0].childNodes[0].nodeValue;
      const enclosure = items[i].getElementsByTagName("enclosure")[0];
      const url = enclosure.getAttribute("url");
      const media: Media = {
        path: url || "",
        name: title || "",
        date: new Date(pubdate as string).getTime() / 1000 || 0,
        url: true,
      };
      urls.push(media);
      console.log(media);
    }
    setUrls(urls);
    // 取得したデータを返す
    return podcastData;
  }

  return (
    <>
      {/* podcast */}
      <Box display="flex" alignItems="center">
        <IconButton
          onClick={() => {
            let c = s_config;
            c.podcast = s_podcast;
            setConfig(c);
            saveConfig();
            fetchPodcastData(s_podcast);
          }}
          aria-label="select folder"
        >
          <SearchIcon />
        </IconButton>
        <Input
          id="str-input"
          onChange={(e: any) => setPodcast(e.currentTarget.value)}
          placeholder="Enter a podcast url..."
          value={s_podcast}
          fullWidth={true}
        />
      </Box>

      <Divider />

      {/* 入力ボタン */}
      <RenderInputAndButton dir={s_dir} str={s_str} callEvent={callEvent} />

      <Divider />
    </>
  );
};
