// End-to-End-Test Ordner-Modus (v2.5): PC und Tablet teilen einen Ordner, den ein Sync-Dienst (OneDrive / FolderSync) abgleicht.
// Der Sync-Dienst wird hier simuliert: zwei getrennte Ordner, die nur auf Zuruf (mit Verzögerung, halben Dateien, Ausfall) abgeglichen werden.
// Aufruf: xvfb-run -a node test/folder.e2e.js <scratch-ordner>
const { _electron: electron } = require("playwright");
const fs = require("fs"), path = require("path");
const APP = path.join(__dirname, ".."), SCR = process.argv[2] || "/tmp/mp-folder";
const SHOTS = path.join(SCR, "shots"), PW = "Buero-Passwort-2026";
const ODA = path.join(SCR, "pc-OneDrive"), ODB = path.join(SCR, "tablet-FolderSync");
const RA = path.join(ODA, "MaklerProzess"), RB = path.join(ODB, "MaklerProzess");
let fails = 0, checks = 0;
const ok = (c, m) => { checks++; if (c) console.log("  ✓ " + m); else { fails++; console.log("  ✗ " + m); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));

const { walk, makeMirror } = require("./foldersim");
const mirror = makeMirror(RA, RB);

async function launch(name, env = {}) {
  const HOME = path.join(SCR, "home-" + name);
  fs.mkdirSync(path.join(HOME, "Documents"), { recursive: true });
  const e = { ...process.env, HOME, ...env }; delete e.OneDrive; delete e.OneDriveConsumer; delete e.OneDriveCommercial; Object.assign(e, env);
  const app = await electron.launch({ executablePath: path.join(APP, "node_modules/electron/dist/electron"), args: ["--no-sandbox", APP], env: e });
  const w = await app.firstWindow(); const errs = [];
  w.on("pageerror", x => errs.push(x.message)); w.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
  w.on("dialog", d => d.accept());
  await w.setViewportSize({ width: 1360, height: 860 }); await w.waitForTimeout(900);
  return { app, w, errs, HOME, name };
}
// nur für die Bildschirmfotos der Anleitung: Testpfade wie unter Windows anzeigen
const winify = X => X.w.evaluate(([ra, rb]) => { const W = "C:\\Users\\Sandra\\OneDrive\\MaklerProzess"; document.querySelectorAll("input").forEach(i => { if (i.value === ra || i.value === rb) i.value = W; });
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let t; while ((t = tw.nextNode())) { if (t.nodeValue.includes("/MaklerProzess")) t.nodeValue = t.nodeValue.replace(/\/\S*MaklerProzess(-Daten)?/g, (m, d) => d ? "C:\\Users\\Sandra\\Documents\\MaklerProzess-Daten" : W); } }, [RA, RB]);
const shot = async (X, n) => { await X.w.waitForTimeout(300); await X.w.screenshot({ path: path.join(SHOTS, n + ".png") }); };
async function waitSync(X, timeout = 30000) {
  const t0 = Date.now(); await X.w.waitForTimeout(200); let quiet = 0;
  while (Date.now() - t0 < timeout) { const s = await X.w.evaluate(() => ({ r: SY.running || SY.again, s: SY.status })); if (!s.r && s.s !== "läuft") { if (++quiet >= 4) return s.s; } else quiet = 0; await X.w.waitForTimeout(250); }
  return "timeout";
}
const syncNow = async X => { await waitSync(X); await X.w.evaluate(() => cloudSync("test")); return waitSync(X); };
const title = (X, re) => X.w.evaluate(r => { const c = DB.cases.find(c => new RegExp(r).test(c.title)); return c ? c.title : null; }, re);

