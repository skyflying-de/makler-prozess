/* Makler-Prozess 2.6 – Archivieren und endgültig Löschen von Fällen und Objekten
 *
 * Daten:   case.archived / object.archived = { at, by, name }   (wird ganz normal synchronisiert)
 *          DB.settings.retention = { years }                      Aufbewahrungsfrist (Standard 10 Jahre)
 *          DB.settings.deleted = [{ id, kind, no, at, by, reason, early }]   Löschprotokoll ohne Inhalte
 * Anzeige: Eine „Linse“ blendet Archiviertes während des Zeichnens aus (DB-Listen werden kurz gefiltert und danach
 *          unverändert zurückgesetzt). Speichern und Sync laufen nie mit der gefilterten Sicht.
 * Rechte:  Archivieren, Zurückholen, Löschen nur Admins am PC/Laptop; das Tablet blendet Archiviertes komplett aus.
 */
let FARCH = false, OARCH = false, ARLENS = null;
const AR_COLLS = ["objects", "cases", "entries", "tasks", "protocols"];
const arIs = r => !!(r && r.archived);
const arAll = k => (ARLENS ? ARLENS[k] : DB[k]) || [];
const arYears = () => { const r = DB.settings.retention; return r && +r.years > 0 ? +r.years : 10; };
const arDeleted = () => DB.settings.deleted || (DB.settings.deleted = []);
const arDeadIds = () => new Set((DB.settings.deleted || []).map(x => x.id));
const arBase = c => c.closed || (c.archived && c.archived.at) || Date.now();
const arDueAt = c => new Date(new Date(arBase(c)).getFullYear() + arYears() + 1, 0, 1).getTime();
const arCount = () => ({ c: arAll("cases").filter(arIs).length, o: arAll("objects").filter(arIs).length });

/* ---------- Sichtbarkeit ---------- */
function arVisible(strict) {
  const dead = arDeadIds(), pc = !MOBILE && !strict;
  const archList = pc && VIEW === "faelle" && FARCH, rep = pc && VIEW === "auswertung" && DB.ui.repArch;
  const cases = DB.cases.filter(c => {
    if (dead.has(c.id)) return false;
    if (!arIs(c)) return !archList;
    if (!pc) return false;
    return archList || rep || (VIEW === "fall" && ARG === c.id) || (VIEW === "objekt" && ARG === c.objectId);
  });
  const ids = new Set(cases.map(c => c.id)), used = new Set(cases.map(c => c.objectId));
  const objects = DB.objects.filter(o => {
    if (dead.has(o.id)) return false;
    if (pc && VIEW === "objekte") return OARCH ? arIs(o) : !arIs(o);
    return !arIs(o) || used.has(o.id) || (pc && VIEW === "objekt" && ARG === o.id);
  });
  const byCase = x => !x.caseId ? true : ids.has(x.caseId);
  return { objects, cases, entries: DB.entries.filter(byCase), tasks: DB.tasks.filter(byCase), protocols: DB.protocols.filter(byCase) };
}
function arNeeded() { return DB && DB.cases && (DB.cases.some(arIs) || DB.objects.some(arIs) || (DB.settings.deleted || []).length); }
// fn mit gefilterter Sicht ausführen; Hinzufügen/Entfernen in den Listen während fn wird auf die echten Listen übertragen
function arLens(fn, strict) {
  if (ARLENS || !arNeeded()) return fn();
  const v = arVisible(strict), orig = {};
  AR_COLLS.forEach(k => { orig[k] = DB[k]; DB[k] = v[k]; });
  ARLENS = orig;
  try { return fn(); }
  finally {
    AR_COLLS.forEach(k => {
      const cur = DB[k], before = new Set(v[k]), now = new Set(cur);
      let real = orig[k];
      const removed = v[k].filter(x => !now.has(x)); if (removed.length) { const rs = new Set(removed); real = real.filter(x => !rs.has(x)); }
      cur.forEach(x => { if (!before.has(x)) real.push(x); });
      DB[k] = real;
    });
    ARLENS = null;
  }
}
// Sicherheit: Speichern/Sync nie mit gefilterter Sicht (falls während des Zeichnens ausgelöst)
{ const _flush = flush; flush = function () { if (ARLENS) { setTimeout(() => flush(), 0); return Promise.resolve(); } return _flush.apply(this, arguments); }; }
if (typeof cloudAfterSave === "function") { const _cas = cloudAfterSave; cloudAfterSave = function () { if (ARLENS) { setTimeout(() => cloudAfterSave(), 0); return; } return _cas.apply(this, arguments); }; }
if (typeof cloudSync === "function") { const _cs = cloudSync; cloudSync = function () { if (ARLENS) { const a = arguments; setTimeout(() => cloudSync.apply(null, a), 0); return Promise.resolve(); } return _cs.apply(this, arguments); }; }

