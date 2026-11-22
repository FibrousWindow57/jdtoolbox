// Schmale Brücke zwischen den lokalen Seiten (Einrichtung, Offline) und der App. Die Toolbox-Website selbst bekommt nichts davon,
// weil diese Seiten nur lokal (file://) geladen werden und der Hauptprozess jeden Aufruf noch einmal auf die Herkunft prüft.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("jdApp", {
  info: () => ipcRenderer.invoke("app:info"),
  saveUrl: (url) => ipcRenderer.invoke("setup:save", url),
  retry: () => ipcRenderer.invoke("app:retry"),
});
