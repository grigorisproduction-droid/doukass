const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const path = require("path");
const { writeSidecar, readImportCandidate } = require("./sidecar.cjs");
const { buildReportTarget } = require("./paths.cjs");
const fs = require("fs");
const kv = require("./kvjson.cjs");
const updater = require("./updater.cjs");

// Main window + "unsaved order" state (reported by the renderer)
let win = null;
let dirty = false;
let forceClose = false;
let closeDialogOpen = false;


function ensureDirExists(dirPath) {
  try { fs.mkdirSync(dirPath, { recursive: true }); } catch {}
}

// ---- Local KV (no native deps) ----
function kvGet(key) {
  return kv.get(key);
}
function kvSet(key, value) {
  kv.set(key, value);
  return true;
}
function kvRemove(key) {
  kv.remove(key);
  return true;
}


// ---- Sync KV IPC (used by renderer to emulate localStorage without freezing) ----
ipcMain.on("mw:kv:getSync", (evt, key) => {
  try { evt.returnValue = kvGet(String(key)); }
  catch { evt.returnValue = null; }
});
ipcMain.on("mw:kv:setSync", (evt, key, value) => {
  try { kvSet(String(key), String(value ?? "")); evt.returnValue = true; }
  catch { evt.returnValue = false; }
});
ipcMain.on("mw:kv:removeSync", (evt, key) => {
  try { kvRemove(String(key)); evt.returnValue = true; }
  catch { evt.returnValue = false; }
});
// ---- Reports folder (user-chosen) ----
const REPORT_FOLDER_KEY = "doukas-report-folder-v1";

ipcMain.handle("mw:report:getFolder", async () => {
  return { ok: true, folder: kvGet(REPORT_FOLDER_KEY) };
});

ipcMain.handle("mw:report:chooseFolder", async () => {
  const res = await dialog.showOpenDialog({
    title: "Choose reports folder",
    properties: ["openDirectory", "createDirectory"],
  });
  if (res.canceled || !res.filePaths?.length) return { ok: false, canceled: true };
  const folder = res.filePaths[0];
  kvSet(REPORT_FOLDER_KEY, folder);
  return { ok: true, folder };
});

ipcMain.handle("mw:report:clearFolder", async () => {
  kvRemove(REPORT_FOLDER_KEY);
  return { ok: true };
});

// Decides where a report is written (and creates the folders).
// With a reports folder configured:   <folder>/<Customer>/<date>_<time>_<TYPE>_<num>/<file>
// Without a customer name:            <folder>/Quick_Order_<date>_<time>.<ext>
// Without a folder: a save dialog is shown.
async function resolveReportTarget({ ext, filename, metadata, dialogTitle, filterName }) {
  const folder = kvGet(REPORT_FOLDER_KEY);
  const rawName = (filename || `report.${ext}`).toString();

  if (folder) {
    ensureDirExists(folder);
    const t = buildReportTarget(folder, metadata, rawName, ext);
    if (t.customerFolder) ensureDirExists(t.customerFolder);
    if (t.orderFolder) ensureDirExists(t.orderFolder);
    return { ok: true, targetPath: t.targetPath, orderFolder: t.orderFolder, folder };
  }

  const defaultName = rawName.toLowerCase().endsWith("." + ext) ? rawName : rawName + "." + ext;
  const res = await dialog.showSaveDialog({
    title: dialogTitle,
    defaultPath: defaultName,
    filters: [{ name: filterName, extensions: [ext] }, { name: "All Files", extensions: ["*"] }],
  });
  if (res.canceled || !res.filePath) return { ok: false, canceled: true };
  return { ok: true, targetPath: res.filePath, orderFolder: null, folder: null };
}

ipcMain.handle("mw:report:saveHtml", async (_evt, filename, html, metadata = {}) => {
  try {
    // metadata: { customer, orderNum, mode, orderData }
    const t = await resolveReportTarget({
      ext: "html", filename, metadata, dialogTitle: "Save report (HTML)", filterName: "HTML",
    });
    if (!t.ok) return t;

    fs.writeFileSync(t.targetPath, html, "utf-8");
    if (metadata && metadata.orderData) {
      try { writeSidecar(t.targetPath, metadata.orderData); } catch (e) { console.error("sidecar write failed", e); }
    }
    return { ok: true, path: t.targetPath, folder: t.orderFolder || t.folder || null };
  } catch (e) {
    return { ok: false, error: (e && e.message) ? e.message : String(e) };
  }
});

// Save PDF (Chromium printToPDF) from report HTML
ipcMain.handle("mw:report:savePdf", async (_evt, filename, html, metadata = {}) => {
  try {
    // metadata: { customer, orderNum, mode, orderData }
    const t = await resolveReportTarget({
      ext: "pdf", filename, metadata, dialogTitle: "Save report (PDF)", filterName: "PDF",
    });
    if (!t.ok) return t;
    const targetPath = t.targetPath;

    // Write HTML to a temporary file (more reliable than data: URL, preserves encoding/relative assets)
    const tmpDir = app.getPath("temp");
    const stamp = Date.now();
    const tmpHtmlPath = path.join(tmpDir, `doukas_report_${stamp}.html`);
    fs.writeFileSync(tmpHtmlPath, html || "", "utf-8");

    const tmp = new BrowserWindow({
      show: false,
      backgroundColor: "#ffffff",
      webPreferences: { sandbox: false, contextIsolation: true, nodeIntegration: false, backgroundThrottling: false }
    });

    try {
      await tmp.loadFile(tmpHtmlPath);

      // Wait for fonts/layout to settle (helps with Greek + consistent output)
      try {
        await tmp.webContents.executeJavaScript(
          "document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()"
        );
      } catch {}

      await new Promise(r => setTimeout(r, 150));

      const pdfData = await tmp.webContents.printToPDF({ printBackground: true });
      fs.writeFileSync(targetPath, pdfData);
      // Companion data file so the report can be re-imported and edited later
      if (metadata && metadata.orderData) {
        try { writeSidecar(targetPath, metadata.orderData); } catch (e) { console.error("sidecar write failed", e); }
      }
    } finally {
      try { tmp.destroy(); } catch {}
      try { fs.unlinkSync(tmpHtmlPath); } catch {}
    }

    return { ok: true, path: targetPath, folder: t.orderFolder || t.folder || null };
  } catch (e) {
    return { ok: false, error: (e && e.message) ? e.message : String(e) };
  }
});


