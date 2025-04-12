import { globalShortcut, app } from "electron";

export class ShortcutsHelper {
  private deps: any;

  constructor(deps: any) {
    this.deps = deps;
  }

  public registerGlobalShortcuts(): void {
    globalShortcut.register("CommandOrControl+H", async () => {
      const mainWindow = this.deps.getMainWindow();
      if (mainWindow) {
        console.log("Taking screenshot...");
        try {
          // Get current view from ScreenshotHelper
          const currentView = this.deps.getScreenshotHelper()?.getView();
          console.log("Current view when taking screenshot:", currentView);

          const screenshotPath = await this.deps.takeScreenshot();
          const preview = await this.deps.getImagePreview(screenshotPath);
          mainWindow.webContents.send("screenshot-taken", {
            path: screenshotPath,
            preview,
          });
        } catch (error) {
          console.error("Error capturing screenshot from shortcuts.ts:", error);
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send(
              this.deps.PROCESSING_EVENTS.SCREENSHOT_ERROR,
              error instanceof Error ? error.message : "Failed to capture screenshot",
            );
          }
        }
      }
    });

    globalShortcut.register("CommandOrControl+Enter", async () => {
      await this.deps.processingHelper?.processScreenshots();
    });

    globalShortcut.register("CommandOrControl+G", () => {
      // Cancel ongoing API requests
      this.deps.processingHelper?.cancelOngoingRequests();

      // Clear both screenshot queues
      this.deps.clearQueues();

      console.log("Cleared queues.");

      // Update the view state to 'queue'
      this.deps.setView("queue");

      // Reset window position

      this.deps.resetWindowPosition();

      // Notify renderer process to switch view to 'queue'
      const mainWindow = this.deps.getMainWindow();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("reset-view");
      }
    });

    // New shortcuts for moving the window
    globalShortcut.register("CommandOrControl+Left", () => {
      console.log("Command/Ctrl + Left pressed. Moving window left.");
      this.deps.moveWindowLeft();
    });

    globalShortcut.register("CommandOrControl+Right", () => {
      console.log("Command/Ctrl + Right pressed. Moving window right.");
      this.deps.moveWindowRight();
    });

    globalShortcut.register("CommandOrControl+Down", () => {
      console.log("Command/Ctrl + down pressed. Moving window down.");
      this.deps.moveWindowDown();
    });

    globalShortcut.register("CommandOrControl+Up", () => {
      console.log("Command/Ctrl + Up pressed. Moving window Up.");
      this.deps.moveWindowUp();
    });

    globalShortcut.register("CommandOrControl+B", () => {
      this.deps.toggleMainWindow();
    });

    // Unregister shortcuts when quitting
    app.on("will-quit", () => {
      globalShortcut.unregisterAll();
    });
  }
}
