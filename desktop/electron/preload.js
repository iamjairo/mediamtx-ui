const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
    getServerUrl: () => ipcRenderer.invoke('get-server-url'),
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    openExternal: (url) => ipcRenderer.invoke('open-external', url),
    showMessage: (options) => ipcRenderer.invoke('show-message', options),
    isDesktop: true,
    platform: process.platform
});
