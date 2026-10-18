// Makler-Prozess – Electron-Hauptprozess
"use strict";
const { app, BrowserWindow, ipcMain, dialog, shell, protocol, net, Menu, safeStorage } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const crypto = require("crypto");
const { pathToFileURL } = require("url");
const AdmZip = require("adm-zip");

const VERSION = require("./package.json").version;
const APPNAME = "MaklerProzess";
app.setName(APPNAME);

protocol.registerSchemesAsPrivileged([{ scheme: "mpfile", privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }]);

/* ---------------- Konfiguration ---------------- */
const CFG_DIR = path.join(app.getPath("appData"), APPNAME);
const CFG_FILE = path.join(CFG_DIR, "config.json");
const DEFAULT_DATA = path.join(app.getPath("documents"), "MaklerProzess-Daten");
let cfg = { dataDir: null, backupDir: null, autoBackup: true, keep: 14, lastAutoBackup: null, authMode: "select", mode: "local", cloud: null, deviceId: null, deviceName: null, secrets: {} };

function loadCfg() {
  try { cfg = { ...cfg, ...JSON.parse(fs.readFileSync(CFG_FILE, "utf8")) }; } catch (e) { /* erster Start */ }
  if (!cfg.deviceId) { cfg.deviceId = crypto.randomBytes(6).toString("hex"); cfg.deviceName = os.hostname(); saveCfg(); }
  cfg.secrets = cfg.secrets || {};
}
const publicCfg = () => { const { secrets, ...rest } = cfg; return { ...rest, hasSecrets: Object.keys(secrets || {}) }; };
function saveCfg() {
  fs.mkdirSync(CFG_DIR, { recursive: true });
  fs.writeFileSync(CFG_FILE, JSON.stringify(cfg, null, 2));
}
const dataFile = () => path.join(cfg.dataDir, "daten.json");
const syncFile = () => path.join(cfg.dataDir, "sync-state.json");
const filesDir = () => path.join(cfg.dataDir, "dateien");
const backupDir = () => cfg.backupDir || path.join(cfg.dataDir, "..", "MaklerProzess-Sicherungen");

