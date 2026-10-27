const fs = require("fs");
const path = require("path");
const { app } = require("electron");

// Simple, robust local "DB" that stores localStorage-like KV pairs in a JSON file.
// This avoids native modules (no node-gyp / Visual Studio needed).
let state = null;
let filePath = null;

function getFilePath() {
  if (filePath) return filePath;
  const userData = app.getPath("userData");
  filePath = path.join(userData, "doukas-calculator.kv.json");
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  return filePath;
}

function load() {
  if (state) return state;
  const fp = getFilePath();
  try {
    const raw = fs.readFileSync(fp, "utf-8");
    const parsed = JSON.parse(raw);
    state = (parsed && typeof parsed === "object" && parsed.kv && typeof parsed.kv === "object")
      ? parsed
      : { kv: {}, updated_at: new Date().toISOString() };
  } catch {
    state = { kv: {}, updated_at: new Date().toISOString() };
    save(); // create file
  }
  return state;
}

function save() {
  const fp = getFilePath();
  state.updated_at = new Date().toISOString();
  fs.writeFileSync(fp, JSON.stringify(state, null, 2), "utf-8");
  return fp;
}

function get(key) {
  const s = load();
  if (!Object.prototype.hasOwnProperty.call(s.kv, key)) return null;
  return s.kv[key];
}

function set(key, value) {
  const s = load();
  s.kv[key] = String(value ?? "");
  save();
}

function remove(key) {
  const s = load();
  delete s.kv[key];
  save();
}

function exportAll() {
  const s = load();
  return { ...s, kv: { ...s.kv } };
}

function importAll(obj) {
  // Used only if ever needed; currently backups happen in the renderer.
  if (!obj || typeof obj !== "object" || !obj.kv || typeof obj.kv !== "object") return false;
  state = { kv: {}, updated_at: new Date().toISOString() };
  for (const [k, v] of Object.entries(obj.kv)) {
    state.kv[k] = String(v ?? "");
  }
  save();
  return true;
}

module.exports = { load, get, set, remove, exportAll, importAll, getFilePath };