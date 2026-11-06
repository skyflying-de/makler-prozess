// Ordner-Modus in der Android-App (Capacitor) nachgestellt: Die native Erweiterung „FolderAccess“ wird durch eine Attrappe ersetzt,
// die denselben Vertrag wie FolderAccessPlugin.java erfüllt (pick / op: test, list, read, write, del, mkdir) und echt in einen Ordner schreibt.
// PC (Electron, Ordner-Modus) ⇄ simulierter Sync-Dienst ⇄ Tablet-Ordner (FolderSync) ⇄ Android-App. Zusätzlich: Browser-App bietet den Modus nicht an.
// Aufruf: node tools/build-web.js --test && xvfb-run -a node test/folder-apk.e2e.js <scratch-ordner>
const { _electron: electron, chromium } = require("playwright");
const fs = require("fs"), path = require("path"), crypto = require("crypto"), { spawn } = require("child_process");
const { makeMirror, walk } = require("./foldersim");
const APP = path.join(__dirname, ".."), SCR = process.argv[2] || "/tmp/mp-folder-apk", SHOTS = path.join(SCR, "shots");
const PW = "Buero-Passwort-2026", UA = "Mozilla/5.0 (Linux; Android 14; SM-X710; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0 Safari/537.36";
const RA = path.join(SCR, "pc-OneDrive", "MaklerProzess"), RB = path.join(SCR, "android-FolderSync", "MaklerProzess");
const TREE = "content://com.android.externalstorage.documents/tree/primary%3AFolderSync%2FMaklerProzess";
let fails = 0, checks = 0; const procs = [];
const ok = (c, m) => { checks++; if (c) console.log("  ✓ " + m); else { fails++; console.log("  ✗ " + m); } };
const mirror = makeMirror(RA, RB);
async function waitSync(X, timeout = 40000) { const t0 = Date.now(); let q = 0; while (Date.now() - t0 < timeout) { const s = await X.w.evaluate(() => ({ r: SY.running || SY.again, s: SY.status })); if (!s.r && s.s !== "läuft") { if (++q >= 4) return s.s; } else q = 0; await X.w.waitForTimeout(250); } return "timeout"; }
const syncNow = async X => { await waitSync(X); await X.w.evaluate(() => cloudSync("test")); return waitSync(X); };
async function pin(X, d) { for (const k of d) await X.w.click(`.login [data-k="${k}"]`); if (d.length < 6) await X.w.click('.login [data-k="OK"]'); await X.w.waitForTimeout(400); }

