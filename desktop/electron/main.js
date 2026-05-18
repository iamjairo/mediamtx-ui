const { app, BrowserWindow, Menu, Tray, shell, ipcMain, nativeImage, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const DASHBOARD_URL = process.env.MEDIAMTX_URL || 'http://localhost:3000';
const IS_DEV = process.env.NODE_ENV === 'development';

let mainWindow;
let tray;
let windowState = loadWindowState();

function loadWindowState() {
    const statePath = path.join(app.getPath('userData'), 'window-state.json');
    try {
        return JSON.parse(fs.readFileSync(statePath, 'utf8'));
    } catch {
        return { width: 1400, height: 900, x: undefined, y: undefined, isMaximized: false };
    }
}

function saveWindowState() {
    if (!mainWindow) return;
    const statePath = path.join(app.getPath('userData'), 'window-state.json');
    const bounds = mainWindow.getBounds();
    const state = {
        width: bounds.width,
        height: bounds.height,
        x: bounds.x,
        y: bounds.y,
        isMaximized: mainWindow.isMaximized()
    };
    try {
        fs.writeFileSync(statePath, JSON.stringify(state));
    } catch {}
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: windowState.width,
        height: windowState.height,
        x: windowState.x,
        y: windowState.y,
        minWidth: 900,
        minHeight: 600,
        title: 'MediaMTX Dashboard',
        backgroundColor: '#0f172a',
        titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
        trafficLightPosition: { x: 16, y: 16 },
        show: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            spellcheck: false
        }
    });

    if (windowState.isMaximized) {
        mainWindow.maximize();
    }

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    mainWindow.loadURL(DASHBOARD_URL);

    mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDesc) => {
        if (errorCode === -102 || errorCode === -6) {
            setTimeout(() => mainWindow.loadURL(DASHBOARD_URL), 3000);
        }
    });

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('http')) {
            shell.openExternal(url);
            return { action: 'deny' };
        }
        return { action: 'allow' };
    });

    mainWindow.on('close', (e) => {
        saveWindowState();
        if (process.platform === 'darwin' && !app.isQuiting) {
            e.preventDefault();
            mainWindow.hide();
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    if (IS_DEV) {
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
}

function createTray() {
    const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');
    let trayIcon;
    try {
        trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
    } catch {
        trayIcon = nativeImage.createEmpty();
    }

    tray = new Tray(trayIcon);
    tray.setToolTip('MediaMTX Dashboard');

    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Show Dashboard',
            click: () => {
                if (mainWindow) {
                    mainWindow.show();
                    mainWindow.focus();
                } else {
                    createWindow();
                }
            }
        },
        { type: 'separator' },
        {
            label: 'Open in Browser',
            click: () => shell.openExternal(DASHBOARD_URL)
        },
        { type: 'separator' },
        {
            label: 'Quit',
            click: () => {
                app.isQuiting = true;
                app.quit();
            }
        }
    ]);

    tray.setContextMenu(contextMenu);

    tray.on('click', () => {
        if (mainWindow) {
            mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
        } else {
            createWindow();
        }
    });
}

function createMenu() {
    const isMac = process.platform === 'darwin';

    const template = [
        ...(isMac ? [{
            label: app.name,
            submenu: [
                { role: 'about' },
                { type: 'separator' },
                { role: 'services' },
                { type: 'separator' },
                { role: 'hide' },
                { role: 'hideOthers' },
                { role: 'unhide' },
                { type: 'separator' },
                { role: 'quit' }
            ]
        }] : []),
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        },
        {
            label: 'Navigate',
            submenu: [
                {
                    label: 'Overview',
                    accelerator: 'CmdOrCtrl+1',
                    click: () => mainWindow?.webContents.executeJavaScript("window.location.hash = '#overview'")
                },
                {
                    label: 'Streams',
                    accelerator: 'CmdOrCtrl+2',
                    click: () => mainWindow?.webContents.executeJavaScript("window.location.hash = '#streams'")
                },
                {
                    label: 'Camera Wall',
                    accelerator: 'CmdOrCtrl+3',
                    click: () => mainWindow?.webContents.executeJavaScript("window.location.hash = '#camerawall'")
                },
                { type: 'separator' },
                {
                    label: 'Server Settings',
                    accelerator: 'CmdOrCtrl+,',
                    click: () => mainWindow?.webContents.executeJavaScript("window.location.hash = '#server'")
                }
            ]
        },
        {
            label: 'Window',
            submenu: [
                { role: 'minimize' },
                { role: 'zoom' },
                ...(isMac ? [
                    { type: 'separator' },
                    { role: 'front' }
                ] : [
                    { role: 'close' }
                ])
            ]
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'MediaMTX Documentation',
                    click: () => shell.openExternal('https://github.com/bluenviron/mediamtx')
                },
                {
                    label: 'Report Issue',
                    click: () => shell.openExternal('https://github.com/iamjairo/mediamtx-ui/issues')
                }
            ]
        }
    ];

    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// IPC handlers
ipcMain.handle('get-server-url', () => DASHBOARD_URL);

ipcMain.handle('get-app-version', () => app.getVersion());

ipcMain.handle('open-external', (_event, url) => {
    if (url && url.startsWith('http')) {
        shell.openExternal(url);
    }
});

ipcMain.handle('show-message', async (_event, options) => {
    return dialog.showMessageBox(mainWindow, options);
});

// App lifecycle
app.whenReady().then(() => {
    createMenu();
    createWindow();
    createTray();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    } else {
        mainWindow.show();
    }
});

app.on('before-quit', () => {
    app.isQuiting = true;
    saveWindowState();
});

// Security: prevent new window creation
app.on('web-contents-created', (_event, contents) => {
    contents.on('will-navigate', (event, url) => {
        if (!url.startsWith(DASHBOARD_URL) && !url.startsWith('http://localhost')) {
            event.preventDefault();
            shell.openExternal(url);
        }
    });
});
