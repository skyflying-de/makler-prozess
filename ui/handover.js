/* Makler-Prozess 2.2 – Übergabe-Stammdaten am Objekt, Protokollverlauf, Vorbelegung neuer Protokolle,
   Mängelprüfung und Rückschreiben nach der Unterschrift. Wird nach app.js geladen. */
"use strict";

/* ---------- Hilfen ---------- */
// gleiche IDs auf allen Geräten (Migration läuft unabhängig auf PC und Tablet → keine Dubletten beim Abgleich)
const hoId = (...p) => { let h = 2166136261; for (const ch of p.join("|")) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return "h" + (h >>> 0).toString(36); };
const hoKitchen = s => s.type === "checklist" && /küche|gerät/i.test(s.title);
const hoCases = o => DB.cases.filter(c => c.objectId === o.id);
const hoProtos = o => { const ids = new Set(hoCases(o).map(c => c.id)); return DB.protocols.filter(p => ids.has(p.caseId)).sort((a, b) => b.date - a.date || b.created - a.created); };
const hoSec = (p, t) => p.sections.filter(s => s.type === t);
const hoNum = s => { const n = parseFloat(String(s || "").replace(/\./g, "").replace(",", ".")); return isNaN(n) ? null : n; };
const hoFmt = n => n === null ? "" : n.toLocaleString("de-DE", { maximumFractionDigits: 2 });
function hoDefects(p) { // alle Mängel eines Protokolls mit Fundstelle
  const out = [];
  p.sections.forEach(s => {
    if (s.type === "rooms") s.rooms.forEach(r => s.items.forEach(i => { const v = r.values[i.id]; if (isDefect(v)) out.push({ s, r, i, v, area: r.name, key: "r|" + r.name + "|" + i.label }); }));
    if (s.type === "checklist") s.items.forEach(i => { const v = s.values[i.id]; if (isDefect(v)) out.push({ s, r: null, i, v, area: s.title, key: "c|" + s.title + "|" + i.label }); });
  });
  return out;
}
function hoFixed(p) { const out = []; p.sections.forEach(s => { const all = s.type === "rooms" ? s.rooms.map(r => [r, r.values]) : [[null, s.values]]; all.forEach(([r, vs]) => s.items.forEach(i => { const v = vs[i.id]; if (v && v.fixedFrom) out.push({ area: r ? r.name : s.title, i, v }); })); }); return out; }
const hoPhotos = p => typeof countPhotos === "function" ? countPhotos(p) : 0;
function hoKeysTotal(p) { let n = 0; hoSec(p, "keys").forEach(s => s.items.forEach(i => { n += parseInt(s.values[i.id] && s.values[i.id].n) || 0; })); return n; }
function hoMeters(p) { const out = []; hoSec(p, "meters").forEach(s => s.items.forEach(i => { const v = s.values[i.id] || {}; out.push({ id: i.id, label: i.label, nr: v.nr || "", stand: v.stand || "", prev: v.prev || null }); })); return out; }
function hoTenant(p) { const g = p.sections.find(s => s.type === "fields"); const it = g && g.items.find(i => /anwesend mieter/i.test(i.label)); const c = caseBy(p.caseId); return (it && g.values[it.id]) || (c && fieldVal(c, "Neuer Mieter")) || ""; }
function hoClosing(p) { const out = []; p.sections.filter(s => s.type === "fields").forEach((s, k) => { if (k === 0) return; s.items.filter(i => i.ftype === "textarea").forEach(i => { if (s.values[i.id]) out.push({ s, i, val: s.values[i.id] }); }); }); return out; }

/* ---------- Stammdaten: Aufbau / Migration ---------- */
function hoFromTemplate(o) {
  const T = DB.settings.protocol, rs = T.sections.find(s => s.active && s.type === "rooms"), ms = T.sections.find(s => s.active && s.type === "meters"), ks = T.sections.find(s => s.active && s.type === "keys"), kc = T.sections.find(s => s.active && hoKitchen(s));
  return { v: 1, src: "Vorlage",
    rooms: (rs ? rs.rooms : []).map(n => ({ id: hoId(o.id, "r", n), name: n })),
    meters: (ms ? ms.items : []).map(i => ({ id: hoId(o.id, "m", i.label), label: i.label, nr: "", loc: "", last: null })),
    keys: (ks ? ks.items : []).map(i => ({ id: hoId(o.id, "k", i.label), label: i.label, n: "", note: "" })),
    devices: (kc ? kc.items : []).map(i => ({ id: hoId(o.id, "d", i.label), label: i.label })) };
}
function hoFromProtocol(o, p) {
  const h = hoFromTemplate(o); h.src = p.no;
  const rs = hoSec(p, "rooms")[0]; if (rs) h.rooms = rs.rooms.map(r => ({ id: hoId(o.id, "r", r.name), name: r.name }));
  const ms = hoSec(p, "meters")[0];
  if (ms) h.meters = ms.items.map(i => { const v = ms.values[i.id] || {}; return { id: hoId(o.id, "m", i.label), label: i.label, nr: v.nr || "", loc: "", last: v.stand ? { stand: v.stand, date: p.date, pno: p.no } : null }; });
  const ks = hoSec(p, "keys")[0];
  if (ks) h.keys = ks.items.map(i => { const v = ks.values[i.id] || {}; return { id: hoId(o.id, "k", i.label), label: i.label, n: v.n || "", note: v.note || "" }; });
  const kc = p.sections.find(hoKitchen); if (kc) h.devices = kc.items.map(i => ({ id: hoId(o.id, "d", i.label), label: i.label }));
  return h;
}
function hoEnsure(o) {
  if (o.handover && o.handover.v) return o.handover;
  const ps = hoProtos(o), base = ps.find(p => p.status === "signed") || ps[0];
  o.handover = base ? hoFromProtocol(o, base) : hoFromTemplate(o);
  return o.handover;
}
const _hoMigrate = migrate;
migrate = function () { _hoMigrate(); if (DB && DB.objects) DB.objects.forEach(hoEnsure); };

