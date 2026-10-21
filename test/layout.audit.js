// Layout-Prüfung: alle Seiten, Reiter und wichtigen Dialoge in mehreren Bildschirmformaten.
// Meldet abgeschnittene / überstehende Elemente und Dialoge, die nicht ins Fenster passen; legt Screenshots ab.
// Aufruf: node tools/build-web.js --test && xvfb-run -a node test/layout.audit.js <ausgabe-ordner> [--shots]
const { _electron: electron, chromium } = require("playwright");
const fs = require("fs"), path = require("path"), { spawn } = require("child_process");
const ONLY = (process.argv.find(a => a.startsWith("--only=")) || "").slice(7);
const APP = path.join(__dirname, ".."), OUT = process.argv[2] || "/tmp/mp-layout", SHOTS = process.argv.includes("--shots");
const UA = "Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

// Szenen: [Name, Code im Seitenkontext, nur Desktop?]
const SCENES = [
  ["start", "go('start')"], ["laufend", "go('laufend')"], ["objekte", "go('objekte')"],
  ["objekt-daten", "OTAB='daten';go('objekt',DB.protocols[0]?caseBy(DB.protocols[0].caseId).objectId:DB.objects[0].id)"],
  ["objekt-faelle", "OTAB='faelle';go('objekt',DB.objects[0].id)"],
  ["objekt-uebergabe", "OTAB='uebergabe';go('objekt',caseBy(DB.protocols[0].caseId).objectId)"],
  ["faelle", "go('faelle')"], ["fall-akt", "TAB='akt';go('fall',DB.cases[0].id)"], ["fall-termine", "TAB='termine';go('fall',DB.cases[0].id)"],
  ["fall-daten", "TAB='daten';go('fall',DB.cases[0].id)"], ["fall-proto", "TAB='proto';PSEL=null;go('fall',DB.protocols[0].caseId)"],
  ["fall-abr", "TAB='abr';go('fall',DB.cases[0].id)", true], ["kalender", "go('kalender')"], ["zeiten", "go('zeiten')"], ["auswertung", "go('auswertung')", true],
  ["einst", "SETTAB='fields';go('einstellungen')"], ["einst-proto", "SETTAB='proto';go('einstellungen')", true], ["einst-design", "SETTAB='design';go('einstellungen')", true],
  ["einst-users", "SETTAB='users';go('einstellungen')", true], ["einst-daten", "SETTAB='daten';go('einstellungen')", true],
  ["dlg-quick", "go('start');quick()"], ["dlg-neuprot", "OTAB='uebergabe';go('objekt',caseBy(DB.protocols[0].caseId).objectId);hoNewProto({oid:caseBy(DB.protocols[0].caseId).objectId})"],
  ["dlg-neuprot2", "document.querySelector('.hodlg [data-x=next]')&&document.querySelector('.hodlg [data-x=next]').click()"],
  ["dlg-zaehler", "OTAB='uebergabe';go('objekt',caseBy(DB.protocols[0].caseId).objectId);hoEdit(caseBy(DB.protocols[0].caseId).objectId,'meters')"],
  ["dlg-termin", "go('start');editTask(null,{caseId:DB.cases[0].id})"],
  ["cap-raum", "TAB='proto';go('fall',DB.protocols[0].caseId);DB.protocols[0].status='draft';openCapture(DB.protocols[0].id,1)"],
  ["cap-zaehler", "openCapture(DB.protocols[0].id,capPages(DB.protocols[0]).findIndex(x=>x.s&&x.s.type==='meters'))"],
  ["cap-schluessel", "openCapture(DB.protocols[0].id,capPages(DB.protocols[0]).findIndex(x=>x.s&&x.s.type==='keys'))"],
  ["cap-abschluss", "openCapture(DB.protocols[0].id,capPages(DB.protocols[0]).length-1)"],
  ["dlg-unterschrift", "closeCap();signDigital(DB.protocols[0].id)"],
  ["druckvorschau", "printDoc(buildProtoDoc(DB.protocols[0]))"], ["hilfe", "help()"]
];
const AUDIT = () => {
  const W = innerWidth, H = innerHeight, bad = [];
  const name = el => { let s = el.tagName.toLowerCase(); if (el.id) s += "#" + el.id; else if (el.className && typeof el.className === "string") s += "." + el.className.trim().split(/\s+/).slice(0, 2).join("."); const t = (el.innerText || el.value || "").trim().split("\n")[0].slice(0, 30); return s + (t ? ` „${t}“` : ""); };
  const inScroller = el => { for (let e = el.parentElement; e && e !== document.body; e = e.parentElement) { const s = getComputedStyle(e); if (/(auto|scroll)/.test(s.overflowX) && e.scrollWidth > e.clientWidth + 1) return true; if (s.overflowX === "hidden" || s.overflowX === "clip") { const r = e.getBoundingClientRect(); if (r.right <= W + 1) return true; } } return false; };
  const top = [...document.querySelectorAll(".ov,.wiz,#cap,.pvov,.helpov,.lightbox")].pop() || document.body;
  top.querySelectorAll("*").forEach(el => {
    const cs = getComputedStyle(el); if (cs.display === "none" || cs.visibility === "hidden" || el.closest(".pdfhost,.pdfpage,#printarea")) return;
    const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return;
    if ((r.right > W + 1 || r.left < -1) && !inScroller(el)) bad.push("ragt heraus: " + name(el) + ` (${Math.round(r.left)}–${Math.round(r.right)} von ${W})`);
    if (/^(BUTTON|INPUT|SELECT|TEXTAREA)$/.test(el.tagName) && document.body.classList.contains("mobile") && r.height < 30 && el.type !== "checkbox" && el.type !== "radio" && !el.closest(".pvov,.hochips")) bad.push(`klein (${Math.round(r.height)} px): ` + name(el));
  });
  document.querySelectorAll(".modal,.wizbox").forEach(d => { const r = d.getBoundingClientRect(); if (r.bottom > H + 1 || r.top < -1 || r.right > W + 1) bad.push(`Dialog passt nicht: ${Math.round(r.width)}×${Math.round(r.height)} in ${W}×${H}`);
    const f = d.querySelector("footer"); if (f) { const fr = f.getBoundingClientRect(); if (fr.bottom > H + 1) bad.push("Dialog-Knöpfe außerhalb"); } });
  const m = document.querySelector("main"); if (m && top === document.body && m.scrollWidth > m.clientWidth + 2) bad.unshift(`Seite breiter als Fenster: ${m.scrollWidth} > ${m.clientWidth}`);
  return [...new Set(bad)].slice(0, 12);
};

