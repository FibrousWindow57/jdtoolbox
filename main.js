// JD Toolbox – Desktop-App (Windows). Die App ist ein sicheres Fenster um die eigene Toolbox im Internet (Cloudflare-Worker):
// Alle Funktionen und Daten kommen von dort, deshalb ändert jedes Website-Update die App sofort mit. Die App selbst
// aktualisiert sich über GitHub Releases (electron-updater), ohne dass jemand neu installieren muss.
const { app, BrowserWindow, Menu, dialog, ipcMain, net, session, shell } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const { isSameOrigin, normalizeUrl } = require("./lib/url");

const APP_ID = "de.jdtoolbox.app";
const PAGES = path.join(__dirname, "pages");
const ICON = path.join(PAGES, "logo.png");
const FOUR_HOURS = 4 * 60 * 60 * 1000;

let win = null;
let settings = {};
let manualUpdateCheck = false;
let autoUpdater = null;

// ---------- Einstellungen (Adresse, Fensterposition) ----------

const settingsFile = () => path.join(app.getPath("userData"), "settings.json");

function loadSettings() {
  try {
    const s = JSON.parse(fs.readFileSync(settingsFile(), "utf8"));
    return s && typeof s === "object" ? s : {};
  } catch {
    return {};
  }
}

function saveSettings() {
  try {
    fs.mkdirSync(path.dirname(settingsFile()), { recursive: true });
    fs.writeFileSync(settingsFile(), JSON.stringify(settings, null, 2));
  } catch (e) {
    console.error("Einstellungen konnten nicht gespeichert werden:", e);
  }
}

// ---------- Seiten laden ----------

function loadApp() {
  if (!win) return;
  const checked = settings.url ? normalizeUrl(settings.url) : null;
  if (!checked || !checked.ok) {
    void win.loadFile(path.join(PAGES, "setup.html"));
    return;
  }
  void win.loadURL(checked.origin);
}

const fromLocalPage = (event) => Boolean(win) && event.sender === win.webContents && String(event.senderFrame?.url ?? "").startsWith("file:");

function openExternal(url) {
  try {
    const u = new URL(url);
    if (u.protocol === "https:" || u.protocol === "http:") void shell.openExternal(url);
  } catch {
    /* ungültige Adresse: nichts öffnen */
  }
}

// ---------- Fenster ----------

function createWindow() {
  const b = settings.bounds ?? {};
  win = new BrowserWindow({
    width: Number.isInteger(b.width) ? b.width : 1280,
    height: Number.isInteger(b.height) ? b.height : 800,
    x: Number.isInteger(b.x) ? b.x : undefined,
    y: Number.isInteger(b.y) ? b.y : undefined,
    minWidth: 360,
    minHeight: 560,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: "#0f1b2a",
    title: "JD Toolbox",
    icon: ICON,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });

  win.once("ready-to-show", () => {
    if (settings.maximized) win.maximize();
    win.show();
  });

  win.on("close", () => {
    settings.maximized = win.isMaximized();
    if (!win.isMaximized() && !win.isMinimized() && !win.isFullScreen()) settings.bounds = win.getBounds();
    saveSettings();
  });
  win.on("closed", () => {
    win = null;
  });

  const wc = win.webContents;
  wc.on("page-title-updated", (e) => e.preventDefault()); // Fenstertitel bleibt „JD Toolbox“

  // Links: dieselbe Toolbox bleibt im Fenster, alles andere öffnet der Standardbrowser.
  wc.setWindowOpenHandler(({ url }) => {
    const origin = settings.url ? normalizeUrl(settings.url).origin : null;
    if (origin && isSameOrigin(url, origin)) void win.loadURL(url);
    else openExternal(url);
    return { action: "deny" };
  });
  wc.on("will-navigate", (event, url) => {
    if (url.startsWith("file:")) return; // eigene lokale Seiten
    const origin = settings.url ? normalizeUrl(settings.url).origin : null;
    if (origin && isSameOrigin(url, origin)) return;
    event.preventDefault();
    openExternal(url);
  });

  // Keine Verbindung: eigene Fehlerseite mit „Erneut versuchen“ statt weißer Fläche.
  wc.on("did-fail-load", (_e, code, description, validatedURL, isMainFrame) => {
    if (!isMainFrame || code === -3 /* abgebrochen */ || String(validatedURL).startsWith("file:")) return;
    void win.loadFile(path.join(PAGES, "offline.html"), { query: { url: String(validatedURL), reason: String(description) } });
  });

  loadApp();
}

// ---------- IPC (nur von den lokalen Seiten erlaubt) ----------

ipcMain.handle("app:info", (event) => {
  if (!fromLocalPage(event)) return null;
  return { version: app.getVersion(), url: settings.url ?? "" };
});

ipcMain.handle("app:retry", (event) => {
  if (!fromLocalPage(event)) return;
  loadApp();
});