/* ---------- Neues Protokoll aus Objekt + Basis ---------- */
const _hoMake = makeProtocol;
makeProtocol = function (st, c, kind, user, opt) {
  const p = _hoMake(st, c, kind, user); if (!DB || !DB.objects) return p; // Beispieldaten werden vor DB erzeugt
  const o = objBy(c.objectId), H = o ? hoEnsure(o) : null; p.hoV = 1;
  opt = opt || { meterNr: true, meterStand: true, keys: true };
  const base = opt.base ? DB.protocols.find(x => x.id === opt.base) : null;
  if (H) {
    const rs = hoSec(p, "rooms")[0]; if (rs && H.rooms.length) rs.rooms = H.rooms.map(r => ({ id: uid(), name: r.name, values: {} }));
    const kc = p.sections.find(hoKitchen); if (kc && H.devices.length) kc.items = H.devices.map(d => ({ id: d.id, label: d.label, ftype: "text", options: "" }));
    const bm = base ? hoMeters(base) : [];
    const ms = hoSec(p, "meters")[0];
    if (ms && H.meters.length) {
      ms.items = H.meters.map(m => ({ id: m.id, label: m.label + (m.loc ? " (" + m.loc + ")" : ""), ftype: "text", options: "", hoLabel: m.label }));
      H.meters.forEach(m => {
        const b = bm.find(x => x.id === m.id) || bm.find(x => x.label.replace(/ \(.*\)$/, "") === m.label), val = {};
        if (opt.meterNr) val.nr = (b && b.nr) || m.nr || "";
        if (opt.meterStand) { const pv = b && b.stand ? { stand: b.stand, date: base.date, pno: base.no } : m.last; if (pv) val.prev = pv; }
        if (Object.keys(val).length) ms.values[m.id] = val;
      });
    }
    const ks = hoSec(p, "keys")[0];
    if (ks && H.keys.length) {
      const bk = base ? (hoSec(base, "keys")[0] || null) : null;
      ks.items = H.keys.map(k => ({ id: k.id, label: k.label, ftype: "text", options: "" }));
      if (opt.keys) H.keys.forEach(k => {
        const bi = bk && (bk.items.find(i => i.id === k.id) || bk.items.find(i => i.label === k.label)), bv = bi ? bk.values[bi.id] : null;
        const n = bv && bv.n !== undefined && bv.n !== "" ? bv.n : k.n;
        if (n !== "" && n !== undefined) ks.values[k.id] = { n: String(n), note: (bv && bv.note) || k.note || "" };
      });
    }
  }
  if (base) {
    p.base = { id: base.id, no: base.no };
    // Mängel nach Entscheidung: übernehmen (ggf. mit Fotos) oder behoben
    const dec = opt.defects || {};
    hoDefects(base).forEach(d => {
      const how = dec[d.key]; if (!how) return;
      const ns = p.sections.find(s => s.type === d.s.type && (d.s.type === "rooms" || s.title === d.s.title)); if (!ns) return;
      let tgt;
      if (d.s.type === "rooms") { let r = ns.rooms.find(x => x.name === d.r.name); if (!r) { r = { id: uid(), name: d.r.name, values: {} }; ns.rooms.push(r); } tgt = r.values; } else tgt = ns.values;
      const it = ns.items.find(i => i.label === d.i.label); if (!it) return;
      if (how === "take") { const ph = opt.withPhotos ? [...(d.v.photos || [])] : []; tgt[it.id] = { z: d.v.z, note: d.v.note || "", from: base.no, ...(ph.length ? { photos: ph, photosFrom: [...ph] } : {}) }; }
      else tgt[it.id] = { fixedFrom: base.no, fixedNote: d.v.note || "" };
    });
    if (opt.closing) hoClosing(base).forEach(x => { const ns = p.sections.find(s => s.type === "fields" && s.title === x.s.title); const it = ns && ns.items.find(i => i.label === x.i.label); if (it) ns.values[it.id] = x.val; });
  }
  return p;
};
// geerbte Fotos gehören dem alten Protokoll – beim Entfernen nur die Verknüpfung lösen
rmPhoto = function (pid, sid, rid, iid, k) {
  if (!confirm("Foto entfernen?")) return;
  const t = ptgt(pById(pid), sid, rid || null), v = t[iid], x = v.photos.splice(k, 1)[0];
  const inherited = v.photosFrom && v.photosFrom.includes(x);
  if (inherited) v.photosFrom = v.photosFrom.filter(y => y !== x);
  else if (x && !String(x).startsWith("data:")) delFile(x).catch(() => {});
  save(); CAP ? drawCap() : render();
};

