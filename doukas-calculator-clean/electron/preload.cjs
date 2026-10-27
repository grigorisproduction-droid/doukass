const { contextBridge, ipcRenderer } = require("electron");

/**
 * Sync KV layer to emulate localStorage but stored in SQLite.
 * Use in renderer: window.mwDB.kv.getSync(key) / setSync(key,val) / removeSync(key)
 */
contextBridge.exposeInMainWorld("mwDB", {
  kv: {
    getSync: (key) => ipcRenderer.sendSync("mw:kv:getSync", key),
    setSync: (key, value) => ipcRenderer.sendSync("mw:kv:setSync", key, value),
    removeSync: (key) => ipcRenderer.sendSync("mw:kv:removeSync", key),
  },
  file: {
    saveText: (suggestedName, text) => ipcRenderer.invoke("mw:file:saveText", suggestedName, text),
    openText: () => ipcRenderer.invoke("mw:file:openText"),
    openReport: () => ipcRenderer.invoke("mw:file:openReport"),
  },
  report: {
    getFolder: () => ipcRenderer.invoke("mw:report:getFolder"),
    chooseFolder: () => ipcRenderer.invoke("mw:report:chooseFolder"),
    clearFolder: () => ipcRenderer.invoke("mw:report:clearFolder"),
    saveHtml: (filename, html, metadata) => ipcRenderer.invoke("mw:report:saveHtml", filename, html, metadata),
    savePdf: (filename, html, metadata) => ipcRenderer.invoke("mw:report:savePdf", filename, html, metadata),
    reveal: (filePath) => ipcRenderer.invoke("mw:report:reveal", filePath),
  },
  app: {
    // tell the main process whether the current order is unsaved (drives the close confirmation)
    setDirty: (dirty) => ipcRenderer.send("mw:app:setDirty", !!dirty),
    closeNow: () => ipcRenderer.send("mw:app:closeNow"),
    // fired when the user chose "Αποθήκευση PDF και έξοδος" in the close dialog
    onSaveBeforeClose: (cb) => {
      const handler = () => cb();
      ipcRenderer.on("mw:app:saveBeforeClose", handler);
      return () => ipcRenderer.removeListener("mw:app:saveBeforeClose", handler);
    },
  },
  update: {
    getInfo: () => ipcRenderer.invoke("mw:update:getInfo"),
    setFeedUrl: (url) => ipcRenderer.invoke("mw:update:setFeedUrl", url),
    check: () => ipcRenderer.invoke("mw:update:check"),
    install: () => ipcRenderer.invoke("mw:update:install"),
    onStatus: (cb) => {
      const handler = (_evt, status) => cb(status);
      ipcRenderer.on("mw:update:status", handler);
      return () => ipcRenderer.removeListener("mw:update:status", handler);
    },
  },
});