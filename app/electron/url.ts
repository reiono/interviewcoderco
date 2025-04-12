// @ts-nocheck

import { app, type BrowserWindow } from "electron";
import client from "./handle";

const debounce = (func, wait) => {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
};

export async function handleCustomProtocol(window: BrowserWindow) {
  const mode = process.env.NODE_ENV as "production" | "development";

  const debouncedHandleUrl = debounce((requestUrl, window) => {
    if (process.platform === 'darwin') {
      app.dock.hide();
    }
    handleUrl(requestUrl, window);
  }, 500);

  client.electronAppUniversalProtocolClient.on("request", async (requestUrl) => {
    debouncedHandleUrl(requestUrl, window);
  });

  await client.electronAppUniversalProtocolClient.initialize({
    protocol: "interviewcoder",
    mode: mode ?? "production",
  });
}

function handleUrl(url: string, window: BrowserWindow) {
  const urlObj = new URL(url);
  const route = urlObj.hostname;
  const params = Object.fromEntries(urlObj.searchParams);

  window.webContents.send("protocol-data", { route, params });
}
