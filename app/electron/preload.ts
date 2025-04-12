console.log("Preload script starting...")
import { contextBridge, ipcRenderer } from "electron"

// Types for the exposed Electron API
interface ElectronAPI {
  openSubscriptionPortal: (authData: {
    id: string
    email: string
  }) => Promise<{ success: boolean; error?: string }>
  updateContentDimensions: (dimensions: {
    width: number
    height: number
  }) => Promise<void>

  getScreenshots: () => Promise<{
    success: boolean
    previews?: Array<{ path: string; preview: string }> | null
    error?: string
  }>

  getPlatform: () => Promise<string>

  onScreenshotTaken: (
    callback: (data: { path: string; preview: string }) => void
  ) => () => void

  // messages for react frontend
  onScreenshotError: (callback: (error: string) => void) => () => void
  onSolutionStart: (callback: () => void) => () => void
  onDebugStart: (callback: () => void) => () => void
  onDebugSuccess: (callback: (data: any) => void) => () => void
  onSolutionError: (callback: (error: string) => void) => () => void
  onProcessingNoScreenshots: (callback: () => void) => () => void
  onProblemExtracted: (callback: (data: any) => void) => () => void
  onSolutionSuccess: (callback: (data: any) => void) => () => void
  onUnauthorized: (callback: () => void) => () => void
  onDebugError: (callback: (error: string) => void) => () => void
  onOutOfCredits: (callback: () => void) => () => void

  onResetView: (callback: () => void) => () => void
  startUpdate: () => Promise<{ success: boolean; error?: string }>
  installUpdate: () => void
  onUpdateAvailable: (callback: (info: any) => void) => () => void
  onUpdateDownloaded: (callback: (info: any) => void) => () => void
  setIgnoreMouseEvents: (
    ignore: boolean,
    options?: { forward: boolean }
  ) => Promise<void>
}

export const PROCESSING_EVENTS = {
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
} as const

// At the top of the file
console.log("Preload script is running")

