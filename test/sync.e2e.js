// End-to-End-Test Cloud-Sync: zwei App-Instanzen (PC + Tablet) gegen WebDAV-Server (Nextcloud-Schema)
// Aufruf: xvfb-run -a node test/sync.e2e.js <scratch-ordner>
const { _electron: electron } = require("playwright");
const fs = require("fs"), path = require("path"), { spawn } = require("child_process");
const APP = path.join(__dirname, ".."), SCR = process.argv[2] || "/tmp/mp-e2e";
const DAV = "http://127.0.0.1:1901/remote.php/dav/files/buero", DAVDIR = path.join(SCR, "davdata"), SHOTS = path.join(SCR, "shots");
const PW = "Buero-Passwort-2026";
let dav = null, fails = 0, checks = 0;
const ok = (c, m) => { checks++; if (c) console.log("  ✓ " + m); else { fails++; console.log("  ✗ " + m); } };
const startDav = () => new Promise(res => { dav = spawn(process.execPath, [path.join(__dirname, "davserver.js"), DAVDIR, "1901"]); dav.stdout.on("data", d => /bereit/.test(d) && res()); });
const stopDav = () => new Promise(res => { dav.on("exit", res); dav.kill(); });
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function launch(name) {
  const HOME = path.join(SCR, "home-" + name);
  fs.mkdirSync(path.join(HOME, "Documents"), { recursive: true });
  const app = await electron.launch({ executablePath: path.join(APP, "node_modules/electron/dist/electron"), args: ["--no-sandbox", APP], env: { ...process.env, HOME } });
  const w = await app.firstWindow(); const errs = [];
  w.on("pageerror", e => errs.push(e.message)); w.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
  w.on("dialog", d => d.accept());
  await w.setViewportSize({ width: 1360, height: 860 }); await w.waitForTimeout(900);
  return { app, w, errs, HOME, name };
}
const shot = async (X, n) => { await X.w.waitForTimeout(300); await X.w.screenshot({ path: path.join(SHOTS, n + ".png") }); };
async function waitSync(X, timeout = 30000) {
  const t0 = Date.now();
  await X.w.waitForTimeout(200);
  let quiet = 0;
  while (Date.now() - t0 < timeout) { const s = await X.w.evaluate(() => ({ r: SY.running || SY.again, s: SY.status })); if (!s.r && s.s !== "läuft") { if (++quiet >= 4) return s.s; } else quiet = 0; await X.w.waitForTimeout(250); }
  return "timeout";
}
const syncNow = async X => { await waitSync(X); await X.w.evaluate(() => cloudSync("test")); return waitSync(X); };
const dataDir = X => X.w.evaluate(() => ENV.cfg.dataDir);
async function fillNextcloud(X, folder = "MaklerProzess") {
  await X.w.click('.wiz [data-p=nextcloud]'); await X.w.click('.wiz [data-a=next]'); await X.w.waitForTimeout(200);
  await X.w.fill('.wiz [name=server]', DAV); await X.w.fill('.wiz [name=user]', "buero"); await X.w.fill('.wiz [name=pass]', "app-pass-123"); await X.w.fill('.wiz [name=folder]', folder);
}

