let client;

if (process.versions && process.versions.electron) {
  try {
    client = require("electron-app-universal-protocol-client");
  } catch (err) {
    console.error("Failed to load native module:", err);
    client = null;
  }
} else {
  client = {};
}

export default client;