/* ---------------- Speichern (atomar) ---------------- */
function writeAtomic(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, text);
  if (fs.existsSync(file)) { try { fs.copyFileSync(file, file + ".bak"); } catch (e) {} }
  fs.renameSync(tmp, file);
}
function safeRel(rel) {
  const clean = String(rel || "").replace(/[<>:"|?*\u0000-\u001f]/g, "_").replace(/\\/g, "/").split("/").filter(s => s && s !== "." && s !== "..").map(s => s.trim().replace(/[. ]+$/, "")).join("/");
  return clean;
}
function absFromRel(rel) {
  const abs = path.resolve(filesDir(), safeRel(rel));
  if (!abs.startsWith(path.resolve(filesDir()))) throw new Error("Ungültiger Pfad");
  return abs;
}
function uniqueName(dir, name) {
  let base = name.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_"), ext = path.extname(base), stem = base.slice(0, base.length - ext.length), n = 1, out = base;
  while (fs.existsSync(path.join(dir, out))) out = `${stem} (${++n})${ext}`;
  return out;
}

/* ---------------- Sicherung ---------------- */
const stamp = () => { const d = new Date(), p = n => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`; };
function makeBackup(kind = "manuell") {
  if (!cfg.dataDir || !fs.existsSync(dataFile())) throw new Error("Keine Daten zum Sichern vorhanden.");
  const dir = backupDir(); fs.mkdirSync(dir, { recursive: true });
  const zip = new AdmZip();
  zip.addLocalFile(dataFile(), "");
  if (fs.existsSync(syncFile())) zip.addLocalFile(syncFile(), "");
  if (fs.existsSync(filesDir())) zip.addLocalFolder(filesDir(), "dateien");
  zip.addFile("sicherung.json", Buffer.from(JSON.stringify({ app: APPNAME, version: VERSION, created: new Date().toISOString(), kind, host: os.hostname(), user: os.userInfo().username, dataDir: cfg.dataDir }, null, 2)));
  const file = path.join(dir, `MaklerProzess_Sicherung_${stamp()}_${kind}.zip`);
  zip.writeZip(file);
  if (kind === "auto") pruneAuto();
  return { file, size: fs.statSync(file).size };
}
function listBackups() {
  const dir = backupDir(); if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => /^MaklerProzess_Sicherung_.*\.zip$/i.test(f)).map(f => { const st = fs.statSync(path.join(dir, f)); return { name: f, file: path.join(dir, f), size: st.size, time: st.mtimeMs, kind: /_auto\.zip$/i.test(f) ? "auto" : /_vor-restore\.zip$/i.test(f) ? "vor Wiederherstellung" : "manuell" }; }).sort((a, b) => b.time - a.time);
}
function pruneAuto() {
  const autos = listBackups().filter(b => b.kind === "auto");
  autos.slice(cfg.keep || 14).forEach(b => { try { fs.unlinkSync(b.file); } catch (e) {} });
}
function restoreBackup(file) {
  const zip = new AdmZip(file);
  const meta = zip.getEntry("sicherung.json"), data = zip.getEntry("daten.json");
  if (!meta || !data) throw new Error("Diese Datei ist keine gültige Sicherung von Makler-Prozess.");
  JSON.parse(zip.readAsText(data)); // Plausibilitätsprüfung
  let safety = null;
  if (fs.existsSync(dataFile())) safety = makeBackup("vor-restore").file;
  const tmp = path.join(cfg.dataDir, ".restore_tmp"); fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(tmp, { recursive: true });
  zip.extractAllTo(tmp, true);
  fs.rmSync(filesDir(), { recursive: true, force: true });
  if (fs.existsSync(path.join(tmp, "dateien"))) fs.renameSync(path.join(tmp, "dateien"), filesDir());
  writeAtomic(dataFile(), fs.readFileSync(path.join(tmp, "daten.json"), "utf8"));
  // Sync-Zustand wird bei Wiederherstellung bewusst NICHT übernommen: der wiederhergestellte Stand
  // wird im Cloud-Modus als neue Änderung erkannt (siehe App) – alter Sync-Zustand bleibt erhalten.
  fs.rmSync(tmp, { recursive: true, force: true });
  return { safety, meta: JSON.parse(zip.readAsText(meta)) };
}
function autoBackupIfDue() {
  const today = new Date().toISOString().slice(0, 10);
  if (!cfg.autoBackup || !cfg.dataDir || !fs.existsSync(dataFile()) || cfg.lastAutoBackup === today) return null;
  try { const r = makeBackup("auto"); cfg.lastAutoBackup = today; saveCfg(); return r; } catch (e) { return { error: e.message }; }
}
function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(s, d); else fs.copyFileSync(s, d);
  }
}

/* ---------------- Fenster ---------------- */
let win, autoInfo = null;
function createWindow() {
  win = new BrowserWindow({
    width: 1360, height: 880, minWidth: 1024, minHeight: 680, title: `Makler-Prozess ${VERSION}`, backgroundColor: "#f3f4f6",
    icon: path.join(__dirname, "ui", "icon.png"), show: false, autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, nodeIntegration: false, spellcheck: true }
  });
  win.once("ready-to-show", () => { win.maximize(); win.show(); });
  win.loadFile(path.join(__dirname, "ui", "index.html"));
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^(https?|mailto):/.test(url)) shell.openExternal(url); return { action: "deny" }; });
  win.on("close", e => {
    if (win._forceClose) return;
    e.preventDefault();
    win.webContents.send("before-close");
    setTimeout(() => { win._forceClose = true; win.close(); }, 700);
  });
}

if (!app.requestSingleInstanceLock()) { app.quit(); }
app.on("second-instance", () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  loadCfg();
  if (cfg.dataDir && fs.existsSync(dataFile())) autoInfo = autoBackupIfDue();
  protocol.handle("mpfile", req => {
    try {
      const u = new URL(req.url); const rel = decodeURIComponent(u.pathname.replace(/^\//, ""));
      return net.fetch(pathToFileURL(absFromRel(rel)).toString());
    } catch (e) { return new Response("not found", { status: 404 }); }
  });
  createWindow();
});
app.on("window-all-closed", () => app.quit());

/* ---------------- IPC ---------------- */
const h = (name, fn) => ipcMain.handle(name, async (ev, ...a) => { try { return { ok: true, data: await fn(...a) }; } catch (e) { return { ok: false, error: e.message }; } });

h("load", () => {
  let db = null;
  if (cfg.dataDir && fs.existsSync(dataFile())) {
    try { db = JSON.parse(fs.readFileSync(dataFile(), "utf8")); }
    catch (e) { const bak = dataFile() + ".bak"; if (fs.existsSync(bak)) db = JSON.parse(fs.readFileSync(bak, "utf8")); else throw new Error("Datendatei beschädigt: " + e.message); }
  }
  const r = { db, cfg: { ...publicCfg(), backupDirEff: cfg.dataDir ? backupDir() : null, defaultData: DEFAULT_DATA }, version: VERSION, autoBackup: autoInfo, platform: process.platform, user: os.userInfo().username, host: os.hostname() };
  autoInfo = null; return r;
});
h("save", text => { if (!cfg.dataDir) throw new Error("Kein Datenordner gewählt."); writeAtomic(dataFile(), text); return true; });
h("setup", ({ dataDir }) => {
  fs.mkdirSync(dataDir, { recursive: true }); fs.mkdirSync(path.join(dataDir, "dateien"), { recursive: true });
  cfg.dataDir = dataDir; saveCfg();
  return { exists: fs.existsSync(dataFile()), backupDir: backupDir() };
});
h("pickFolder", async (title, def) => {
  const r = await dialog.showOpenDialog(win, { title, defaultPath: def || app.getPath("documents"), properties: ["openDirectory", "createDirectory"] });
  return r.canceled ? null : r.filePaths[0];
});
h("checkFolder", dir => {
  const res = { exists: fs.existsSync(dir), hasData: fs.existsSync(path.join(dir, "daten.json")), writable: false };
  try { fs.mkdirSync(dir, { recursive: true }); const t = path.join(dir, ".schreibtest"); fs.writeFileSync(t, "ok"); fs.unlinkSync(t); res.writable = true; } catch (e) { res.error = e.message; }
  return res;
});
h("moveData", ({ target, mode }) => {
  // mode: "copy" = Daten mitnehmen, "use" = dort vorhandene Daten verwenden
  if (!fs.existsSync(target)) fs.mkdirSync(target, { recursive: true });
  if (mode === "copy") {
    if (fs.existsSync(path.join(target, "daten.json"))) throw new Error("Im Zielordner liegen bereits Daten. Bitte „Dort vorhandene Daten verwenden“ wählen oder einen leeren Ordner.");
    makeBackup("vor-umzug");
    fs.copyFileSync(dataFile(), path.join(target, "daten.json"));
    if (fs.existsSync(syncFile())) fs.copyFileSync(syncFile(), path.join(target, "sync-state.json"));
    if (fs.existsSync(filesDir())) copyDir(filesDir(), path.join(target, "dateien"));
  } else if (!fs.existsSync(path.join(target, "daten.json"))) throw new Error("Im gewählten Ordner wurden keine Daten gefunden.");
  cfg.dataDir = target; saveCfg(); return { dataDir: target };
});
h("setCfg", patch => { delete patch.secrets; Object.assign(cfg, patch); saveCfg(); return { ...publicCfg(), backupDirEff: backupDir(), defaultData: DEFAULT_DATA }; });
h("backup", () => makeBackup("manuell"));
h("listBackups", () => listBackups());
h("restore", async file => {
  if (!file) { const r = await dialog.showOpenDialog(win, { title: "Sicherung wählen", defaultPath: backupDir(), filters: [{ name: "Sicherung", extensions: ["zip"] }], properties: ["openFile"] }); if (r.canceled) return null; file = r.filePaths[0]; }
  return restoreBackup(file);
});
h("openPath", rel => { const p = rel === "@data" ? cfg.dataDir : rel === "@backup" ? backupDir() : absFromRel(rel); fs.mkdirSync(fs.existsSync(p) && fs.statSync(p).isFile() ? path.dirname(p) : p, { recursive: true }); return shell.openPath(p); });
h("showItem", rel => shell.showItemInFolder(absFromRel(rel)));
h("importFiles", ({ paths, rel }) => {
  const dir = absFromRel(rel); fs.mkdirSync(dir, { recursive: true });
  return paths.map(p => { const n = uniqueName(dir, path.basename(p)); fs.copyFileSync(p, path.join(dir, n)); return { n, p: safeRel(rel + "/" + n) }; });
});
h("writeImage", ({ dataURL, rel, name }) => {
  const m = /^data:image\/(\w+);base64,(.*)$/.exec(dataURL || ""); if (!m) throw new Error("Bilddaten ungültig");
  const dir = absFromRel(rel); fs.mkdirSync(dir, { recursive: true });
  const n = uniqueName(dir, (name || crypto.randomBytes(5).toString("hex")) + "." + (m[1] === "jpeg" ? "jpg" : m[1]));
  fs.writeFileSync(path.join(dir, n), Buffer.from(m[2], "base64")); return safeRel(rel + "/" + n);
});
h("deleteFile", rel => { const p = absFromRel(rel); if (fs.existsSync(p)) fs.unlinkSync(p); return true; });
h("pdf", async ({ name, rel, open }) => {
  const buf = await win.webContents.printToPDF({ pageSize: "A4", printBackground: true, margins: { marginType: "custom", top: 0.4, bottom: 0.4, left: 0.4, right: 0.4 } });
  let file;
  if (rel) { const dir = absFromRel(rel); fs.mkdirSync(dir, { recursive: true }); file = path.join(dir, uniqueName(dir, name)); }
  else { const r = await dialog.showSaveDialog(win, { title: "PDF speichern", defaultPath: path.join(app.getPath("documents"), name), filters: [{ name: "PDF", extensions: ["pdf"] }] }); if (r.canceled) return null; file = r.filePath; }
  fs.writeFileSync(file, buf); if (open) shell.openPath(file);
  return { file, rel: rel ? safeRel(rel + "/" + path.basename(file)) : null };
});
h("print", () => new Promise(res => win.webContents.print({ printBackground: true }, (ok, err) => res({ ok, err }))));
h("saveText", async ({ name, text }) => {
  const r = await dialog.showSaveDialog(win, { title: "Speichern", defaultPath: path.join(app.getPath("documents"), name), filters: [{ name: "JSON", extensions: ["json"] }] });
  if (r.canceled) return null; fs.writeFileSync(r.filePath, text); return r.filePath;
});
h("mail", ({ to, subject, body, attachRel }) => {
  shell.openExternal(`mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  if (attachRel) shell.showItemInFolder(absFromRel(attachRel));
  return true;
});
h("hash", text => crypto.createHash("sha256").update(String(text)).digest("hex"));
h("openManual", () => { const f = path.join(__dirname, "Anleitung.html"); if (!fs.existsSync(f)) throw new Error("Anleitung nicht gefunden"); return shell.openPath(f); });

/* ---------------- Cloud-Sync: Netzwerk, Geheimnisse, Dateien, Zustand ---------------- */
h("http", async ({ method, url, headers, bodyB64 }) => {
  let res;
  try {
    res = await net.fetch(url, { method, headers: headers || {}, body: bodyB64 ? Buffer.from(bodyB64, "base64") : undefined, redirect: "follow", bypassCustomProtocolHandlers: true });
  } catch (e) { const err = new Error("Keine Verbindung: " + e.message); throw err; }
  const buf = Buffer.from(await res.arrayBuffer());
  const hdr = {}; res.headers.forEach((v, k) => { hdr[k.toLowerCase()] = v; });
  return { status: res.status, headers: hdr, b64: buf.toString("base64") };
});
const enc = v => safeStorage.isEncryptionAvailable() ? "s:" + safeStorage.encryptString(String(v)).toString("base64") : "p:" + Buffer.from(String(v)).toString("base64");
const dec = v => !v ? null : v.startsWith("s:") ? safeStorage.decryptString(Buffer.from(v.slice(2), "base64")) : Buffer.from(v.slice(2), "base64").toString();
h("secretSet", ({ name, value }) => { if (value === null || value === undefined) delete cfg.secrets[name]; else cfg.secrets[name] = enc(value); saveCfg(); return true; });
h("secretGet", name => { try { return dec(cfg.secrets[name]); } catch (e) { return null; } });
h("secretClear", () => { cfg.secrets = {}; saveCfg(); return true; });
h("fileStat", rel => { try { const st = fs.statSync(absFromRel(rel)); return { size: st.size, mtime: st.mtimeMs }; } catch (e) { return null; } });
h("readB64", rel => fs.readFileSync(absFromRel(rel)).toString("base64"));
h("writeB64", ({ rel, b64 }) => { const p = absFromRel(rel); fs.mkdirSync(path.dirname(p), { recursive: true }); const tmp = p + ".dl"; fs.writeFileSync(tmp, Buffer.from(b64, "base64")); fs.renameSync(tmp, p); return true; });
h("loadSync", () => { try { return fs.existsSync(syncFile()) ? fs.readFileSync(syncFile(), "utf8") : null; } catch (e) { return null; } });
h("saveSync", text => { writeAtomic(syncFile(), text); return true; });
h("dropSync", () => { if (fs.existsSync(syncFile())) fs.renameSync(syncFile(), syncFile().replace(/\.json$/, `_alt_${stamp()}.json`)); return true; });
h("openExternal", url => { if (/^https:\/\//.test(url)) shell.openExternal(url); return true; });
h("deviceInfo", () => ({ id: cfg.deviceId, name: cfg.deviceName || os.hostname(), platform: "Windows", host: os.hostname(), version: VERSION }));
h("openDoc", name => { const f = path.join(__dirname, path.basename(String(name))); if (!fs.existsSync(f)) throw new Error("Datei nicht gefunden: " + name); return shell.openPath(f); });