(async () => {
  fs.rmSync(SCR, { recursive: true, force: true }); fs.mkdirSync(SHOTS, { recursive: true });
  await startDav();
  console.log("1) PC: Einrichtung mit Beispieldaten, dann Cloud-Sync anlegen");
  const A = await launch("pc");
  await A.w.click("[data-a=next]"); await A.w.waitForTimeout(300); await A.w.click("[data-s=demo]"); await A.w.click("[data-a=next]"); await A.w.waitForTimeout(200);
  await A.w.fill("[name=wn]", "Sandra Lugt"); await A.w.fill("[name=ws]", "SL"); await A.w.click("[data-a=next]"); await A.w.waitForTimeout(1200);
  await A.w.keyboard.press("Escape");
  // echte Datei am Objekt (soll in die Cloud)
  fs.writeFileSync(path.join(SCR, "Grundbuch.pdf"), "%PDF-1.4 Testinhalt Grundbuch");
  await A.w.evaluate(() => { OTAB = "daten"; go("objekt", DB.objects[0].id); });
  await A.w.setInputFiles('label:has-text("Datei") >> nth=0 >> input[type=file]', path.join(SCR, "Grundbuch.pdf")); await A.w.waitForTimeout(600);
  await A.w.evaluate(() => { SETTAB = "daten"; go("einstellungen"); }); await A.w.waitForTimeout(400);
  await shot(A, "20_modus_lokal");
  await A.w.click("button:has-text('Cloud-Sync einrichten')"); await A.w.waitForTimeout(300); await shot(A, "21_wiz_anbieter");
  await fillNextcloud(A); await shot(A, "22_wiz_nextcloud");
  await A.w.click('.wiz [data-a=next]'); await A.w.waitForTimeout(1500);
  ok(await A.w.locator('.wiz [name=pw]').count() === 1, "Verbindung zu Nextcloud/WebDAV hergestellt");
  await A.w.fill('.wiz [name=pw]', "zu-kurz"); await A.w.fill('.wiz [name=pw2]', "zu-kurz"); await A.w.click('.wiz [data-a=next]'); await A.w.waitForTimeout(200);
  ok(/mindestens 10/.test(await A.w.locator("#werr").innerText()), "zu kurzes Passwort abgelehnt");
  await A.w.fill('.wiz [name=pw]', PW); await A.w.fill('.wiz [name=pw2]', PW); await A.w.fill('.wiz [name=dev]', "PC Büro"); await shot(A, "23_wiz_passwort");
  await A.w.click('.wiz [data-a=next]');
  await A.w.waitForSelector('.wiz [data-a=done]', { timeout: 60000 }); await shot(A, "24_wiz_fertig");
  await A.w.click('.wiz [data-a=done]'); await A.w.waitForTimeout(800);
  const root = path.join(DAVDIR, "MaklerProzess");
  ok(fs.existsSync(path.join(root, "office.json")), "office.json in der Cloud");
  ok(fs.readdirSync(path.join(root, "snapshot")).length === 1, "verschlüsselter Datenstand (Snapshot) hochgeladen");
  const objRel = await A.w.evaluate(() => Object.values(DB.objects[0].files).flat()[0].p);
  ok(fs.existsSync(path.join(root, "dateien", objRel)), "Dokument lesbar im Cloud-Ordner: dateien/" + objRel);
  const snapRaw = fs.readFileSync(path.join(root, "snapshot", fs.readdirSync(path.join(root, "snapshot"))[0]));
  ok(!snapRaw.includes(Buffer.from("Ahornweg")) && snapRaw.slice(0, 4).toString() === "MPK1", "Datenstand ist verschlüsselt (kein Klartext)");

  console.log("2) Tablet: Erststart → Bestehendem Büro beitreten");
  const B = await launch("tablet");
  await B.w.click("[data-a=join]"); await B.w.waitForTimeout(400);
  await fillNextcloud(B); await B.w.click('.wiz [data-a=next]'); await B.w.waitForTimeout(1500);
  await B.w.fill('.wiz [name=secret]', "falsches-passwort"); await B.w.fill('.wiz [name=dev]', "Tablet Übergaben"); await B.w.click('.wiz [data-a=next]');
  await B.w.waitForSelector("#werr:has-text('falsch')", { timeout: 20000 });
  ok(true, "falsches Büro-Passwort abgelehnt");
  await B.w.fill('.wiz [name=secret]', PW); await shot(B, "25_wiz_beitreten"); await B.w.click('.wiz [data-a=next]');
  await B.w.waitForSelector('.wiz [data-a=done]', { timeout: 60000 });
  await B.w.click('.wiz [data-a=done]'); await B.w.waitForTimeout(2500);
  await B.w.waitForSelector(".ov .utiles [data-u]", { timeout: 10000 }); await shot(B, "29_wer_arbeitet");
  await B.w.click(".ov .utiles [data-u=u2]"); await B.w.waitForTimeout(400);
  ok(await B.w.evaluate(() => ME().name) === "Markus Steiner", "Tablet fragt nach Mitarbeiter (Markus)");
  // nach Reload: Benutzerauswahl (Assistent fragt keinen Benutzer) → ersten nehmen
  const cnt = async X => X.w.evaluate(() => ({ o: DB.objects.length, c: DB.cases.length, e: DB.entries.length, p: DB.protocols.length, u: DB.settings.users.length }));
  const ca = await cnt(A), cb = await cnt(B);
  ok(JSON.stringify(ca) === JSON.stringify(cb), `gleicher Datenstand PC ${JSON.stringify(ca)} / Tablet ${JSON.stringify(cb)}`);
  ok(fs.existsSync(path.join(await dataDir(B), "dateien", objRel)), "Dokument auf das Tablet geladen");
  ok(await B.w.evaluate(() => ENV.cfg.mode === "cloud" && SY.on), "Tablet im Cloud-Modus");

  console.log("3) Gleichzeitig verschiedene Felder ändern");
  await A.w.evaluate(() => { const c = DB.cases.find(c => c.title.includes("Ahornweg")); c.title = "Verkauf EFH Ahornweg (Preis neu)"; save(); });
  await B.w.evaluate(() => { const c = DB.cases.find(c => c.title.includes("Ahornweg")); c.client = "Familie Berger-Huber"; save(); });
  await A.w.waitForTimeout(800); await B.w.waitForTimeout(800);
  await syncNow(A); await syncNow(B); await syncNow(A);
  const fA = await A.w.evaluate(() => { const c = DB.cases.find(c => c.title.includes("Ahornweg")); return c.title + " | " + c.client; });
  const fB = await B.w.evaluate(() => { const c = DB.cases.find(c => c.title.includes("Ahornweg")); return c.title + " | " + c.client; });
  ok(fA === fB && /Preis neu/.test(fA) && /Berger-Huber/.test(fA), "zusammengeführt auf beiden Geräten: " + fA);

  console.log("4) Offline arbeiten: Server weg, Tablet bucht Zeit + ändert, PC ändert dasselbe Feld später");
  await stopDav();
  await B.w.evaluate(() => { const c = DB.cases.find(c => c.title.includes("Nikola")); TAB = "akt"; go("fall", c.id); });
  await B.w.click("button.act >> nth=0"); await B.w.waitForTimeout(400);
  await B.w.evaluate(() => { const c = DB.cases.find(c => c.title.includes("Ahornweg")); c.stage = 3; c.title = "Titel vom Tablet (offline)"; save(); });
  await B.w.waitForTimeout(800); const stB = await syncNow(B);
  ok(stB === "offline", "Tablet erkennt Offline-Zustand");
  await B.w.evaluate(() => syPill()); await shot(B, "26_offline");
  const pend = await B.w.evaluate(() => SY.state.outbox.length); ok(pend > 0, `${pend} Änderungen warten lokal`);
  await sleep(1200);
  await A.w.evaluate(() => { const c = DB.cases.find(c => c.title.includes("Tablet") || c.title.includes("Ahornweg")); c.title = "Titel vom PC (später)"; save(); });
  await A.w.waitForTimeout(800);
  await startDav();
  await syncNow(A); await syncNow(B); await syncNow(A);
  const t1 = await A.w.evaluate(() => { const c = DB.cases.find(c => /Titel vom/.test(c.title)); return c && c.title + "|" + c.stage; });
  const t2 = await B.w.evaluate(() => { const c = DB.cases.find(c => /Titel vom/.test(c.title)); return c && c.title + "|" + c.stage; });
  ok(t1 === t2 && t1.startsWith("Titel vom PC (später)|3"), "spätere Änderung gewinnt, Phase vom Tablet übernommen: " + t1);
  const runA = await A.w.evaluate(() => DB.entries.filter(e => !e.end).length), runB = await B.w.evaluate(() => DB.entries.filter(e => !e.end).length);
  ok(runA === runB && runA >= 3, `offline gestartete Aktion auf dem PC sichtbar (${runA} laufend)`);
  const conf = await B.w.evaluate(() => SY.state.conflicts.length);
  ok(conf >= 1, "Konflikt im Tablet protokolliert");

  console.log("5) Unterschriebenes Protokoll bleibt gesperrt");
  const pid = await A.w.evaluate(() => DB.protocols[0].id);
  await A.w.evaluate(id => { const p = DB.protocols.find(p => p.id === id); p.status = "ready"; save(); }, pid); await A.w.waitForTimeout(600);
  await syncNow(A); await syncNow(B);
  await stopDav();
  await B.w.evaluate(id => { const p = DB.protocols.find(p => p.id === id); const s = p.sections.find(s => s.type === "rooms"); s.rooms[0].values[s.items[0].id] = { z: "Mängel", note: "Tablet offline nachgetragen" }; save(); }, pid);
  await B.w.waitForTimeout(600); await syncNow(B);
  await sleep(800);
  await A.w.evaluate(id => { const p = DB.protocols.find(p => p.id === id); p.status = "signed"; p.signedAt = Date.now(); cloudLock(id); save(); }, pid);
  await A.w.waitForTimeout(600);
  await startDav();
  await syncNow(A); await syncNow(B); await syncNow(A);
  const vA = await A.w.evaluate(id => { const p = DB.protocols.find(p => p.id === id); const s = p.sections.find(s => s.type === "rooms"); return JSON.stringify(s.rooms[0].values[s.items[0].id] || null) + p.status; }, pid);
  const vB = await B.w.evaluate(id => { const p = DB.protocols.find(p => p.id === id); const s = p.sections.find(s => s.type === "rooms"); return JSON.stringify(s.rooms[0].values[s.items[0].id] || null) + p.status; }, pid);
  ok(vA === vB && !/Tablet offline/.test(vA) && /signed$/.test(vA), "unterschriebener Stand gilt auf beiden Geräten: " + vA);
  ok(await B.w.evaluate(() => SY.state.conflicts.some(c => /unterschrieben/.test(c.reason))), "Tablet meldet abgewiesene Änderung");

  console.log("6) Foto am Tablet → im Cloud-Ordner und am PC");
  fs.writeFileSync(path.join(SCR, "foto.jpg"), Buffer.from("/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=", "base64"));
  const rel = await B.w.evaluate(async () => { const c = DB.cases.find(c => c.title.includes("Nikola")); const rel = await api.writeImage({ dataURL: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=", rel: folderRel(c, c.type, { label: "Übergabeprotokoll" }) + "/Test Fotos" });
    const o = DB.objects[0]; const f = DB.settings.fields.object.find(f => f.type === "file"); o.files[f.id] = [...(o.files[f.id] || []), { n: "foto.jpg", p: rel }]; save(); return rel; });
  await B.w.waitForTimeout(600); await syncNow(B); await syncNow(A);
  ok(fs.existsSync(path.join(root, "dateien", rel)), "Foto im Cloud-Ordner");
  ok(fs.existsSync(path.join(await dataDir(A), "dateien", rel)), "Foto auf dem PC angekommen");

  console.log("7) Löschen synchronisiert (Termin)");
  const tid = await A.w.evaluate(() => { const t = DB.tasks[0]; DB.tasks.shift(); save(); return t.id; });
  await A.w.waitForTimeout(600); await syncNow(A); await syncNow(B);
  ok(!(await B.w.evaluate(id => DB.tasks.some(t => t.id === id), tid)), "gelöschter Termin auch am Tablet weg");

  console.log("8) Neustart: Tablet startet im Cloud-Modus und gleicht ab");
  await B.app.close();
  const B2 = await launch("tablet"); await B2.w.waitForTimeout(2500);
  ok(await B2.w.locator(".ov .utiles").count() === 0, "Mitarbeiterwahl erscheint nur einmal");
  ok(await B2.w.evaluate(() => SY.on && SY.status === "ok"), "nach Neustart synchron");

  // Screenshots Einstellungen + Statusleiste
  await syncNow(A); await A.w.evaluate(() => syDevicesLoad(true)); await A.w.evaluate(() => { SETTAB = "daten"; go("einstellungen"); }); await A.w.waitForTimeout(500);
  await shot(A, "27_modus_cloud");
  await A.w.evaluate(() => go("start")); await shot(A, "28_start_cloud");
  const labels = await A.w.evaluate(() => SY.state.conflicts.map(syFieldLabel));
  ok(labels.length && labels.every(l => !/#[a-z0-9]{6}/.test(l)), "Konfliktprotokoll mit verständlichen Feldnamen: " + labels[0]);

  // Plattenprüfung: Pakete unlesbar
  const pkgs = fs.readdirSync(path.join(root, "sync")).flatMap(d => fs.readdirSync(path.join(root, "sync", d)).map(f => path.join(root, "sync", d, f)));
  ok(pkgs.length > 0 && pkgs.every(f => !fs.readFileSync(f).includes(Buffer.from("Titel vom"))), `${pkgs.length} Änderungspakete, alle verschlüsselt`);

  const errs = [...A.errs, ...B.errs, ...B2.errs];
  ok(errs.length === 0, "keine Fehler in der Oberfläche" + (errs.length ? ": " + errs.slice(0, 3).join(" | ") : ""));
  await A.app.close(); await B2.app.close(); await stopDav();
  console.log(`\n${checks - fails}/${checks} Prüfungen bestanden.`);
  process.exit(fails ? 1 : 0);
})().catch(async e => { console.error("ABBRUCH:", e); try { dav && dav.kill(); } catch (x) {} process.exit(2); });