/* ---------- Aufräumen: Reste gelöschter Fälle (z. B. von einem Gerät mit älterer Version nachgereicht) ---------- */
function arCleanOrphans() {
  if (!DB || !(DB.settings.deleted || []).length) return;
  const dead = arDeadIds(); let n = 0;
  for (const k of ["entries", "tasks", "protocols"]) { const before = DB[k].length; DB[k] = DB[k].filter(x => !(x.caseId && dead.has(x.caseId))); n += before - DB[k].length; }
  const nc = DB.cases.length; DB.cases = DB.cases.filter(c => !dead.has(c.id)); n += nc - DB.cases.length;
  const no = DB.objects.length; DB.objects = DB.objects.filter(o => !dead.has(o.id)); n += no - DB.objects.length;
  if (n) save();
}

/* ---------- Zeichnen ---------- */
{
  const _render = render;
  render = function () {
    if (!DB) return _render();
    arCleanOrphans();
    const r = arLens(() => _render());
    try { arDecorate(); } catch (e) { console.warn("Archiv-Anzeige", e); }
    return r;
  };
  for (const n of ["quick", "startFromObject", "editTask", "newCase", "hoNewProto"]) {
    if (typeof window[n] !== "function") continue;
    const f = window[n]; window[n] = function () { const a = arguments; return arLens(() => f.apply(this, a), true); };
  }
}
{ const _vF = vFaelle; vFaelle = function () {
    let h; if (FARCH && !MOBILE) { const m = MODE; MODE = "list"; try { h = _vF(); } finally { MODE = m; } } else h = _vF();
    if (MOBILE) return h;
    const n = arCount().c;
    const seg = `<div class="seg" id="arseg"><button class="${FARCH ? "" : "on"}" onclick="FARCH=false;render()">Aktiv</button><button class="${FARCH ? "on" : ""}" onclick="FARCH=true;render()">${ic("lock", 'style="width:13px"')}Archiv (${n})</button></div>`;
    h = h.replace('<div class="sp"></div>', seg + '<div class="sp"></div>');
    if (FARCH) h = h.replace(/<div class="seg">(?:(?!<\/div>).)*Phasen(?:(?!<\/div>).)*<\/div>/s, "").replace(/<div class="(card|board)">/, (n ? `<div class="banner">${ic("lock", 'style="width:15px"')}Archivierte Fälle – nur lesen. Öffnen, um sie zurückzuholen${isAdmin() ? " oder endgültig zu löschen" : ""}.</div>` : `<div class="banner">Keine archivierten Fälle.</div>`) + "$&");
    return h;
  };
}
{ const _vO = vObjekte; vObjekte = function () {
    let h = _vO(); if (MOBILE) return h;
    const n = arCount().o;
    const seg = `<div class="seg" id="aroseg"><button class="${OARCH ? "" : "on"}" onclick="OARCH=false;render()">Aktiv</button><button class="${OARCH ? "on" : ""}" onclick="OARCH=true;render()">${ic("lock", 'style="width:13px"')}Archiv (${n})</button></div>`;
    return h.replace('<div class="sp"></div>', seg + '<div class="sp"></div>');
  };
}
{ const _vA = vAuswertung; vAuswertung = function () {
    const h = _vA(); const n = arCount().c;
    return h.replace("<h1>Auswertungen</h1>", `<h1>Auswertungen</h1><span class="sp"></span><label class="archk" style="display:flex;gap:6px;align-items:center;font-size:13px"><input type="checkbox" ${DB.ui.repArch ? "checked" : ""} onchange="DB.ui.repArch=this.checked;save();render()"> inkl. Archiv (${n} Fälle)</label>`);
  };
}
{ const _vD = vDaten; vDaten = function () { return _vD() + (isAdmin() && !MOBILE ? arSettingsCard() : ""); }; }