/* ---- Attrappe FolderAccess (Node-Seite, Verhalten wie FolderAccessPlugin.java) ---- */
const FA = { granted: true, ops: {}, picks: 0 };
const skip = n => !n || n.startsWith(".") || n.startsWith("~$") || /\.(tmp|partial|crdownload|dl)$/i.test(n);
async function folderOp(o) {
  FA.ops[o.op] = (FA.ops[o.op] || 0) + 1;
  if (o.uri === TREE + "Fremd") { // Ordner eines anderen Büros: eigene office.json mit fremdem Schlüssel
    if (o.op === "test" || o.op === "mkdir") return { data: true };
    if (o.op === "read" && o.rel === "office.json") { const off = JSON.parse(fs.readFileSync(path.join(RB, "office.json"), "utf8")); off.check = Buffer.from("fremd-fremd-fremd-fremd-fremd-fremd-fremd").toString("base64"); return { data: Buffer.from(JSON.stringify(off)).toString("base64") }; }
    return o.op === "list" ? { data: [] } : {};
  }
  if (o.uri !== TREE || !FA.granted) throw new Error("Keine Berechtigung für den Ordner – bitte „Ordner neu wählen“.");
  const segs = String(o.rel || "").split(/[\\/]+/).filter(Boolean);
  if (segs.some(s => s === "." || s === "..")) throw new Error("Ungültiger Pfad");
  if (!fs.existsSync(RB)) throw new Error("Ordner nicht erreichbar – Speicher nicht verfügbar");
  const abs = path.join(RB, ...segs);
  switch (o.op) {
    case "test": { const p = path.join(RB, ".mp-test-" + Date.now()); fs.writeFileSync(p, "ok"); fs.unlinkSync(p); return { data: true }; }
    case "list": return { data: fs.existsSync(abs) ? fs.readdirSync(abs, { withFileTypes: true }).filter(e => !skip(e.name)).map(e => ({ name: e.name, dir: e.isDirectory(), size: e.isDirectory() ? 0 : fs.statSync(path.join(abs, e.name)).size })) : [] };
    case "read": return fs.existsSync(abs) && fs.statSync(abs).isFile() ? { data: fs.readFileSync(abs).toString("base64") } : {};
    case "write": {
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      const bytes = Buffer.from(o.b64 || "", "base64");
      if (fs.existsSync(abs)) fs.writeFileSync(abs, bytes); // vorhandene Datei: überschreiben (wt)
      else { const tmp = path.join(path.dirname(abs), "." + path.basename(abs) + "." + crypto.randomBytes(4).toString("hex") + ".tmp"); fs.writeFileSync(tmp, bytes); fs.renameSync(tmp, abs); }
      return { data: true };
    }
    case "del": if (fs.existsSync(abs)) fs.rmSync(abs, { recursive: true, force: true }); return { data: true };
    case "mkdir": fs.mkdirSync(abs, { recursive: true }); return { data: true };
    default: throw new Error("Unbekannte Ordner-Aktion");
  }
}
const NATIVE = () => {
  window.__native = { listeners: {}, opened: [] };
  const N = window.__native;
  const impl = {
    NativeHttp: { request: async () => { throw new Error("im Ordner-Modus nicht erwartet"); } },
    Filesystem: { writeFile: async o => ({ uri: "file:///cache/" + o.path }) },
    Share: { share: async () => ({}) }, Browser: { open: async o => { N.opened.push(o.url); } }, App: { exitApp: async () => {} },
    FolderAccess: { pick: async () => window.__faPick(), op: async o => window.__faOp(o) }
  };
  window.androidBridge = {};
  window.Capacitor = {
    PluginHeaders: Object.entries(impl).map(([name, m]) => ({ name, methods: [...Object.keys(m).map(k => ({ name: k, rtype: "promise" })), { name: "addListener", rtype: "callback" }, { name: "removeListener", rtype: "promise" }] })),
    nativePromise: (pl, m, o) => impl[pl] && impl[pl][m] ? Promise.resolve(impl[pl][m](o)) : Promise.reject(new Error(pl + "." + m + " fehlt")),
    nativeCallback: (pl, m, o, cb) => { if (m === "addListener") (N.listeners[o.eventName] = N.listeners[o.eventName] || []).push(cb); return String(Math.random()); }
  };
};

