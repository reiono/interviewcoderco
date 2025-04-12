"use strict";
// ScreenshotHelper.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScreenshotHelper = void 0;
const node_path_1 = __importDefault(require("node:path"));
const node_fs_1 = __importDefault(require("node:fs"));
const electron_1 = require("electron");
const uuid_1 = require("uuid");
const child_process_1 = require("child_process");
const util_1 = require("util");
const execFileAsync = (0, util_1.promisify)(child_process_1.execFile);
class ScreenshotHelper {
    constructor(view = "queue") {
        this.screenshotQueue = [];
        this.extraScreenshotQueue = [];
        this.MAX_SCREENSHOTS = 2;
        this.view = "queue";
        this.view = view;
        // Initialize directories
        this.screenshotDir = node_path_1.default.join(electron_1.app.getPath("userData"), "screenshots");
        this.extraScreenshotDir = node_path_1.default.join(electron_1.app.getPath("userData"), "extra_screenshots");
        // Create directories if they don't exist
        if (!node_fs_1.default.existsSync(this.screenshotDir)) {
            node_fs_1.default.mkdirSync(this.screenshotDir);
        }
        if (!node_fs_1.default.existsSync(this.extraScreenshotDir)) {
            node_fs_1.default.mkdirSync(this.extraScreenshotDir);
        }
    }
    getView() {
        return this.view;
    }
    setView(view) {
        console.log("Setting view in ScreenshotHelper:", view);
        console.log("Current queues - Main:", this.screenshotQueue, "Extra:", this.extraScreenshotQueue);
        this.view = view;
        // Clear appropriate queue when switching views
        if (view === "queue") {
            this.clearExtraScreenshotQueue();
        }
        else if (view === "solutions") {
            // Don't clear main queue when switching to solutions
            // This allows us to keep the original screenshots
        }
    }
    getScreenshotQueue() {
        return this.screenshotQueue;
    }
    getExtraScreenshotQueue() {
        console.log("Getting extra screenshot queue:", this.extraScreenshotQueue);
        return this.extraScreenshotQueue;
    }
    clearQueues() {
        // Clear screenshotQueue
        this.screenshotQueue.forEach((screenshotPath) => {
            node_fs_1.default.unlink(screenshotPath, (err) => {
                if (err)
                    console.error(`Error deleting screenshot at ${screenshotPath}:`, err);
            });
        });
        this.screenshotQueue = [];
        // Clear extraScreenshotQueue
        this.extraScreenshotQueue.forEach((screenshotPath) => {
            node_fs_1.default.unlink(screenshotPath, (err) => {
                if (err)
                    console.error(`Error deleting extra screenshot at ${screenshotPath}:`, err);
            });
        });
        this.extraScreenshotQueue = [];
    }
    checkScreenRecordingPermission() {
        if (process.platform === "darwin") {
            return electron_1.systemPreferences.getMediaAccessStatus("screen") === "granted";
        }
        return true; // Windows and Linux don't require explicit screen recording permission
    }
    async captureScreenshotMac() {
        if (!this.checkScreenRecordingPermission()) {
            throw new Error("Screen recording permission not granted. Please enable it in System Preferences > Security & Privacy > Privacy > Screen Recording");
        }
        const tmpPath = node_path_1.default.join(electron_1.app.getPath("temp"), `${(0, uuid_1.v4)()}.png`);
        await execFileAsync("screencapture", ["-x", tmpPath]);
        const buffer = await node_fs_1.default.promises.readFile(tmpPath);
        await node_fs_1.default.promises.unlink(tmpPath);
        return buffer;
    }
    async captureScreenshotWindows() {
        // Using PowerShell's native screenshot capability
        const tmpPath = node_path_1.default.join(electron_1.app.getPath("temp"), `${(0, uuid_1.v4)()}.png`);
        const script = `
      Add-Type -AssemblyName System.Windows.Forms
      Add-Type -AssemblyName System.Drawing
      $screen = [System.Windows.Forms.Screen]::PrimaryScreen
      $bitmap = New-Object System.Drawing.Bitmap $screen.Bounds.Width, $screen.Bounds.Height
      $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
      $graphics.CopyFromScreen($screen.Bounds.X, $screen.Bounds.Y, 0, 0, $bitmap.Size)
      $bitmap.Save('${tmpPath.replace(/\\/g, "\\\\")}')
      $graphics.Dispose()
      $bitmap.Dispose()
    `;
        await execFileAsync("powershell", ["-command", script]);
        const buffer = await node_fs_1.default.promises.readFile(tmpPath);
        await node_fs_1.default.promises.unlink(tmpPath);
        return buffer;
    }
    async takeScreenshot() {
        console.log("Taking screenshot in view:", this.view);
        await new Promise((resolve) => setTimeout(resolve, 100));
        let screenshotPath = "";
        try {
            // Check permissions before proceeding
            if (process.platform === "darwin" &&
                !this.checkScreenRecordingPermission()) {
                throw new Error("Screen recording permission not granted. Please enable it in System Preferences > Security & Privacy > Privacy > Screen Recording");
            }
            // Get screenshot buffer using native methods
            const screenshotBuffer = process.platform === "darwin"
                ? await this.captureScreenshotMac()
                : await this.captureScreenshotWindows();
            // Save and manage the screenshot based on current view
            if (this.view === "queue") {
                screenshotPath = node_path_1.default.join(this.screenshotDir, `${(0, uuid_1.v4)()}.png`);
                await node_fs_1.default.promises.writeFile(screenshotPath, screenshotBuffer);
                console.log("Adding screenshot to main queue:", screenshotPath);
                this.screenshotQueue.push(screenshotPath);
                if (this.screenshotQueue.length > this.MAX_SCREENSHOTS) {
                    const removedPath = this.screenshotQueue.shift();
                    if (removedPath) {
                        try {
                            await node_fs_1.default.promises.unlink(removedPath);
                            console.log("Removed old screenshot from main queue:", removedPath);
                        }
                        catch (error) {
                            console.error("Error removing old screenshot:", error);
                        }
                    }
                }
            }
            else if (this.view === "solutions") {
                // In solutions view, only add to extra queue
                screenshotPath = node_path_1.default.join(this.extraScreenshotDir, `${(0, uuid_1.v4)()}.png`);
                await node_fs_1.default.promises.writeFile(screenshotPath, screenshotBuffer);
                console.log("Adding screenshot to extra queue:", screenshotPath);
                this.extraScreenshotQueue.push(screenshotPath);
                if (this.extraScreenshotQueue.length > this.MAX_SCREENSHOTS) {
                    const removedPath = this.extraScreenshotQueue.shift();
                    if (removedPath) {
                        try {
                            await node_fs_1.default.promises.unlink(removedPath);
                            console.log("Removed old screenshot from extra queue:", removedPath);
                        }
                        catch (error) {
                            console.error("Error removing old screenshot:", error);
                        }
                    }
                }
            }
        }
        catch (error) {
            console.error("Screenshot error:", error);
            throw error;
        }
        return screenshotPath;
    }
    async getImagePreview(filepath) {
        try {
            const data = await node_fs_1.default.promises.readFile(filepath);
            return `data:image/png;base64,${data.toString("base64")}`;
        }
        catch (error) {
            console.error("Error reading image:", error);
            throw error;
        }
    }
    clearExtraScreenshotQueue() {
        // Clear extraScreenshotQueue
        this.extraScreenshotQueue.forEach((screenshotPath) => {
            node_fs_1.default.unlink(screenshotPath, (err) => {
                if (err)
                    console.error(`Error deleting extra screenshot at ${screenshotPath}:`, err);
            });
        });
        this.extraScreenshotQueue = [];
    }
}
exports.ScreenshotHelper = ScreenshotHelper;