ipcMain.handle("setup:save", async (event, input) => {
  if (!fromLocalPage(event)) return { ok: false, error: "Nicht erlaubt." };
  const checked = normalizeUrl(input);
  if (!checked.ok) return checked;
  try {
    const res = await net.fetch(`${checked.origin}/api/v1/auth/config`, { signal: AbortSignal.timeout(10_000) });
    const body = res.ok ? await res.json().catch(() => null) : null;
    if (!body || typeof body.setup_required !== "boolean") {
      return { ok: false, error: `Unter ${checked.origin} antwortet keine JD Toolbox (Antwort ${res.status}). Bitte die Adresse prüfen.` };
    }
  } catch (e) {
    const timeout = e && e.name === "TimeoutError";
    return { ok: false, error: timeout ? `${checked.origin} antwortet nicht innerhalb von 10 Sekunden.` : `${checked.origin} ist nicht erreichbar. Bitte Adresse und Internetverbindung prüfen.` };
  }
  settings.url = checked.origin;
  saveSettings();
  loadApp();
  return { ok: true };
});

// ---------- Menü ----------

function buildMenu() {
  const template = [
    {
      label: "Datei",
      submenu: [
        { label: "Adresse der Toolbox ändern …", click: () => win && win.loadFile(path.join(PAGES, "setup.html")) },
        { label: "Nach Updates suchen", click: () => checkForUpdates(true) },
        { type: "separator" },
        { role: "quit", label: "Beenden" },
      ],
    },
    {
      label: "Ansicht",
      submenu: [
        { role: "reload", label: "Neu laden" },
        { role: "forceReload", label: "Neu laden (Cache leeren)" },
        { type: "separator" },
        { role: "resetZoom", label: "Normale Größe" },
        { role: "zoomIn", label: "Vergrößern" },
        { role: "zoomOut", label: "Verkleinern" },
        { type: "separator" },
        { role: "togglefullscreen", label: "Vollbild" },
        ...(app.isPackaged ? [] : [{ role: "toggleDevTools", label: "Entwicklertools" }]),
      ],
    },
    {
      label: "Hilfe",
      submenu: [
        {
          label: "Über JD Toolbox",
          click: () =>
            void dialog.showMessageBox(win, { type: "info", title: "JD Toolbox", message: `JD Toolbox ${app.getVersion()}`, detail: `Verbunden mit: ${settings.url || "(noch keine Adresse)"}`, icon: ICON }),
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ---------- Updates (GitHub Releases) ----------

function checkForUpdates(manual) {
  if (!app.isPackaged || !autoUpdater) {
    if (manual) void dialog.showMessageBox(win, { type: "info", message: "Updates gibt es nur in der installierten App.", buttons: ["OK"] });
    return;
  }
  manualUpdateCheck = manual;
  autoUpdater.checkForUpdates().catch((e) => reportUpdateError(e));
}

function reportUpdateError(e) {
  console.error("Update-Prüfung fehlgeschlagen:", e);
  if (manualUpdateCheck) {
    manualUpdateCheck = false;
    void dialog.showMessageBox(win, { type: "warning", title: "Update", message: "Die Update-Prüfung ist fehlgeschlagen.", detail: `${e && e.message ? e.message : e}\n\nBitte Internetverbindung prüfen und später erneut versuchen.`, buttons: ["OK"] });
  }
}

function setupUpdates() {
  if (!app.isPackaged) return;
  ({ autoUpdater } = require("electron-updater"));
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on("update-available", (info) => {
    if (manualUpdateCheck) void dialog.showMessageBox(win, { type: "info", message: `Version ${info.version} wird heruntergeladen …`, detail: "Du kannst weiterarbeiten. Danach fragt die App, ob sie neu starten soll.", buttons: ["OK"] });
  });
  autoUpdater.on("update-not-available", () => {
    if (manualUpdateCheck) void dialog.showMessageBox(win, { type: "info", message: `JD Toolbox ${app.getVersion()} ist aktuell.`, buttons: ["OK"] });
    manualUpdateCheck = false;
  });
  autoUpdater.on("update-downloaded", (info) => {
    manualUpdateCheck = false;
    void dialog
      .showMessageBox(win, { type: "info", title: "Update bereit", message: `Version ${info.version} ist heruntergeladen.`, detail: "Jetzt neu starten und installieren? Sonst wird sie beim nächsten Beenden automatisch installiert.", buttons: ["Jetzt neu starten", "Später"], defaultId: 0, cancelId: 1 })
      .then((r) => {
        if (r.response === 0) autoUpdater.quitAndInstall();
      });
  });
  autoUpdater.on("error", (e) => reportUpdateError(e));
  setTimeout(() => checkForUpdates(false), 10_000);
  setInterval(() => checkForUpdates(false), FOUR_HOURS);
}

// ---------- Start ----------

if (!app.requestSingleInstanceLock()) {
  app.quit(); // zweiter Start: bestehendes Fenster nach vorn (siehe „second-instance“)
} else {
  app.on("second-instance", () => {
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.focus();
  });

  app.setAppUserModelId(APP_ID);

  app.whenReady().then(() => {
    settings = loadSettings();
    // Die Website braucht keine Gerätezugriffe; nur Kopieren in die Zwischenablage (Token, Passwörter) und Vollbild bleiben erlaubt.
    const allowed = new Set(["clipboard-sanitized-write", "fullscreen"]);
    session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => callback(allowed.has(permission)));
    session.defaultSession.setPermissionCheckHandler((_wc, permission) => allowed.has(permission));
    buildMenu();
    createWindow();
    setupUpdates();
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on("window-all-closed", () => app.quit());
}