(async () => {
  fs.rmSync(SCR, { recursive: true, force: true }); fs.mkdirSync(SHOTS, { recursive: true }); fs.mkdirSync(RA, { recursive: true }); fs.mkdirSync(RB, { recursive: true });
  const st = spawn(process.execPath, [path.join(__dirname, "static.js"), path.join(APP, "www"), "1903"]); procs.push(st); await new Promise(r => st.stdout.on("data", d => /bereit/.test(d) && r()));
  const browser = await chromium.launch();

  console.log("1) PC legt das Büro im OneDrive-Ordner an");
  const HOME = path.join(SCR, "home-pc"); fs.mkdirSync(path.join(HOME, "Documents"), { recursive: true });
  const app = await electron.launch({ executablePath: path.join(APP, "node_modules/electron/dist/electron"), args: ["--no-sandbox", APP], env: { ...process.env, HOME } });
  const A = { w: await app.firstWindow() }; A.w.on("dialog", d => d.accept()); await A.w.waitForTimeout(900);
  await A.w.click("[data-a=next]"); await A.w.waitForTimeout(300); await A.w.click("[data-s=demo]"); await A.w.click("[data-a=next]"); await A.w.waitForTimeout(200);
  await A.w.fill("[name=wn]", "Sandra Lugt"); await A.w.fill("[name=ws]", "SL"); await A.w.click("[data-a=next]"); await A.w.waitForTimeout(1200); await A.w.keyboard.press("Escape");
  await A.w.evaluate(async r => {
    const cloud = { provider: "folder", root: r, label: r }, prov = await syProvider(cloud); await prov.test(); await syCreateOffice(prov, "Buero-Passwort-2026", () => {});
    ENV.cfg = { ...ENV.cfg, ...await api.setCfg({ mode: "cloud", cloud, deviceName: "PC Büro" }) }; SY.on = false; await cloudBoot();
  }, RA);
  ok(await waitSync(A) === "ok", "PC im Ordner-Modus synchron");
  ok(mirror() > 0, "Sync-Dienst überträgt den Ordner aufs Tablet");

  console.log("2) Android-App tritt über „Gemeinsamer Ordner“ bei");
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, hasTouch: true, userAgent: UA, serviceWorkers: "block" });
  await ctx.exposeFunction("__faOp", folderOp);
  await ctx.exposeFunction("__faPick", async () => { FA.picks++; return FA.cancelPick ? {} : FA.foreign ? { uri: TREE + "Fremd", name: "Fremdes Büro" } : { uri: TREE, name: "MaklerProzess" }; });
  await ctx.addInitScript(NATIVE);
  const B = { w: await ctx.newPage(), errs: [] }; B.w.on("pageerror", e => B.errs.push(e.message)); B.w.on("console", m => { if (m.type() === "error") B.errs.push(m.text()); }); B.w.on("dialog", d => d.accept());
  await B.w.goto("http://127.0.0.1:1903/"); await B.w.waitForTimeout(800);
  ok(await B.w.evaluate(() => PLATFORM.native && PLATFORM.folderMode), "Android-App: Ordner-Modus verfügbar");
  await B.w.click("[data-a=join]"); await B.w.waitForTimeout(300);
  ok(await B.w.locator(".wiz [data-p=folder]:not([disabled])").count() === 1, "Auswahl „Gemeinsamer Ordner“ aktiv");
  await B.w.click(".wiz [data-p=folder]"); await B.w.click(".wiz [data-a=next]"); await B.w.waitForTimeout(300);
  ok(/FolderSync/.test(await B.w.locator(".wiz").innerText()) && await B.w.locator(".wiz [name=fdroot]").count() === 0, "Tablet: Hinweis FolderSync/Autosync, Ordner-Auswahl statt Pfadfeld");
  await B.w.screenshot({ path: path.join(SHOTS, "60_tablet_ordner_waehlen.png") });
  await B.w.click(".wiz [data-a=next]"); await B.w.waitForTimeout(400);
  ok(/Bitte einen Ordner wählen/.test(await B.w.locator("#werr").innerText()), "ohne Auswahl: „Bitte einen Ordner wählen“");
  FA.cancelPick = true; await B.w.click(".wiz [data-a=fdpick]"); await B.w.waitForTimeout(300);
  ok(/noch nicht gewählt/.test(await B.w.locator(".wiz").innerText()), "Abbruch der Android-Ordnerauswahl ändert nichts");
  FA.cancelPick = false; await B.w.click(".wiz [data-a=fdpick]"); await B.w.waitForTimeout(300);
  ok(/MaklerProzess/.test(await B.w.locator(".wiz [data-fdlabel]").innerText()), "gewählter Ordner wird angezeigt");
  await B.w.screenshot({ path: path.join(SHOTS, "61_tablet_ordner_gewaehlt.png") });
  await B.w.click(".wiz [data-a=next]"); await B.w.waitForSelector(".wiz [name=secret]", { timeout: 15000 });
  await B.w.fill(".wiz [name=secret]", PW); await B.w.fill(".wiz [name=dev]", "Android-Tablet"); await B.w.click(".wiz [data-a=next]");
  await B.w.waitForSelector(".wiz [data-a=done]", { timeout: 60000 }); await B.w.click(".wiz [data-a=done]"); await B.w.waitForTimeout(1500);
  await B.w.click('.login [data-u="u1"]'); await pin(B, "4321"); await pin(B, "4321");
  ok(await waitSync(B) === "ok", "Android-App synchron über den Ordner");
  const cnt = X => X.w.evaluate(() => ({ o: DB.objects.length, c: DB.cases.length, p: DB.protocols.length }));
  ok(JSON.stringify(await cnt(A)) === JSON.stringify(await cnt(B)), "gleicher Büro-Stand " + JSON.stringify(await cnt(B)));
  ok(FA.ops.write > 0 && FA.ops.list > 0 && FA.ops.read > 0, `Zugriffe über die native Ordner-Erweiterung (${JSON.stringify(FA.ops)})`);
  const devJson = walk(RB).filter(r => /^devices\//.test(r)).map(r => JSON.parse(fs.readFileSync(path.join(RB, r), "utf8"))).find(d => d.name === "Android-Tablet");
  ok(devJson && devJson.platform === "Android-App", "Gerät im Ordner gemeldet (devices/…json)");
  ok(walk(RB).every(r => !/\.tmp$/.test(r)), "keine Zwischendateien im Tablet-Ordner");

  console.log("3) Hin und zurück über den Sync-Dienst");
  await B.w.evaluate(async () => { DB.cases[0].title = "Übergabe am Tablet erfasst"; save(); await flush(); });
  await syncNow(B); mirror(); await syncNow(A);
  ok(await A.w.evaluate(() => DB.cases[0].title) === "Übergabe am Tablet erfasst", "Tablet → Ordner → OneDrive → PC");
  await A.w.evaluate(async () => { DB.cases[1].title = "Vom PC zurück"; save(); await flush(); });
  await syncNow(A); mirror();
  await B.w.evaluate(() => window.__native.listeners.resume && window.__native.listeners.resume.forEach(f => f()));
  let got = false; for (let i = 0; i < 20 && !got; i++) { await B.w.waitForTimeout(300); got = await B.w.evaluate(() => DB.cases[1].title === "Vom PC zurück"); }
  ok(got, "beim Zurückkehren in die App wird sofort abgeglichen (resume)");
  ok(/An Ordner übergeben/.test(await B.w.locator("#syncpill").innerText().catch(() => "")) || await B.w.evaluate(() => /An Ordner übergeben/.test(syPillHTML())), "Statusanzeige „An Ordner übergeben“");

  console.log("4) Berechtigung verloren → „Ordner neu wählen“");
  FA.granted = false;
  await B.w.evaluate(async () => { DB.cases[0].note = "ohne Berechtigung"; save(); await flush(); });
  const s4 = await syncNow(B);
  ok(s4 === "anmeldung" && await B.w.evaluate(() => /Ordner-Zugriff nötig/.test(syPillHTML())), "Status „Ordner-Zugriff nötig“, Daten bleiben lokal");
  await B.w.evaluate(() => { SETTAB = "daten"; go("einstellungen"); }); await B.w.waitForTimeout(300);
  ok(/Ordner neu wählen/.test(await B.w.locator("#cloudcard").innerText()) && /Sync-App/.test(await B.w.locator("#cloudcard").innerText()), "Einstellungen: „Ordner neu wählen“ + Hinweis Sync-App");
  await B.w.screenshot({ path: path.join(SHOTS, "62_tablet_karte.png") });
  FA.granted = true;
  FA.foreign = true; await B.w.evaluate(() => cloudReauth()); await B.w.waitForTimeout(600);
  ok(await B.w.evaluate(() => ENV.cfg.cloud.root) === TREE && /anderes Büro/.test(await B.w.locator(".toast").innerText().catch(() => "")), "Ordner mit fremdem Büro wird abgelehnt (Meldung „anderes Büro“)");
  FA.foreign = false; await B.w.evaluate(() => cloudReauth()); await B.w.waitForTimeout(400);
  ok(await waitSync(B) === "ok" && await B.w.evaluate(() => SY.state.outbox.length) === 0, "nach neuer Auswahl wieder synchron, Änderung abgelegt");

  console.log("5) Browser-App (ohne native Erweiterung) bietet den Ordner-Modus nicht an");
  const ctx3 = await browser.newContext({ viewport: { width: 1280, height: 800 }, hasTouch: true, userAgent: UA.replace("; wv", ""), serviceWorkers: "block" });
  const C = { w: await ctx3.newPage() }; await C.w.goto("http://127.0.0.1:1903/"); await C.w.waitForTimeout(800);
  await C.w.click("[data-a=join]"); await C.w.waitForTimeout(300);
  ok(await C.w.locator(".wiz [data-p=folder][disabled]").count() === 1 && /Nur in der Windows- und der Android-App/.test(await C.w.locator(".wiz").innerText()), "Browser-App: Auswahl deaktiviert mit Hinweis");
  await C.w.screenshot({ path: path.join(SHOTS, "63_pwa_ordner_deaktiviert.png") });

  ok(B.errs.length === 0, "Android-App ohne Skriptfehler" + (B.errs.length ? ": " + B.errs.slice(0, 3).join(" | ") : ""));
  await ctx.close(); await ctx3.close(); await browser.close(); await app.close(); procs.forEach(p => p.kill());
  console.log(`\n${checks - fails}/${checks} Prüfungen bestanden`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error("ABBRUCH", e); procs.forEach(p => p.kill()); process.exit(2); });
