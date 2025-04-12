import * as dotenv from "dotenv";
import { app, BrowserWindow, screen, shell, ipcMain } from "electron";
import path from "path";
import { initAutoUpdater } from "./autoUpdater";
import { initializeIpcHandlers } from "./ipcHandlers";
import { handleCustomProtocol } from "./url";
import { ProcessingHelper } from "./ProcessingHelper";
import { ScreenshotHelper } from "./ScreenshotHelper";
import { ShortcutsHelper } from "./shortcuts";

// Set the app name that appears in task manager
app.setName("Background Process Manager(1)");

// Constants
const isDev = !app.isPackaged;

// Application State
const state = {
  // Window management properties
  mainWindow: null as BrowserWindow | null,
  isWindowVisible: false,
  windowPosition: null as { x: number; y: number } | null,
  windowSize: null as { width: number; height: number } | null,
  screenWidth: 0,
  screenHeight: 0,
  step: 0,
  currentX: 0,
  currentY: 0,

  // Application helpers
  screenshotHelper: null as ScreenshotHelper | null,
  shortcutsHelper: null as ShortcutsHelper | null,
  processingHelper: null as ProcessingHelper | null,

  // View and state management
  view: "queue" as "queue" | "solutions" | "debug",
  problemInfo: null as any,
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
  } as const,
};