const electronAPI = {
  openSubscriptionPortal: async (authData: { id: string; email: string }) => {
    return ipcRenderer.invoke("open-subscription-portal", authData)
  },
  openSettingsPortal: () => ipcRenderer.invoke("open-settings-portal"),
  updateContentDimensions: (dimensions: { width: number; height: number }) =>
    ipcRenderer.invoke("update-content-dimensions", dimensions),

  getPlatform: async () => {
    try {
      console.log("Calling get-platform from preload")
      const platform = await ipcRenderer.invoke("get-platform")
      console.log("Platform returned:", platform)
      return platform
    } catch (error) {
      console.error("Error getting platform:", error)
      return "win32" // Default fallback
    }
  },

  getScreenshots: () => ipcRenderer.invoke("get-screenshots"),

  onScreenshotTaken: (
    callback: (data: { path: string; preview: string }) => void
  ) => {
    const subscription = (_: any, data: { path: string; preview: string }) =>
      callback(data)
    ipcRenderer.on("screenshot-taken", subscription)
    return () => {
      ipcRenderer.removeListener("screenshot-taken", subscription)
    }
  },
  onScreenshotError: (callback: (error: string) => void) => {
    const subscription = (_: any, error: string) => callback(error)
    ipcRenderer.on(PROCESSING_EVENTS.SCREENSHOT_ERROR, subscription)
    return () => {
      ipcRenderer.removeListener(
        PROCESSING_EVENTS.SCREENSHOT_ERROR,
        subscription
      )
    }
  },
  onResetView: (callback: () => void) => {
    const subscription = () => callback()
    ipcRenderer.on("reset-view", subscription)
    return () => {
      ipcRenderer.removeListener("reset-view", subscription)
    }
  },
  onSolutionStart: (callback: () => void) => {
    const subscription = () => callback()
    ipcRenderer.on(PROCESSING_EVENTS.INITIAL_START, subscription)
    return () => {
      ipcRenderer.removeListener(PROCESSING_EVENTS.INITIAL_START, subscription)
    }
  },
  onDebugStart: (callback: () => void) => {
    const subscription = () => callback()
    ipcRenderer.on(PROCESSING_EVENTS.DEBUG_START, subscription)
    return () => {
      ipcRenderer.removeListener(PROCESSING_EVENTS.DEBUG_START, subscription)
    }
  },
  onDebugSuccess: (callback: (data: any) => void) => {
    ipcRenderer.on("debug-success", (_event, data) => callback(data))
    return () => {
      ipcRenderer.removeListener("debug-success", (_event, data) =>
        callback(data)
      )
    }
  },
  onDebugError: (callback: (error: string) => void) => {
    const subscription = (_: any, error: string) => callback(error)
    ipcRenderer.on(PROCESSING_EVENTS.DEBUG_ERROR, subscription)
    return () => {
      ipcRenderer.removeListener(PROCESSING_EVENTS.DEBUG_ERROR, subscription)
    }
  },
  onSolutionError: (callback: (error: string) => void) => {
    const subscription = (_: any, error: string) => callback(error)
    ipcRenderer.on(PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR, subscription)
    return () => {
      ipcRenderer.removeListener(
        PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR,
        subscription
      )
    }
  },
  onProcessingNoScreenshots: (callback: () => void) => {
    const subscription = () => callback()
    ipcRenderer.on(PROCESSING_EVENTS.NO_SCREENSHOTS, subscription)
    return () => {
      ipcRenderer.removeListener(PROCESSING_EVENTS.NO_SCREENSHOTS, subscription)
    }
  },
  onOutOfCredits: (callback: () => void) => {
    const subscription = () => callback()
    ipcRenderer.on(PROCESSING_EVENTS.API_KEY_INVALID, subscription)
    return () => {
      ipcRenderer.removeListener(
        PROCESSING_EVENTS.API_KEY_INVALID,
        subscription
      )
    }
  },
  onProblemExtracted: (callback: (data: any) => void) => {
    const subscription = (_: any, data: any) => callback(data)
    ipcRenderer.on(PROCESSING_EVENTS.PROBLEM_EXTRACTED, subscription)
    return () => {
      ipcRenderer.removeListener(
        PROCESSING_EVENTS.PROBLEM_EXTRACTED,
        subscription
      )
    }
  },
  onSolutionSuccess: (callback: (data: any) => void) => {
    const subscription = (_: any, data: any) => callback(data)
    ipcRenderer.on(PROCESSING_EVENTS.SOLUTION_SUCCESS, subscription)
    return () => {
      ipcRenderer.removeListener(
        PROCESSING_EVENTS.SOLUTION_SUCCESS,
        subscription
      )
    }
  },
  onUnauthorized: (callback: () => void) => {
    const subscription = () => callback()
    ipcRenderer.on(PROCESSING_EVENTS.UNAUTHORIZED, subscription)
    return () => {
      ipcRenderer.removeListener(PROCESSING_EVENTS.UNAUTHORIZED, subscription)
    }
  },

  startUpdate: () => ipcRenderer.invoke("start-update"),
  installUpdate: () => ipcRenderer.invoke("install-update"),
  onUpdateAvailable: (callback: (info: any) => void) => {
    const subscription = (_: any, info: any) => callback(info)
    ipcRenderer.on("update-available", subscription)
    return () => {
      ipcRenderer.removeListener("update-available", subscription)
    }
  },
  onUpdateDownloaded: (callback: (info: any) => void) => {
    const subscription = (_: any, info: any) => callback(info)
    ipcRenderer.on("update-downloaded", subscription)
    return () => {
      ipcRenderer.removeListener("update-downloaded", subscription)
    }
  },
  setIgnoreMouseEvents: (ignore: boolean, options?: { forward: boolean }) =>
    ipcRenderer.invoke("set-ignore-mouse-events", ignore, options)
} as ElectronAPI

// Expose the API
contextBridge.exposeInMainWorld("electronAPI", electronAPI)

// Add this focus restoration handler
ipcRenderer.on("restore-focus", () => {
  // Try to focus the active element if it exists
  const activeElement = document.activeElement as HTMLElement
  if (activeElement && typeof activeElement.focus === "function") {
    activeElement.focus()
  }
})

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electron", {
  ipcRenderer: {
    on: (channel: string, func: (...args: any[]) => void) => {
      if (channel === "protocol-data") {
        ipcRenderer.on(channel, (event, ...args) => func(...args))
      }
    },
    removeListener: (channel: string, func: (...args: any[]) => void) => {
      if (channel === "protocol-data") {
        ipcRenderer.removeListener(channel, (event, ...args) => func(...args))
      }
    }
  }
})
