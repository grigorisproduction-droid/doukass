const { app, dialog } = require("electron");
const fs = require("fs");
const path = require("path");

// Auto-update (electron-updater, "generic" provider = any plain http/https folder).
// The feed URL is the folder that contains  latest.yml  + the Setup .exe + its .blockmap.
// It can be set:
//   1) per PC from the app  (Settings -> Ενημερώσεις εφαρμογής)   -> stored in the local KV
//   2) for every installation, in electron/update-config.json before building
// If no URL is set the updater stays completely dormant (no network calls).

const FEED_KEY = "doukas-update-feed-v1";

let kv = null;
let getWindow = () => null;
let onBeforeQuitForUpdate = () => {};
let updater = null;
let status = { state: "idle" };

function setStatus(next) {
  status = next;
  const win = getWindow();
  try {
    if (win && !win.isDestroyed()) win.webContents.send("mw:update:status", status);
  } catch {}
}

function bundledFeedUrl() {
  try {
    const raw = fs.readFileSync(path.join(__dirname, "update-config.json"), "utf-8");
    const j = JSON.parse(raw);
    return typeof j.feedUrl === "string" ? j.feedUrl.trim() : "";
  } catch {
    return "";
  }
}

function userFeedUrl() {
  const v = kv.get(FEED_KEY);
  return typeof v === "string" ? v.trim() : "";
}

function effectiveFeedUrl() {
  return userFeedUrl() || bundledFeedUrl();
}

function isValidUrl(u) {
  try {
    const x = new URL(u);
    return x.protocol === "https:" || x.protocol === "http:";
  } catch {
    return false;
  }
}

function ensureUpdater() {
  if (updater) return updater;
  const { autoUpdater } = require("electron-updater");
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = false;
  autoUpdater.logger = console;

  autoUpdater.on("checking-for-update", () => setStatus({ state: "checking" }));
  autoUpdater.on("update-available", (info) =>
    setStatus({ state: "downloading", version: info && info.version, percent: 0 })
  );
  autoUpdater.on("update-not-available", () => setStatus({ state: "none" }));
  autoUpdater.on("download-progress", (p) =>
    setStatus({ state: "downloading", version: status.version, percent: Math.round((p && p.percent) || 0) })
  );
  autoUpdater.on("error", (e) =>
    setStatus({ state: "error", message: e && e.message ? String(e.message).slice(0, 300) : String(e) })
  );
  autoUpdater.on("update-downloaded", (info) => {
    setStatus({ state: "ready", version: info && info.version });
    const win = getWindow();
    dialog
      .showMessageBox(win && !win.isDestroyed() ? win : undefined, {
        type: "info",
        title: "Διαθέσιμη ενημέρωση",
        message: `Η νέα έκδοση ${info && info.version ? info.version : ""} είναι έτοιμη.`,
        detail:
          "Η εφαρμογή θα κλείσει, θα ενημερωθεί και θα ανοίξει ξανά. Το πρόχειρο της παραγγελίας διατηρείται. Αν επιλέξετε «Αργότερα», η ενημέρωση θα εγκατασταθεί όταν κλείσετε την εφαρμογή.",
        buttons: ["Επανεκκίνηση και ενημέρωση", "Αργότερα"],
        defaultId: 0,
        cancelId: 1,
      })
      .then((r) => {
        if (r.response === 0) install();
      })
      .catch(() => {});
  });

  updater = autoUpdater;
  return updater;
}

function check() {
  if (!app.isPackaged) {
    setStatus({ state: "disabled", message: "Οι ενημερώσεις λειτουργούν μόνο στην εγκατεστημένη εφαρμογή." });
    return status;
  }
  const url = effectiveFeedUrl();
  if (!url) {
    setStatus({ state: "disabled", message: "Δεν έχει οριστεί διεύθυνση ενημερώσεων." });
    return status;
  }
  if (!isValidUrl(url)) {
    setStatus({ state: "error", message: "Μη έγκυρη διεύθυνση ενημερώσεων (πρέπει να ξεκινά με https:// ή http://)." });
    return status;
  }
  if (status.state === "checking" || status.state === "downloading") return status;

  try {
    const u = ensureUpdater();
    u.setFeedURL({ provider: "generic", url });
    setStatus({ state: "checking" });
    u.checkForUpdates().catch((e) =>
      setStatus({ state: "error", message: e && e.message ? String(e.message).slice(0, 300) : String(e) })
    );
  } catch (e) {
    setStatus({ state: "error", message: e && e.message ? String(e.message).slice(0, 300) : String(e) });
  }
  return status;
}

function install() {
  if (!updater || status.state !== "ready") return false;
  try {
    onBeforeQuitForUpdate();
    updater.quitAndInstall(false, true);
    return true;
  } catch {
    return false;
  }
}

function setFeedUrl(url) {
  const v = String(url == null ? "" : url).trim();
  if (v && !isValidUrl(v)) return { ok: false, error: "Η διεύθυνση πρέπει να ξεκινά με https:// ή http://" };
  if (v) kv.set(FEED_KEY, v);
  else kv.remove(FEED_KEY);
  return { ok: true };
}

function getInfo() {
  return {
    version: app.getVersion(),
    packaged: app.isPackaged,
    feedUrl: userFeedUrl(),
    bundledFeedUrl: bundledFeedUrl(),
    status,
  };
}

function init(opts) {
  kv = opts.kv;
  getWindow = opts.getWindow;
  onBeforeQuitForUpdate = opts.onBeforeQuitForUpdate || (() => {});
}

// Silent check a few seconds after start-up (only when a feed URL exists)
function scheduleStartupCheck(delayMs = 8000) {
  if (!app.isPackaged) return;
  setTimeout(() => {
    if (effectiveFeedUrl()) check();
  }, delayMs);
}

module.exports = { init, check, install, setFeedUrl, getInfo, scheduleStartupCheck };