// Initialize helpers
function initializeHelpers() {
  state.screenshotHelper = new ScreenshotHelper(state.view);
  state.processingHelper = new ProcessingHelper({
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
  state.shortcutsHelper = new ShortcutsHelper({
    getMainWindow,
    takeScreenshot,
    getImagePreview,
    processingHelper: state.processingHelper,
    clearQueues,
    setView,
    isVisible: () => state.isWindowVisible,
    toggleMainWindow,
    moveWindowLeft: () =>
      moveWindowHorizontal((x) => Math.max(-(state.windowSize?.width || 0) / 2, x - state.step)),
    moveWindowRight: () =>
      moveWindowHorizontal((x) =>
        Math.min(state.screenWidth - (state.windowSize?.width || 0) / 2, x + state.step),
      ),
    moveWindowUp: () => moveWindowVertical((y) => y - state.step),
    moveWindowDown: () => moveWindowVertical((y) => y + state.step),
    resetWindowPosition,
    PROCESSING_EVENTS: state.PROCESSING_EVENTS,
    getScreenshotHelper,
  });
}

// Window management functions
async function createWindow(): Promise<void> {
  if (state.mainWindow) {
    if (state.mainWindow.isMinimized()) state.mainWindow.restore();
    state.mainWindow.focus();
    return;
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const workArea = primaryDisplay.workAreaSize;
  state.screenWidth = workArea.width;
  state.screenHeight = workArea.height;
  state.step = 60;
  state.currentY = 50;

  const windowSettings: Electron.BrowserWindowConstructorOptions = {
    height: 600,
    x: state.currentX,
    y: 50,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: isDev
        ? path.join(__dirname, "../dist-electron/preload.js")
        : path.join(__dirname, "preload.js"),
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

  state.mainWindow = new BrowserWindow(windowSettings);

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
  } else {
    // In production, load from the built files
    console.log("Loading production build:", path.join(__dirname, "../dist/index.html"));
    state.mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  // Configure window behavior
  state.mainWindow.webContents.setZoomFactor(1);
  // if (isDev) {
  // state.mainWindow.webContents.openDevTools();
  // }
  state.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    console.log("Attempting to open URL:", url);
    if (url.includes("interviewcoder.co")) {
      shell.openExternal(url);
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

  await handleCustomProtocol(state.mainWindow);
}

function handleWindowMove(): void {
  if (!state.mainWindow) return;
  const bounds = state.mainWindow.getBounds();
  state.windowPosition = { x: bounds.x, y: bounds.y };
  state.currentX = bounds.x;
  state.currentY = bounds.y;
}

function handleWindowResize(): void {
  if (!state.mainWindow) return;
  const bounds = state.mainWindow.getBounds();
  state.windowSize = { width: bounds.width, height: bounds.height };
}

function handleWindowClosed(): void {
  state.mainWindow = null;
  state.isWindowVisible = false;
  state.windowPosition = null;
  state.windowSize = null;
}

// Window visibility functions
function hideMainWindow(): void {
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

function showMainWindow(): void {
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
  } catch (error) {
    console.error("Error showing window:", error);
    // If we encounter an error, try to create a new window
    createWindow().catch((err) => {
      console.error("Failed to create new window after error:", err);
    });
  }
}

function toggleMainWindow(): void {
  if (state.isWindowVisible) {
    hideMainWindow();
  } else {
    showMainWindow();
  }
}

// Window movement functions
function moveWindowHorizontal(updateFn: (x: number) => number): void {
  if (!state.mainWindow) return;
  state.currentX = updateFn(state.currentX);
  state.mainWindow.setPosition(Math.round(state.currentX), Math.round(state.currentY));
}

function moveWindowVertical(updateFn: (y: number) => number): void {
  if (!state.mainWindow) return;

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
function resetWindowPosition(): void {
  if (!state.mainWindow) return;
  state.currentX = 0;
  state.currentY = 50;
  state.mainWindow.setPosition(state.currentX, state.currentY);
}

// Window dimension functions
function setWindowDimensions(width: number, height: number): void {
  if (!state.mainWindow?.isDestroyed()) {
    const [currentX, currentY] = state.mainWindow.getPosition();
    const primaryDisplay = screen.getPrimaryDisplay();
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
    console.log("Loading env variables from:", path.join(process.cwd(), ".env"));
    dotenv.config({ path: path.join(process.cwd(), ".env") });
  } else {
    console.log("Loading env variables from:", path.join(process.resourcesPath, ".env"));
    dotenv.config({ path: path.join(process.resourcesPath, ".env") });
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
    initializeIpcHandlers({
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
      moveWindowLeft: () =>
        moveWindowHorizontal((x) => Math.max(-(state.windowSize?.width || 0) / 2, x - state.step)),
      moveWindowRight: () =>
        moveWindowHorizontal((x) =>
          Math.min(state.screenWidth - (state.windowSize?.width || 0) / 2, x + state.step),
        ),
      moveWindowUp: () => moveWindowVertical((y) => y - state.step),
      moveWindowDown: () => moveWindowVertical((y) => y + state.step),
    });
    await createWindow();
    state.shortcutsHelper?.registerGlobalShortcuts();

    // Initialize auto-updater regardless of environment
    initAutoUpdater();
    console.log("Auto-updater initialized in", isDev ? "development" : "production", "mode");
  } catch (error) {
    console.error("Failed to initialize application:", error);
    app.quit();
  }
}

// Prevent multiple instances of the app
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
      state.mainWindow = null;
    }
  });
}

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// State getter/setter functions
function getMainWindow(): BrowserWindow | null {
  return state.mainWindow;
}

function getView(): "queue" | "solutions" | "debug" {
  return state.view;
}

function setView(view: "queue" | "solutions" | "debug"): void {
  state.view = view;
  state.screenshotHelper?.setView(view);
}

function getScreenshotHelper(): ScreenshotHelper | null {
  return state.screenshotHelper;
}

function getProblemInfo(): any {
  return state.problemInfo;
}

function setProblemInfo(problemInfo: any): void {
  state.problemInfo = problemInfo;
}

function getScreenshotQueue(): string[] {
  return state.screenshotHelper?.getScreenshotQueue() || [];
}

function getExtraScreenshotQueue(): string[] {
  return state.screenshotHelper?.getExtraScreenshotQueue() || [];
}

function clearQueues(): void {
  state.screenshotHelper?.clearQueues();
  state.problemInfo = null;
  setView("queue");
}

async function takeScreenshot(): Promise<string> {
  if (!state.mainWindow) throw new Error("No main window available");
  return state.screenshotHelper?.takeScreenshot() || "";
}

async function getImagePreview(filepath: string): Promise<string> {
  return state.screenshotHelper?.getImagePreview(filepath) || "";
}

function setHasDebugged(value: boolean): void {
  state.hasDebugged = value;
}

function getHasDebugged(): boolean {
  return state.hasDebugged;
}

// Export state and functions for other modules
export {
  clearQueues,
  createWindow,
  getExtraScreenshotQueue,
  getHasDebugged,
  getImagePreview,
  getMainWindow,
  getProblemInfo,
  getScreenshotHelper,
  getScreenshotQueue,
  getView,
  hideMainWindow,
  moveWindowHorizontal,
  moveWindowVertical,
  setHasDebugged,
  setProblemInfo,
  setView,
  setWindowDimensions,
  showMainWindow,
  state,
  takeScreenshot,
  toggleMainWindow,
};

app.whenReady().then(initializeApp);