/* ---------- Dialog: Protokoll anlegen (Basis, Übernahme, Mängelprüfung) ---------- */
function addProto(cid, kind, basePid) { hoNewProto({ cid, kind, base: basePid }); }
function hoNewProto({ cid, oid, kind, base }) {
  const c0 = cid ? caseBy(cid) : null, o = objBy(oid || (c0 && c0.objectId)); if (!o) return;
  const rent = hoCases(o).filter(c => c.type === "rent");
  if (!rent.length) { toast("Für dieses Objekt gibt es noch keinen Vermietungsfall – bitte zuerst einen Auftrag „Vermietung“ anlegen."); return; }
  const ps = hoProtos(o), last = ps.find(p => p.status === "signed") || ps[0];
  const W = { cid: (c0 || rent.find(c => !c.closed) || rent[0]).id, kind: kind || (last && last.kind === "Einzug" ? "Auszug" : "Einzug"), mode: base ? "other" : last ? "last" : "none", other: base || (ps[0] && ps[0].id) || "",
    defects: true, withPhotos: true, meterNr: true, meterStand: true, keys: true, closing: false, step: 1, dec: {} };
  const ov = document.createElement("div"); ov.className = "ov"; document.body.appendChild(ov);
  const baseP = () => W.mode === "last" ? last : W.mode === "other" ? DB.protocols.find(p => p.id === W.other) : null;
  const close = () => { ov.remove(); document.removeEventListener("keydown", kd); };
  const kd = e => { if (e.key === "Escape") close(); }; document.addEventListener("keydown", kd);
  const opt = (n, l, dis) => `<label class="hoopt ${dis ? "dis" : ""}"><input type="checkbox" data-o="${n}" ${W[n] ? "checked" : ""} ${dis ? "disabled" : ""}> ${l}</label>`;
  const draw = () => {
    const b = baseP(), defs = b ? hoDefects(b) : [];
    let body;
    if (W.step === 1) body = `<div class="form"><label>Vorgang</label><select data-w="cid">${rent.map(c => `<option value="${c.id}" ${c.id === W.cid ? "selected" : ""}>${esc(c.no)} · ${esc(c.title)}${c.closed ? " (abgeschlossen)" : ""}</option>`).join("")}</select>
       <label>Art</label><div class="seg">${["Einzug", "Auszug"].map(k => `<button type="button" data-k="${k}" class="${W.kind === k ? "on" : ""}">${k}</button>`).join("")}</div></div>
      <div class="banner" style="margin:12px 0">${ic("home", 'style="width:16px"')}Räume, Zähler, Schlüssel und Geräte kommen aus den Übergabe-Stammdaten des Objekts.</div>
      <b style="font-size:13px">Basis</b><div class="hobase">
       <label><input type="radio" name="hom" value="last" ${W.mode === "last" ? "checked" : ""} ${last ? "" : "disabled"}> letztes Protokoll ${last ? `<b>${esc(last.no)}</b> · ${last.kind} · ${dt(last.date)}` : "<span class='hint'>(keins vorhanden)</span>"}</label>
       <label><input type="radio" name="hom" value="other" ${W.mode === "other" ? "checked" : ""} ${ps.length ? "" : "disabled"}> anderes Protokoll <select data-w="other" ${W.mode === "other" ? "" : "disabled"}>${ps.map(p => `<option value="${p.id}" ${p.id === W.other ? "selected" : ""}>${esc(p.no)} · ${p.kind} · ${dt(p.date)} · ${PSTAT[p.status][0]}</option>`).join("")}</select></label>
       <label><input type="radio" name="hom" value="none" ${W.mode === "none" ? "checked" : ""}> leer (nur Objektdaten)</label></div>
      <b style="font-size:13px">Übernehmen</b><div class="hoopts">
       ${opt("defects", `bisherige Mängel${b ? ` (${defs.length})` : ""}`, !b)}${W.defects && b ? `<span class="hoopt sub"><label><input type="radio" name="hop" value="1" ${W.withPhotos ? "checked" : ""}> mit Fotos</label><label><input type="radio" name="hop" value="0" ${W.withPhotos ? "" : "checked"}> ohne Fotos</label></span>` : ""}
       ${opt("meterNr", "Zählernummern")}${opt("meterStand", "bisherige Zählerstände (als Vorwert)")}${opt("keys", "Anzahl Schlüssel")}${opt("closing", "Abschlussanmerkungen", !b)}</div>`;
    else body = `<p style="margin-top:0">Mängel aus <b>${esc(b.no)}</b> (${b.kind}, ${dt(b.date)}) kurz prüfen: Besteht der Mangel noch, wird er übernommen; ist er beseitigt, wird er als <b>behoben</b> vermerkt.</p>
      <div class="hodefs">${defs.map((d, k) => `<div class="hodef"><div class="hodefi">${(d.v.photos || []).slice(0, 1).map(x => `<img src="${psrc(x)}" alt="Foto">`).join("") || `<span class="hodefn">${ic("bell", 'style="width:18px"')}</span>`}
        <div><b>${esc(d.area)} · ${esc(d.i.label)}</b><div class="hint">${esc(d.v.z)}${d.v.note ? " · " + esc(d.v.note) : ""}${d.v.from ? ` · seit ${esc(d.v.from)}` : ""}${(d.v.photos || []).length ? ` · 📷 ${d.v.photos.length}` : ""}</div></div></div>
        <div class="seg"><button type="button" data-d="${k}" data-v="take" class="${W.dec[d.key] !== "fixed" ? "on" : ""}">übernehmen</button><button type="button" data-d="${k}" data-v="fixed" class="${W.dec[d.key] === "fixed" ? "on" : ""}">behoben</button></div></div>`).join("")}</div>
      <div style="display:flex;gap:8px;margin-top:10px"><button class="btn sm" type="button" data-all="take">Alle übernehmen</button><button class="btn sm" type="button" data-all="fixed">Alle behoben</button></div>`;
    const needStep2 = b && W.defects && defs.length;
    ov.innerHTML = `<div class="modal hodlg" role="dialog" aria-label="Protokoll anlegen"><header>${W.kind}sprotokoll anlegen · ${esc(o.title)}${needStep2 ? ` <span class="hint">Schritt ${W.step}/2</span>` : ""}</header><div class="b">${body}<div class="err"></div></div>
      <footer><button class="btn" data-x="c">Abbrechen</button>${W.step === 2 ? `<button class="btn" data-x="back">Zurück</button>` : ""}${W.step === 1 && needStep2 ? `<button class="btn pri" data-x="next">Weiter: Mängel prüfen (${defs.length})</button>` : `<button class="btn pri" data-x="ok">${ic("edit")}Anlegen &amp; erfassen</button>`}</footer></div>`;
    ov.querySelector("[data-x=c]").onclick = close;
    const on = (sel, f) => ov.querySelectorAll(sel).forEach(e => e.onclick = () => f(e));
    on("[data-k]", e => { W.kind = e.dataset.k; draw(); });
    ov.querySelectorAll("[name=hom]").forEach(e => e.onchange = () => { W.mode = e.value; W.dec = {}; draw(); });
    ov.querySelectorAll("[name=hop]").forEach(e => e.onchange = () => { W.withPhotos = e.value === "1"; });
    ov.querySelectorAll("[data-w]").forEach(e => e.onchange = () => { W[e.dataset.w] = e.value; if (e.dataset.w === "other") W.dec = {}; draw(); });
    ov.querySelectorAll("[data-o]").forEach(e => e.onchange = () => { W[e.dataset.o] = e.checked; draw(); });
    on("[data-d]", e => { W.dec[defs[+e.dataset.d].key] = e.dataset.v; draw(); });
    on("[data-all]", e => { defs.forEach(d => W.dec[d.key] = e.dataset.all); draw(); });
    on("[data-x=next]", () => { W.step = 2; draw(); });
    on("[data-x=back]", () => { W.step = 1; draw(); });
    on("[data-x=ok]", () => {
      const c = caseBy(W.cid), decisions = {};
      if (b && W.defects) defs.forEach(d => decisions[d.key] = W.dec[d.key] || "take");
      const p = makeProtocol(DB.settings, c, W.kind, DB.ui.user, { base: b ? b.id : null, defects: decisions, withPhotos: W.withPhotos, meterNr: W.meterNr, meterStand: W.meterStand, keys: W.keys, closing: W.closing && !!b });
      DB.protocols.push(p); PSEL = p.id; close(); save();
      if (VIEW !== "fall" || ARG !== c.id) { TAB = "proto"; VIEW = "fall"; ARG = c.id; }
      render(); toast(`${W.kind}sprotokoll ${p.no} angelegt${b ? " – Basis " + b.no : ""}`); openCapture(p.id);
    });
  };
  draw();
}

