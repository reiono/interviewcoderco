// ipcHandlers.ts

import { ipcMain, shell } from "electron";

export function initializeIpcHandlers({
  getMainWindow,
  setWindowDimensions,
  getScreenshotQueue,
  getExtraScreenshotQueue,
  getImagePreview,

  getView,
}: any): void {
  console.log("Initializing IPC handlers");

  // Platform handler
  ipcMain.handle("get-platform", () => {
    console.log("get-platform handler called, returning:", process.platform);
    return process.platform;
  });

  // Window dimension handler
  ipcMain.handle(
    "update-content-dimensions",
    async (_event, { width, height }: { width: number; height: number }) => {
      if (width && height) {
        setWindowDimensions(width, height);
      }
    },
  );

  // Screenshot management handlers
  ipcMain.handle("get-screenshots", async () => {
    try {
      let previews = [];
      const currentView = getView();

      if (currentView === "queue") {
        const queue = getScreenshotQueue();
        previews = await Promise.all(
          queue.map(async (path: string) => ({
            path,
            preview: await getImagePreview(path),
          })),
        );
      } else {
        console.log("Getting extra screenshots");
        const extraQueue = getExtraScreenshotQueue();
        previews = await Promise.all(
          extraQueue.map(async (path: string) => ({
            path,
            preview: await getImagePreview(path),
          })),
        );
      }

      return {
        success: true,
        previews: previews || [],
      };
    } catch (error) {
      console.error("Error getting screenshots:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        previews: [],
      };
    }
  });

  // Auth related handlers
  ipcMain.handle("open-settings-portal", () => {
    shell.openExternal("https://www.interviewcoder.co/settings");
  });

  ipcMain.handle("open-subscription-portal", async () => {
    try {
      const url = "https://www.interviewcoder.co/checkout";
      await shell.openExternal(url);
      return { success: true };
    } catch (error) {
      console.error("Error opening page:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to open page",
      };
    }
  });

  // Add click-through handler
  ipcMain.handle(
    "set-ignore-mouse-events",
    (_event, ignore: boolean, options?: { forward: boolean }) => {
      const win = getMainWindow();
      if (win && !win.isDestroyed()) {
        win.setIgnoreMouseEvents(ignore, options);
      }
    },
  );
}
