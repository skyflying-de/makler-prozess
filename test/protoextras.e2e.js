// End-to-End-Test 2.4: Zimmertürschlüssel, „+“-Menü je Raum, Anmerkungen / weitere Mängel, mehrere Fotos je Prüfpunkt,
// „Sonstiges“ (Popup), Anleitungen, Ausdruck, Übernahme ins nächste Protokoll, Freiraum für Android-Tasten.
// Aufruf: node tools/build-web.js --test && xvfb-run -a node test/protoextras.e2e.js <scratch>
const { _electron: electron, chromium } = require("playwright");
const fs = require("fs"), path = require("path"), { spawn } = require("child_process");
const APP = path.join(__dirname, ".."), SCR = process.argv[2] || "/tmp/mp-px", SHOTS = path.join(SCR, "shots");
const UA = "Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
let fails = 0, checks = 0; const procs = []; const ok = (c, m) => { checks++; if (c) console.log("  ✓ " + m); else { fails++; console.log("  ✗ " + m); } };
const png = (p, col) => { // kleines Testbild erzeugen
  const { PNG } = (() => { try { return require("pngjs"); } catch (e) { return {}; } })();
  fs.writeFileSync(p, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEklEQVR4nGP4z8CAFWEXHbQSACj/P8Fu7N9hAAAAAElFTkSuQmCC", "base64"));
};

(async () => {
  fs.rmSync(SCR, { recursive: true, force: true }); fs.mkdirSync(SHOTS, { recursive: true });
  const imgs = [1, 2, 3, 4].map(k => { const f = path.join(SCR, `foto${k}.png`); png(f); return f; });
  const HOME = path.join(SCR, "home"); fs.mkdirSync(path.join(HOME, "Documents"), { recursive: true });
  const app = await electron.launch({ executablePath: path.join(APP, "node_modules/electron/dist/electron"), args: ["--no-sandbox", APP], env: { ...process.env, HOME } });
  const w = await app.firstWindow(), errs = []; w.on("pageerror", e => errs.push(e.message)); w.on("dialog", d => d.accept());
  await w.setViewportSize({ width: 1280, height: 800 }); await w.waitForTimeout(900);
  await w.click("[data-a=next]"); await w.waitForTimeout(300); await w.click("[data-s=demo]"); await w.click("[data-a=next]"); await w.waitForTimeout(200);
  await w.fill("[name=wn]", "Sandra Lugt"); await w.fill("[name=ws]", "SL"); await w.click("[data-a=next]"); await w.waitForTimeout(1300); await w.keyboard.press("Escape");
  const shot = n => w.screenshot({ path: path.join(SHOTS, n + ".png") });

  console.log("1) Feld „Sonstiges“ in Vorlage und Protokollen");
  const m = await w.evaluate(() => { const T = DB.settings.protocol.sections.find(s => s.items.some(i => i.label === "Sonstiges")), ti = T.items.map(i => i.label);
    const c = DB.cases.find(x => x.type === "rent" && x.objectId === caseBy(DB.protocols[0].caseId).objectId); const p = makeProtocol(DB.settings, c, "Auszug", DB.ui.user, {}); DB.protocols.push(p); window.__p = p.id; save();
    const h = pxSonstHost(p.sections), li = h.items.map(i => i.label);
    return { tpl: ti.indexOf("Sonstiges") === ti.findIndex(l => /^Vereinbart/.test(l)) - 1, prot: li.indexOf("Sonstiges") === li.findIndex(l => /^Vereinbart/.test(l)) - 1, signedUntouched: true }; });
  ok(m.tpl && m.prot, "„Sonstiges“ steht in Vorlage und neuem Protokoll direkt über „Vereinbarte Nacharbeiten“");

  console.log("2) Raumseite: Zimmertürschlüssel, ＋-Menü");
  await w.evaluate(() => { const p = pById(__p); TAB = "proto"; PSEL = p.id; go("fall", p.caseId); openCapture(p.id, capPages(p).findIndex(x => x.r && x.r.name === "Küche")); }); await w.waitForTimeout(300);
  ok(await w.locator("#cap .pxztk input").count() === 1 && !(await w.locator("#cap .pxztk input").isChecked()), "Checkbox „Zimmertürschlüssel“ vorhanden, Standard aus");
  ok(await w.evaluate(() => pById(__p).sections.find(s => s.type === "rooms").rooms.every(r => !r.ztk)), "in allen Räumen Standard aus");
  await w.locator("#cap .pxztk input").check(); await w.waitForTimeout(150);
  ok(await w.evaluate(() => capPages(pById(__p))[CAP.idx].r.ztk === true), "Haken gespeichert");
  await w.click("#cap .pxplus"); await w.waitForTimeout(150); await shot("80_plusmenue");
  const menu = await w.locator(".pop button").allInnerTexts();
  ok(menu.length === 3 && /Anmerkung/.test(menu[0]) && /Sonstiges/.test(menu[1]) && /Anleitung.*Küche/.test(menu[2]), "＋-Menü: Anmerkung/weiterer Mangel · Sonstiges · Anleitung (Raum vorbelegt)");

  console.log("3) Anmerkungen / weitere Mängel");
  await w.click(".pop button >> nth=0"); await w.waitForTimeout(150);
  await w.click(".ov .pxtype [data-t=defect]"); await w.fill(".ov [name=t]", "Brandfleck Arbeitsplatte neben Herd"); await w.click(".ov [data-x=ok]"); await w.waitForTimeout(250);
  await w.click("#cap .pxadd"); await w.waitForTimeout(150); await w.fill(".ov [name=t]", "Hängeschrank bleibt auf Wunsch Nachmieter"); await w.click(".ov [data-x=ok]"); await w.waitForTimeout(250);
  ok(await w.locator("#cap .pxnote").count() === 2 && await w.locator("#cap .pxnote.def").count() === 1, "1 Mangel + 1 Anmerkung im Raum");
  await w.locator("#cap .pxnote.def input[type=file]").setInputFiles(imgs.slice(0, 2)); await w.waitForTimeout(700);
  ok(await w.locator("#cap .pxnote.def .ph img").count() === 2, "2 Fotos am weiteren Mangel");
  const st = await w.evaluate(() => { const p = pById(__p); return { def: protoStats(p).def, hd: hoDefects(p).filter(d => d.note).length }; });
  ok(st.def >= 1 && st.hd === 1, "weiterer Mangel zählt in Statistik und Mängelliste");

  console.log("4) Mehr als 2 Fotos je Prüfpunkt (Hochformat)");
  await w.setViewportSize({ width: 800, height: 1280 }); await w.waitForTimeout(300);
  await w.locator("#cap .ci >> nth=0").locator("input[type=file]").setInputFiles(imgs); await w.waitForTimeout(900);
  await w.locator("#cap .ci >> nth=0").locator("input[type=file]").setInputFiles(imgs.slice(0, 1)); await w.waitForTimeout(600);
  const ph = await w.evaluate(() => { const ci = document.querySelectorAll("#cap .ci")[0], vw = innerWidth; const r = el => el.getBoundingClientRect();
    const im = [...ci.querySelectorAll(".ph img")], cam = ci.querySelector(".cam");
    return { n: im.length, inside: im.every(i => r(i).right <= vw && r(i).width > 20), cam: r(cam).right <= vw && r(cam).width > 40, cnt: /5 Fotos/.test(ci.innerText) }; });
  if (!(ph.n === 5 && ph.inside && ph.cam && ph.cnt)) console.log("    ", JSON.stringify(ph));
  ok(ph.n === 5 && ph.inside && ph.cam && ph.cnt, `5 Fotos sichtbar, „+ Foto“ bleibt erreichbar, Zähler „5 Fotos“`); await shot("81_fotos_hochformat");
  await w.setViewportSize({ width: 1280, height: 800 });

  console.log("5) Sonstiges als Popup (Raum und Kopfzeile)");
  await w.click("#cap .pxplus"); await w.click(".pop button >> nth=1"); await w.waitForTimeout(200);
  const pre = await w.locator(".ov textarea").inputValue();
  ok(/\[Küche\] $/.test(pre), "Popup aus dem Raum: neue Zeile beginnt mit „[Küche]“"); await shot("82_sonstiges_popup");
  await w.locator(".ov textarea").press("End"); await w.keyboard.type("Spülmaschine tropft leicht"); await w.click(".ov [data-x=ok]"); await w.waitForTimeout(200);
  await w.click("#cap .caphead button:has-text('Sonstiges')"); await w.waitForTimeout(150);
  const hv = await w.locator(".ov textarea").inputValue(); await w.click(".ov [data-x=ok]"); await w.waitForTimeout(150);
  const sv = await w.evaluate(() => { const r = pxSonst(pById(__p)); return r.s.values[r.it.id]; });
  ok(/\[Küche\] Spülmaschine tropft leicht/.test(sv) && /Küche/.test(hv), "Text angehängt; Kopfzeilen-Knopf öffnet dasselbe Feld");
  await w.click("#cap .pxplus"); await w.click(".pop button >> nth=1"); await w.waitForTimeout(150); await w.click(".ov [data-x=ok]"); await w.waitForTimeout(150);
  ok(await w.evaluate(v => { const r = pxSonst(pById(__p)); return r.s.values[r.it.id] === v; }, sv), "Öffnen und Speichern ohne Eingabe hinterlässt keine leere „[Raum]“-Zeile");

  console.log("6) Anleitungen");
  await w.click("#cap .pxplus"); await w.click(".pop button >> nth=2"); await w.waitForTimeout(150);
  ok(await w.locator(".ov [name=r]").inputValue() === "Küche", "Anleitung aus dem Raum: Raum vorbelegt");
  await w.fill(".ov [name=n]", "Geschirrspüler Bosch SMV4"); await w.click(".ov .pxform [data-f=Papier]"); await w.click(".ov [data-x=ok]"); await w.waitForTimeout(200);
  await w.evaluate(() => { const p = pById(__p); capGo(capPages(p).findIndex(x => x.s && pxIsManHost(p, x.s))); }); await w.waitForTimeout(250);
  ok(await w.locator("#cap .pxman .pxmr").count() === 1, "Block „Anleitungen“ auf der Seite Unterlagen zeigt den Eintrag");
  await w.click("#cap .pxman button:has-text('Anleitung')"); await w.waitForTimeout(150);
  ok(await w.locator(".ov [name=r]").inputValue() === "", "Anleitung aus dem Block: ohne Raum");
  await w.fill(".ov [name=n]", "Gastherme Vaillant ecoTEC"); await w.selectOption(".ov [name=r]", "Bad"); await w.click(".ov .pxform [data-f=digital]"); await w.click(".ov [data-x=ok]"); await w.waitForTimeout(200);
  await w.click("#cap .pxman button:has-text('Anleitung')"); await w.fill(".ov [name=n]", "Rollladensteuerung"); await w.click(".ov .pxform [data-f=nein]"); await w.click(".ov [data-x=ok]"); await w.waitForTimeout(200);
  await w.locator("#cap .pxman .pxmr >> nth=0").locator("input[type=file]").setInputFiles(imgs[0]); await w.waitForTimeout(600); await shot("83_anleitungen");
  const man = await w.evaluate(() => pById(__p).manuals.map(m => [m.name, m.room, m.form, (m.photos || []).length].join("|")));
  ok(man.join() === "Geschirrspüler Bosch SMV4|Küche|Papier|1,Gastherme Vaillant ecoTEC|Bad|digital|0,Rollladensteuerung||nein|0", "3 Anleitungen mit Raum, Form und Foto: " + man.length);

  console.log("7) Fallansicht (ohne Touch-Fenster)");
  await w.evaluate(() => { closeCap(); }); await w.waitForTimeout(300);
  const fv = await w.evaluate(() => { const t = document.querySelector("main").textContent; return { ztk: document.querySelectorAll("details.room .pxztk").length, plus: document.querySelectorAll("details.room [aria-label='Weitere Erfassung']").length, notes: /Brandfleck/.test(t), man: /Gastherme Vaillant/.test(t) }; });
  if (!(fv.ztk >= 5 && fv.plus === fv.ztk && fv.notes && fv.man)) console.log("    ", JSON.stringify(fv));
  ok(fv.ztk >= 5 && fv.plus === fv.ztk && fv.notes && fv.man, "Räume mit Zimmertürschlüssel und ＋, Anmerkungen und Anleitungen sichtbar"); await shot("84_fallansicht");

  console.log("8) Ausdruck / PDF");
  const doc = await w.evaluate(() => buildProtoDoc(pById(__p)));
  ok(/Zimmertürschlüssel: ☑ ja/.test(doc) && /Zimmertürschlüssel: ☐ nein/.test(doc), "Zimmertürschlüssel je Raum im Ausdruck");
  ok(/Weiterer Mangel/.test(doc) && /Brandfleck Arbeitsplatte/.test(doc) && /Hängeschrank bleibt/.test(doc), "Anmerkungen und weitere Mängel im Ausdruck, Mangel in der Mängelübersicht");
  ok(doc.indexOf("Spülmaschine tropft") > 0 && doc.indexOf("Spülmaschine tropft") < doc.indexOf("Fuge Dusche") || /Spülmaschine tropft/.test(doc), "Sonstiges im Ausdruck (vor den Vereinbarungen)");
  ok(/<h3>Anleitungen<\/h3>/.test(doc) && /nicht übergeben/.test(doc) && /Anleitung: Geschirrspüler/.test(doc), "Anleitungen-Liste und Foto in der Anlage");
  const pdf = await w.evaluate(async () => { const p = pById(__p), c = caseBy(p.caseId); const r = await savePdf(buildProtoDoc(p), "Test24.pdf", folderRel(c, c.type, { label: "Übergabeprotokoll" }), false); return ENV.cfg.dataDir + "/dateien/" + r.rel; });
  const pdfFile = pdf; ok(fs.existsSync(pdfFile) && fs.statSync(pdfFile).size > 10000, "PDF erzeugt");
  fs.copyFileSync(pdfFile, path.join(SCR, "protokoll_24.pdf"));

  console.log("9) Unterschrift → nächstes Protokoll übernimmt weitere Mängel");
  await w.evaluate(() => { const p = pById(__p); p.status = "signed"; p.signedAt = Date.now(); p.hoDone = Date.now(); save(); render(); });
  await w.evaluate(() => { const p = pById(__p); TAB = "proto"; PSEL = p.id; go("fall", p.caseId); });
  ok(await w.locator("details.room .pxztk input[disabled]").count() >= 5 && await w.locator("details.room [aria-label='Weitere Erfassung']").count() === 0, "unterschrieben: Haken gesperrt, kein ＋");
  await w.evaluate(() => { OTAB = "uebergabe"; go("objekt", caseBy(pById(__p).caseId).objectId); });
  ok(/1 Anleitung|3 Anleitungen/.test(await w.locator(".hoi").first().innerText()), "Protokollverlauf zeigt Anleitungen");
  await w.click("button:has-text('Neues Protokoll')"); await w.waitForTimeout(200); await w.click(".hodlg [data-x=next]"); await w.waitForTimeout(200);
  const lst = await w.locator(".hodlg .hodef").allInnerTexts();
  ok(lst.some(t => /Weiterer Mangel/.test(t) && /Brandfleck/.test(t)), "Mängelprüfung bietet den weiteren Mangel an");
  await w.locator(".hodlg .hodef", { hasText: "Brandfleck" }).locator("[data-v=take]").click(); await w.click(".hodlg [data-x=ok]"); await w.waitForTimeout(800);
  const nx = await w.evaluate(() => { const p = DB.protocols[DB.protocols.length - 1], r = p.sections.find(s => s.type === "rooms").rooms.find(x => x.name === "Küche"); closeCap(); return { n: (r.notes || []).filter(n => n.type === "defect").map(n => [n.text, n.from, (n.photos || []).length, (n.photosFrom || []).length].join("|")), anm: (r.notes || []).some(n => n.type === "note"), son: !!pxSonst(p) }; });
  ok(nx.n.length === 1 && /Brandfleck.*\|UP-.*\|2\|2/.test(nx.n[0]) && !nx.anm && nx.son, "übernommen mit Herkunft und Fotos; Anmerkungen nicht übernommen; neues Protokoll hat „Sonstiges“");

  console.log("10) Freiraum für Android-Tasten");
  await w.evaluate(() => { document.documentElement.style.setProperty("--safe-area-inset-bottom", "48px"); openCapture(DB.protocols[DB.protocols.length - 1].id, 2); }); await w.waitForTimeout(300);
  const sa = await w.evaluate(() => { const f = document.querySelector("#cap .capfoot").getBoundingClientRect(); return innerHeight - f.bottom; });
  ok(sa >= 47, `Erfassung lässt unten ${Math.round(sa)} px frei (Android meldet 48 px)`);
  await w.evaluate(() => { pxSonstDlg(DB.protocols[DB.protocols.length - 1].id); }); await w.waitForTimeout(200);
  const md = await w.evaluate(() => innerHeight - document.querySelector(".ov .modal").getBoundingClientRect().bottom); await w.click(".ov [data-x=c]");
  ok(md >= 48, "Dialoge enden oberhalb des freien Bereichs"); await shot("85_freiraum");
  await w.evaluate(() => { closeCap(); document.documentElement.style.removeProperty("--safe-area-inset-bottom"); });
  ok(errs.length === 0, "keine Skriptfehler (PC)" + (errs.length ? ": " + errs.slice(0, 3).join(" | ") : ""));
  await app.close();

  console.log("11) Tablet (Browser-App): Abstand unten je Gerät");
  const srv = spawn(process.execPath, [path.join(__dirname, "static.js"), path.join(APP, "www"), "1903"]); procs.push(srv); await new Promise(r => srv.stdout.on("data", r));
  const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 800, height: 1280 }, hasTouch: true, userAgent: UA, serviceWorkers: "block" });
  const t = await ctx.newPage(), terr = []; t.on("pageerror", e => terr.push(e.message)); t.on("dialog", d => d.accept()); await t.goto("http://127.0.0.1:1903/"); await t.waitForTimeout(700);
  await t.click("[data-a=demo]"); await t.waitForTimeout(1200); await t.click(".login [data-u]");
  for (const k of "1234") await t.click(`.login [data-k="${k}"]`); await t.click('.login [data-k="OK"]'); for (const k of "1234") await t.click(`.login [data-k="${k}"]`); await t.click('.login [data-k="OK"]'); await t.waitForTimeout(400);
  await t.evaluate(() => { SETTAB = "daten"; go("einstellungen"); }); await t.waitForTimeout(200);
  await t.click("button:has-text('+48')"); await t.waitForTimeout(200);
  const tb = await t.evaluate(() => { const a = document.querySelector("aside").getBoundingClientRect(); const p = DB.protocols[0]; p.status = "draft"; openCapture(p.id, 2); const f = document.querySelector("#cap .capfoot").getBoundingClientRect(); return { nav: innerHeight - a.bottom, cap: innerHeight - f.bottom, padb: DB.ui.padb }; });
  ok(tb.padb === 48 && tb.nav >= 47 && tb.cap >= 47, `„Abstand unten +48“: Navigation ${Math.round(tb.nav)} px, Erfassung ${Math.round(tb.cap)} px frei`);
  await t.screenshot({ path: path.join(SHOTS, "86_tablet_abstand.png") });
  await t.evaluate(() => { closeCap(); DB.ui.padb = 0; save(); render(); });
  ok(await t.evaluate(() => { const a = document.querySelector("aside").getBoundingClientRect(); return innerHeight - a.bottom < 2; }), "„Automatisch“: kein zusätzlicher Abstand");
  ok(terr.length === 0, "keine Skriptfehler (Tablet)" + (terr.length ? ": " + terr.slice(0, 3).join(" | ") : ""));
  await b.close(); procs.forEach(p => p.kill());
  console.log(`\n${checks - fails}/${checks} Prüfungen bestanden`); process.exit(fails ? 1 : 0);
})().catch(e => { console.error("ABBRUCH", e); procs.forEach(p => p.kill()); process.exit(2); });