// nach dem Zeichnen: Kennzeichnung, Nur-Lesen-Sicht, Knöpfe für Admins
function arDecorate() {
  const main = document.querySelector("main"); if (!main || MOBILE) return;
  main.querySelectorAll("[onclick*=\"go('fall','\"]").forEach(el => {
    const m = /go\('fall','([^']+)'\)/.exec(el.getAttribute("onclick")), c = m && caseBy(m[1]);
    if (c && arIs(c) && !el.querySelector(".tag.artag")) { const t = el.querySelector("b,.t") || el; t.insertAdjacentHTML("beforeend", ' <span class="tag grey artag">archiviert</span>'); }
  });
  if (OARCH && VIEW === "objekte") main.querySelectorAll("[onclick*=\"go('objekt','\"]").forEach(el => { const b = el.querySelector("b"); if (b && !b.querySelector(".artag")) b.insertAdjacentHTML("beforeend", ' <span class="tag grey artag">archiviert</span>'); });
  const top = main.querySelector(".top"); if (!top) return;
  if (VIEW === "fall") {
    const c = caseBy(ARG); if (!c) return;
    if (arIs(c)) { arBanner(main, top, `Archiviert am ${dt(c.archived.at)}${c.archived.name ? " von " + esc(c.archived.name) : ""} · Löschen erlaubt ab <b>${dt(arDueAt(c))}</b> (Aufbewahrung ${arYears()} Jahre)`); arReadOnly(main); }
    if (isAdmin()) top.insertAdjacentHTML("beforeend", arIs(c)
      ? `<button class="btn" data-arok onclick="arRestoreCase('${c.id}')">${ic("swap")}Zurückholen</button><button class="btn danger" data-arok onclick="arDeleteCaseDlg('${c.id}')">${ic("trash")}Endgültig löschen …</button>`
      : `<button class="btn" data-arok onclick="arArchiveCaseDlg('${c.id}')">${ic("lock")}Archivieren …</button>`);
  }
  if (VIEW === "objekt") {
    const o = objBy(ARG); if (!o) return;
    const cs = arAll("cases").filter(c => c.objectId === o.id), active = cs.filter(c => !arIs(c));
    if (arIs(o)) { arBanner(main, top, `Objekt archiviert am ${dt(o.archived.at)}${o.archived.name ? " von " + esc(o.archived.name) : ""}${cs.length ? ` · ${cs.length} archivierte${cs.length === 1 ? "r" : ""} Fall/Fälle` : ""}`); arReadOnly(main); }
    if (isAdmin()) top.insertAdjacentHTML("beforeend", arIs(o)
      ? `<button class="btn" data-arok onclick="arRestoreObject('${o.id}')">${ic("swap")}Zurückholen</button>${cs.length ? "" : `<button class="btn danger" data-arok onclick="arDeleteObjectDlg('${o.id}')">${ic("trash")}Endgültig löschen …</button>`}`
      : !active.length ? `<button class="btn" data-arok onclick="arArchiveObjectDlg('${o.id}')">${ic("lock")}Archivieren …</button>` : "");
  }
}
function arBanner(main, top, html) { top.insertAdjacentHTML("afterend", `<div class="banner arbanner">${ic("lock", 'style="width:15px;flex:none"')}<span>${html}</span></div>`); }
// Archiviertes nur lesen: Eingaben sperren, nur Navigieren, Ansehen, Drucken und Öffnen bleibt möglich
const AR_ALLOW = /(^|[;\s])(TAB|OTAB|PSEL|DDOC)=|go\(|openRel|openFile|openDoc|openPath|printDoc|printProto|lightbox|showPhoto|viewFile|preview|help\(/;
function arReadOnly(root) {
  root.classList.add("arro");
  root.querySelectorAll("input,select,textarea,button,label.btn").forEach(el => {
    if (el.closest(".tabs") || el.hasAttribute("data-arok") || AR_ALLOW.test(el.getAttribute("onclick") || "")) return;
    if (el.tagName === "LABEL") { el.classList.add("ardis"); el.querySelectorAll("input").forEach(i => i.disabled = true); return; }
    el.disabled = true; el.classList.add("ardis");
  });
  root.querySelectorAll("[contenteditable=true]").forEach(el => el.setAttribute("contenteditable", "false"));
}

/* ---------- Archivieren ---------- */
function arOpenOf(id) {
  return { tasks: DB.tasks.filter(t => t.caseId === id && !t.done), run: DB.entries.filter(e => e.caseId === id && !e.end) };
}
function arArchiveCaseDlg(id) {
  if (!isAdmin()) return toast("Nur Admins können archivieren.");
  const c = caseBy(id), o = objBy(c.objectId), op = arOpenOf(id);
  if (op.tasks.length || op.run.length) {
    modal("Archivieren nicht möglich", `<p style="margin-top:0"><b>${esc(c.no)} · ${esc(c.title)}</b> hat noch Offenes. Bitte zuerst erledigen bzw. beenden:</p>
      <ul>${op.run.map(e => `<li>Laufende Zeit von ${esc((DB.settings.users.find(u => u.id === e.userId) || {}).name || "?")} seit ${dt(e.start)}</li>`).join("")}${op.tasks.map(t => `<li>${t.type === "wv" ? "Wiedervorlage" : "Termin"} „${esc(t.title || "")}“ · ${dt(t.due)}</li>`).join("")}</ul>`,
      { ok: null, extra: op.tasks.length ? `<button class="btn" onclick="this.closest('.ov').close();TAB='termine';go('fall','${id}')">Zu den Terminen</button>` : "" });
    return;
  }
  const others = DB.cases.filter(x => x.objectId === c.objectId && x.id !== id && !arIs(x)), objOk = o && !arIs(o) && !others.length;
  const n = { e: DB.entries.filter(e => e.caseId === id).length, t: DB.tasks.filter(t => t.caseId === id).length, p: DB.protocols.filter(p => p.caseId === id).length };
  modal("Fall archivieren?", `<p style="margin-top:0"><b>${esc(c.no)} · ${esc(c.title)}</b> wird aus Listen, Phasen-Ansicht, Kalender, Start und Auswertungen ausgeblendet. Alles bleibt erhalten und nur lesbar:</p>
    <ul><li>${TT() ? `${n.e} Zeitbuchungen · ` : ""}${n.t} Termine · ${n.p} Protokolle</li></ul>
    ${c.stage < 3 ? `<div class="banner" style="background:var(--warn-soft);color:var(--warn)">Der Fall steht noch in der Phase „${esc(STAGES[c.stage])}“ – z. B. abgebrochen? Er wird trotzdem archiviert.</div>` : ""}
    ${objOk ? `<label style="display:flex;gap:8px;align-items:center"><input type="checkbox" name="obj" checked> Objekt <b>${esc(o.no)} ${esc(o.title)}</b> mit archivieren (keine weiteren aktiven Fälle)</label>` : ""}
    <p class="hint">Löschen erlaubt ab ${dt(arDueAt({ ...c, archived: { at: Date.now() } }))} (Aufbewahrung ${arYears()} Jahre). Auf Tablets wird der Fall ausgeblendet.</p>`,
    { ok: "Archivieren", onOk: ov => {
      const who = { at: Date.now(), by: ME().id, name: ME().name };
      c.archived = who;
      if (objOk && ov.querySelector("[name=obj]") && ov.querySelector("[name=obj]").checked) o.archived = { ...who };
      FARCH = false; VIEW = "faelle"; ARG = null; toast(`${c.no} archiviert`);
    } });
}
function arArchiveObjectDlg(oid) {
  if (!isAdmin()) return;
  const o = objBy(oid), cs = DB.cases.filter(c => c.objectId === oid);
  if (cs.some(c => !arIs(c))) return toast("Das Objekt hat noch aktive Fälle.");
  modal("Objekt archivieren?", `<p style="margin-top:0"><b>${esc(o.no)} · ${esc(o.title)}</b> wird aus der Objektliste ausgeblendet und ist nur noch lesbar.${cs.length ? ` Seine ${cs.length} Fälle sind bereits archiviert.` : ""}</p>`,
    { ok: "Archivieren", onOk: () => { o.archived = { at: Date.now(), by: ME().id, name: ME().name }; OARCH = false; VIEW = "objekte"; ARG = null; toast(`${o.no} archiviert`); } });
}
function arRestoreCase(id) {
  const c = caseBy(id), o = objBy(c.objectId);
  if (!confirm(`${c.no} aus dem Archiv zurückholen?${o && arIs(o) ? `\nDas Objekt ${o.no} wird ebenfalls zurückgeholt.` : ""}`)) return;
  delete c.archived; if (o && arIs(o)) delete o.archived;
  FARCH = false; save(); render(); toast(`${c.no} ist wieder aktiv`);
}
function arRestoreObject(oid) {
  const o = objBy(oid); if (!confirm(`${o.no} aus dem Archiv zurückholen?\nArchivierte Fälle des Objekts bleiben archiviert.`)) return;
  delete o.archived; OARCH = false; save(); render(); toast(`${o.no} ist wieder aktiv`);
}

/* ---------- Endgültig löschen ---------- */
function arDelDialog(title, rec, what, due, run) {
  const early = due && Date.now() < due;
  modal(title, `<p style="margin-top:0">${what} <b>Das lässt sich nicht rückgängig machen.</b></p>
    ${early ? `<div class="banner" style="background:var(--bad-soft,#fdecea);color:var(--bad)">${ic("lock", 'style="width:15px;flex:none"')}<span>Die Aufbewahrungsfrist läuft noch bis ${dt(due - 864e5)}. Löschen nur mit Begründung.</span></div>
      <div class="form"><label>Begründung</label><input name="why" placeholder="z. B. Auftrag nie zustande gekommen"></div>` : ""}
    <div class="form"><label>Zur Bestätigung Nummer eintippen</label><input name="no" placeholder="${esc(rec.no)}" autocomplete="off"></div>`,
    { ok: "Endgültig löschen", onOk: ov => {
      if (ov.querySelector("[name=no]").value.trim() !== rec.no) throw new Error(`Bitte genau „${rec.no}“ eintippen.`);
      const why = early ? ov.querySelector("[name=why]").value.trim() : "";
      if (early && !why) throw new Error("Bitte eine Begründung angeben.");
      run(why, early);
    } });
  const okb = document.querySelector(".ov:last-child [data-x=ok]"); if (okb) okb.classList.replace("pri", "danger");
}
function arFilesGone(beforeRefs) { const keep = new Set(SC.fileRefs(DB)); beforeRefs.filter(r => !keep.has(r)).forEach(r => delFile(r).catch(() => {})); }
function arDeleteCaseDlg(id) {
  if (!isAdmin()) return;
  const c = caseBy(id); if (!arIs(c)) return toast("Nur archivierte Fälle können gelöscht werden.");
  const n = { e: DB.entries.filter(e => e.caseId === id).length, t: DB.tasks.filter(t => t.caseId === id).length, p: DB.protocols.filter(p => p.caseId === id).length };
  arDelDialog("Fall endgültig löschen", c, `Löscht <b>${esc(c.no)} · ${esc(c.title)}</b> mit ${TT() ? `${n.e} Zeitbuchungen, ` : ""}${n.t} Terminen, ${n.p} Protokollen und den zugehörigen Dokumenten auf <b>allen Geräten</b>.`, arDueAt(c), (why, early) => {
    const refs = SC.fileRefs({ cases: [c], entries: DB.entries.filter(e => e.caseId === id), tasks: DB.tasks.filter(t => t.caseId === id), protocols: DB.protocols.filter(p => p.caseId === id) });
    DB.entries = DB.entries.filter(e => e.caseId !== id); DB.tasks = DB.tasks.filter(t => t.caseId !== id); DB.protocols = DB.protocols.filter(p => p.caseId !== id);
    DB.cases = DB.cases.filter(x => x.id !== id);
    arDeleted().push({ id, kind: "case", no: c.no, at: Date.now(), by: ME().name, reason: why, early: !!early });
    arFilesGone(refs);
    VIEW = "faelle"; FARCH = true; ARG = null; toast(`${c.no} endgültig gelöscht`);
  });
}
function arDeleteObjectDlg(oid) {
  if (!isAdmin()) return;
  const o = objBy(oid); if (!arIs(o)) return;
  if (DB.cases.some(c => c.objectId === oid)) return toast("Erst alle Fälle des Objekts löschen.");
  arDelDialog("Objekt endgültig löschen", o, `Löscht <b>${esc(o.no)} · ${esc(o.title)}</b> mit allen Objektdaten und Dokumenten auf <b>allen Geräten</b>.`, 0, why => {
    const refs = SC.fileRefs({ objects: [o] });
    DB.objects = DB.objects.filter(x => x.id !== oid); DB.tasks = DB.tasks.filter(t => t.objectId !== oid);
    arDeleted().push({ id: oid, kind: "object", no: o.no, at: Date.now(), by: ME().name, reason: why, early: false });
    arFilesGone(refs);
    VIEW = "objekte"; OARCH = true; ARG = null; toast(`${o.no} endgültig gelöscht`);
  });
}

/* ---------- Einstellungen → Daten: Archiv & Aufbewahrung ---------- */
function arSettingsCard() {
  const y = arYears(), arch = arAll("cases").filter(arIs), due = arch.filter(c => arDueAt(c) <= Date.now()).sort((a, b) => arDueAt(a) - arDueAt(b));
  const log = (DB.settings.deleted || []).slice(-5).reverse();
  return `<div class="card" id="arcard"><h2>${ic("lock", 'style="width:17px"')}Archiv &amp; Aufbewahrung</h2>
   <div class="form"><label>Aufbewahrung Fälle</label><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><div class="seg">${[6, 10].map(n => `<button class="${y === n ? "on" : ""}" onclick="arSetYears(${n})">${n} Jahre</button>`).join("")}<button class="${y !== 6 && y !== 10 ? "on" : ""}" onclick="arSetYears(prompt('Aufbewahrung in Jahren','${y}'))">eigene${y !== 6 && y !== 10 ? `: ${y} J.` : ""}</button></div></div>
   <label>Fristbeginn</label><div class="hint" style="margin:0">Ende des Jahres des Abschlusses (ohne Abschluss: der Archivierung)</div>
   <label>Archiviert</label><div>${arch.length} Fälle · ${arAll("objects").filter(arIs).length} Objekte <button class="btn sm" onclick="FARCH=true;go('faelle')">Archiv öffnen</button></div>
   <label>Löschen fällig</label><div>${due.length ? due.map(c => `<div class="devrow"><b>${esc(c.no)}</b> ${esc(c.title)}<span class="sp"></span><span class="hint">seit ${dt(arDueAt(c))}</span><button class="btn sm" onclick="go('fall','${c.id}')">Öffnen</button></div>`).join("") : '<span class="tag ok">keine</span>'}</div>
   ${log.length ? `<label>Zuletzt gelöscht</label><div>${log.map(x => `<div class="hint" style="margin:0">${dt(x.at)} · ${x.kind === "case" ? "Fall" : "Objekt"} ${esc(x.no)} · ${esc(x.by || "")}${x.early ? " · vor Fristende: " + esc(x.reason || "") : ""}</div>`).join("")}</div>` : ""}</div>
   <p class="hint">Archivieren, Zurückholen und Löschen: im Fall bzw. Objekt oben rechts (nur Admins). Tablets blenden Archiviertes aus. Das Löschprotokoll enthält nur Nummer, Datum, Person und ggf. Begründung.</p></div>`;
}
function arSetYears(v) { const n = parseInt(v, 10); if (!(n > 0 && n < 100)) return; DB.settings.retention = { years: n }; save(); render(); }
