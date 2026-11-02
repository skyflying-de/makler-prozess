// End-to-End-Test 2.3: Zeiterfassung büroweit aus-/einschalten, manuelle Stunden, Räume umbenennen, Abgleich auf zweites Gerät.
// Aufruf: xvfb-run -a node test/timetracking.e2e.js <scratch>
const { _electron: electron } = require("playwright");
const fs = require("fs"), path = require("path"), { spawn } = require("child_process");
const APP = path.join(__dirname, ".."), SCR = process.argv[2] || "/tmp/mp-tt", SHOTS = path.join(SCR, "shots");
let fails = 0, checks = 0, dav = null; const ok = (c, m) => { checks++; if (c) console.log("  ✓ " + m); else { fails++; console.log("  ✗ " + m); } };

async function launch(name, demo = true) {
  const HOME = path.join(SCR, "home-" + name); fs.mkdirSync(path.join(HOME, "Documents"), { recursive: true });
  const app = await electron.launch({ executablePath: path.join(APP, "node_modules/electron/dist/electron"), args: ["--no-sandbox", APP], env: { ...process.env, HOME } });
  const w = await app.firstWindow(), errs = []; w.on("pageerror", e => errs.push(e.message)); w.on("dialog", d => d.accept());
  await w.setViewportSize({ width: 1360, height: 860 }); await w.waitForTimeout(900);
  if (demo) {
    await w.click("[data-a=next]"); await w.waitForTimeout(300); await w.click("[data-s=demo]"); await w.click("[data-a=next]"); await w.waitForTimeout(200);
    await w.fill("[name=wn]", "Sandra Lugt"); await w.fill("[name=ws]", "SL"); await w.click("[data-a=next]"); await w.waitForTimeout(1300); await w.keyboard.press("Escape");
  }
  return { app, w, errs };
}
async function waitSync(X) { let q = 0; for (let i = 0; i < 160; i++) { const s = await X.w.evaluate(() => ({ r: SY.running || SY.again, s: SY.status })); if (!s.r && s.s !== "läuft") { if (++q >= 4) return s.s; } else q = 0; await X.w.waitForTimeout(250); } return "timeout"; }
const syncNow = async X => { await waitSync(X); await X.w.evaluate(() => cloudSync("test")); return waitSync(X); };

