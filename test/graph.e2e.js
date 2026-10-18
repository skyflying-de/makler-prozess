// OneDrive-Weg gegen Graph-Nachbau: Anmeldung per Code, Zielordner, Büro anlegen/beitreten, große Datei, Paging, Token-Erneuerung
const { _electron: electron } = require("playwright");
const fs = require("fs"), path = require("path"), { spawn } = require("child_process"), http = require("http");
const APP = path.join(__dirname, ".."), SCR = process.argv[2] || "/tmp/mp-graph", SHOTS = path.join(SCR, "shots");
const CFG = { clientId: "11111111-2222-3333-4444-555555555555", tenant: "organizations", loginBase: "http://127.0.0.1:1902", graphBase: "http://127.0.0.1:1902/v1.0" };
const PW = "Buero-Passwort-2026";
let fails = 0, checks = 0, mock = null; const ok = (c, m) => { checks++; if (c) console.log("  ✓ " + m); else { fails++; console.log("  ✗ " + m); } };
const stats = () => new Promise(r => http.get("http://127.0.0.1:2002/", res => { let d = ""; res.on("data", c => d += c); res.on("end", () => r(JSON.parse(d))); }));
async function launch(name) {
  const HOME = path.join(SCR, "home-" + name); fs.mkdirSync(HOME, { recursive: true });
  const app = await electron.launch({ executablePath: path.join(APP, "node_modules/electron/dist/electron"), args: ["--no-sandbox", APP], env: { ...process.env, HOME } });
  const w = await app.firstWindow(), errs = []; w.on("pageerror", e => errs.push(e.message)); w.on("dialog", d => d.accept());
  await w.setViewportSize({ width: 1360, height: 860 }); await w.waitForTimeout(900); return { app, w, errs, HOME };
}
async function waitSync(X) { let q = 0; for (let i = 0; i < 200; i++) { const s = await X.w.evaluate(() => ({ r: SY.running || SY.again, s: SY.status })); if (!s.r && s.s !== "läuft") { if (++q >= 4) return s.s; } else q = 0; await X.w.waitForTimeout(250); } return "timeout"; }
const syncNow = async X => { await waitSync(X); await X.w.evaluate(() => cloudSync("test")); return waitSync(X); };
const login = X => X.w.evaluate(async cfg => {
  const dc = await Providers.msDeviceCode(cfg, SYT); const tok = await Providers.msPollToken(cfg, SYT, dc); await api.secretSet("msRefresh", tok.refresh_token);
  return dc.user_code + "|" + JSON.parse(atob(tok.id_token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).preferred_username;
}, CFG);

(async () => {
  fs.rmSync(SCR, { recursive: true, force: true }); fs.mkdirSync(SHOTS, { recursive: true });
  mock = spawn(process.execPath, [path.join(__dirname, "graphmock.js"), "1902"]); await new Promise(r => mock.stdout.on("data", r));
  console.log("1) PC: Beispieldaten, OneDrive-Assistent ansehen, Anmeldung per Code");
  const A = await launch("pc");
  await A.w.click("[data-a=next]"); await A.w.waitForTimeout(300); await A.w.click("[data-s=demo]"); await A.w.click("[data-a=next]"); await A.w.waitForTimeout(200);
  await A.w.fill("[name=wn]", "Sandra Lugt"); await A.w.fill("[name=ws]", "SL"); await A.w.click("[data-a=next]"); await A.w.waitForTimeout(1200); await A.w.keyboard.press("Escape");
  await A.w.evaluate(() => { SETTAB = "daten"; go("einstellungen"); cloudWizard("create"); }); await A.w.waitForTimeout(300);
  await A.w.click(".wiz [data-p=onedrive]"); await A.w.click(".wiz [data-a=next]"); await A.w.waitForTimeout(200);
  await A.w.fill(".wiz [name=clientId]", CFG.clientId); await A.w.screenshot({ path: path.join(SHOTS, "30_wiz_onedrive.png") });
  await A.w.click(".wiz [data-a=next]"); await A.w.waitForTimeout(200);
  ok(/zuerst bei Microsoft anmelden/.test(await A.w.locator("#werr").innerText()), "ohne Anmeldung kein Weiter");
  await A.w.click(".wiz [data-a=cancel]");
  const who = await login(A); ok(/MPKX-7Q2B\|buero@lugtiv\.de/.test(who), "Anmeldung per Gerätecode: " + who);

  console.log("2) Zielordner + große Datei (> 4 MB, Upload in Teilen) + Büro anlegen");
  const big = Buffer.alloc(5 * 1024 * 1024 + 12345, 7); big.write("%PDF-groß", 0);
  await A.w.evaluate(async b64 => {
    const o = DB.objects[0], f = DB.settings.fields.object.find(f => f.type === "file"), rel = folderRel(o, "object", f) + "/Expose_gross.pdf";
    await api.writeB64(rel, b64); o.files[f.id] = [...(o.files[f.id] || []), { n: "Expose_gross.pdf", p: rel }]; save(); await flush();
  }, big.toString("base64"));
  const created = await A.w.evaluate(async cfg => {
    const sec = { get: () => api.secretGet("msRefresh"), set: v => api.secretSet("msRefresh", v) };
    const r = await Providers.graphResolveTarget(cfg, SYT, sec, { type: "me", folder: "MaklerProzess" });
    const cloud = { provider: "onedrive", ...cfg, ...r, account: "buero@lugtiv.de" };
    const prov = await syProvider(cloud); await prov.test();
    await syCreateOffice(prov, "Buero-Passwort-2026", () => {});
    ENV.cfg = { ...ENV.cfg, ...await api.setCfg({ mode: "cloud", cloud, deviceName: "PC Büro" }) }; SY.on = false; await cloudBoot();
    return cloud.folderLabel;
  }, CFG);
  ok(created === "MaklerProzess", "Ordner im eigenen OneDrive angelegt");
  let st = await stats();
  ok(st.session >= 1 && st.chunk >= 2, `große Datei per Upload-Sitzung in ${st.chunk} Teilen`);
  ok(st.files.some(f => f.startsWith("office.json")) && st.files.some(f => f.startsWith("snapshot/")) && st.files.some(f => f.endsWith("Expose_gross.pdf")), "office.json, Snapshot und Dokumente im OneDrive");

  console.log("3) Tablet: anderer Nutzer, „Mit mir geteilt“ → beitreten");
  const B = await launch("tablet");
  await B.w.evaluate(async () => { const d = ENV.cfg.defaultData; await api.setup({ dataDir: d }); ENV = await api.load(); document.querySelector(".wiz").remove(); });
  await login(B);
  const joined = await B.w.evaluate(async cfg => {
    const sec = { get: () => api.secretGet("msRefresh"), set: v => api.secretSet("msRefresh", v) };
    const shared = await Providers.graphSharedFolders(cfg, SYT, sec);
    const r = await Providers.graphResolveTarget(cfg, SYT, sec, { type: "shared", ...shared[0] });
    const cloud = { provider: "onedrive", ...cfg, ...r };
    await syJoinOffice(await syProvider(cloud), "Buero-Passwort-2026", () => {});
    ENV.cfg = { ...ENV.cfg, ...await api.setCfg({ mode: "cloud", cloud, deviceName: "Tablet" }) }; SY.on = false; await cloudBoot(); render();
    return shared[0].name + "|" + JSON.stringify([DB.objects.length, DB.cases.length, DB.entries.length]);
  }, CFG);
  const countsA = await A.w.evaluate(() => JSON.stringify([DB.objects.length, DB.cases.length, DB.entries.length]));
  ok(joined === "Büro Lugtiv|" + countsA, "geteilter Ordner gefunden, gleicher Datenstand " + countsA);
  const relBig = await B.w.evaluate(() => DB.objects.flatMap(o => Object.values(o.files).flat()).find(x => x && x.n === "Expose_gross.pdf").p);
  const bDir = await B.w.evaluate(() => ENV.cfg.dataDir);
  const got = fs.readFileSync(path.join(bDir, "dateien", relBig));
  ok(got.equals(big), "große Datei vollständig und identisch heruntergeladen (" + got.length + " Bytes, über Weiterleitung ohne Anmeldedaten)");

  console.log("4) Abgleich in beide Richtungen, mehr als eine Seite Ordnerinhalt");
  const [c1, c2] = await A.w.evaluate(() => [DB.cases[0].id, DB.cases[1].id]);
  for (let i = 0; i < 4; i++) { await A.w.evaluate(([id, i]) => { DB.cases.find(c => c.id === id).title = "PC Änderung " + i; save(); }, [c1, i]); await A.w.waitForTimeout(500); await syncNow(A); }
  await B.w.evaluate(id => { DB.cases.find(c => c.id === id).client = "vom Tablet"; save(); }, c2); await B.w.waitForTimeout(500);
  await syncNow(B); await syncNow(A);
  const rd = ([a, b]) => DB.cases.find(c => c.id === a).title + "|" + DB.cases.find(c => c.id === b).client;
  const a = await A.w.evaluate(rd, [c1, c2]), b = await B.w.evaluate(rd, [c1, c2]);
  ok(a === b && a === "PC Änderung 3|vom Tablet", "beide Richtungen: " + a);
  st = await stats(); ok(st.list > 0, "Ordnerlisten mit Folgeseiten gelesen");

  console.log("5) Token-Erneuerung");
  const before = (await stats()).refresh;
  await A.w.evaluate(() => { SY.prov = null; }); await syncNow(A);
  ok((await stats()).refresh > before && await A.w.evaluate(() => SY.status) === "ok", "Zugriffstoken per Refresh-Token erneuert");
  await A.w.evaluate(() => { SETTAB = "daten"; go("einstellungen"); }); await A.w.waitForTimeout(500); await A.w.screenshot({ path: path.join(SHOTS, "31_modus_onedrive.png") });

  const errs = [...A.errs, ...B.errs]; ok(!errs.length, "keine Oberflächenfehler" + (errs.length ? ": " + errs.join(" | ") : ""));
  await A.app.close(); await B.app.close(); mock.kill();
  console.log(`\n${checks - fails}/${checks} Prüfungen bestanden.`); process.exit(fails ? 1 : 0);
})().catch(e => { console.error("ABBRUCH:", e); try { mock && mock.kill(); } catch (x) {} process.exit(2); });
