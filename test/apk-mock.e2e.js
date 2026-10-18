// Android-App-Weg (Capacitor) im Browser nachgestellt: native Erweiterungen (NativeHttp, Filesystem, Share, Browser, App)
// werden durch Attrappen ersetzt, die wie auf dem Gerät antworten. Prüft die JavaScript-Seite der APK ohne Android-SDK.
// Aufruf: node tools/build-web.js --test && xvfb-run -a node test/apk-mock.e2e.js <scratch-ordner>
const { _electron: electron, chromium } = require("playwright");
const fs = require("fs"), path = require("path"), { spawn } = require("child_process");
const APP = path.join(__dirname, ".."), SCR = process.argv[2] || "/tmp/mp-apk", SHOTS = path.join(SCR, "shots");
const PW = "Buero-Passwort-2026", UA = "Mozilla/5.0 (Linux; Android 14; SM-X710; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0 Safari/537.36";
const MS = { clientId: "11111111-2222-3333-4444-555555555555", tenant: "organizations", loginBase: "http://127.0.0.1:1902", graphBase: "http://127.0.0.1:1902/v1.0" };
let fails = 0, checks = 0; const procs = [];
const ok = (c, m) => { checks++; if (c) console.log("  ✓ " + m); else { fails++; console.log("  ✗ " + m); } };
const start = (args, re) => new Promise(res => { const p = spawn(process.execPath, args); procs.push(p); p.stdout.on("data", d => re.test(d) && res(p)); });
async function waitSync(X, timeout = 40000) { const t0 = Date.now(); let q = 0; while (Date.now() - t0 < timeout) { const s = await X.w.evaluate(() => ({ r: SY.running || SY.again, s: SY.status })); if (!s.r && s.s !== "läuft") { if (++q >= 4) return s.s; } else q = 0; await X.w.waitForTimeout(250); } return "timeout"; }
const syncNow = async X => { await waitSync(X); await X.w.evaluate(() => cloudSync("test")); return waitSync(X); };
async function pin(X, d) { for (const k of d) await X.w.click(`.login [data-k="${k}"]`); if (d.length < 6) await X.w.click('.login [data-k="OK"]'); await X.w.waitForTimeout(400); }

