// Run:  node tests/paths.test.cjs
// Verifies report-folder naming with Greek letters, spaces, illegal Windows characters,
// reserved names, long names and the local-date handling around midnight.
process.env.TZ = "Europe/Athens";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { sanitizeName, sanitizeFileName, localStamp, buildReportTarget } = require("../electron/paths.cjs");
const { sidecarPathFor, writeSidecar, readImportCandidate, guessFromFolder } = require("../electron/sidecar.cjs");

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log("  ok  " + name); };

t("Greek letters, spaces and accents are preserved", () => {
  assert.strictEqual(sanitizeName("Παπαδόπουλος & Υιοί Ο.Ε"), "Παπαδόπουλος & Υιοί Ο.Ε");
  assert.strictEqual(sanitizeName("  Κατασκευές   Άγιος  Γεώργιος "), "Κατασκευές Άγιος Γεώργιος");
});

t("illegal Windows characters are replaced", () => {
  const out = sanitizeName('Α/Β\\Γ:Δ*Ε?Ζ"Η<Θ>Ι|Κ');
  assert.ok(!/[\\/:*?"<>|]/.test(out), out);
});

t("trailing dots / spaces are removed (Windows strips them silently)", () => {
  assert.strictEqual(sanitizeName("ΔΟΥΚΑΣ Α.Ε. "), "ΔΟΥΚΑΣ Α.Ε");
  assert.strictEqual(sanitizeName("..."), "_");
  assert.strictEqual(sanitizeName("   "), "_");
});

t("reserved device names are made safe", () => {
  for (const n of ["CON", "nul", "COM1", "lpt9", "AUX.txt", "prn"]) {
    const out = sanitizeName(n);
    assert.ok(out.startsWith("_"), n + " -> " + out);
  }
  assert.strictEqual(sanitizeName("Console"), "Console");
});

t("path traversal attempts stay inside one folder level", () => {
  const out = sanitizeName("../../Windows/System32");
  assert.ok(!out.includes("/") && !out.includes("\\"), out);
});

t("very long names are truncated", () => {
  assert.ok(sanitizeName("Α".repeat(500)).length <= 80);
  assert.ok(sanitizeFileName("Β".repeat(500) + ".pdf", "pdf").length <= 124);
});

t("file name keeps its extension and gets sanitized", () => {
  assert.strictEqual(sanitizeFileName("47_Παπαδόπουλος_05-02-2026.pdf", "pdf"), "47_Παπαδόπουλος_05-02-2026.pdf");
  assert.strictEqual(sanitizeFileName("a:b.pdf", "pdf"), "a_b.pdf");
  assert.strictEqual(sanitizeFileName("report", "html"), "report.html");
});

t("local date is used (UTC date would be the previous day just after midnight in Greece)", () => {
  const d = new Date(2026, 1, 5, 0, 30, 10); // 5 Feb 2026 00:30:10 local (Athens)
  assert.strictEqual(localStamp(d).date, "2026-02-05");
  assert.strictEqual(localStamp(d).time, "00-30-10");
  // the previous implementation:
  assert.strictEqual(d.toISOString().split("T")[0], "2026-02-04", "sanity: old logic really was wrong");
});

t("order folder name matches what the importer expects", () => {
  const now = new Date(2026, 1, 5, 14, 30, 15);
  const r = buildReportTarget("/tmp/x", { customer: "Πελάτης Α", orderNum: "47", mode: "ORDER" }, "47_x.pdf", "pdf", now);
  assert.strictEqual(path.basename(r.orderFolder), "2026-02-05_14-30-15_ORDER_47");
  assert.deepStrictEqual(guessFromFolder(r.targetPath), { mode: "ORDER", orderNum: "47" });
});

t("order number with illegal characters is sanitized in the folder name", () => {
  const r = buildReportTarget("/tmp/x", { customer: "Α", orderNum: "12/2026:A", mode: "OFFER" }, "f.pdf", "pdf", new Date(2026, 0, 1));
  assert.ok(/_OFFER_12_2026_A$/.test(path.basename(r.orderFolder)), r.orderFolder);
});

t("no customer -> flat Quick_Order file", () => {
  const r = buildReportTarget("/tmp/x", { customer: "   " }, "f.pdf", "pdf", new Date(2026, 4, 9, 8, 5, 3));
  assert.strictEqual(path.basename(r.targetPath), "Quick_Order_2026-05-09_08-05-03.pdf");
  assert.strictEqual(r.orderFolder, null);
});

t("real filesystem: Greek + spaces in the reports folder, PDF + .mwdata.json round-trip", () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "Φάκελος Αναφορών "));
  try {
    const folder = path.join(base, "Δελτία Παραγγελιών");
    fs.mkdirSync(folder, { recursive: true });
    const r = buildReportTarget(folder, { customer: "Γιώργος Παπαδόπουλος Α.Ε.", orderNum: "101", mode: "ORDER" },
      "101_Γιώργος Παπαδόπουλος Α.Ε._05-02-2026.pdf", "pdf", new Date(2026, 1, 5, 9, 0, 0));
    fs.mkdirSync(r.customerFolder, { recursive: true });
    fs.mkdirSync(r.orderFolder, { recursive: true });
    fs.writeFileSync(r.targetPath, "%PDF-1.4 fake");
    const data = { version: 1, mode: "ORDER", orderNum: "101", customer: "Γιώργος", rows: [{ id: 1, category: "Σωλήνα", quantity: 3 }] };
    writeSidecar(r.targetPath, data);

    assert.ok(fs.existsSync(sidecarPathFor(r.targetPath)));
    const cand = readImportCandidate(r.targetPath);
    assert.strictEqual(cand.ok, true);
    assert.strictEqual(cand.kind, "data");
    assert.deepStrictEqual(JSON.parse(cand.text), data);

    const listed = fs.readdirSync(r.orderFolder).sort();
    assert.strictEqual(listed.length, 2);
    assert.ok(listed.some(n => n.endsWith(".pdf")) && listed.some(n => n.endsWith(".mwdata.json")));
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

console.log(`\n${passed} tests passed`);