(async () => {
  fs.rmSync(SCR, { recursive: true, force: true }); fs.mkdirSync(SHOTS, { recursive: true });
  dav = spawn(process.execPath, [path.join(__dirname, "davserver.js"), path.join(SCR, "dav"), "1901"]); await new Promise(r => dav.stdout.on("data", d => /bereit/.test(d) && r()));
  const A = await launch("pc"), w = A.w, shot = n => w.screenshot({ path: path.join(SHOTS, n + ".png") });
  await w.evaluate(async () => { const root = Providers.nextcloudRoot("http://127.0.0.1:1901", "buero"); await api.secretSet("ncPass", "app-pass-123");
    const cloud = { provider: "nextcloud", root, folder: "MaklerProzess", user: "buero", host: "127.0.0.1:1901", web: "" }; const prov = await syProvider(cloud);
    await syCreateOffice(prov, "Buero-Passwort-2026", () => {}); ENV.cfg = { ...ENV.cfg, ...await api.setCfg({ mode: "cloud", cloud, deviceName: "PC Büro" }) }; SY.on = false; await cloudBoot(); });
  ok(await waitSync(A) === "ok", "PC im Cloud-Betrieb");

  console.log("1) Ausgangslage: Zeiterfassung an");
  const before = await w.evaluate(() => ({ tt: TT(), nav: document.querySelector("#nav").innerText, run: DB.entries.filter(e => !e.end).length, n: DB.entries.length }));
  ok(before.tt && /Laufend/.test(before.nav) && /Zeiterfassung/.test(before.nav) && before.run >= 1, `Standard „Ein“ (${before.run} laufende Aktionen, ${before.n} Buchungen)`);

  console.log("2) Ausschalten mit laufenden Aktionen");
  await w.evaluate(() => { SETTAB = "funktionen"; go("einstellungen"); }); await w.waitForTimeout(200); await shot("70_funktionen_ein");
  await w.click("#fn-tt .seg button:has-text('Aus')"); await w.waitForTimeout(200);
  ok(/laufen noch/.test(await w.locator(".ov").innerText()) && await w.locator(".ov .hodiff label").count() === before.run, "Rückfrage listet die laufenden Aktionen"); await shot("71_ausschalten_rueckfrage");
  await w.click(".ov [data-x=c]"); await w.waitForTimeout(150);
  ok(await w.evaluate(() => TT() && DB.entries.filter(e => !e.end).length) === before.run, "Abbrechen ändert nichts");
  await w.click("#fn-tt .seg button:has-text('Aus')"); await w.waitForTimeout(150); await w.click(".ov [data-x=ok]"); await w.waitForTimeout(300); await shot("72_funktionen_aus");
  const off = await w.evaluate(() => ({ tt: TT(), run: DB.entries.filter(e => !e.end).length, n: DB.entries.length, hist: DB.entries.filter(e => e.history.some(h => /Ausschalten/.test(h.text))).length }));
  ok(!off.tt && off.run === 0 && off.hist === before.run && off.n === before.n, "Aktionen gestoppt (mit Vermerk), Buchungen erhalten, Zeiterfassung aus");

  console.log("3) Oberfläche ohne Zeiterfassung");
  const ui = await w.evaluate(() => { go("start"); return { nav: document.querySelector("#nav").innerText, dock: document.querySelector("#dock").innerText, main: document.querySelector("main").innerText }; });
  ok(!/Laufend|Zeiterfassung/.test(ui.nav), "Navigation ohne Laufend und Zeiterfassung");
  ok(!/Aktion erfassen|Alle laufenden|Läuft bei mir/.test(ui.dock), "Leiste oben ohne Zeiterfassung");
  ok(/Offene Übergabeprotokolle/.test(ui.main) && /Letzte Übergaben/.test(ui.main) && !/Meine Zeit|Gerade aktiv|Zuletzt erfasst/.test(ui.main), "Startseite: Übergaben statt Zeiten"); await shot("73_start_aus");
  const fall = await w.evaluate(() => { const c = DB.cases[0]; TAB = "akt"; go("fall", c.id); return { tabs: document.querySelector("main .tabs").innerText, tab: TAB, btn: document.querySelector("main .top").innerText }; });
  ok(!/Aktivitäten/.test(fall.tabs) && fall.tab === "termine" && !/Nachtragen/.test(fall.btn), "Fall ohne Aktivitäten/Nachtragen, öffnet auf Termine");
  const obj = await w.evaluate(() => { go("objekte"); const a = document.querySelector("main").innerText; OTAB = "faelle"; go("objekt", DB.objects[0].id); return { list: a, top: document.querySelector("main .top").innerText, th: document.querySelector("main table") ? document.querySelector("main table").innerText : "" }; });
  ok(!/Aktion\b/.test(obj.list.replace(/Aktionen/g, "")) && !/Aktion starten/.test(obj.top) && !/\bZeit\b/.test(obj.th), "Objekte ohne „Aktion“ und Zeit-Spalte");
  const task = await w.evaluate(() => { const t = DB.tasks.find(x => x.kind === "termin" && x.actionId && !x.done); go("start"); const row = document.querySelector("main").innerText; editTask(t.id); const dlg = document.querySelector(".ov").innerText; document.querySelector(".ov").close(); return { row: /Starten/.test(row), dlg: /Geplante Aktion|Jetzt starten/.test(dlg), keep: !!t.actionId }; });
  ok(!task.row && !task.dlg, "Termine ohne „Starten“ und ohne geplante Aktion");
  const pr = await w.evaluate(() => { const p = DB.protocols[0]; TAB = "proto"; PSEL = p.id; go("fall", p.caseId); return /Zeit starten/.test(document.querySelector("main").innerText); });
  ok(!pr, "Protokoll ohne „Zeit starten“");
  const ausw = await w.evaluate(() => { RTAB = "ma"; go("auswertung"); return { tabs: document.querySelector("main .tabs").innerText, r: RTAB }; });
  ok(!/Zeiten je Mitarbeiter|Aufwand je Aktion/.test(ausw.tabs) && ausw.r === "pipe", "Auswertungen: nur Pipeline und Leistungsnachweise");
  const est = await w.evaluate(() => { SETTAB = "actions"; go("einstellungen"); const t = document.querySelector("main .tabs").innerText; const r = SETTAB; SETTAB = "users"; render(); return { t, r, users: document.querySelector("main table").innerText }; });
  ok(!/Aktionen/.test(est.t) && est.r === "funktionen" && !/Buchungen/.test(est.users), "Einstellungen ohne Reiter Aktionen, Mitarbeiter ohne Buchungen");
  ok(await w.evaluate(() => { startAction(DB.cases[0].id, DB.settings.actions[DB.cases[0].type][0].id); quick(); return DB.entries.filter(e => !e.end).length === 0 && !document.querySelector(".ov"); }), "Start einer Aktion ist gesperrt (auch über Tastatur/Tray)");

  console.log("4) Abrechnung mit manuellen Stunden");
  const bill = await w.evaluate(() => { const c = DB.cases.find(x => x.billing === "hours" || x.billing === "mixed") || DB.cases[0]; c.billing = "hours"; TAB = "abr"; go("fall", c.id); window.__c = c.id;
    return { before: caseBilling(c).total, card: !!document.querySelector(".manual"), act: /Tätigkeitsnachweis/.test(document.querySelector("main").innerText) }; });
  ok(bill.before === 0 && bill.card && !bill.act, "Stunden-Abrechnung ohne gebuchte Zeiten = 0 €, Bereich „Stunden manuell“, kein Tätigkeitsnachweis");
  await w.click(".manual button:has-text('Leistung')"); await w.waitForTimeout(150);
  await w.locator(".manual .mtab input[inputmode=decimal]").first().fill("2,5"); await w.locator(".manual .mtab input[inputmode=decimal]").first().dispatchEvent("change"); await w.waitForTimeout(200);
  const b2 = await w.evaluate(() => { const c = caseBy(__c), b = caseBilling(c), m = c.manual[0]; return { total: b.total, hours: b.hours, exp: 2.5 * svcBy(m.serviceId).rate * (svcBy(m.serviceId).billable ? 1 : 0), doc: buildReportDoc(c) }; });
  ok(Math.abs(b2.hours - 2.5) < 1e-9 && Math.abs(b2.total - b2.exp) < 0.01, `manuelle 2,5 Std. abgerechnet (${b2.total.toFixed(2)} €)`);
  ok(/2,50/.test(b2.doc) && !/Tätigkeitsnachweis/.test(b2.doc), "Leistungsnachweis (Ausdruck) mit manuellen Stunden, ohne Tätigkeitsnachweis"); await shot("74_abrechnung_manuell");

  console.log("5) Windows-Taskleiste");
  const tb = await A.app.evaluate(() => global.__mpTaskbar());
  const title = await A.app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].getTitle());
  ok(!tb.overlay && tb.thumbar.length === 0 && /keine Aktion/.test(tb.tooltip) && !/▶|⏸/.test(title), "keine Zeit im Titel, kein Badge, keine Vorschau-Knöpfe");

  console.log("6) Abgleich: zweites Gerät übernimmt den Schalter");
  ok(await syncNow(A) === "ok", "PC gesendet");
  const B = await launch("pc2", false);
  await B.w.evaluate(async () => { const d = ENV.cfg.defaultData; await api.setup({ dataDir: d }); ENV = await api.load(); document.querySelector(".wiz").remove();
    const root = Providers.nextcloudRoot("http://127.0.0.1:1901", "buero"); await api.secretSet("ncPass", "app-pass-123");
    const cloud = { provider: "nextcloud", root, folder: "MaklerProzess", user: "buero", host: "127.0.0.1:1901", web: "" }; const prov = await syProvider(cloud);
    await syJoinOffice(prov, "Buero-Passwort-2026", () => {}); ENV.cfg = { ...ENV.cfg, ...await api.setCfg({ mode: "cloud", cloud, deviceName: "Laptop" }) }; DB.ui.chosen = 1; SY.on = false; await cloudBoot(); render(); });
  await waitSync(B);
  ok(await B.w.evaluate(() => !TT() && !/Laufend/.test(document.querySelector("#nav").innerText)), "zweites Gerät: Zeiterfassung aus (büroweit)");
  ok(await B.w.evaluate(id => (caseBy(id).manual || []).length === 1, await w.evaluate(() => __c)), "manuelle Stunden auf dem zweiten Gerät");

  console.log("7) Wieder einschalten");
  await w.evaluate(() => { SETTAB = "funktionen"; go("einstellungen"); }); await w.click("#fn-tt .seg button:has-text('Ein')"); await w.waitForTimeout(200);
  const on = await w.evaluate(() => { go("zeiten"); const z = document.querySelector("main").innerText; const c = caseBy(__c); return { tt: TT(), view: VIEW, n: DB.entries.length, z: /Zeiterfassung/.test(z), bill: caseBilling(c).hours, nav: document.querySelector("#nav").innerText }; });
  ok(on.tt && on.view === "zeiten" && on.n === before.n && /Laufend/.test(on.nav), "alle Ansichten und Buchungen wieder da");
  ok(on.bill > 2.5, `gebuchte Zeiten + manuelle Stunden zusammen abgerechnet (${on.bill.toFixed(2)} Std.)`);
  ok(await syncNow(A) === "ok" && await syncNow(B) === "ok" && await B.w.evaluate(() => TT()), "zweites Gerät: wieder an");

  console.log("8) Räume umbenennen (je Objekt)");
  const oid = await w.evaluate(() => { const p = DB.protocols[0]; window.__oid = caseBy(p.caseId).objectId; return __oid; });
  // offenes Protokoll anlegen (leer, Basis keine), dann im Objekt umbenennen
  await w.evaluate(() => { const c = DB.cases.find(x => x.objectId === __oid && x.type === "rent"); const p = makeProtocol(DB.settings, c, "Einzug", DB.ui.user, {}); DB.protocols.push(p); window.__pd = p.id; save(); OTAB = "uebergabe"; go("objekt", __oid); });
  const r0 = await w.evaluate(() => objBy(__oid).handover.rooms.map(r => r.name));
  await w.click(".hosh:has-text('Räume') button"); await w.waitForTimeout(200);
  const idx = r0.findIndex(n => /Schlafzimmer/.test(n)); await w.locator(".ov .hor").nth(idx).locator("input").fill("Arbeitszimmer"); await w.screenshot({ path: path.join(SHOTS, "75_raeume_umbenennen.png") });
  await w.click(".ov [data-x=ok]"); await w.waitForTimeout(250);
  const rn = await w.evaluate(() => ({ obj: objBy(__oid).handover.rooms.map(r => r.name), draft: pById(__pd).sections.find(s => s.type === "rooms").rooms.map(r => r.name), signed: DB.protocols[0].sections.find(s => s.type === "rooms").rooms.map(r => r.name) }));
  ok(rn.obj.includes("Arbeitszimmer") && !rn.obj.includes("Schlafzimmer"), "Raum am Objekt umbenannt");
  ok(rn.draft.includes("Arbeitszimmer") && !rn.draft.includes("Schlafzimmer"), "offenes Protokoll übernimmt den neuen Namen");
  ok(rn.signed.includes("Schlafzimmer"), "unterschriebenes Protokoll bleibt unverändert");
  // im Protokoll umbenennen (Erfassung) → nach Unterschrift Rückfrage „Raum umbenannt“
  await w.evaluate(() => { const p = pById(__pd), k = capPages(p).findIndex(x => x.r && x.r.name === "Küche"); TAB = "proto"; PSEL = p.id; go("fall", p.caseId); openCapture(p.id, k); }); await w.waitForTimeout(250);
  await w.click("#cap .capttl button:has-text('Umbenennen')"); await w.waitForTimeout(150); await w.fill(".ov [name=n]", "Wohnküche"); await w.screenshot({ path: path.join(SHOTS, "76_raum_im_protokoll.png") });
  await w.click(".ov [data-x=ok]"); await w.waitForTimeout(300);
  ok(/Wohnküche/.test(await w.locator("#cap .capttl h2").innerText()) && await w.locator("#cap").count() === 1, "Raum in der Erfassung umbenannt, Erfassung bleibt offen");
  await w.evaluate(() => { closeCap(); const p = pById(__pd); p.status = "ready"; p.signMode = "print"; save(); render(); });
  fs.writeFileSync(path.join(SCR, "scan.pdf"), "%PDF-1.4 x");
  await w.setInputFiles('label:has-text("Unterschriebenes Exemplar hochladen") input[type=file]', path.join(SCR, "scan.pdf")); await w.waitForTimeout(1200);
  const dl = await w.locator(".ov .hodiff").innerText().catch(() => "");
  ok(/Raum umbenannt/.test(dl) && /Küche → Wohnküche/.test(dl) && !/Neuer Raum „Wohnküche“/.test(dl), "nach Unterschrift: „Raum umbenannt Küche → Wohnküche“ (nicht als neu/gelöscht)");
  await w.click(".ov [data-x=ok]"); await w.waitForTimeout(200);
  ok(await w.evaluate(() => objBy(__oid).handover.rooms.some(r => r.name === "Wohnküche") && !objBy(__oid).handover.rooms.some(r => r.name === "Küche")), "neuer Raumname ins Objekt übernommen");

  ok(A.errs.length === 0 && B.errs.length === 0, "keine Skriptfehler" + ([...A.errs, ...B.errs].length ? ": " + [...A.errs, ...B.errs].slice(0, 3).join(" | ") : ""));
  await A.app.close(); await B.app.close(); dav.kill();
  console.log(`\n${checks - fails}/${checks} Prüfungen bestanden`); process.exit(fails ? 1 : 0);
})().catch(e => { console.error("ABBRUCH", e); if (dav) dav.kill(); process.exit(2); });