/* ---------- Nach der Unterschrift: Abweichungen ins Objekt übernehmen ---------- */
function hoDiff(p) {
  const c = caseBy(p.caseId), o = c && objBy(c.objectId); if (!o) return [];
  const H = hoEnsure(o), out = [];
  hoMeters(p).forEach(m => {
    const om = H.meters.find(x => x.id === m.id) || H.meters.find(x => x.label === m.label.replace(/ \(.*\)$/, ""));
    if (!om) { if (m.nr || m.stand) out.push({ k: "mnew", label: `Neuer Zähler „${m.label}“`, detail: [m.nr, m.stand].filter(Boolean).join(" · "), m, on: true }); return; }
    if (m.nr && m.nr !== om.nr) out.push({ k: "mnr", label: `Zählernummer ${om.label}`, detail: `${om.nr || "–"} → ${m.nr}`, om, m, on: true });
    if (m.stand && (!om.last || om.last.pno !== p.no || om.last.stand !== m.stand)) out.push({ k: "mst", label: `Zählerstand ${om.label}`, detail: `${om.last ? om.last.stand : "–"} → ${m.stand} (${dt(p.date)})`, om, m, on: true });
  });
  const ks = hoSec(p, "keys")[0];
  if (ks) ks.items.forEach(i => { const v = ks.values[i.id] || {}, ok = H.keys.find(x => x.id === i.id) || H.keys.find(x => x.label === i.label); if (ok && v.n !== undefined && v.n !== "" && String(v.n) !== String(ok.n)) out.push({ k: "key", label: `Schlüssel ${ok.label}`, detail: `${ok.n || "–"} → ${v.n}`, ok, v, on: true }); });
  const rs = hoSec(p, "rooms")[0];
  if (rs) {
    rs.rooms.forEach(r => { if (!H.rooms.some(x => x.name === r.name)) out.push({ k: "radd", label: `Neuer Raum „${r.name}“`, detail: "in die Stammdaten aufnehmen", name: r.name, on: true }); });
    H.rooms.forEach(x => { if (!rs.rooms.some(r => r.name === x.name)) out.push({ k: "rdel", label: `Raum „${x.name}“`, detail: "im Protokoll entfernt – auch aus den Stammdaten löschen?", room: x, on: false }); });
  }
  return out;
}
function hoApply(p, list) {
  const o = objBy(caseBy(p.caseId).objectId), H = hoEnsure(o);
  list.forEach(d => {
    if (d.k === "mnr") d.om.nr = d.m.nr;
    if (d.k === "mst") d.om.last = { stand: d.m.stand, date: p.date, pno: p.no };
    if (d.k === "mnew") H.meters.push({ id: hoId(o.id, "m", d.m.label), label: d.m.label, nr: d.m.nr, loc: "", last: d.m.stand ? { stand: d.m.stand, date: p.date, pno: p.no } : null });
    if (d.k === "key") d.ok.n = String(d.v.n);
    if (d.k === "radd") H.rooms.push({ id: hoId(o.id, "r", d.name), name: d.name });
    if (d.k === "rdel") H.rooms = H.rooms.filter(r => r.id !== d.room.id);
  });
}
function hoAfterSign(pid) {
  const p = DB.protocols.find(x => x.id === pid); if (!p || !p.hoV || p.status !== "signed" || p.hoDone) return;
  const list = hoDiff(p);
  if (!list.length) { p.hoDone = Date.now(); save(); return; }
  modal(`Objektdaten aktualisieren · ${p.no}`, `<p style="margin-top:0">Im unterschriebenen Protokoll weichen folgende Angaben von den Übergabe-Stammdaten des Objekts ab. Ausgewählte Punkte werden ins Objekt übernommen und gelten für künftige Protokolle.</p>
    <div class="hodiff">${list.map((d, k) => `<label><input type="checkbox" name="d${k}" ${d.on ? "checked" : ""}><span><b>${esc(d.label)}</b><span class="hint">${esc(d.detail)}</span></span></label>`).join("")}</div>`,
  { ok: "Übernehmen", extra: `<button class="btn" data-x="no">Nicht übernehmen</button>`, onOk: ov => { hoApply(p, list.filter((d, k) => v(ov, "d" + k))); p.hoDone = Date.now(); toast("Objektdaten aktualisiert"); } });
  const ov = [...document.querySelectorAll(".ov")].pop(); const no = ov && ov.querySelector("[data-x=no]");
  if (no) no.onclick = () => { ov.close(); p.hoDone = Date.now(); save(); render(); };
}
const hoPending = p => !!p.hoV && p.status === "signed" && !p.hoDone && hoDiff(p).length > 0; // nur Protokolle ab 2.2
const hoMg = n => n + (n === 1 ? " Mangel" : " Mängel");

