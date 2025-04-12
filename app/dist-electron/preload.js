"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROCESSING_EVENTS = void 0;
console.log("Preload script starting...");
const electron_1 = require("electron");
exports.PROCESSING_EVENTS = {
    //global states
    UNAUTHORIZED: "processing-unauthorized",
    NO_SCREENSHOTS: "processing-no-screenshots",
    API_KEY_INVALID: "processing-api-key-invalid",
    SCREENSHOT_ERROR: "screenshot-error",
    INITIAL_START: "initial-start",
    PROBLEM_EXTRACTED: "problem-extracted",
    SOLUTION_SUCCESS: "solution-success",
    INITIAL_SOLUTION_ERROR: "solution-error",
    DEBUG_START: "debug-start",
    DEBUG_SUCCESS: "debug-success",
    DEBUG_ERROR: "debug-error"
};
// At the top of the file
console.log("Preload script is running");
const electronAPI = {
    openSubscriptionPortal: async (authData) => {
        return electron_1.ipcRenderer.invoke("open-subscription-portal", authData);
    },
    openSettingsPortal: () => electron_1.ipcRenderer.invoke("open-settings-portal"),
    updateContentDimensions: (dimensions) => electron_1.ipcRenderer.invoke("update-content-dimensions", dimensions),
    getPlatform: async () => {
        try {
            console.log("Calling get-platform from preload");
            const platform = await electron_1.ipcRenderer.invoke("get-platform");
            console.log("Platform returned:", platform);
            return platform;
        }
        catch (error) {
            console.error("Error getting platform:", error);
            return "win32"; // Default fallback
        }
    },
    getScreenshots: () => electron_1.ipcRenderer.invoke("get-screenshots"),
    onScreenshotTaken: (callback) => {
        const subscription = (_, data) => callback(data);
        electron_1.ipcRenderer.on("screenshot-taken", subscription);
        return () => {
            electron_1.ipcRenderer.removeListener("screenshot-taken", subscription);
        };
    },
    onScreenshotError: (callback) => {
        const subscription = (_, error) => callback(error);
        electron_1.ipcRenderer.on(exports.PROCESSING_EVENTS.SCREENSHOT_ERROR, subscription);
        return () => {
            electron_1.ipcRenderer.removeListener(exports.PROCESSING_EVENTS.SCREENSHOT_ERROR, subscription);
        };
    },
    onResetView: (callback) => {
        const subscription = () => callback();
        electron_1.ipcRenderer.on("reset-view", subscription);
        return () => {
            electron_1.ipcRenderer.removeListener("reset-view", subscription);
        };
    },
    onSolutionStart: (callback) => {
        const subscription = () => callback();
        electron_1.ipcRenderer.on(exports.PROCESSING_EVENTS.INITIAL_START, subscription);
        return () => {
            electron_1.ipcRenderer.removeListener(exports.PROCESSING_EVENTS.INITIAL_START, subscription);
        };
    },
    onDebugStart: (callback) => {
        const subscription = () => callback();
        electron_1.ipcRenderer.on(exports.PROCESSING_EVENTS.DEBUG_START, subscription);
        return () => {
            electron_1.ipcRenderer.removeListener(exports.PROCESSING_EVENTS.DEBUG_START, subscription);
        };
    },
    onDebugSuccess: (callback) => {
        electron_1.ipcRenderer.on("debug-success", (_event, data) => callback(data));
        return () => {
            electron_1.ipcRenderer.removeListener("debug-success", (_event, data) => callback(data));
        };
    },
    onDebugError: (callback) => {
        const subscription = (_, error) => callback(error);
        electron_1.ipcRenderer.on(exports.PROCESSING_EVENTS.DEBUG_ERROR, subscription);
        return () => {
            electron_1.ipcRenderer.removeListener(exports.PROCESSING_EVENTS.DEBUG_ERROR, subscription);
        };
    },
    onSolutionError: (callback) => {
        const subscription = (_, error) => callback(error);
        electron_1.ipcRenderer.on(exports.PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR, subscription);
        return () => {
            electron_1.ipcRenderer.removeListener(exports.PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR, subscription);
        };
    },
    onProcessingNoScreenshots: (callback) => {
        const subscription = () => callback();
        electron_1.ipcRenderer.on(exports.PROCESSING_EVENTS.NO_SCREENSHOTS, subscription);
        return () => {
            electron_1.ipcRenderer.removeListener(exports.PROCESSING_EVENTS.NO_SCREENSHOTS, subscription);
        };
    },
    onOutOfCredits: (callback) => {
        const subscription = () => callback();
        electron_1.ipcRenderer.on(exports.PROCESSING_EVENTS.API_KEY_INVALID, subscription);
        return () => {
            electron_1.ipcRenderer.removeListener(exports.PROCESSING_EVENTS.API_KEY_INVALID, subscription);
        };
    },
    onProblemExtracted: (callback) => {
        const subscription = (_, data) => callback(data);
        electron_1.ipcRenderer.on(exports.PROCESSING_EVENTS.PROBLEM_EXTRACTED, subscription);
        return () => {
            electron_1.ipcRenderer.removeListener(exports.PROCESSING_EVENTS.PROBLEM_EXTRACTED, subscription);
        };
    },
    onSolutionSuccess: (callback) => {
        const subscription = (_, data) => callback(data);
        electron_1.ipcRenderer.on(exports.PROCESSING_EVENTS.SOLUTION_SUCCESS, subscription);
        return () => {
            electron_1.ipcRenderer.removeListener(exports.PROCESSING_EVENTS.SOLUTION_SUCCESS, subscription);
        };
    },
    onUnauthorized: (callback) => {
        const subscription = () => callback();
        electron_1.ipcRenderer.on(exports.PROCESSING_EVENTS.UNAUTHORIZED, subscription);
        return () => {
            electron_1.ipcRenderer.removeListener(exports.PROCESSING_EVENTS.UNAUTHORIZED, subscription);
        };
    },
    startUpdate: () => electron_1.ipcRenderer.invoke("start-update"),
    installUpdate: () => electron_1.ipcRenderer.invoke("install-update"),
    onUpdateAvailable: (callback) => {
        const subscription = (_, info) => callback(info);
        electron_1.ipcRenderer.on("update-available", subscription);
        return () => {
            electron_1.ipcRenderer.removeListener("update-available", subscription);
        };
    },
    onUpdateDownloaded: (callback) => {
        const subscription = (_, info) => callback(info);
        electron_1.ipcRenderer.on("update-downloaded", subscription);
        return () => {
            electron_1.ipcRenderer.removeListener("update-downloaded", subscription);
        };
    },
    setIgnoreMouseEvents: (ignore, options) => electron_1.ipcRenderer.invoke("set-ignore-mouse-events", ignore, options)
};
// Expose the API
electron_1.contextBridge.exposeInMainWorld("electronAPI", electronAPI);
// Add this focus restoration handler
electron_1.ipcRenderer.on("restore-focus", () => {
    // Try to focus the active element if it exists
    const activeElement = document.activeElement;
    if (activeElement && typeof activeElement.focus === "function") {
        activeElement.focus();
    }
});
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
electron_1.contextBridge.exposeInMainWorld("electron", {
    ipcRenderer: {
        on: (channel, func) => {
            if (channel === "protocol-data") {
                electron_1.ipcRenderer.on(channel, (event, ...args) => func(...args));
            }
        },
        removeListener: (channel, func) => {
            if (channel === "protocol-data") {
                electron_1.ipcRenderer.removeListener(channel, (event, ...args) => func(...args));
            }
        }
    }
});