// Reveal saved file in Explorer/Finder
ipcMain.handle("mw:report:reveal", async (_evt, filePath) => {
  if (!filePath) return { ok: false };
  try {
    shell.showItemInFolder(filePath);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e && e.message) ? e.message : String(e) };
  }
});

// Optional: file dialogs for export/import raw JSON blobs
ipcMain.handle("mw:file:saveText", async (_evt, suggestedName, text) => {
  const res = await dialog.showSaveDialog({
    title: "Save file",
    defaultPath: suggestedName || "export.json",
    filters: [{ name: "JSON", extensions: ["json"] }, { name: "All Files", extensions: ["*"] }],
  });
  if (res.canceled || !res.filePath) return { ok: false, canceled: true };
  fs.writeFileSync(res.filePath, text, "utf-8");
  return { ok: true, path: res.filePath };
});

ipcMain.handle("mw:file:openText", async () => {
  const res = await dialog.showOpenDialog({
    title: "Open file",
    properties: ["openFile"],
    filters: [{ name: "JSON", extensions: ["json"] }, { name: "All Files", extensions: ["*"] }],
  });
  if (res.canceled || !res.filePaths?.length) return { ok: false, canceled: true };
  const text = fs.readFileSync(res.filePaths[0], "utf-8");
  return { ok: true, path: res.filePaths[0], text };
});

ipcMain.handle("mw:file:openReport", async () => {
  const res = await dialog.showOpenDialog({
    title: "Εισαγωγή Δελτίου",
    properties: ["openFile"],
    filters: [
      { name: "Δελτία (PDF, δεδομένα, HTML)", extensions: ["pdf", "json", "html", "htm"] },
      { name: "All Files", extensions: ["*"] },
    ],
  });
  if (res.canceled || !res.filePaths?.length) return { ok: false, canceled: true };
  try {
    return readImportCandidate(res.filePaths[0]);
  } catch (e) {
    return { ok: false, error: (e && e.message) ? e.message : String(e) };
  }
});
// ---- Unsaved-order protection + app/update IPC ----
ipcMain.on("mw:app:setDirty", (_evt, v) => { dirty = !!v; });
ipcMain.on("mw:app:closeNow", () => {
  forceClose = true;
  if (win && !win.isDestroyed()) win.close();
});

ipcMain.handle("mw:update:getInfo", async () => updater.getInfo());
ipcMain.handle("mw:update:setFeedUrl", async (_evt, url) => updater.setFeedUrl(url));
ipcMain.handle("mw:update:check", async () => updater.check());
ipcMain.handle("mw:update:install", async () => ({ ok: updater.install() }));

function createWindow() {
  forceClose = false;
  dirty = false;

  win = new BrowserWindow({
    width: 1280,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  win.setMenuBarVisibility(false);

  // Ask before closing while the current order has not been saved as a report.
  // (The draft itself is always autosaved, so nothing is lost - this only protects the PDF/report.)
  win.on("close", (e) => {
    if (forceClose || !dirty) return;
    if (win.webContents.isCrashed()) return;
    e.preventDefault();
    if (closeDialogOpen) return;
    closeDialogOpen = true;
    dialog
      .showMessageBox(win, {
        type: "question",
        title: "Έξοδος",
        message: "Η τρέχουσα παραγγελία δεν έχει αποθηκευτεί ως αναφορά (PDF).",
        detail:
          "Το πρόχειρο διατηρείται και θα ανοίξει την επόμενη φορά. Αν θέλετε αποθηκευμένο PDF, επιλέξτε «Αποθήκευση PDF και έξοδος».",
        buttons: ["Αποθήκευση PDF και έξοδος", "Έξοδος χωρίς αποθήκευση", "Άκυρο"],
        defaultId: 0,
        cancelId: 2,
        noLink: true,
      })
      .then((r) => {
        closeDialogOpen = false;
        if (r.response === 0) {
          // renderer saves the PDF, then asks us to close (mw:app:closeNow)
          if (win && !win.isDestroyed()) win.webContents.send("mw:app:saveBeforeClose");
        } else if (r.response === 1) {
          forceClose = true;
          if (win && !win.isDestroyed()) win.close();
        }
      })
      .catch(() => { closeDialogOpen = false; });
  });

  win.on("closed", () => { win = null; });

  if (app.isPackaged) {
    win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  } else {
    win.loadURL("http://localhost:5173");
  }

  return win;
}

app.whenReady().then(() => {
  // init KV store (creates file if missing)
  kv.load();

  updater.init({
    kv,
    getWindow: () => win,
    onBeforeQuitForUpdate: () => { forceClose = true; },
  });

  createWindow();
  updater.scheduleStartupCheck();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