/* ---------- Objekt: Hinweisleiste, Reiter „Übergabe“ ---------- */
function hoLastBar(o) {
  const ps = hoProtos(o); if (!ps.length) return "";
  const p = ps[0], defs = hoDefects(p).length, cls = p.status !== "signed" ? "draft" : defs ? "warn" : "ok";
  return `<div class="holast ${cls}">${ic("lock", 'style="width:15px"')}<b>Letzte Übergabe:</b> ${p.kind} ${dt(p.date)} · ${esc(p.no)} · ${PSTAT[p.status][0]}${p.status !== "signed" ? ` · ${protoStats(p).pc} %` : ""}${defs ? ` · <b>${hoMg(defs)}${p.status === "signed" ? " offen" : ""}</b>` : p.status === "signed" ? " · mängelfrei" : ""}
    <span class="sp"></span><button class="btn sm" onclick="hoOpen('${p.id}')">Protokoll öffnen</button></div>`;
}
function hoOpen(pid) { const p = DB.protocols.find(x => x.id === pid); if (!p) return; PSEL = p.id; TAB = "proto"; go("fall", p.caseId); }
function hoPdf(pid) { printDoc(buildProtoDoc(DB.protocols.find(x => x.id === pid)), (DB.protocols.find(x => x.id === pid).no) + ".pdf"); }
let HOOPEN = {};
function hoObjTab(o) {
  const H = hoEnsure(o), ps = hoProtos(o), last = ps[0], lastS = ps.find(p => p.status === "signed");
  const defsL = lastS ? hoDefects(lastS) : [], fixL = lastS ? hoFixed(lastS) : [];
  const newD = defsL.filter(d => !d.v.from).length, oldD = defsL.length - newD;
  const lastRead = H.meters.map(m => m.last && m.last.date).filter(Boolean).sort((a, b) => b - a)[0];
  const keysT = H.keys.reduce((a, k) => a + (parseInt(k.n) || 0), 0);
  let h = `<div class="hosum">
    <div class="card"><span class="k">Status letzte Übergabe</span>${last ? `<b style="color:var(--${last.status === "signed" ? "ok" : last.status === "ready" ? "warn" : "mute"})">${last.status === "signed" ? "✓ " : ""}${PSTAT[last.status][0]}</b><span class="hint">${last.kind} · ${dt(last.date)}${last.signMode ? " · " + (last.signMode === "digital" ? "digital" : "Papier") : ""}</span>` : `<b class="muted">–</b><span class="hint">noch kein Protokoll</span>`}</div>
    <div class="card"><span class="k">Offene Mängel</span><b style="color:${defsL.length ? "var(--bad)" : "var(--ok)"}">${lastS ? defsL.length : "–"}</b><span class="hint">${lastS ? (defsL.length || fixL.length ? [newD ? newD + " neu" : "", oldD ? oldD + " übernommen" : "", fixL.length ? fixL.length + " behoben" : ""].filter(Boolean).join(" · ") : "mängelfrei") : "laut letztem unterschriebenen Protokoll"}</span></div>
    <div class="card"><span class="k">Zähler</span><b>${H.meters.length}</b><span class="hint">${lastRead ? "zuletzt abgelesen " + dt(lastRead) : "noch nicht abgelesen"}</span></div>
    <div class="card"><span class="k">Schlüssel</span><b>${keysT || "–"}</b><span class="hint">${H.keys.filter(k => parseInt(k.n)).map(k => k.n + " " + k.label).join(" · ") || "Anzahl noch offen"}</span></div></div>`;
  const pend = ps.filter(hoPending);
  if (pend.length) h += `<div class="banner" style="background:var(--warn-soft);color:var(--warn)">${ic("bell", 'style="width:16px"')}${pend[0].no}: Angaben weichen von den Objektdaten ab.<span class="sp"></span><button class="btn sm" onclick="hoAfterSign('${pend[0].id}')">Prüfen &amp; übernehmen</button></div>`;
  h += `<div class="card"><h2>${ic("doc", 'style="width:17px"')}Protokollverlauf<span class="sp"></span><button class="btn sm pri" onclick="hoNewProto({oid:'${o.id}'})">${ic("plus")}Neues Protokoll</button></h2>`;
  if (!ps.length) h += `<div class="hint">Noch keine Übergabeprotokolle zu diesem Objekt. Neue Protokolle werden aus den Stammdaten unten vorbelegt.</div>`;
  else h += `<div class="hotl">${ps.map((p, idx) => {
    const st = protoStats(p), defs = hoDefects(p), nd = defs.filter(d => !d.v.from).length, fx = hoFixed(p), ph = hoPhotos(p), kt = hoKeysTotal(p), ms = hoMeters(p).filter(m => m.stand || m.nr);
    const na = hoClosing(p).map(x => x.val).join(" · "), open = HOOPEN[p.id] !== undefined ? HOOPEN[p.id] : idx === ps.findIndex(x => x.status === "signed");
    const prevP = ps.slice(idx + 1).find(x => x.status === "signed"), pm = prevP ? hoMeters(prevP) : [];
    return `<div class="hoi ${p.status}"><div class="hoh"><span class="tag rent">${p.kind}</span><h3>${dt(p.date)} · ${esc(p.no)}</h3><span class="tag ${PSTAT[p.status][1]}">${p.status === "signed" ? "✓ " : ""}${PSTAT[p.status][0]}${p.status !== "signed" ? " · " + st.pc + " %" : ""}</span>
      <span class="hint">${[hoTenant(p) ? "Mieter: " + esc(hoTenant(p)) : "", p.signMode ? (p.signMode === "digital" ? "digital" : "Papier") : "", p.sent ? "an Mieter gesendet" : "", p.base ? "Basis " + esc(p.base.no) : ""].filter(Boolean).join(" · ")}</span>
      <span class="hoacts">${p.status === "signed" ? `<button class="btn sm" onclick="hoOpen('${p.id}')">Öffnen</button><button class="btn sm" onclick="hoPdf('${p.id}')">${ic("print")}PDF</button><button class="btn sm" onclick="hoNewProto({oid:'${o.id}',base:'${p.id}'})">Als Basis</button>` : `<button class="btn sm pri" onclick="hoOpen('${p.id}')">Weiter erfassen</button><button class="btn sm" onclick="hoNewProto({oid:'${o.id}',base:'${p.id}'})">Als Basis</button>`}</span></div>
      <div class="hochips">${p.status !== "signed" ? `<span class="chip">${st.done}/${st.tot} Prüfpunkte</span>` : ""}${defs.length ? `<span class="chip bad">⚠ ${hoMg(defs.length)}${nd && nd < defs.length ? ` (${nd} neu)` : ""}</span>` : p.status === "signed" ? `<span class="chip ok">✓ mängelfrei</span>` : ""}${fx.length ? `<span class="chip ok">✓ ${fx.length} behoben</span>` : ""}${ph ? `<span class="chip">📷 ${ph}</span>` : ""}${ms.length ? `<span class="chip">⚡ ${ms.length} Zähler</span>` : ""}${kt ? `<span class="chip">🔑 ${kt} Schlüssel</span>` : ""}${na ? `<span class="chip">📝 ${esc(na.length > 60 ? na.slice(0, 57) + "…" : na)}</span>` : ""}
       ${defs.length || ms.length ? `<button class="chip lnk" onclick="HOOPEN['${p.id}']=${!open};render()">${open ? "Details ▴" : "Details ▾"}</button>` : ""}</div>
      ${open && (defs.length || ms.length || fx.length) ? `<div class="hodet"><div>${defs.length || fx.length ? `<b>Mängel</b>${defs.map(d => `<div class="hom">${(d.v.photos || []).slice(0, 1).map(x => `<img src="${psrc(x)}" alt="Foto" onclick="showImg(this.src)">`).join("") || `<span class="hodefn">!</span>`}<div><b>${esc(d.area)} · ${esc(d.i.label)}</b><div class="hint">${esc(d.v.note || d.v.z)} · ${d.v.from ? `<span class="tag grey">seit ${esc(d.v.from)}</span>` : `<span class="tag warn">neu</span>`}</div></div></div>`).join("")}${fx.map(f => `<div class="hom"><span class="hodefn ok">✓</span><div><b>${esc(f.area)} · ${esc(f.i.label)}</b><div class="hint">behoben seit ${esc(f.v.fixedFrom)}${f.v.fixedNote ? " · " + esc(f.v.fixedNote) : ""}</div></div></div>`).join("")}` : ""}</div>
       <div>${ms.length ? `<b>Zählerstände</b><table class="mini"><tr><th>Zähler</th><th>Nr.</th><th>Stand</th>${pm.length ? `<th>Δ ${esc(prevP.no)}</th>` : ""}</tr>${ms.map(m => { const q = pm.find(x => x.id === m.id || x.label === m.label), a = hoNum(m.stand), b = q ? hoNum(q.stand) : null; return `<tr><td>${esc(m.label)}</td><td>${esc(m.nr)}</td><td>${esc(m.stand)}</td>${pm.length ? `<td>${a !== null && b !== null ? (a - b >= 0 ? "+" : "") + hoFmt(a - b) : ""}</td>` : ""}</tr>`; }).join("")}</table>` : ""}</div></div>` : ""}</div>`;
  }).join("")}</div>`;
  h += `</div>`;
  // Stammdaten
  h += `<div class="card"><h2>${ic("home", 'style="width:17px"')}Übergabe-Stammdaten<span class="hint">Grundlage für neue Protokolle${H.src ? " · ursprünglich aus " + esc(H.src) : ""}</span></h2>
    <div class="hosec"><div class="hosh"><b>Räume</b><button class="btn sm" onclick="hoEdit('${o.id}','rooms')">${ic("edit")}Bearbeiten</button></div><div class="horooms">${H.rooms.map(r => `<span>${esc(r.name)}</span>`).join("") || '<span class="hint">keine</span>'}</div></div>
    <div class="hogrid"><div class="hosec"><div class="hosh"><b>Zähler</b><button class="btn sm" onclick="hoEdit('${o.id}','meters')">${ic("edit")}Bearbeiten</button></div>
      <table class="mini"><tr><th>Art</th><th>Nummer</th><th>Lage</th><th>letzter Stand</th></tr>${H.meters.map(m => `<tr><td>${esc(m.label)}</td><td>${esc(m.nr || "–")}</td><td>${esc(m.loc || "")}</td><td>${m.last ? `${esc(m.last.stand)} · ${dt(m.last.date)}` : "–"}</td></tr>`).join("") || '<tr><td colspan="4" class="hint">keine</td></tr>'}</table></div>
     <div class="hosec"><div class="hosh"><b>Schlüssel</b><button class="btn sm" onclick="hoEdit('${o.id}','keys')">${ic("edit")}Bearbeiten</button></div>
      <table class="mini"><tr><th>Schlüssel</th><th>Anzahl</th><th>Bemerkung</th></tr>${H.keys.map(k => `<tr><td>${esc(k.label)}</td><td>${esc(k.n || "–")}</td><td>${esc(k.note || "")}</td></tr>`).join("") || '<tr><td colspan="3" class="hint">keine</td></tr>'}</table>
      <div class="hosh" style="margin-top:12px"><b>Einbauküche / Geräte</b><button class="btn sm" onclick="hoEdit('${o.id}','devices')">${ic("edit")}Bearbeiten</button></div><div class="hint">${H.devices.map(d => esc(d.label)).join(" · ") || "keine"}</div></div></div></div>`;
  return h;
}