(async () => {
  fs.rmSync(SCR, { recursive: true, force: true }); fs.mkdirSync(SHOTS, { recursive: true }); fs.mkdirSync(ODA, { recursive: true }); fs.mkdirSync(ODB, { recursive: true });

  console.log("1) PC (Modus Lokal, Beispieldaten) → „Büro im Ordner anlegen“");
  const HANG = path.join(SCR, "nas-haengt");
  const A = await launch("pc", { OneDrive: ODA, MP_TEST_FD_HANG: HANG, MP_FD_TIMEOUT: "2000", MP_FD_PAUSE: "1500" });
  await A.w.click("[data-a=next]"); await A.w.waitForTimeout(300); await A.w.click("[data-s=demo]"); await A.w.click("[data-a=next]"); await A.w.waitForTimeout(200);
  await A.w.fill("[name=wn]", "Sandra Lugt"); await A.w.fill("[name=ws]", "SL"); await A.w.click("[data-a=next]"); await A.w.waitForTimeout(1200);
  await A.w.keyboard.press("Escape");
  fs.writeFileSync(path.join(SCR, "Expose.pdf"), "%PDF-1.4 Expose Testinhalt");
  await A.w.evaluate(() => { OTAB = "daten"; go("objekt", DB.objects[0].id); });
  await A.w.setInputFiles('label:has-text("Datei") >> nth=0 >> input[type=file]', path.join(SCR, "Expose.pdf")); await A.w.waitForTimeout(600);
  await A.w.evaluate(() => { SETTAB = "daten"; go("einstellungen"); }); await A.w.waitForTimeout(400);
  await A.w.click("button:has-text('Cloud-Sync einrichten')"); await A.w.waitForTimeout(300);
  ok(await A.w.locator(".wiz [data-p=folder].sel").count() === 1, "Anbieter „Gemeinsamer Ordner“ vorausgewählt");
  await shot(A, "50_wiz_anbieter_ordner");
  await A.w.click(".wiz [data-a=next]"); await A.w.waitForTimeout(500);
  ok(await A.w.inputValue(".wiz [name=fdroot]") === RA, "OneDrive-Ordner automatisch vorgeschlagen: …/MaklerProzess");
  ok(await A.w.locator(".wiz [data-sug]").count() === 1, "Vorschlagsknopf „OneDrive“ sichtbar");
  ok(/Ordner/.test(await A.w.locator(".wiz .step.cur").innerText()), "Schritt heißt „Ordner“");
  await winify(A); await shot(A, "51_wiz_ordner_pc"); await A.w.fill(".wiz [name=fdroot]", RA);
  await A.w.fill(".wiz [name=fdroot]", path.join(SCR, "gibtsnicht", "tief", "MaklerProzess")); await A.w.click(".wiz [data-a=next]"); await A.w.waitForTimeout(600);
  ok(/nicht erreichbar/i.test(await A.w.locator("#werr").innerText()), "nicht vorhandener Ordner wird abgelehnt");
  await A.w.click(".wiz [data-sug='0']"); await A.w.click(".wiz [data-a=next]"); await A.w.waitForTimeout(600);
  ok(await A.w.locator(".wiz [name=pw]").count() === 1, "Ordner geprüft (Schreibtest) → weiter zum Büro-Passwort");
  await A.w.fill(".wiz [name=pw]", PW); await A.w.fill(".wiz [name=pw2]", PW); await A.w.fill(".wiz [name=dev]", "PC Büro");
  await A.w.click(".wiz [data-a=next]"); await A.w.waitForSelector(".wiz [data-a=done]", { timeout: 60000 });
  ok(/Tablet/.test(await A.w.locator(".wiz .banner").innerText()), "Abschluss nennt den nächsten Schritt am Tablet");
  await shot(A, "52_wiz_fertig"); await A.w.click(".wiz [data-a=done]"); await A.w.waitForTimeout(800);
  ok(fs.existsSync(path.join(RA, "office.json")) && fs.readdirSync(path.join(RA, "snapshot")).length === 1, "office.json + verschlüsselter Snapshot im OneDrive-Ordner");
  const objRel = await A.w.evaluate(() => Object.values(DB.objects[0].files).flat()[0].p);
  ok(fs.existsSync(path.join(RA, "dateien", objRel)), "Dokument lesbar unter dateien/");
  ok(walk(RA).every(r => !/\.tmp$/.test(r)) && fs.readdirSync(RA).every(n => !n.startsWith(".")), "keine Zwischendateien liegen geblieben (atomisches Schreiben)");
  ok(!fs.readFileSync(path.join(RA, "snapshot", fs.readdirSync(path.join(RA, "snapshot"))[0])).includes(Buffer.from("Ahornweg")), "Datenstand verschlüsselt");
  await waitSync(A);
  ok(/An Ordner übergeben/.test(await A.w.locator("#syncpill").innerText()), "Statusanzeige: „An Ordner übergeben · …“");
  await A.w.evaluate(() => { SETTAB = "daten"; go("einstellungen"); }); await A.w.waitForTimeout(300);
  const card = await A.w.locator("#cloudcard").innerText();
  ok(/Gemeinsamer Ordner/.test(card) && /OneDrive, die NAS bzw\. der Sync-Dienst/.test(card) && /Ordner neu wählen/.test(card), "Einstellungen zeigen Ordner, Übertragungs-Hinweis und „Ordner neu wählen“");
  await winify(A); await shot(A, "53_karte_ordner");

  console.log("2) Tablet tritt bei – zuerst bevor OneDrive übertragen hat, dann mit halber Datei, dann vollständig");
  const B = await launch("tablet");
  const joinTry = async () => { await B.w.fill(".wiz [name=fdroot]", RB); await B.w.click(".wiz [data-a=next]"); await B.w.waitForFunction(() => document.querySelector("#werr").innerText.trim() || document.querySelector(".wiz [name=secret]"), null, { timeout: 15000 }); return B.w.locator("#werr").innerText(); };
  await B.w.click("[data-a=join]"); await B.w.waitForTimeout(400);
  await B.w.click(".wiz [data-p=folder]"); await B.w.click(".wiz [data-a=next]"); await B.w.waitForTimeout(400);
  ok(/Kein OneDrive-Ordner/.test(await B.w.locator(".wiz").innerText()), "ohne OneDrive: Hinweis „bitte Ordner wählen“");
  fs.mkdirSync(RB, { recursive: true });
  ok(/noch\) kein Büro|abgeglichen/.test(await joinTry()), "leerer Ordner: verständlicher Hinweis (noch nicht abgeglichen)");
  mirror({ only: /^office\.json$/, truncate: /office\.json/ });
  ok(/nicht vollständig übertragen/.test(await joinTry()), "halb übertragene office.json: „noch nicht vollständig übertragen“");
  mirror({ only: /^office\.json$/ }); mirror({ truncate: /^snapshot\// });
  { const e = await joinTry(); if (e) console.log('    (Fehler: ' + e + ')'); }
  await B.w.fill(".wiz [name=secret]", PW); await B.w.fill(".wiz [name=dev]", "Tablet Übergaben"); await B.w.click(".wiz [data-a=next]"); await B.w.waitForTimeout(1500);
  ok(/nicht vollständig übertragen/.test(await B.w.locator("#werr").innerText()), "halber Snapshot: Beitritt bricht sauber ab (Hinweis warten)");
  await shot(B, "54_beitritt_unvollstaendig");
  mirror();
  await B.w.click(".wiz [data-a=back3]"); await B.w.waitForTimeout(300); await B.w.click(".wiz [data-a=next]");
  await B.w.waitForSelector(".wiz [data-a=done]", { timeout: 60000 }); await B.w.click(".wiz [data-a=done]"); await B.w.waitForTimeout(2500);
  if (await B.w.locator(".ov .utiles [data-u]").count()) { await B.w.click(".ov .utiles [data-u=u2]"); await B.w.waitForTimeout(300); }
  const cnt = X => X.w.evaluate(() => ({ o: DB.objects.length, c: DB.cases.length, e: DB.entries.length, p: DB.protocols.length }));
  const ca = await cnt(A), cb = await cnt(B);
  ok(JSON.stringify(ca) === JSON.stringify(cb), `Tablet hat den Büro-Stand ${JSON.stringify(cb)}`);
  ok(fs.existsSync(path.join(await B.w.evaluate(() => ENV.cfg.dataDir), "dateien", objRel)), "Dokument auf dem Tablet");

  console.log("3) Änderung am PC → erst nach Übertragung durch den Sync-Dienst am Tablet");
  await A.w.evaluate(() => { const c = DB.cases.find(c => c.title.includes("Ahornweg")); c.title = "Ahornweg – Preis vom PC"; save(); });
  await A.w.waitForTimeout(500); await syncNow(A); await syncNow(B);
  ok(!(await title(B, "Preis vom PC")), "vor der Übertragung: Tablet sieht die Änderung noch nicht");
  mirror(); await syncNow(B);
  ok(!!(await title(B, "Preis vom PC")), "nach der Übertragung: Änderung am Tablet");

  console.log("4) Halb übertragene Pakete: Tablet sendet 2 Pakete, das erste kommt nur halb an");
  const devB = await B.w.evaluate(() => SY.state.dev);
  const curBefore = await A.w.evaluate(d => SY.state.cursors[d] || 0, devB);
  await B.w.evaluate(() => { DB.cases.find(c => c.title.includes("Ahornweg")).client = "Paket eins"; save(); }); await B.w.waitForTimeout(400); await syncNow(B);
  await B.w.evaluate(() => { DB.cases.find(c => c.title.includes("Ahornweg")).note = "Paket zwei"; save(); }); await B.w.waitForTimeout(400); await syncNow(B);
  const pk = fs.readdirSync(path.join(RB, "sync", devB)).sort().slice(-2);
  ok(pk.length === 2, "zwei neue Pakete im Tablet-Ordner: " + pk.join(", "));
  mirror({ truncate: new RegExp("sync/" + devB + "/" + pk[0].replace(".", "\\.")) });
  await A.w.evaluate(() => { SY.partial = 0; }); await syncNow(A);
  const st4 = await A.w.evaluate(d => ({ cur: SY.state.cursors[d] || 0, cl: DB.cases.find(c => c.title.includes("Ahornweg")).client, partial: SY.partial, status: SY.status }), devB);
  ok(st4.cur === curBefore && st4.cl !== "Paket eins" && st4.partial >= 1 && st4.status === "ok", `PC überspringt nichts: Stand bleibt bei ${st4.cur}, kein Fehler (${st4.status})`);
  mirror(); await syncNow(A);
  const st5 = await A.w.evaluate(() => { const c = DB.cases.find(c => c.title.includes("Ahornweg")); return c.client + " | " + c.note; });
  ok(st5 === "Paket eins | Paket zwei", "nach vollständiger Übertragung beide Pakete übernommen");

  console.log("4b) Paket kommt vor seinem Vorgänger an, dazwischen vergehen 13 Std. – nichts darf übersprungen werden");
  await waitSync(A);
  const cur0 = await A.w.evaluate(d => SY.state.cursors[d] || 0, devB);
  await B.w.evaluate(() => { DB.cases.find(c => c.title.includes("Ahornweg")).client = "Lücke fünf"; save(); }); await B.w.waitForTimeout(400); await syncNow(B);
  await B.w.evaluate(() => { DB.cases.find(c => c.title.includes("Ahornweg")).note = "Lücke sechs"; save(); }); await B.w.waitForTimeout(400); await syncNow(B);
  const [p5, p6] = fs.readdirSync(path.join(RB, "sync", devB)).sort().slice(-2);
  mirror({ only: new RegExp("sync/" + devB + "/" + p6.replace(".", "\\.")) });
  await syncNow(A);
  ok(await A.w.evaluate(d => SY.state.cursors[d] || 0, devB) === cur0, "Nachfolger allein wird nicht übernommen (Stand bleibt)");
  await A.w.evaluate(() => { const real = Date.now; window.__realNow = real; Date.now = () => real() + 13 * 3600e3; });
  await syncNow(A);
  ok(await A.w.evaluate(d => SY.state.cursors[d] || 0, devB) === cur0, "auch nach 13 Std. kein stilles Überspringen");
  await A.w.evaluate(() => { Date.now = window.__realNow; });
  mirror(); await syncNow(A);
  const g4 = await A.w.evaluate(() => { const c = DB.cases.find(c => c.title.includes("Ahornweg")); return c.client + " | " + c.note; });
  ok(g4 === "Lücke fünf | Lücke sechs", "Vorgänger trifft ein → beide Pakete in richtiger Reihenfolge übernommen");

  console.log("4c) Selbstheilung: eigenes Paket im Ordner beschädigt (Stromausfall / Sync-App)");
  const own = path.join(RB, "sync", devB, p6), good = fs.readFileSync(own);
  fs.writeFileSync(own, good.subarray(0, 10));
  await syncNow(B);
  ok(fs.readFileSync(own).equals(good), "Tablet legt das beschädigte eigene Paket beim nächsten Abgleich neu ab");

  console.log("5) Ordner-Beobachtung: PC übernimmt neue Dateien ohne Knopfdruck");
  await waitSync(A);
  await B.w.evaluate(() => { DB.cases.find(c => c.title.includes("Ahornweg")).title = "Ahornweg – vom Tablet (Beobachtung)"; save(); }); await B.w.waitForTimeout(400); await syncNow(B);
  mirror(); let seen = false;
  for (let i = 0; i < 24 && !seen; i++) { await sleep(500); seen = !!(await title(A, "Beobachtung")); }
  ok(seen, "PC hat die Änderung innerhalb weniger Sekunden selbst geladen");

  console.log("6) Ordner nicht erreichbar (Laufwerk weg / OneDrive pausiert & Ordner verschoben)");
  await waitSync(A);
  fs.renameSync(ODA, ODA + "-weg");
  await A.w.evaluate(() => { DB.cases.find(c => c.title.includes("Ahornweg")).client = "offline am PC"; save(); }); await A.w.waitForTimeout(400);
  const s6 = await syncNow(A);
  ok(s6 === "offline", "Status „offline“ statt Fehler");
  ok(/Ordner nicht erreichbar/.test(await A.w.locator("#syncpill").innerText()), "Anzeige „Ordner nicht erreichbar“");
  ok(await A.w.evaluate(() => DB.cases.find(c => c.title.includes("Ahornweg")).client) === "offline am PC" && await A.w.evaluate(() => SY.state.outbox.length) > 0, "lokal weitergearbeitet, Änderung wartet");
  await shot(A, "55_ordner_offline");
  fs.renameSync(ODA + "-weg", ODA); await sleep(1700); // nach Ausfall wird der Ordner kurz nicht angefasst (im Betrieb 30 Sek.)
  const s7 = await syncNow(A);
  ok(s7 === "ok" && await A.w.evaluate(() => SY.state.outbox.length) === 0, "Ordner wieder da → Änderung abgelegt");
  mirror(); await syncNow(B);
  ok(await B.w.evaluate(() => DB.cases.find(c => c.title.includes("Ahornweg")).client) === "offline am PC", "… und am Tablet angekommen");

  console.log("6b) Büro-NAS: Laptop unterwegs – Netzlaufwerk antwortet nicht (hängt), App darf nicht einfrieren");
  await waitSync(A); fs.writeFileSync(HANG, "1");
  await A.w.evaluate(() => { DB.cases.find(c => c.title.includes("Ahornweg")).client = "unterwegs erfasst"; save(); });
  const t0 = Date.now(); await A.w.evaluate(() => { cloudSync("test"); });
  await sleep(300);
  const lat = await A.w.evaluate(async () => { const t = performance.now(); await api.deviceInfo(); await flush(); return performance.now() - t; });
  ok(lat < 800, `App bleibt bedienbar, Speichern läuft weiter (${Math.round(lat)} ms)`);
  const s8 = await waitSync(A); const dur = Date.now() - t0;
  ok(s8 === "offline" && dur < 8000, `nach Zeitgrenze „Ordner nicht erreichbar“ (${(dur / 1000).toFixed(1)} s statt Hängen)`);
  const t1 = Date.now(); await A.w.evaluate(() => cloudSync("test")); const s9 = await waitSync(A);
  ok(s9 === "offline" && Date.now() - t1 < 2500, "weitere Versuche fassen den Ordner kurz nicht an (kein Stau)");
  await shot(A, "56_nas_unterwegs");
  fs.unlinkSync(HANG); await sleep(1700);
  ok(await syncNow(A) === "ok" && await A.w.evaluate(() => SY.state.outbox.length) === 0, "zurück im Büronetz → Änderung abgelegt");
  mirror(); await syncNow(B);
  ok(await B.w.evaluate(() => DB.cases.find(c => c.title.includes("Ahornweg")).client) === "unterwegs erfasst", "… und am anderen Gerät angekommen");

  console.log("7) Sicherheit & Konfliktfreiheit");
  const esc1 = await A.w.evaluate(r => api.fd({ op: "read", root: r, rel: "../../home-pc/x" }).then(() => "gelesen", e => e.message), RA);
  ok(/außerhalb/.test(esc1), "Pfad außerhalb des Ordners wird abgewiesen (Hauptprozess)");
  const esc2 = await A.w.evaluate(r => PV.folder({ root: r }, o => api.fd(o)).get("sync/../../x").then(() => "gelesen", e => e.message), RA);
  ok(/Ungültiger Pfad/.test(esc2), "„..“ wird schon in der App abgewiesen");
  const devA = await A.w.evaluate(() => SY.state.dev);
  ok(fs.readdirSync(path.join(RA, "sync")).sort().join() === [devA, devB].sort().join(), "je Gerät ein eigener Paket-Ordner – niemand überschreibt fremde Dateien");
  ok(walk(RA).every(r => !/\(\d\)|Konflikt|conflict/i.test(r)), "keine Konflikt-Kopien");

  ok(A.errs.length === 0, "PC ohne Konsolenfehler" + (A.errs.length ? ": " + A.errs.slice(0, 3).join(" | ") : ""));
  ok(B.errs.length === 0, "Tablet ohne Konsolenfehler" + (B.errs.length ? ": " + B.errs.slice(0, 3).join(" | ") : ""));
  await A.app.close(); await B.app.close();
  console.log(`\n${checks - fails}/${checks} Prüfungen bestanden`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error("ABBRUCH", e); process.exit(2); });
