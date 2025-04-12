"use strict";
// ipcHandlers.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeIpcHandlers = initializeIpcHandlers;
const electron_1 = require("electron");
function initializeIpcHandlers({ getMainWindow, setWindowDimensions, getScreenshotQueue, getExtraScreenshotQueue, getImagePreview, getView, }) {
    console.log("Initializing IPC handlers");
    // Platform handler
    electron_1.ipcMain.handle("get-platform", () => {
        console.log("get-platform handler called, returning:", process.platform);
        return process.platform;
    });
    // Window dimension handler
    electron_1.ipcMain.handle("update-content-dimensions", async (_event, { width, height }) => {
        if (width && height) {
            setWindowDimensions(width, height);
        }
    });
    // Screenshot management handlers
    electron_1.ipcMain.handle("get-screenshots", async () => {
        try {
            let previews = [];
            const currentView = getView();
            if (currentView === "queue") {
                const queue = getScreenshotQueue();
                previews = await Promise.all(queue.map(async (path) => ({
                    path,
                    preview: await getImagePreview(path),
                })));
            }
            else {
                console.log("Getting extra screenshots");
                const extraQueue = getExtraScreenshotQueue();
                previews = await Promise.all(extraQueue.map(async (path) => ({
                    path,
                    preview: await getImagePreview(path),
                })));
            }
            return {
                success: true,
                previews: previews || [],
            };
        }
        catch (error) {
            console.error("Error getting screenshots:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
                previews: [],
            };
        }
    });
    // Auth related handlers
    electron_1.ipcMain.handle("open-settings-portal", () => {
        electron_1.shell.openExternal("https://www.interviewcoder.co/settings");
    });
    electron_1.ipcMain.handle("open-subscription-portal", async () => {
        try {
            const url = "https://www.interviewcoder.co/checkout";
            await electron_1.shell.openExternal(url);
            return { success: true };
        }
        catch (error) {
            console.error("Error opening page:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "Failed to open page",
            };
        }
    });
    // Add click-through handler
    electron_1.ipcMain.handle("set-ignore-mouse-events", (_event, ignore, options) => {
        const win = getMainWindow();
        if (win && !win.isDestroyed()) {
            win.setIgnoreMouseEvents(ignore, options);
        }
    });
}