/* ---------- Stammdaten bearbeiten (Zeilen anlegen / ändern / löschen / sortieren) ---------- */
function hoEdit(oid, kind) {
  const o = objBy(oid), H = hoEnsure(o);
  const cols = { rooms: [["name", "Raum"]], devices: [["label", "Gerät / Prüfpunkt"]], meters: [["label", "Art"], ["nr", "Zählernummer"], ["loc", "Lage"]], keys: [["label", "Schlüssel"], ["n", "Anzahl"], ["note", "Bemerkung"]] }[kind];
  const title = { rooms: "Räume", devices: "Einbauküche / Geräte", meters: "Zähler", keys: "Schlüssel" }[kind];
  let rows = H[kind].map(x => ({ ...x }));
  const ov = modal(title + " · " + o.title, `<div class="hoedit"></div><button class="btn sm" type="button" data-add>${ic("plus")}Zeile hinzufügen</button>
    <p class="hint">Reihenfolge mit ▲▼. Gilt für neue Protokolle; bestehende Protokolle bleiben unverändert.</p>`, { wide: kind === "meters" || kind === "keys", onOk: () => {
      grab(); const keyF = cols[0][0];
      const clean = rows.filter(r => String(r[keyF] || "").trim());
      clean.forEach(r => { r[keyF] = r[keyF].trim(); if (!r.id) r.id = hoId(o.id, kind[0], r[keyF], Date.now(), Math.random()); });
      const dup = clean.map(r => r[keyF].toLowerCase()).find((n, i, a) => a.indexOf(n) !== i); if (dup) throw new Error(`„${dup}“ ist doppelt.`);
      H[kind] = clean; toast(title + " gespeichert");
    } });
  const box = ov.querySelector(".hoedit");
  const grab = () => box.querySelectorAll(".hor").forEach((el, k) => cols.forEach(([f]) => { rows[k][f] = el.querySelector(`[data-f="${f}"]`).value; }));
  const draw = () => {
    box.innerHTML = rows.map((r, k) => `<div class="hor">${cols.map(([f, l]) => `<input data-f="${f}" value="${esc(r[f] || "")}" placeholder="${l}" ${f === "n" ? 'inputmode="numeric" style="max-width:90px"' : ""}>`).join("")}
      <button class="ib" type="button" data-up="${k}" aria-label="nach oben" ${k ? "" : "disabled"}>▲</button><button class="ib" type="button" data-dn="${k}" aria-label="nach unten" ${k < rows.length - 1 ? "" : "disabled"}>▼</button><button class="ib" type="button" data-rm="${k}" aria-label="löschen">${ic("trash")}</button></div>`).join("") || '<div class="hint">Keine Einträge.</div>';
    box.querySelectorAll("[data-up]").forEach(b => b.onclick = () => { grab(); const k = +b.dataset.up; [rows[k - 1], rows[k]] = [rows[k], rows[k - 1]]; draw(); });
    box.querySelectorAll("[data-dn]").forEach(b => b.onclick = () => { grab(); const k = +b.dataset.dn; [rows[k + 1], rows[k]] = [rows[k], rows[k + 1]]; draw(); });
    box.querySelectorAll("[data-rm]").forEach(b => b.onclick = () => { grab(); rows.splice(+b.dataset.rm, 1); draw(); });
  };
  ov.querySelector("[data-add]").onclick = () => { grab(); rows.push({}); draw(); const l = box.querySelectorAll(".hor"); if (l.length) l[l.length - 1].querySelector("input").focus(); };
  draw();
}

/* ---------- Anzeige im Protokoll: Vorwerte, übernommene / behobene Mängel ---------- */
function hoItemHint(v) {
  if (!v) return "";
  if (v.fixedFrom) return `<div class="hohint ok">✓ behoben seit ${esc(v.fixedFrom)}${v.fixedNote ? ": " + esc(v.fixedNote) : ""}</div>`;
  if (v.from) return `<div class="hohint">aus ${esc(v.from)} übernommen</div>`;
  return "";
}
function hoPrevHint(v) { return v && v.prev ? `<div class="hohint">Vorwert ${esc(v.prev.stand)} · ${dt(v.prev.date)}${v.prev.pno ? " · " + esc(v.prev.pno) : ""}</div>` : ""; }
