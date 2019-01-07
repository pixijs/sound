"use strict";

const path = require("path");
const electron = require("electron");
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;

module.exports = function(file)
{
    let mainWindow = null;

    app.on("window-all-closed", () => {
        app.quit();
    });

    app.on("ready", () => {
        mainWindow = new BrowserWindow({
            width: 1000,
            height: 600,
            useContentSize: true,
            resizable: true,
            webPreferences: {
                nodeIntegration: false,
            },
        });

        mainWindow.loadURL(`file://${path.dirname(__dirname)}/${file}`);
        mainWindow.on("closed", () => {
            mainWindow = null;
        });
    });
};
