// End-to-End-Test Tablet (Browser-App/PWA): PC (Windows-App, Electron) + Tablet (Chromium, Android-Kennung)
// Teil 1 Nextcloud mit CORS-Freigabe, Teil 2 OneDrive mit Anmeldung per PKCE.
// Aufruf: node tools/build-web.js --test && xvfb-run -a node test/pwa.e2e.js <scratch-ordner>
const { _electron: electron, chromium } = require("playwright");
const fs = require("fs"), path = require("path"), { spawn } = require("child_process"), http = require("http");
const APP = path.join(__dirname, ".."), SCR = process.argv[2] || "/tmp/mp-pwa", SHOTS = path.join(SCR, "shots");
const WEB = "http://127.0.0.1:1903/", DAV_DIRECT = "http://127.0.0.1:1901", DAV_CORS = "http://127.0.0.1:1904";
const PW = "Buero-Passwort-2026", UA = "Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const MS = { clientId: "11111111-2222-3333-4444-555555555555", tenant: "organizations", loginBase: "http://127.0.0.1:1902", graphBase: "http://127.0.0.1:1902/v1.0" };
let fails = 0, checks = 0; const procs = [];
const ok = (c, m) => { checks++; if (c) console.log("  ✓ " + m); else { fails++; console.log("  ✗ " + m); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const start = (args, re) => new Promise(res => { const p = spawn(process.execPath, args); procs.push(p); p.stdout.on("data", d => re.test(d) && res(p)); p.stderr.on("data", d => process.stderr.write(d)); });
const stats = () => new Promise(r => http.get("http://127.0.0.1:2002/", res => { let d = ""; res.on("data", c => d += c); res.on("end", () => r(JSON.parse(d))); }));

async function pc(name) {
  const HOME = path.join(SCR, "home-" + name); fs.mkdirSync(path.join(HOME, "Documents"), { recursive: true });
  const app = await electron.launch({ executablePath: path.join(APP, "node_modules/electron/dist/electron"), args: ["--no-sandbox", APP], env: { ...process.env, HOME } });
  const w = await app.firstWindow(), errs = []; w.on("pageerror", e => errs.push(e.message)); w.on("dialog", d => d.accept());
  await w.setViewportSize({ width: 1360, height: 860 }); await w.waitForTimeout(900);
  await w.click("[data-a=next]"); await w.waitForTimeout(300); await w.click("[data-s=demo]"); await w.click("[data-a=next]"); await w.waitForTimeout(200);
  await w.fill("[name=wn]", "Sandra Lugt"); await w.fill("[name=ws]", "SL"); await w.click("[data-a=next]"); await w.waitForTimeout(1200); await w.keyboard.press("Escape");
  return { app, w, errs, HOME };
}
async function tablet(browser, name, vp = { width: 1280, height: 800 }) {
  const ctx = await browser.newContext({ viewport: vp, hasTouch: true, userAgent: UA, acceptDownloads: true, locale: "de-DE", timezoneId: "Europe/Berlin" });
  const w = await ctx.newPage(), errs = [];
  w.on("pageerror", e => errs.push(e.message)); w.on("console", m => { if (m.type() === "error" && !/Failed to load resource|CORS policy|ERR_FAILED/.test(m.text())) errs.push(m.text()); }); w.on("dialog", d => d.accept());
  await w.goto(WEB); await w.waitForTimeout(800);
  return { ctx, w, errs, name };
}
async function waitSync(X, timeout = 40000) {
  const t0 = Date.now(); let q = 0; await X.w.waitForTimeout(200);
  while (Date.now() - t0 < timeout) { const s = await X.w.evaluate(() => ({ r: SY.running || SY.again, s: SY.status })); if (!s.r && s.s !== "läuft") { if (++q >= 4) return s.s; } else q = 0; await X.w.waitForTimeout(250); }
  return "timeout";
}
const syncNow = async X => { await waitSync(X); await X.w.evaluate(() => cloudSync("test")); return waitSync(X); };
const shot = async (X, n) => { await X.w.waitForTimeout(350); await X.w.screenshot({ path: path.join(SHOTS, n + ".png") }); };
async function pin(X, digits) { for (const k of digits) await X.w.click(`.login [data-k="${k}"]`); if (digits.length < 6) await X.w.click('.login [data-k="OK"]'); await X.w.waitForTimeout(400); }

(async () => {
  fs.rmSync(SCR, { recursive: true, force: true }); fs.mkdirSync(SHOTS, { recursive: true });
  await start([path.join(__dirname, "davserver.js"), path.join(SCR, "davdata"), "1901"], /bereit/);
  await start([path.join(__dirname, "corsproxy.js"), "1904", "1901", "http://127.0.0.1:1903"], /bereit/);
  await start([path.join(__dirname, "static.js"), path.join(APP, "www"), "1903"], /bereit/);
  await start([path.join(__dirname, "graphmock.js"), "1902"], /bereit/);
  const browser = await chromium.launch();

  console.log("1) PC: Beispieldaten + Dokument, Cloud-Sync (Nextcloud) anlegen");
  const A = await pc("pc");
  const pdfRel = await A.w.evaluate(async () => {
    const o = DB.objects[0], f = DB.settings.fields.object.find(f => f.type === "file"), rel = folderRel(o, "object", f) + "/Grundbuch.pdf";
    await api.writeB64(rel, btoa("%PDF-1.4 Grundbuchauszug Test")); o.files[f.id] = [...(o.files[f.id] || []), { n: "Grundbuch.pdf", p: rel }]; save(); await flush(); return rel;
  });
  await A.w.evaluate(async dav => {
    const root = Providers.nextcloudRoot(dav, "buero"); await api.secretSet("ncPass", "app-pass-123");
    const cloud = { provider: "nextcloud", root, folder: "MaklerProzess", user: "buero", host: new URL(root).host, web: "" };
    const prov = await syProvider(cloud); await prov.test(); await syCreateOffice(prov, "Buero-Passwort-2026", () => {});
    ENV.cfg = { ...ENV.cfg, ...await api.setCfg({ mode: "cloud", cloud, deviceName: "PC Büro" }) }; SY.on = false; await cloudBoot();
  }, DAV_DIRECT);
  ok(await waitSync(A) === "ok", "PC synchron");

  console.log("2) Tablet (Browser-App): Willkommen → Büro beitreten");
  const B = await tablet(browser, "tab");
  ok(await B.w.locator(".wiz h1:has-text('Tablet')").count() === 1, "Willkommen-Seite für Tablet");
  await shot(B, "40_tablet_willkommen");
  await B.w.click("[data-a=join]"); await B.w.waitForTimeout(300);
  await B.w.click(".wiz [data-p=nextcloud]"); await B.w.click(".wiz [data-a=next]"); await B.w.waitForTimeout(200);
  ok(/CORS/.test(await B.w.locator(".wiz").innerText()), "Hinweis auf CORS-Freigabe im Assistenten");
  await B.w.fill(".wiz [name=server]", DAV_DIRECT); await B.w.fill(".wiz [name=user]", "buero"); await B.w.fill(".wiz [name=pass]", "app-pass-123");
  await B.w.click(".wiz [data-a=next]"); await B.w.waitForSelector("#werr:not(:empty)", { timeout: 15000 });
  ok(/CORS/.test(await B.w.locator("#werr").innerText()), "Nextcloud ohne CORS-Freigabe: verständliche Meldung");
  await B.w.fill(".wiz [name=server]", DAV_CORS); await B.w.click(".wiz [data-a=next]"); await B.w.waitForSelector(".wiz [name=secret]", { timeout: 15000 }).catch(async e => { console.log("    Meldung: " + await B.w.locator("#werr").innerText()); throw e; });
  ok(true, "Nextcloud mit CORS-Freigabe verbunden");
  await B.w.fill(".wiz [name=secret]", PW); await B.w.fill(".wiz [name=dev]", "Tablet Außendienst"); await B.w.click(".wiz [data-a=next]");
  await B.w.waitForSelector(".wiz [data-a=done]", { timeout: 60000 }); await shot(B, "41_tablet_beigetreten");
  await B.w.click(".wiz [data-a=done]"); await B.w.waitForTimeout(1500);

  console.log("3) Tablet: Mitarbeiter wählen, PIN festlegen");
  ok(await B.w.locator(".login").count() === 1, "Anmeldung nach dem Beitritt");
  await B.w.click('.login [data-u="u1"]'); await B.w.waitForTimeout(200); await shot(B, "42_tablet_pin_festlegen");
  ok(/Neue PIN festlegen/.test(await B.w.locator(".login").innerText()), "PIN festlegen angeboten");
  await pin(B, "2468"); await pin(B, "1357");
  ok(/stimmen nicht/.test(await B.w.locator(".login").innerText()), "abweichende Wiederholung abgelehnt");
  await pin(B, "2468"); await pin(B, "2468");
  ok(await B.w.locator(".login").count() === 0, "PIN festgelegt und angemeldet");
  ok(await waitSync(B) === "ok", "Tablet synchron");
  const cnt = await B.w.evaluate(() => [DB.objects.length, DB.cases.length, DB.protocols.length, document.body.classList.contains("mobile")]);
  const cntA = await A.w.evaluate(() => [DB.objects.length, DB.cases.length, DB.protocols.length]);
  ok(cnt[0] === cntA[0] && cnt[1] === cntA[1] && cnt[2] === cntA[2] && cnt[3], `Büro-Stand übernommen (${cnt.slice(0, 3).join("/")}), Tablet-Layout aktiv`);
  ok(await B.w.evaluate(() => !document.querySelector("#nav").innerText.includes("Auswertungen") && document.querySelector("#nav").innerText.includes("Gerät")), "Navigation Außendienst (ohne Auswertungen, mit Gerät)");
  await shot(B, "43_tablet_start");

  console.log("4) Dokumente erst bei Bedarf");
  ok(await B.w.evaluate(r => api.fileStat(r), pdfRel) === null && await B.w.evaluate(r => SY.state.files[r], pdfRel) === 2, "fremdes Dokument nicht vorab geladen");
  const [dl] = await Promise.all([B.w.waitForEvent("download", { timeout: 15000 }), B.w.evaluate(r => api.openPath(r), pdfRel)]);
  const dlPath = path.join(SCR, "dl.pdf"); await dl.saveAs(dlPath);
  ok(fs.readFileSync(dlPath, "utf8").includes("Grundbuchauszug"), "Dokument beim Öffnen aus der Cloud geladen");
  ok((await B.w.evaluate(r => api.fileStat(r), pdfRel)) !== null, "danach lokal zwischengespeichert");

  console.log("5) Tablet ändert, fotografiert, erzeugt PDF → PC");
  const tRes = await B.w.evaluate(async () => {
    const c = DB.cases.find(x => x.type === "rent"); c.title = c.title + " (Tablet)";
    const cv = document.createElement("canvas"); cv.width = 320; cv.height = 200; const g = cv.getContext("2d"); g.fillStyle = "#0f8a7a"; g.fillRect(0, 0, 320, 200); g.fillStyle = "#fff"; g.font = "28px sans-serif"; g.fillText("Zähler 4711", 40, 110);
    const rel = await api.writeImage({ dataURL: cv.toDataURL("image/jpeg", .8), rel: folderRel(c, c.type, { label: "Übergabeprotokoll" }) + "/Fotos", name: "Zaehler" });
    const f = DB.settings.fields.rent.find(x => x.type === "file"); c.files[f.id] = [...(c.files[f.id] || []), { n: rel.split("/").pop(), p: rel }];
    save(); await flush(); return { id: c.id, rel, title: c.title };
  });
  const pdf = await B.w.evaluate(async () => {
    const p = DB.protocols[0]; const c = caseBy(p.caseId);
    const r = await savePdf(buildProtoDoc(p), "Testprotokoll.pdf", folderRel(c, c.type, { label: "Übergabeprotokoll" }), false);
    const f = DB.settings.fields.rent.find(x => x.label === "Übergabeprotokoll"); c.files[f.id] = [...(c.files[f.id] || []), { n: r.file, p: r.rel }]; save(); await flush();
    const b = atob(await api.readB64(r.rel)); window.__pdf = await api.readB64(r.rel); return { rel: r.rel, head: b.slice(0, 5), pages: (b.match(/\/Type\s*\/Page[^s]/g) || []).length, size: b.length };
  });
  fs.writeFileSync(path.join(SCR, "tablet_protokoll.pdf"), Buffer.from(await B.w.evaluate(() => window.__pdf), "base64"));
  ok(pdf.head === "%PDF-" && pdf.pages >= 1, `PDF auf dem Tablet erzeugt (${pdf.pages} Seite(n), ${Math.round(pdf.size / 1024)} KB)`);
  ok(await syncNow(B) === "ok", "Tablet gesendet");
  ok(await syncNow(A) === "ok", "PC abgeglichen");
  const onA = await A.w.evaluate(async t => ({ title: DB.cases.find(c => c.id === t.id).title, img: await api.fileStat(t.rel) }), tRes);
  ok(onA.title === tRes.title, "Änderung vom Tablet am PC");
  ok(!!onA.img && fs.existsSync(path.join(SCR, "davdata/MaklerProzess/dateien", tRes.rel)), "Foto vom Tablet in der Cloud und am PC");
  ok(fs.existsSync(path.join(SCR, "davdata/MaklerProzess/dateien", pdf.rel)), "Tablet-PDF lesbar im Cloud-Ordner");

  console.log("6) Offline am Tablet");
  await B.ctx.setOffline(true);
  await B.w.evaluate(async () => { const t = DB.tasks[0]; t.title = "Offline geändert"; save(); await flush(); });
  const offl = await syncNow(B);
  const pill = await B.w.locator("#syncpill").innerText();
  ok(offl === "offline" && /Offline/.test(pill), "offline erkannt: " + pill);
  await shot(B, "44_tablet_offline");
  await B.ctx.setOffline(false); await B.w.evaluate(() => window.dispatchEvent(new Event("online")));
  ok(await waitSync(B) === "ok" && await syncNow(A) === "ok", "nach Verbindung automatisch abgeglichen");
  ok(await A.w.evaluate(() => DB.tasks[0].title) === "Offline geändert", "Offline-Änderung am PC angekommen");

  console.log("7) PC ändert → Tablet; Bilder im Protokoll");
  await A.w.evaluate(async () => { DB.objects[0].title = "Geändert am PC"; save(); await flush(); });
  ok(await syncNow(A) === "ok" && await syncNow(B) === "ok", "beide abgeglichen");
  ok(await B.w.evaluate(() => DB.objects[0].title) === "Geändert am PC", "PC-Änderung auf dem Tablet");
  await B.w.evaluate(id => { TAB = "daten"; go("fall", id); }, tRes.id); await B.w.waitForTimeout(400);
  await B.w.evaluate(r => { const i = document.createElement("img"); i.id = "testimg"; i.src = psrc(r); document.querySelector("main").appendChild(i); }, tRes.rel);
  await B.w.waitForFunction(() => { const i = document.getElementById("testimg"); return i && i.src.startsWith("blob:") && i.naturalWidth === 320; }, null, { timeout: 8000 }).then(() => ok(true, "Foto aus dem Gerätespeicher angezeigt"), () => ok(false, "Foto aus dem Gerätespeicher angezeigt"));
  await shot(B, "45_tablet_fall");

  console.log("8) Sperre, PIN, Neustart, Offline-Start");
  await B.w.evaluate(() => { window.MP_LOCK_MS = 1200; }); await B.w.waitForTimeout(7000);
  ok(await B.w.locator(".login").count() === 1, "automatische Sperre nach Inaktivität");
  await B.w.click('.login [data-u="u1"]'); await pin(B, "111111");
  ok(/falsch/.test(await B.w.locator(".login").innerText()), "falsche PIN abgelehnt");
  await pin(B, "2468"); ok(await B.w.locator(".login").count() === 0, "mit PIN entsperrt");
  await B.w.evaluate(() => { window.MP_LOCK_MS = 0; });
  await B.w.click("button.userchip"); await B.w.waitForTimeout(200);
  await B.w.click('.login [data-u="u3"]'); await B.w.waitForTimeout(200);
  ok(/keine PIN vergeben/.test(await B.w.locator(".login").innerText()), "anderer Mitarbeiter ohne PIN: Hinweis auf PC (einmaliges Festlegen verbraucht)");
  await B.w.click('.login [data-u="u1"]'); await pin(B, "2468");
  await B.w.reload(); await B.w.waitForTimeout(1500);
  ok(await B.w.locator(".login").count() === 1, "nach Neustart PIN-Abfrage");
  await B.w.click('.login [data-u="u1"]'); await pin(B, "2468");
  ok(await B.w.evaluate(() => SY.on && DB.objects[0].title === "Geändert am PC"), "Daten und Cloud-Sync nach Neustart vorhanden");
  ok(await B.w.evaluate(async () => { for (let i = 0; i < 20 && !navigator.serviceWorker.controller; i++) await new Promise(r => setTimeout(r, 250)); return !!navigator.serviceWorker.controller; }), "Service Worker aktiv");
  await B.ctx.setOffline(true); await B.w.reload(); await B.w.waitForTimeout(1500);
  ok(await B.w.locator(".login [data-u]").count() > 0, "App startet auch ohne Internet (Offline-Zwischenspeicher)");
  await B.w.click('.login [data-u="u1"]'); await pin(B, "2468"); await B.ctx.setOffline(false);
  await B.w.evaluate(() => { SETTAB = "daten"; go("einstellungen"); }); await B.w.waitForTimeout(800); await shot(B, "46_tablet_geraet");
  ok(/Tablet Außendienst/.test(await B.w.locator("#cloudcard").innerText()) && await B.w.locator("button:has-text('Cloud-Sync einrichten')").count() === 0, "Gerät-Seite: Cloud-Karte ohne „Büro anlegen“");
  await B.w.evaluate(() => help()); await B.w.waitForTimeout(300);
  ok(/Tablet \(Android/.test(await B.w.locator(".helpdr article h2").innerText()), "Hilfe öffnet Thema Tablet");
  await B.w.keyboard.press("Escape");
  const dropped = await B.w.evaluate(() => PLATFORM.dropCache());
  ok(dropped >= 1 && await B.w.evaluate(r => api.fileStat(r), pdfRel) === null && await B.w.evaluate(r => api.fileStat(r), tRes.rel) !== null, `Speicher freigeben: ${dropped} fremde(s) Dokument(e) entfernt, eigene bleiben`);

  console.log("9) Hochformat");
  await B.w.setViewportSize({ width: 800, height: 1280 }); await B.w.evaluate(() => go("start")); await shot(B, "47_tablet_hochformat");
  ok(await B.w.evaluate(() => { const a = document.querySelector("aside").getBoundingClientRect(); return a.top > innerHeight - 120 && a.width > 700; }), "Navigation im Hochformat unten");
  ok(B.errs.length === 0, "keine Skriptfehler Tablet" + (B.errs.length ? ": " + B.errs.slice(0, 3).join(" | ") : ""));
  ok(A.errs.length === 0, "keine Skriptfehler PC" + (A.errs.length ? ": " + A.errs.slice(0, 3).join(" | ") : ""));
  await A.app.close(); await B.ctx.close();

  console.log("10) OneDrive in der Browser-App: Anmeldung per PKCE (Pop-up)");
  const C = await pc("pc2");
  await C.w.evaluate(async cfg => {
    const dc = await Providers.msDeviceCode(cfg, SYT); const tok = await Providers.msPollToken(cfg, SYT, dc); await api.secretSet("msRefresh", tok.refresh_token);
    const sec = { get: () => api.secretGet("msRefresh"), set: v => api.secretSet("msRefresh", v) };
    const r = await Providers.graphResolveTarget(cfg, SYT, sec, { type: "me", folder: "MaklerProzess" });
    const cloud = { provider: "onedrive", ...cfg, ...r, account: "buero@lugtiv.de" }; const prov = await syProvider(cloud); await syCreateOffice(prov, "Buero-Passwort-2026", () => {});
    ENV.cfg = { ...ENV.cfg, ...await api.setCfg({ mode: "cloud", cloud, deviceName: "PC Büro" }) }; SY.on = false; await cloudBoot();
  }, MS);
  ok(await waitSync(C) === "ok", "PC mit OneDrive synchron");
  const D = await tablet(browser, "tab2");
  await D.w.evaluate(async t => { await api.setCfg({ msTest: t }); ENV = await api.load(); }, { loginBase: MS.loginBase, graphBase: MS.graphBase });
  await D.w.click("[data-a=join]"); await D.w.waitForTimeout(300);
  await D.w.click(".wiz [data-p=onedrive]"); await D.w.click(".wiz [data-a=next]"); await D.w.waitForTimeout(200);
  await D.w.fill(".wiz [name=clientId]", MS.clientId);
  ok(/auth\.html/.test(await D.w.locator(".wiz .path").innerText()), "Umleitungs-URI für die App-Registrierung angezeigt");
  await shot(D, "48_tablet_onedrive");
  const [popup] = await Promise.all([D.ctx.waitForEvent("page", { timeout: 10000 }), D.w.click(".wiz [data-a=mslogin]")]);
  await D.w.waitForSelector(".wiz [data-t=me]", { timeout: 15000 });
  ok(/buero@lugtiv\.de/.test(await D.w.locator(".wiz .banner").innerText()), "angemeldet per Pop-up (PKCE)");
  await sleep(800); ok(popup.isClosed(), "Anmeldefenster schließt sich selbst");
  await D.w.click(".wiz [data-a=next]"); await D.w.waitForSelector(".wiz [name=secret]", { timeout: 15000 });
  await D.w.fill(".wiz [name=secret]", PW); await D.w.click(".wiz [data-a=next]");
  await D.w.waitForSelector(".wiz [data-a=done]", { timeout: 60000 }); await D.w.click(".wiz [data-a=done]"); await D.w.waitForTimeout(1500);
  await D.w.click('.login [data-u="u1"]'); await pin(D, "9753"); await pin(D, "9753");
  ok(await waitSync(D) === "ok", "Tablet über OneDrive synchron");
  const st = await stats(); ok(st.pkce === 1, "Token per Autorisierungscode + PKCE (mit Herkunftsangabe) geholt");
  await D.w.evaluate(async () => { DB.cases[0].title = "Vom Tablet über OneDrive"; save(); await flush(); });
  ok(await syncNow(D) === "ok" && await syncNow(C) === "ok", "abgeglichen");
  ok(await C.w.evaluate(() => DB.cases[0].title) === "Vom Tablet über OneDrive", "Änderung über OneDrive am PC");
  ok(D.errs.length === 0, "keine Skriptfehler Tablet 2" + (D.errs.length ? ": " + D.errs.slice(0, 3).join(" | ") : ""));
  await C.app.close(); await D.ctx.close(); await browser.close();

  console.log(`\n${checks - fails}/${checks} Prüfungen bestanden`);
  procs.forEach(p => p.kill()); process.exit(fails ? 1 : 0);
})().catch(e => { console.error("ABBRUCH", e); procs.forEach(p => p.kill()); process.exit(2); });
