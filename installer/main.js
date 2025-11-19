const { app, BrowserWindow } = require("electron");

function createWindow() {
  const win = new BrowserWindow({
    fullscreen: true,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    hasShadow: false,
    skipTaskbar: true,
    focusable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.loadFile("simple-index.html");
  
  // Make window click-through except for mate and controls
  win.setIgnoreMouseEvents(true, { forward: true });
  
  // Handle mouse events from renderer
  const { ipcMain } = require('electron');
  
  ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => {
    win.setIgnoreMouseEvents(ignore, options);
  });
  
  // Debug - open dev tools
  // win.webContents.openDevTools();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
