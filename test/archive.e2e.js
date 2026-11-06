// End-to-End-Test 2.6: Fälle/Objekte archivieren, zurückholen, endgültig löschen; Tablet blendet aus; Mischbetrieb mit 2.5.1.
// Aufruf: node tools/build-web.js --test && xvfb-run -a node test/archive.e2e.js <scratch> [<pfad-zu-2.5.1-app>]
const { _electron: electron, chromium } = require("playwright");
const fs = require("fs"), path = require("path"), { spawn } = require("child_process");
const APP = path.join(__dirname, ".."), SCR = process.argv[2] || "/tmp/mp-archive", OLD = process.argv[3] || "";
const SHOTS = path.join(SCR, "shots"), PW = "Buero-Passwort-2026", ROOT = path.join(SCR, "nas", "MaklerProzess");
const UA = "Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
let fails = 0, checks = 0; const procs = [];
const ok = (c, m) => { checks++; if (c) console.log("  ✓ " + m); else { fails++; console.log("  ✗ " + m); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function launch(name, app = APP) {
  const HOME = path.join(SCR, "home-" + name); fs.mkdirSync(path.join(HOME, "Documents"), { recursive: true });
  const a = await electron.launch({ executablePath: path.join(APP, "node_modules/electron/dist/electron"), args: ["--no-sandbox", app], env: { ...process.env, HOME } });
  const w = await a.firstWindow(), errs = []; w.on("pageerror", e => errs.push(e.message)); w.on("console", m => { if (m.type() === "error") errs.push(m.text()); }); w.on("dialog", d => d.accept());
  await w.setViewportSize({ width: 1366, height: 820 }); await w.waitForTimeout(900);
  return { app: a, w, errs, HOME };
}
async function demo(X) {
  await X.w.click("[data-a=next]"); await X.w.waitForTimeout(300); await X.w.click("[data-s=demo]"); await X.w.click("[data-a=next]"); await X.w.waitForTimeout(200);
  await X.w.fill("[name=wn]", "Sandra Lugt"); await X.w.fill("[name=ws]", "SL"); await X.w.click("[data-a=next]"); await X.w.waitForTimeout(1200); await X.w.keyboard.press("Escape");
}
async function waitSync(X, t = 30000) { const t0 = Date.now(); let q = 0; while (Date.now() - t0 < t) { const s = await X.w.evaluate(() => ({ r: SY.running || SY.again, s: SY.status })); if (!s.r && s.s !== "läuft") { if (++q >= 4) return s.s; } else q = 0; await X.w.waitForTimeout(250); } return "timeout"; }
const syncNow = async X => { await waitSync(X); await X.w.evaluate(() => cloudSync("test")); return waitSync(X); };
// Bildschirmfotos für die Anleitung: Testpfade wie unter Windows anzeigen
const shot = async (X, n) => {
  await X.w.evaluate(() => { const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let t; while ((t = tw.nextNode())) if (/\/(tmp|home)\//.test(t.nodeValue)) t.nodeValue = t.nodeValue.replace(/\/\S*?MaklerProzess-Daten/g, "C:\\Users\\Sandra\\Documents\\MaklerProzess-Daten").replace(/\//g, "\\"); });
  await X.w.screenshot({ path: path.join(SHOTS, n + ".png") });
};
const mainText = X => X.w.locator("main").innerText();

(async () => {
  fs.rmSync(SCR, { recursive: true, force: true }); fs.mkdirSync(SHOTS, { recursive: true }); fs.mkdirSync(ROOT, { recursive: true });

  console.log("1) Vorbereitung: Demo-Büro am PC (Admin)");
  const A = await launch("pc"); await demo(A);
  // Fall mit Dokument, Protokoll und Zeiten wählen; offene Termine merken
  const C = await A.w.evaluate(() => { const c = DB.protocols.length ? caseBy(DB.protocols[0].caseId) : DB.cases[0]; return { id: c.id, no: c.no, title: c.title, oid: c.objectId }; });
  const counts = () => A.w.evaluate(id => ({ e: DB.entries.filter(e => e.caseId === id).length, t: DB.tasks.filter(t => t.caseId === id).length, p: DB.protocols.filter(p => p.caseId === id).length, c: DB.cases.length, o: DB.objects.length }), C.id);
  fs.writeFileSync(path.join(SCR, "Grundriss.pdf"), "%PDF-1.4 Grundriss");
  await A.w.evaluate(oid => { OTAB = "daten"; go("objekt", oid); }, C.oid);
  await A.w.setInputFiles('main label:has-text("Datei") >> nth=0 >> input[type=file]', path.join(SCR, "Grundriss.pdf")); await A.w.waitForTimeout(600);
  const objFile = await A.w.evaluate(oid => SC.fileRefs({ objects: [objBy(oid)] })[0], C.oid);
  ok(!!objFile, "Dokument am Objekt abgelegt: " + objFile);
  const before = await counts();
  ok(before.p > 0, `Testfall ${C.no} „${C.title}“ (${before.e} Zeiten, ${before.t} Termine, ${before.p} Protokolle)`);

  console.log("2) Archivieren gesperrt, solange etwas offen ist");
  await A.w.evaluate(id => { DB.tasks.push({ id: "t-open-test", caseId: id, type: "wv", title: "Rückruf Eigentümer", due: Date.now() + 864e5, done: false, userId: DB.ui.user }); save(); TAB = "daten"; go("fall", id); }, C.id);
  await A.w.click("main .top button:has-text('Archivieren')"); await A.w.waitForTimeout(300);
  ok(/Archivieren nicht möglich/.test(await A.w.locator(".ov").innerText()) && /Rückruf Eigentümer/.test(await A.w.locator(".ov").innerText()) && await A.w.locator(".ov [data-x=ok]").count() === 0, "offene Wiedervorlage wird gezeigt, kein Archivieren-Knopf");
  await shot(A, "70_archiv_gesperrt"); await A.w.click(".ov [data-x=c]");
  await A.w.evaluate(id => { DB.tasks.forEach(t => { if (t.caseId === id) t.done = true; }); DB.entries.forEach(e => { if (e.caseId === id && !e.end) e.end = Date.now(); }); save(); render(); }, C.id);

  console.log("3) Fall archivieren (mit Objekt)");
  const othersOnObj = await A.w.evaluate(c => DB.cases.filter(x => x.objectId === c.oid && x.id !== c.id).length, C);
  if (othersOnObj) await A.w.evaluate(c => { DB.cases.filter(x => x.objectId === c.oid && x.id !== c.id).forEach(x => { x.objectId = DB.objects.find(o => o.id !== c.oid).id; }); save(); render(); }, C);
  await A.w.click("main .top button:has-text('Archivieren')"); await A.w.waitForTimeout(300);
  const dlg = await A.w.locator(".ov").innerText();
  ok(/Fall archivieren\?/.test(dlg) && /mit archivieren/.test(dlg) && /Löschen erlaubt ab/.test(dlg), "Dialog: Umfang, Objekt-Option, Löschfrist");
  await shot(A, "71_archiv_dialog");
  await A.w.click(".ov [data-x=ok]"); await A.w.waitForTimeout(500);
  const arc = await A.w.evaluate(c => ({ c: !!caseBy(c.id).archived, o: !!objBy(c.oid).archived, n: DB.cases.length }), C);
  ok(arc.c && arc.o && arc.n === before.c, "Fall und Objekt archiviert, nichts gelöscht");
  ok(!(await mainText(A)).includes(C.no), "Fälle (Phasen-Ansicht): Fall nicht mehr sichtbar");
  await A.w.evaluate(() => { MODE = "list"; render(); }); ok(!(await mainText(A)).includes(C.no), "Fälle (Liste): nicht sichtbar");
  await A.w.evaluate(() => go("start")); ok(!(await mainText(A)).includes(C.title), "Start: nicht sichtbar");
  await A.w.evaluate(() => go("kalender")); ok(!(await mainText(A)).includes("Rückruf Eigentümer"), "Kalender: Termine des Falls ausgeblendet");
  await A.w.evaluate(() => { OARCH = false; go("objekte"); }); const objNo = await A.w.evaluate(id => objBy(id).no, C.oid);
  ok(!(await mainText(A)).includes(objNo), "Objekte: archiviertes Objekt ausgeblendet");
  await A.w.evaluate(() => { OARCH = true; render(); }); ok((await mainText(A)).includes(objNo) && /archiviert/.test(await mainText(A)), "Objekte → Archiv: sichtbar mit Kennzeichnung");
  await A.w.evaluate(() => { OARCH = false; RTAB = "fall"; DB.ui.repArch = false; go("auswertung"); });
  ok(!(await mainText(A)).includes(C.no), "Auswertung: standardmäßig ohne Archiv");
  await A.w.click("main .archk input"); await A.w.waitForTimeout(300);
  ok((await mainText(A)).includes(C.no), "Auswertung „inkl. Archiv“: Fall wieder enthalten");
  await A.w.evaluate(() => { DB.ui.repArch = false; save(); });
  const disk = JSON.parse(fs.readFileSync(path.join(await A.w.evaluate(() => ENV.cfg.dataDir), "daten.json"), "utf8"));
  ok(disk.cases.length === before.c && disk.cases.find(c => c.id === C.id).archived && disk.entries.filter(e => e.caseId === C.id).length === before.e, "gespeicherte Datei vollständig (Ausblenden ändert keine Daten)");

  console.log("4) Archiv-Ansicht und Nur-Lesen");
  await A.w.evaluate(() => { FARCH = true; MODE = "board"; go("faelle"); });
  const at = await mainText(A);
  ok(at.includes(C.no) && /archiviert/.test(at) && /nur lesen/.test(at), "Fälle → Archiv: Liste mit Kennzeichnung und Hinweis");
  await shot(A, "72_faelle_archiv");
  await A.w.click(`main tr:has-text("${C.no}")`); await A.w.waitForTimeout(400);
  ok(/Archiviert am/.test(await mainText(A)) && /Löschen erlaubt ab/.test(await mainText(A)), "Fall: Hinweis mit Datum und Löschfrist");
  for (const tab of ["daten", "proto", "termine"]) {
    await A.w.evaluate(t => { TAB = t; render(); }, tab);
    const en = await A.w.evaluate(() => [...document.querySelectorAll("main input,main select,main textarea,main button")].filter(e => !e.disabled && !e.closest(".tabs") && !e.hasAttribute("data-arok") && !/go\(|TAB=|PSEL=|print|open/.test(e.getAttribute("onclick") || "")).map(e => (e.innerText || e.name || e.tagName).trim().slice(0, 30)));
    ok(en.length === 0, `Reiter „${tab}“: keine Eingabe möglich${en.length ? " – offen: " + en.join(", ") : ""}`);
  }
  await A.w.evaluate(() => { TAB = "daten"; render(); }); await shot(A, "73_fall_archiviert");
  ok(await A.w.locator("main .top button:has-text('Zurückholen')").count() === 1 && await A.w.locator("main .top button:has-text('Endgültig löschen')").count() === 1, "Admin: „Zurückholen“ und „Endgültig löschen …“");
  await A.w.evaluate(() => { DB.ui.user = "u2"; render(); });
  ok(await A.w.locator("main .top button:has-text('Zurückholen'), main .top button:has-text('Endgültig')").count() === 0, "Mitarbeiter ohne Admin-Recht: keine Archiv-/Löschknöpfe");
  await A.w.evaluate(id => { go("fall", DB.cases.find(c => !c.archived).id); }); ok(await A.w.locator("main .top button:has-text('Archivieren')").count() === 0, "… und kein „Archivieren“");
  await A.w.evaluate(id => { DB.ui.user = "u1"; go("fall", id); }, C.id);

  console.log("5) Zurückholen");
  await A.w.click("main .top button:has-text('Zurückholen')"); await A.w.waitForTimeout(400);
  const back = await A.w.evaluate(c => ({ c: !!caseBy(c.id).archived, o: !!objBy(c.oid).archived }), C);
  ok(!back.c && !back.o, "Fall und Objekt wieder aktiv");
  await A.w.evaluate(() => { FARCH = false; MODE = "list"; go("faelle"); }); ok((await mainText(A)).includes(C.no), "wieder in der Fallliste");

  console.log("6) Aufbewahrung einstellen");
  await A.w.evaluate(() => { SETTAB = "daten"; go("einstellungen"); });
  ok(await A.w.locator("#arcard").count() === 1 && /10 Jahre/.test(await A.w.locator("#arcard").innerText()), "Einstellungen → Daten: Karte „Archiv & Aufbewahrung“ (Standard 10 Jahre)");
  await A.w.click("#arcard button:has-text('6 Jahre')"); await A.w.waitForTimeout(200);
  ok(await A.w.evaluate(() => DB.settings.retention.years) === 6, "auf 6 Jahre umgestellt");
  await A.w.evaluate(id => { const c = caseBy(id); c.closed = new Date(2017, 5, 1).getTime(); c.archived = { at: Date.now(), by: "u1", name: "Andrea Huber" }; save(); SETTAB = "daten"; render(); }, C.id);
  ok(/Löschen fällig/.test(await A.w.locator("#arcard").innerText()) && (await A.w.locator("#arcard").innerText()).includes(C.no), "Abschluss 2017 + 6 Jahre → in „Löschen fällig“");
  await shot(A, "74_einst_archiv");
  await A.w.evaluate(id => { const c = caseBy(id); c.closed = Date.now(); delete c.archived; DB.settings.retention = { years: 10 }; save(); render(); }, C.id);

  console.log("7) Mischbetrieb: PC 2.6.0 ⇄ zweites Gerät 2.5.1 über gemeinsamen Ordner");
  await A.w.evaluate(async r => { const cloud = { provider: "folder", root: r, label: r }, prov = await syProvider(cloud); await prov.test(); await syCreateOffice(prov, "Buero-Passwort-2026", () => {}); ENV.cfg = { ...ENV.cfg, ...await api.setCfg({ mode: "cloud", cloud, deviceName: "PC 2.6" }) }; SY.on = false; await cloudBoot(); }, ROOT);
  ok(await waitSync(A) === "ok", "PC 2.6 im Ordner-Modus");
  let B = null;
  if (OLD && fs.existsSync(OLD)) {
    B = await launch("alt", OLD);
    const vB = await B.w.evaluate(() => ENV.version);
    await B.w.click("[data-a=join]"); await B.w.waitForTimeout(300); await B.w.click(".wiz [data-p=folder]"); await B.w.click(".wiz [data-a=next]"); await B.w.waitForTimeout(300);
    await B.w.fill(".wiz [name=fdroot]", ROOT); await B.w.click(".wiz [data-a=next]"); await B.w.waitForSelector(".wiz [name=secret]", { timeout: 15000 });
    await B.w.fill(".wiz [name=secret]", PW); await B.w.fill(".wiz [name=dev]", "Tablet alt"); await B.w.click(".wiz [data-a=next]");
    await B.w.waitForSelector(".wiz [data-a=done]", { timeout: 60000 }); await B.w.click(".wiz [data-a=done]"); await B.w.waitForTimeout(1500);
    if (await B.w.locator(".ov .utiles [data-u]").count()) { await B.w.click(".ov .utiles [data-u=u1]"); await B.w.waitForTimeout(300); }
    ok(vB === "2.5.1", `zweites Gerät läuft mit Version ${vB}`);
    await A.w.evaluate(id => { caseBy(id).archived = { at: Date.now(), by: "u1", name: "Andrea Huber" }; save(); }, C.id); await A.w.waitForTimeout(400);
    await syncNow(A); await syncNow(B);
    const bv = await B.w.evaluate(id => { const c = DB.cases.find(c => c.id === id); return { has: !!c, arch: !!(c && c.archived) }; }, C.id);
    ok(bv.has && bv.arch, "2.5.1 behält die Archiv-Markierung beim Abgleich (Fall dort weiter sichtbar)");
    await B.w.evaluate(id => { DB.cases.find(c => c.id === id).client = "Änderung vom alten Gerät"; save(); }, C.id); await B.w.waitForTimeout(400);
    await syncNow(B); await syncNow(A);
    const av = await A.w.evaluate(id => { const c = caseBy(id); return { cl: c.client, arch: !!c.archived }; }, C.id);
    ok(av.cl === "Änderung vom alten Gerät" && av.arch, "Änderung vom 2.5.1-Gerät kommt an, Fall bleibt archiviert");
    // 2.5.1 bucht offline noch eine Zeit auf den Fall, während der PC ihn löscht
    await B.w.evaluate(id => { DB.entries.push({ id: "e-alt-nach", caseId: id, userId: "u1", start: Date.now() - 36e5, end: Date.now(), pauses: [], note: "nachgereicht" }); }, C.id);
    B.syncHeld = true;
  } else console.log("  (kein 2.5.1-Pfad angegeben – Mischbetrieb übersprungen)");

  console.log("8) Endgültig löschen (Admin, mit Bestätigung)");
  await A.w.evaluate(id => { const c = caseBy(id); c.archived = c.archived || { at: Date.now(), by: "u1", name: "Andrea Huber" }; save(); go("fall", id); }, C.id);
  const refs = await A.w.evaluate(id => SC.fileRefs({ cases: [caseBy(id)], protocols: DB.protocols.filter(p => p.caseId === id), entries: [], tasks: [] }), C.id);
  const dataDir = await A.w.evaluate(() => ENV.cfg.dataDir);
  await A.w.click("main .top button:has-text('Endgültig löschen')"); await A.w.waitForTimeout(300);
  ok(/Aufbewahrungsfrist läuft noch/.test(await A.w.locator(".ov").innerText()), "vor Fristende: Warnung + Begründung nötig");
  await shot(A, "75_loeschen_dialog");
  await A.w.fill(".ov [name=no]", "falsch"); await A.w.click(".ov [data-x=ok]"); await A.w.waitForTimeout(200);
  ok(/genau/.test(await A.w.locator(".ov .err").innerText()), "falsche Nummer → abgelehnt");
  await A.w.fill(".ov [name=no]", C.no); await A.w.click(".ov [data-x=ok]"); await A.w.waitForTimeout(200);
  ok(/Begründung/.test(await A.w.locator(".ov .err").innerText()), "ohne Begründung → abgelehnt");
  await A.w.fill(".ov [name=why]", "Testlöschung"); await A.w.click(".ov [data-x=ok]"); await A.w.waitForTimeout(800);
  const after = await counts();
  ok(after.c === before.c - 1 && after.e === 0 && after.t === 0 && after.p === 0, "Fall mit Zeiten, Terminen, Protokollen gelöscht");
  const log = await A.w.evaluate(() => DB.settings.deleted.slice(-1)[0]);
  ok(log && log.no === C.no && log.early && log.reason === "Testlöschung" && !("title" in log), "Löschprotokoll: Nummer, Person, Begründung – ohne Inhalte");
  ok(refs.length === 0 || refs.every(r => !fs.existsSync(path.join(dataDir, "dateien", r))), `zugehörige Dateien entfernt (${refs.length})`);
  // Objekt endgültig löschen
  await A.w.evaluate(oid => { const o = objBy(oid); o.archived = o.archived || { at: Date.now(), by: "u1", name: "Andrea Huber" }; save(); go("objekt", oid); }, C.oid);
  ok(await A.w.locator("main .top button:has-text('Endgültig löschen')").count() === 1, "Objekt ohne Fälle: „Endgültig löschen“ verfügbar");
  await A.w.click("main .top button:has-text('Endgültig löschen')"); await A.w.waitForTimeout(200);
  await A.w.fill(".ov [name=no]", objNo); await A.w.click(".ov [data-x=ok]"); await A.w.waitForTimeout(600);
  ok(await A.w.evaluate(oid => !DB.objects.some(o => o.id === oid), C.oid), "Objekt gelöscht");
  ok(!fs.existsSync(path.join(dataDir, "dateien", objFile)), "Dokument des Objekts lokal gelöscht");
  await syncNow(A); ok(!fs.existsSync(path.join(ROOT, "dateien", objFile)), "… und im gemeinsamen Ordner entfernt");

  if (B) {
    console.log("9) Löschung erreicht das 2.5.1-Gerät; nachgereichte Zeit wird aufgeräumt");
    await syncNow(A); await syncNow(B); await syncNow(A); await A.w.evaluate(() => render()); await sleep(600); await syncNow(A); await syncNow(B);
    const bs = await B.w.evaluate(c => ({ cs: DB.cases.some(x => x.id === c.id), os: DB.objects.some(o => o.id === c.oid), e: DB.entries.filter(e => e.caseId === c.id).length }), C);
    ok(!bs.cs && !bs.os, "2.5.1: Fall und Objekt verschwunden");
    ok(bs.e === 0 && await A.w.evaluate(id => DB.entries.filter(e => e.caseId === id).length, C.id) === 0, "nachgereichte Zeitbuchung vom alten Gerät auf beiden Geräten entfernt");
    ok(B.errs.length === 0, "2.5.1 ohne Skriptfehler" + (B.errs.length ? ": " + B.errs.slice(0, 2).join(" | ") : ""));
    await B.app.close();
  }

  console.log("10) Tablet 2.6 blendet Archiviertes komplett aus");
  const st = spawn(process.execPath, [path.join(__dirname, "static.js"), path.join(APP, "www"), "1903"]); procs.push(st); await new Promise(r => st.stdout.on("data", r));
  const br = await chromium.launch(), ctx = await br.newContext({ viewport: { width: 1280, height: 800 }, hasTouch: true, userAgent: UA, serviceWorkers: "block" });
  const T = { w: await ctx.newPage(), errs: [] }; T.w.on("pageerror", e => T.errs.push(e.message)); T.w.on("dialog", d => d.accept());
  await T.w.goto("http://127.0.0.1:1903/"); await T.w.waitForTimeout(700); await T.w.click("[data-a=demo]"); await T.w.waitForTimeout(1200); await T.w.click(".login [data-u]");
  for (let r = 0; r < 2; r++) { for (const k of "1234") await T.w.click(`.login [data-k="${k}"]`); await T.w.click('.login [data-k="OK"]'); } await T.w.waitForTimeout(500);
  const tc = await T.w.evaluate(() => { const c = DB.cases.find(c => DB.protocols.some(p => p.caseId === c.id)) || DB.cases[0]; c.archived = { at: Date.now(), by: "u1", name: "X" }; save(); return { id: c.id, no: c.no, title: c.title, oid: c.objectId }; });
  let seen = [];
  for (const v of ["start", "faelle", "objekte", "kalender", "laufend"]) { await T.w.evaluate(x => go(x), v); if ((await T.w.locator("main").innerText()).includes(tc.no)) seen.push(v); }
  ok(seen.length === 0, "Tablet: Fall in keiner Ansicht" + (seen.length ? " – sichtbar in " + seen.join(", ") : ""));
  ok(await T.w.locator("#arseg, #aroseg, .archk").count() === 0, "Tablet: kein Archiv-Filter, keine Archiv-Knöpfe");
  await T.w.evaluate(id => go("fall", id), tc.id); ok(!(await T.w.locator("main").innerText()).includes(tc.title + "\n"), "Tablet: direkter Aufruf zeigt den Fall nicht");
  ok(await T.w.evaluate(id => { const s = JSON.parse(JSON.stringify(DB)); return s.cases.some(c => c.id === id); }, tc.id), "Tablet: Daten bleiben gespeichert");
  await T.w.evaluate(() => go("faelle")); await T.w.screenshot({ path: path.join(SHOTS, "76_tablet_ausgeblendet.png") });
  ok(T.errs.length === 0, "Tablet ohne Skriptfehler" + (T.errs.length ? ": " + T.errs.join(" | ") : ""));
  await br.close();

  ok(A.errs.length === 0, "PC ohne Konsolenfehler" + (A.errs.length ? ": " + A.errs.slice(0, 3).join(" | ") : ""));
  await A.app.close(); procs.forEach(p => p.kill());
  console.log(`\n${checks - fails}/${checks} Prüfungen bestanden`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error("ABBRUCH", e); procs.forEach(p => p.kill()); process.exit(2); });
