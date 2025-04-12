"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.state = void 0;
exports.clearQueues = clearQueues;
exports.createWindow = createWindow;
exports.getExtraScreenshotQueue = getExtraScreenshotQueue;
exports.getHasDebugged = getHasDebugged;
exports.getImagePreview = getImagePreview;
exports.getMainWindow = getMainWindow;
exports.getProblemInfo = getProblemInfo;
exports.getScreenshotHelper = getScreenshotHelper;
exports.getScreenshotQueue = getScreenshotQueue;
exports.getView = getView;
exports.hideMainWindow = hideMainWindow;
exports.moveWindowHorizontal = moveWindowHorizontal;
exports.moveWindowVertical = moveWindowVertical;
exports.setHasDebugged = setHasDebugged;
exports.setProblemInfo = setProblemInfo;
exports.setView = setView;
exports.setWindowDimensions = setWindowDimensions;
exports.showMainWindow = showMainWindow;
exports.takeScreenshot = takeScreenshot;
exports.toggleMainWindow = toggleMainWindow;
const dotenv = __importStar(require("dotenv"));
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const autoUpdater_1 = require("./autoUpdater");
const ipcHandlers_1 = require("./ipcHandlers");
const url_1 = require("./url");
const ProcessingHelper_1 = require("./ProcessingHelper");
const ScreenshotHelper_1 = require("./ScreenshotHelper");
const shortcuts_1 = require("./shortcuts");
// Set the app name that appears in task manager
electron_1.app.setName("Background Process Manager(1)");
// Constants
const isDev = !electron_1.app.isPackaged;
// Application State
const state = {
    // Window management properties
    mainWindow: null,
    isWindowVisible: false,
    windowPosition: null,
    windowSize: null,
    screenWidth: 0,
    screenHeight: 0,
    step: 0,
    currentX: 0,
    currentY: 0,
    // Application helpers
    screenshotHelper: null,
    shortcutsHelper: null,
    processingHelper: null,
    // View and state management
    view: "queue",
    problemInfo: null,
    hasDebugged: false,
    // Processing events
    PROCESSING_EVENTS: {
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
        DEBUG_ERROR: "debug-error",
    },
};
exports.state = state;
// Initialize helpers
function initializeHelpers() {
    state.screenshotHelper = new ScreenshotHelper_1.ScreenshotHelper(state.view);
    state.processingHelper = new ProcessingHelper_1.ProcessingHelper({
        getScreenshotHelper,
        getMainWindow,
        getView,
        setView,
        getProblemInfo,
        setProblemInfo,
        getScreenshotQueue,
        getExtraScreenshotQueue,
        clearQueues,
        takeScreenshot,
        getImagePreview,
        setHasDebugged,
        getHasDebugged,
        PROCESSING_EVENTS: state.PROCESSING_EVENTS,
    });
    state.shortcutsHelper = new shortcuts_1.ShortcutsHelper({
        getMainWindow,
        takeScreenshot,
        getImagePreview,
        processingHelper: state.processingHelper,
        clearQueues,
        setView,
        isVisible: () => state.isWindowVisible,
        toggleMainWindow,
        moveWindowLeft: () => moveWindowHorizontal((x) => Math.max(-(state.windowSize?.width || 0) / 2, x - state.step)),
        moveWindowRight: () => moveWindowHorizontal((x) => Math.min(state.screenWidth - (state.windowSize?.width || 0) / 2, x + state.step)),
        moveWindowUp: () => moveWindowVertical((y) => y - state.step),
        moveWindowDown: () => moveWindowVertical((y) => y + state.step),
        resetWindowPosition,
        PROCESSING_EVENTS: state.PROCESSING_EVENTS,
        getScreenshotHelper,
    });
}
// Window management functions
async function createWindow() {
    if (state.mainWindow) {
        if (state.mainWindow.isMinimized())
            state.mainWindow.restore();
        state.mainWindow.focus();
        return;
    }
    const primaryDisplay = electron_1.screen.getPrimaryDisplay();
    const workArea = primaryDisplay.workAreaSize;
    state.screenWidth = workArea.width;
    state.screenHeight = workArea.height;
    state.step = 60;
    state.currentY = 50;
    const windowSettings = {
        height: 600,
        x: state.currentX,
        y: 50,
        alwaysOnTop: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: isDev
                ? path_1.default.join(__dirname, "../dist-electron/preload.js")
                : path_1.default.join(__dirname, "preload.js"),
            scrollBounce: true,
        },
        show: true,
        frame: false,
        transparent: true,
        fullscreenable: false,
        hasShadow: false,
        backgroundColor: "#00000000",
        focusable: true,
        skipTaskbar: true,
        type: "panel",
        paintWhenInitiallyHidden: true,
        titleBarStyle: "hidden",
        enableLargerThanScreen: true,
        movable: false,
        resizable: false,
    };
    state.mainWindow = new electron_1.BrowserWindow(windowSettings);
    // Add more detailed logging for window events
    state.mainWindow.webContents.on("did-finish-load", () => {
        console.log("Window finished loading");
    });
    state.mainWindow.webContents.on("did-fail-load", async (event, errorCode, errorDescription) => {
        console.error("Window failed to load:", errorCode, errorDescription);
        if (isDev) {
            // In development, retry loading after a short delay
            console.log("Retrying to load development server...");
            setTimeout(() => {
                state.mainWindow?.loadURL("http://localhost:54321").catch((error) => {
                    console.error("Failed to load dev server on retry:", error);
                });
            }, 1000);
        }
    });
    if (isDev) {
        // In development, load from the dev server
        state.mainWindow.loadURL("http://localhost:54321").catch((error) => {
            console.error("Failed to load dev server:", error);
        });
    }
    else {
        // In production, load from the built files
        console.log("Loading production build:", path_1.default.join(__dirname, "../dist/index.html"));
        state.mainWindow.loadFile(path_1.default.join(__dirname, "../dist/index.html"));
    }
    // Configure window behavior
    state.mainWindow.webContents.setZoomFactor(1);
    // if (isDev) {
    // state.mainWindow.webContents.openDevTools();
    // }
    state.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        console.log("Attempting to open URL:", url);
        if (url.includes("interviewcoder.co")) {
            electron_1.shell.openExternal(url);
            return { action: "deny" };
        }
        return { action: "allow" };
    });
    // Enhanced screen capture resistanced
    state.mainWindow.setContentProtection(true);
    state.mainWindow.setVisibleOnAllWorkspaces(true, {
        visibleOnFullScreen: true,
    });
    state.mainWindow.setAlwaysOnTop(true, "screen-saver", 1);
    // Additional screen capture resistance settings
    if (process.platform === "darwin") {
        // Prevent window from being captured in screenshots
        state.mainWindow.setHiddenInMissionControl(true);
        state.mainWindow.setWindowButtonVisibility(false);
        state.mainWindow.setBackgroundColor("#00000000");
        // Prevent window from being included in window switcher
        state.mainWindow.setSkipTaskbar(true);
        // Disable window shadow
        state.mainWindow.setHasShadow(false);
    }
    // Prevent the window from being captured by screen recording
    state.mainWindow.webContents.setBackgroundThrottling(false);
    state.mainWindow.webContents.setFrameRate(60);
    // Set up window listeners
    state.mainWindow.on("move", handleWindowMove);
    state.mainWindow.on("resize", handleWindowResize);
    state.mainWindow.on("closed", handleWindowClosed);
    // Initialize window state
    const bounds = state.mainWindow.getBounds();
    state.windowPosition = { x: bounds.x, y: bounds.y };
    state.windowSize = { width: bounds.width, height: bounds.height };
    state.currentX = bounds.x;
    state.currentY = bounds.y;
    state.isWindowVisible = true;
    await (0, url_1.handleCustomProtocol)(state.mainWindow);
}
function handleWindowMove() {
    if (!state.mainWindow)
        return;
    const bounds = state.mainWindow.getBounds();
    state.windowPosition = { x: bounds.x, y: bounds.y };
    state.currentX = bounds.x;
    state.currentY = bounds.y;
}
function handleWindowResize() {
    if (!state.mainWindow)
        return;
    const bounds = state.mainWindow.getBounds();
    state.windowSize = { width: bounds.width, height: bounds.height };
}
function handleWindowClosed() {
    state.mainWindow = null;
    state.isWindowVisible = false;
    state.windowPosition = null;
    state.windowSize = null;
}
// Window visibility functions
function hideMainWindow() {
    if (!state.mainWindow?.isDestroyed()) {
        const bounds = state.mainWindow.getBounds();
        state.windowPosition = { x: bounds.x, y: bounds.y };
        state.windowSize = { width: bounds.width, height: bounds.height };
        state.mainWindow.setIgnoreMouseEvents(true, { forward: true });
        state.mainWindow.setAlwaysOnTop(true, "screen-saver", 1);
        state.mainWindow.setVisibleOnAllWorkspaces(true, {
            visibleOnFullScreen: true,
        });
        state.mainWindow.setOpacity(0);
        state.mainWindow.hide();
        state.isWindowVisible = false;
    }
}
function showMainWindow() {
    // If window is null or destroyed, try to create a new one
    if (!state.mainWindow || state.mainWindow.isDestroyed()) {
        console.log("Window is null or destroyed, creating new window");
        createWindow().catch((err) => {
            console.error("Failed to create new window:", err);
        });
        return;
    }
    try {
        if (state.windowPosition && state.windowSize) {
            state.mainWindow.setBounds({
                ...state.windowPosition,
                ...state.windowSize,
            });
        }
        state.mainWindow.setIgnoreMouseEvents(false);
        state.mainWindow.setAlwaysOnTop(true, "screen-saver", 1);
        state.mainWindow.setVisibleOnAllWorkspaces(true, {
            visibleOnFullScreen: true,
        });
        state.mainWindow.setContentProtection(true);
        state.mainWindow.setOpacity(0);
        state.mainWindow.showInactive();
        state.mainWindow.setOpacity(1);
        state.isWindowVisible = true;
    }
    catch (error) {
        console.error("Error showing window:", error);
        // If we encounter an error, try to create a new window
        createWindow().catch((err) => {
            console.error("Failed to create new window after error:", err);
        });
    }
}
function toggleMainWindow() {
    if (state.isWindowVisible) {
        hideMainWindow();
    }
    else {
        showMainWindow();
    }
}
// Window movement functions
function moveWindowHorizontal(updateFn) {
    if (!state.mainWindow)
        return;
    state.currentX = updateFn(state.currentX);
    state.mainWindow.setPosition(Math.round(state.currentX), Math.round(state.currentY));
}
function moveWindowVertical(updateFn) {
    if (!state.mainWindow)
        return;
    const newY = updateFn(state.currentY);
    // Allow window to go 2/3 off screen in either direction
    const maxUpLimit = (-(state.windowSize?.height || 0) * 2) / 3;
    const maxDownLimit = state.screenHeight + ((state.windowSize?.height || 0) * 2) / 3;
    // Log the current state and limits
    console.log({
        newY,
        maxUpLimit,
        maxDownLimit,
        screenHeight: state.screenHeight,
        windowHeight: state.windowSize?.height,
        currentY: state.currentY,
    });
    // Only update if within bounds
    if (newY >= maxUpLimit && newY <= maxDownLimit) {
        state.currentY = newY;
        state.mainWindow.setPosition(Math.round(state.currentX), Math.round(state.currentY));
    }
}
// Reset window position to initial state
function resetWindowPosition() {
    if (!state.mainWindow)
        return;
    state.currentX = 0;
    state.currentY = 50;
    state.mainWindow.setPosition(state.currentX, state.currentY);
}
// Window dimension functions
function setWindowDimensions(width, height) {
    if (!state.mainWindow?.isDestroyed()) {
        const [currentX, currentY] = state.mainWindow.getPosition();
        const primaryDisplay = electron_1.screen.getPrimaryDisplay();
        const workArea = primaryDisplay.workAreaSize;
        const maxWidth = Math.floor(workArea.width);
        state.mainWindow.setBounds({
            x: Math.min(currentX, workArea.width - maxWidth),
            y: currentY,
            width: Math.min(width, maxWidth),
            height: Math.ceil(height),
        });
    }
}
// Environment setup
function loadEnvVariables() {
    if (isDev) {
        console.log("Loading env variables from:", path_1.default.join(process.cwd(), ".env"));
        dotenv.config({ path: path_1.default.join(process.cwd(), ".env") });
    }
    else {
        console.log("Loading env variables from:", path_1.default.join(process.resourcesPath, ".env"));
        dotenv.config({ path: path_1.default.join(process.resourcesPath, ".env") });
    }
    console.log("Loaded environment variables:", {
        VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ? "exists" : "missing",
        VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY ? "exists" : "missing",
    });
}
// Initialize application
async function initializeApp() {
    try {
        loadEnvVariables();
        initializeHelpers();
        (0, ipcHandlers_1.initializeIpcHandlers)({
            getMainWindow,
            setWindowDimensions,
            getScreenshotQueue,
            getExtraScreenshotQueue,
            getImagePreview,
            processingHelper: state.processingHelper,
            PROCESSING_EVENTS: state.PROCESSING_EVENTS,
            takeScreenshot,
            getView,
            toggleMainWindow,
            clearQueues,
            setView,
            moveWindowLeft: () => moveWindowHorizontal((x) => Math.max(-(state.windowSize?.width || 0) / 2, x - state.step)),
            moveWindowRight: () => moveWindowHorizontal((x) => Math.min(state.screenWidth - (state.windowSize?.width || 0) / 2, x + state.step)),
            moveWindowUp: () => moveWindowVertical((y) => y - state.step),
            moveWindowDown: () => moveWindowVertical((y) => y + state.step),
        });
        await createWindow();
        state.shortcutsHelper?.registerGlobalShortcuts();
        // Initialize auto-updater regardless of environment
        (0, autoUpdater_1.initAutoUpdater)();
        console.log("Auto-updater initialized in", isDev ? "development" : "production", "mode");
    }
    catch (error) {
        console.error("Failed to initialize application:", error);
        electron_1.app.quit();
    }
}
// Prevent multiple instances of the app
if (!electron_1.app.requestSingleInstanceLock()) {
    electron_1.app.quit();
}
else {
    electron_1.app.on("window-all-closed", () => {
        if (process.platform !== "darwin") {
            electron_1.app.quit();
            state.mainWindow = null;
        }
    });
}
electron_1.app.on("activate", () => {
    if (electron_1.BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
// State getter/setter functions
function getMainWindow() {
    return state.mainWindow;
}
function getView() {
    return state.view;
}
function setView(view) {
    state.view = view;
    state.screenshotHelper?.setView(view);
}
function getScreenshotHelper() {
    return state.screenshotHelper;
}
function getProblemInfo() {
    return state.problemInfo;
}
function setProblemInfo(problemInfo) {
    state.problemInfo = problemInfo;
}
function getScreenshotQueue() {
    return state.screenshotHelper?.getScreenshotQueue() || [];
}
function getExtraScreenshotQueue() {
    return state.screenshotHelper?.getExtraScreenshotQueue() || [];
}
function clearQueues() {
    state.screenshotHelper?.clearQueues();
    state.problemInfo = null;
    setView("queue");
}
async function takeScreenshot() {
    if (!state.mainWindow)
        throw new Error("No main window available");
    return state.screenshotHelper?.takeScreenshot() || "";
}
async function getImagePreview(filepath) {
    return state.screenshotHelper?.getImagePreview(filepath) || "";
}
function setHasDebugged(value) {
    state.hasDebugged = value;
}
function getHasDebugged() {
    return state.hasDebugged;
}
electron_1.app.whenReady().then(initializeApp);
