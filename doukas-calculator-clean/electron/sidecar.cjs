const fs = require("fs");
const path = require("path");

// Each saved PDF gets a companion data file: <name>.mwdata.json
// It holds the full, structured order (rows + internal metadata) so the report
// can later be re-imported and edited with correct weight recalculation.

function sidecarPathFor(filePath) {
  return filePath.replace(/\.(pdf|html?)$/i, "") + ".mwdata.json";
}

function writeSidecar(filePath, data) {
  fs.writeFileSync(sidecarPathFor(filePath), JSON.stringify(data, null, 2), "utf-8");
}

// Tries to guess { mode, orderNum } from the organized folder name:
//   2026-02-05_14-30-15_ORDER_47
function guessFromFolder(filePath) {
  const folderName = path.basename(path.dirname(filePath));
  const m = folderName.match(/_(ORDER|OFFER)_(.+)$/);
  if (!m) return null;
  return { mode: m[1], orderNum: m[2] };
}

// Inspects a file chosen in the import dialog and returns what the renderer needs.
function readImportCandidate(filePath) {
  const lower = filePath.toLowerCase();

  if (lower.endsWith(".json")) {
    return { ok: true, kind: "data", path: filePath, text: fs.readFileSync(filePath, "utf-8") };
  }

  if (lower.endsWith(".html") || lower.endsWith(".htm")) {
    const sc = sidecarPathFor(filePath);
    if (fs.existsSync(sc)) {
      return { ok: true, kind: "data", path: filePath, text: fs.readFileSync(sc, "utf-8") };
    }
    return { ok: true, kind: "html", path: filePath, text: fs.readFileSync(filePath, "utf-8") };
  }

  if (lower.endsWith(".pdf")) {
    const sc = sidecarPathFor(filePath);
    if (fs.existsSync(sc)) {
      return { ok: true, kind: "data", path: filePath, text: fs.readFileSync(sc, "utf-8") };
    }
    return { ok: true, kind: "pdf-no-data", path: filePath, guess: guessFromFolder(filePath) };
  }

  return { ok: false, error: "Μη υποστηριζόμενος τύπος αρχείου." };
}

module.exports = { sidecarPathFor, writeSidecar, guessFromFolder, readImportCandidate };