async function run(kind, page, vps, report, setup) {
  for (const [vw, vh, label] of vps) {
    await page.setViewportSize({ width: vw, height: vh }); await page.waitForTimeout(250);
    if (setup) await setup();
    for (const [sc, code, deskOnly] of SCENES) {
      if (deskOnly && kind === "tablet") continue;
      try { await Promise.race([page.evaluate(c => { document.querySelectorAll(".ov,.pvov,.helpov,.pop,.lightbox").forEach(x => { if (!x.classList.contains("hodlg")) x.remove(); }); (0, eval)(c); }, code), new Promise((_, j) => setTimeout(() => j(new Error("Zeitüberschreitung Szene")), 15000))]); } catch (e) { report.push({ kind, vp: label, scene: sc, issues: ["Fehler: " + e.message.split("\n")[0]] }); continue; }
      await page.waitForTimeout(220);
      const issues = await Promise.race([page.evaluate(AUDIT), new Promise(r => setTimeout(() => r(["Prüfung: Zeitüberschreitung"]), 15000))]);
      process.stdout.write(`${kind} ${label} ${sc}: ${issues.length}\n`);
      report.push({ kind, vp: label, scene: sc, issues });
      if (SHOTS) await page.screenshot({ path: path.join(OUT, `${kind}_${label}_${sc}.png`) });
    }
    await page.evaluate(() => { document.querySelectorAll(".ov,.pvov,.helpov,.pop,.lightbox").forEach(x => x.remove()); if (typeof closeCap === "function" && CAP) closeCap(); });
  }
}

(async () => {
  fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
  const report = [], procs = [];
  // Desktop (Windows-App)
  if (ONLY !== "tablet") {
  const HOME = path.join(OUT, "home"); fs.mkdirSync(path.join(HOME, "Documents"), { recursive: true });
  const app = await electron.launch({ executablePath: path.join(APP, "node_modules/electron/dist/electron"), args: ["--no-sandbox", APP], env: { ...process.env, HOME } });
  const w = await app.firstWindow(); w.on("dialog", d => d.accept()); await w.waitForTimeout(900);
  await w.click("[data-a=next]"); await w.waitForTimeout(300); await w.click("[data-s=demo]"); await w.click("[data-a=next]"); await w.waitForTimeout(200);
  await w.fill("[name=wn]", "Sandra Lugt"); await w.fill("[name=ws]", "SL"); await w.click("[data-a=next]"); await w.waitForTimeout(1300); await w.keyboard.press("Escape");
  await run("pc", w, [[1366, 768, "1366x768"], [1280, 720, "1280x720"], [1920, 1040, "1920x1040"]], report);
  await app.close();
  }
  // Tablet (Browser-App)
  if (ONLY !== "pc") {
  const srv = spawn(process.execPath, [path.join(__dirname, "static.js"), path.join(APP, "www"), "1903"]); procs.push(srv); await new Promise(r => srv.stdout.on("data", r));
  const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, hasTouch: true, userAgent: UA, locale: "de-DE", serviceWorkers: "block" });
  const t = await ctx.newPage(); t.on("dialog", d => d.accept()); await t.goto("http://127.0.0.1:1903/"); await t.waitForTimeout(700);
  await t.click("[data-a=demo]"); await t.waitForTimeout(1200); await t.click(".login [data-u]");
  for (const k of "1234") await t.click(`.login [data-k="${k}"]`); await t.click('.login [data-k="OK"]'); for (const k of "1234") await t.click(`.login [data-k="${k}"]`); await t.click('.login [data-k="OK"]'); await t.waitForTimeout(500);
  await t.evaluate(() => { window.MP_LOCK_MS = 36e5; });
  await run("tablet", t, [[1280, 800, "quer"], [800, 1280, "hoch"], [1024, 768, "quer-klein"], [768, 1024, "hoch-klein"], [600, 960, "hoch-7zoll"]], report);
  await b.close(); }
  procs.forEach(p => p.kill());
  fs.writeFileSync(path.join(OUT, "bericht.json"), JSON.stringify(report, null, 1));
  const withIssues = report.filter(r => r.issues.length);
  withIssues.forEach(r => console.log(`${r.kind} ${r.vp} ${r.scene}:\n   ` + r.issues.join("\n   ")));
  console.log(`\n${report.length} Ansichten geprüft, ${withIssues.length} mit Befund`);
  process.exit(0);
})().catch(e => { console.error("ABBRUCH", e); process.exit(2); });
