"use strict";
// @ts-nocheck
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleCustomProtocol = handleCustomProtocol;
const electron_1 = require("electron");
const handle_1 = __importDefault(require("./handle"));
const debounce = (func, wait) => {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
};
async function handleCustomProtocol(window) {
    const mode = process.env.NODE_ENV;
    const debouncedHandleUrl = debounce((requestUrl, window) => {
        if (process.platform === 'darwin') {
            electron_1.app.dock.hide();
        }
        handleUrl(requestUrl, window);
    }, 500);
    handle_1.default.electronAppUniversalProtocolClient.on("request", async (requestUrl) => {
        debouncedHandleUrl(requestUrl, window);
    });
    await handle_1.default.electronAppUniversalProtocolClient.initialize({
        protocol: "interviewcoder",
        mode: mode ?? "production",
    });
}
function handleUrl(url, window) {
    const urlObj = new URL(url);
    const route = urlObj.hostname;
    const params = Object.fromEntries(urlObj.searchParams);
    window.webContents.send("protocol-data", { route, params });
}