// Attrappen der nativen Android-Erweiterungen
const NATIVE = () => {
  window.__native = { http: 0, methods: {}, files: {}, shares: [], opened: [], listeners: {} };
  const N = window.__native;
  const impl = {
    NativeHttp: { request: async o => { N.http++; N.methods[o.method] = (N.methods[o.method] || 0) + 1; return window.__nativeHttp(o); } },
    Filesystem: { writeFile: async o => { N.files[o.path] = o.data.length; return { uri: "file:///data/user/0/de.maklerprozess.app/cache/" + o.path }; } },
    Share: { share: async o => { N.shares.push({ title: o.title, text: o.text, files: o.files }); return {}; } },
    Browser: { open: async o => { N.opened.push(o.url); } },
    App: { exitApp: async () => { N.exited = true; } }
  };
  // wie die native Brücke von Capacitor auf Android: Plattformkennung, Plugin-Kopfdaten, nativePromise/nativeCallback
  window.androidBridge = {};
  window.Capacitor = {
    PluginHeaders: Object.entries(impl).map(([name, m]) => ({ name, methods: [...Object.keys(m).map(k => ({ name: k, rtype: "promise" })), { name: "addListener", rtype: "callback" }, { name: "removeListener", rtype: "promise" }] })),
    nativePromise: (pl, m, o) => impl[pl] && impl[pl][m] ? Promise.resolve(impl[pl][m](o)) : Promise.reject(new Error(pl + "." + m + " fehlt")),
    nativeCallback: (pl, m, o, cb) => { if (m === "addListener") (N.listeners[o.eventName] = N.listeners[o.eventName] || []).push(cb); return String(Math.random()); }
  };
};
async function nativeHttp({ method, url, headers, bodyB64 }) {
  if (!/^https?:\/\//.test(url)) throw new Error("Ungültige Adresse");
  const r = await fetch(url, { method, headers, body: bodyB64 ? Buffer.from(bodyB64, "base64") : undefined, redirect: "follow" });
  const h = {}; r.headers.forEach((v, k) => h[k] = v);
  return { status: r.status, headers: h, b64: Buffer.from(await r.arrayBuffer()).toString("base64") };
}

(async () => {
  fs.rmSync(SCR, { recursive: true, force: true }); fs.mkdirSync(SHOTS, { recursive: true });
  await start([path.join(__dirname, "davserver.js"), path.join(SCR, "davdata"), "1901"], /bereit/);
  await start([path.join(__dirname, "static.js"), path.join(APP, "www"), "1903"], /bereit/);
  await start([path.join(__dirname, "graphmock.js"), "1902"], /bereit/);
  const browser = await chromium.launch();

  console.log("1) PC legt Büro an (Nextcloud)");
  const HOME = path.join(SCR, "home-pc"); fs.mkdirSync(path.join(HOME, "Documents"), { recursive: true });
  const app = await electron.launch({ executablePath: path.join(APP, "node_modules/electron/dist/electron"), args: ["--no-sandbox", APP], env: { ...process.env, HOME } });
  const A = { w: await app.firstWindow() }; A.w.on("dialog", d => d.accept()); await A.w.waitForTimeout(900);
  await A.w.click("[data-a=next]"); await A.w.waitForTimeout(300); await A.w.click("[data-s=demo]"); await A.w.click("[data-a=next]"); await A.w.waitForTimeout(200);
  await A.w.fill("[name=wn]", "Sandra Lugt"); await A.w.fill("[name=ws]", "SL"); await A.w.click("[data-a=next]"); await A.w.waitForTimeout(1200); await A.w.keyboard.press("Escape");
  await A.w.evaluate(async () => {
    const root = Providers.nextcloudRoot("http://127.0.0.1:1901", "buero"); await api.secretSet("ncPass", "app-pass-123");
    const cloud = { provider: "nextcloud", root, folder: "MaklerProzess", user: "buero", host: "127.0.0.1:1901", web: "" };
    const prov = await syProvider(cloud); await syCreateOffice(prov, "Buero-Passwort-2026", () => {});
    ENV.cfg = { ...ENV.cfg, ...await api.setCfg({ mode: "cloud", cloud, deviceName: "PC Büro" }) }; SY.on = false; await cloudBoot();
  });
  ok(await waitSync(A) === "ok", "PC synchron");

  console.log("2) „Android-App“: Nextcloud ohne CORS-Freigabe über die native Erweiterung");
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, hasTouch: true, userAgent: UA, serviceWorkers: "block" });
  await ctx.exposeFunction("__nativeHttp", nativeHttp); await ctx.addInitScript(NATIVE);
  const B = { w: await ctx.newPage(), errs: [] }; B.w.on("pageerror", e => B.errs.push(e.message)); B.w.on("dialog", d => d.accept());
  await B.w.goto("http://127.0.0.1:1903/"); await B.w.waitForTimeout(800);
  ok(await B.w.evaluate(() => PLATFORM.native && PLATFORM.kind === "android" && PLATFORM.msFlow === "device"), "Plattform erkannt: Android-App (native Erweiterungen)");
  ok(/Android-App/.test(await B.w.locator(".wiz").innerText()), "Willkommen zeigt „Android-App“");
  await B.w.click("[data-a=join]"); await B.w.waitForTimeout(300);
  await B.w.click(".wiz [data-p=nextcloud]"); await B.w.click(".wiz [data-a=next]"); await B.w.waitForTimeout(200);
  ok(!/CORS/.test(await B.w.locator(".wiz").innerText()), "kein CORS-Hinweis in der Android-App");
  await B.w.fill(".wiz [name=server]", "http://127.0.0.1:1901"); await B.w.fill(".wiz [name=user]", "buero"); await B.w.fill(".wiz [name=pass]", "app-pass-123");
  await B.w.click(".wiz [data-a=next]"); await B.w.waitForSelector(".wiz [name=secret]", { timeout: 15000 }).catch(async e => { console.log("    Meldung: " + await B.w.locator("#werr").innerText(), JSON.stringify(await B.w.evaluate(() => window.__native))); throw e; });
  await B.w.fill(".wiz [name=secret]", PW); await B.w.fill(".wiz [name=dev]", "Android-Tablet"); await B.w.click(".wiz [data-a=next]");
  await B.w.waitForSelector(".wiz [data-a=done]", { timeout: 60000 }); await B.w.click(".wiz [data-a=done]"); await B.w.waitForTimeout(1500);
  await B.w.click('.login [data-u="u1"]'); await pin(B, "4321"); await pin(B, "4321");
  ok(await waitSync(B) === "ok", "Android-App synchron");
  const n = await B.w.evaluate(() => window.__native);
  ok(n.http > 0 && n.methods.PROPFIND > 0, `Cloud-Zugriffe nativ inkl. WebDAV-PROPFIND (${n.http}× seit Neustart)`);
  const dev = JSON.parse(fs.readFileSync(fs.readdirSync(path.join(SCR, "davdata/MaklerProzess/devices")).map(f => path.join(SCR, "davdata/MaklerProzess/devices", f)).find(f => /Android-Tablet/.test(fs.readFileSync(f, "utf8"))), "utf8"));
  ok(dev.platform === "Android-App", "Gerät meldet sich als „Android-App“");

  console.log("3) Teilen, PDF, Mail, Zurück-Taste");
  await B.w.evaluate(() => { const p = DB.protocols[0]; printDoc(buildProtoDoc(p), "Protokoll.pdf"); }); await B.w.waitForTimeout(300);
  await B.w.click(".pvov [data-x=pdf]"); await B.w.waitForFunction(() => window.__native.shares.length > 0, null, { timeout: 30000 });
  let sh = await B.w.evaluate(() => window.__native);
  ok(sh.shares[0].files[0].endsWith("teilen/Protokoll.pdf") && sh.files["teilen/Protokoll.pdf"] > 1000, "PDF erzeugt und über Android-Teilen angeboten");
  await B.w.evaluate(() => window.__native.listeners.backButton.forEach(f => f())); await B.w.waitForTimeout(200);
  ok(await B.w.locator(".pvov").count() === 0, "Zurück-Taste schließt die Druckvorschau");
  const mailOk = await B.w.evaluate(async () => {
    const c = DB.cases.find(x => x.type === "rent"); const rel = await api.writeImage({ dataURL: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", rel: folderRel(c, c.type, { label: "Übergabeprotokoll" }), name: "x" });
    await api.mail({ to: "mieter@beispiel.de", subject: "Übergabeprotokoll", body: "Guten Tag", attachRel: rel });
    const s = window.__native.shares.pop(); return s.title === "Übergabeprotokoll" && s.text === "Guten Tag" && s.files[0].endsWith(".png");
  });
  ok(mailOk, "E-Mail mit Anhang über Android-Teilen (Betreff + Text übergeben)");
  await B.w.evaluate(() => go("faelle")); await B.w.evaluate(() => window.__native.listeners.backButton.forEach(f => f())); await B.w.waitForTimeout(200);
  ok(await B.w.evaluate(() => VIEW) === "start", "Zurück-Taste: zur Startseite");
  await B.w.evaluate(() => window.__native.listeners.backButton.forEach(f => f()));
  ok(await B.w.evaluate(() => window.__native.exited === true), "Zurück-Taste auf der Startseite beendet die App");
  await B.w.evaluate(async () => { DB.cases[0].title = "Android geändert"; save(); await flush(); });
  ok(await syncNow(B) === "ok" && await syncNow(A) === "ok" && await A.w.evaluate(() => DB.cases[0].title) === "Android geändert", "Änderung der Android-App am PC");
  const n2 = await B.w.evaluate(() => window.__native.methods); ok(n2.PUT > 0, `Senden nativ per PUT (${n2.PUT}×)`);
  ok(B.errs.length === 0, "keine Skriptfehler" + (B.errs.length ? ": " + B.errs.slice(0, 3).join(" | ") : ""));
  await ctx.close();

  console.log("4) „Android-App“: OneDrive-Anmeldung per Gerätecode");
  const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 800 }, hasTouch: true, userAgent: UA, serviceWorkers: "block" });
  await ctx2.exposeFunction("__nativeHttp", nativeHttp); await ctx2.addInitScript(NATIVE);
  const C = { w: await ctx2.newPage() }; C.w.on("dialog", d => d.accept());
  await C.w.goto("http://127.0.0.1:1903/"); await C.w.waitForTimeout(800);
  await C.w.evaluate(async t => { await api.setCfg({ msTest: t }); ENV = await api.load(); }, { loginBase: MS.loginBase, graphBase: MS.graphBase });
  await C.w.click("[data-a=join]"); await C.w.waitForTimeout(300); await C.w.click(".wiz [data-p=onedrive]"); await C.w.click(".wiz [data-a=next]"); await C.w.waitForTimeout(200);
  await C.w.fill(".wiz [name=clientId]", MS.clientId); await C.w.click(".wiz [data-a=mslogin]");
  await C.w.waitForSelector(".wiz [data-t=me]", { timeout: 20000 });
  const op = await C.w.evaluate(() => window.__native.opened);
  ok(/MPKX-7Q2B/.test(await C.w.locator(".wiz").innerText()) || op.some(u => /devicelogin/.test(u)), "Gerätecode angezeigt und Anmeldeseite im Android-Browser geöffnet");
  ok(/buero@lugtiv\.de/.test(await C.w.locator(".wiz .banner").innerText()), "per Gerätecode angemeldet (Anmeldung bleibt 90 Tage gültig)");
  await ctx2.close(); await app.close(); await browser.close();

  console.log(`\n${checks - fails}/${checks} Prüfungen bestanden`);
  procs.forEach(p => p.kill()); process.exit(fails ? 1 : 0);
})().catch(e => { console.error("ABBRUCH", e); procs.forEach(p => p.kill()); process.exit(2); });
