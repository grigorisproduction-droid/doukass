const path = require("path");

// Helpers that make report folders/files safe on Windows (and everywhere else):
//  - illegal characters  \ / : * ? " < > |   and control characters
//  - trailing dots/spaces (Windows silently strips them, which breaks later lookups)
//  - reserved device names (CON, PRN, AUX, NUL, COM1..9, LPT1..9)
//  - overly long names
//  - LOCAL date/time (toISOString() is UTC and gives the previous day between 00:00 and 02:00/03:00 in Greece)

const RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;

function sanitizeName(value, fallback = "_", maxLen = 80) {
  let v = String(value == null ? "" : value)
    .normalize("NFC")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, " ")
    .trim();
  v = v.replace(/[. ]+$/, "");
  if (!v || /^\.+$/.test(v)) return fallback;
  if (RESERVED.test(v)) v = "_" + v;
  if (v.length > maxLen) v = v.slice(0, maxLen).replace(/[. ]+$/, "");
  return v || fallback;
}

// Keeps the extension, sanitizes the base name ("47_Παπαδόπουλος_05-02-2026.pdf")
function sanitizeFileName(name, ext, fallbackBase = "report", maxBase = 120) {
  const wanted = "." + String(ext).replace(/^\./, "").toLowerCase();
  let base = String(name == null ? "" : name);
  if (base.toLowerCase().endsWith(wanted)) base = base.slice(0, base.length - wanted.length);
  return sanitizeName(base, fallbackBase, maxBase) + wanted;
}

const pad = (n) => String(n).padStart(2, "0");

function localStamp(d = new Date()) {
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`,
  };
}

// Where a report goes when a reports folder is configured.
//  with customer : <folder>/<Customer>/<date>_<time>_<TYPE>_<num>/<file>
//  no customer   : <folder>/Quick_Order_<date>_<time>.<ext>
function buildReportTarget(folder, metadata, fileName, ext, now = new Date()) {
  const md = metadata || {};
  const { date, time } = localStamp(now);
  const customer = typeof md.customer === "string" ? md.customer.trim() : "";

  if (customer) {
    const customerFolder = path.join(folder, sanitizeName(customer, "Πελάτης"));
    const type = md.mode === "OFFER" ? "OFFER" : "ORDER";
    const num = sanitizeName(md.orderNum, "NO_NUM", 40);
    const orderFolder = path.join(customerFolder, `${date}_${time}_${type}_${num}`);
    return {
      customerFolder,
      orderFolder,
      targetPath: path.join(orderFolder, sanitizeFileName(fileName, ext)),
    };
  }

  return {
    customerFolder: null,
    orderFolder: null,
    targetPath: path.join(folder, `Quick_Order_${date}_${time}.${String(ext).replace(/^\./, "")}`),
  };
}

module.exports = { sanitizeName, sanitizeFileName, localStamp, buildReportTarget };
