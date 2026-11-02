/* Makler-Prozess 2.4 – Übergabeprotokoll: Zimmertürschlüssel je Raum, Anmerkungen / weitere Mängel je Raum,
   Feld „Sonstiges“ (Popup von überall), Block „Anleitungen“, „+“-Menü je Raum. Wird nach handover.js geladen. */
"use strict";

const PX_SONST = "Sonstiges";
const PX_FORMS = [["Papier", "Papier", "ok"], ["digital", "digital", "sale"], ["nein", "nicht übergeben", "warn"]];
const pxLocked = p => !p || p.status === "signed";
const pxRedraw = () => setTimeout(() => { if (typeof CAP !== "undefined" && CAP) drawCap(); }, 0);

/* ---------- Sonstiges-Feld: in Vorlage und offenen Protokollen oberhalb der Vereinbarungen ---------- */
function pxSonstHost(secs) { // Abschnitt mit „Vereinbarte Nacharbeiten“ bzw. „Sonstiges“, sonst letzter Angaben-Abschnitt
  const f = secs.filter(s => s.type === "fields");
  return f.find(s => s.items.some(i => i.label === PX_SONST)) || f.find(s => s.items.some(i => /^vereinbart/i.test(i.label))) || f[f.length - 1] || null;
}
function pxEnsureSonst(secs, mkId) {
  const h = pxSonstHost(secs); if (!h) return null;
  let it = h.items.find(i => i.label === PX_SONST);
  if (!it) {
    it = { id: mkId(), label: PX_SONST, ftype: "textarea", options: "" };
    const k = h.items.findIndex(i => /^vereinbart/i.test(i.label));
    h.items.splice(k < 0 ? h.items.length : k, 0, it);
  }
  return { s: h, it };
}
const pxSonst = p => { const r = pxEnsureSonst(p.sections, uid); return r; };
const _pxMigrate = migrate;
migrate = function () {
  _pxMigrate(); if (!DB || !DB.settings || !DB.settings.protocol) return;
  // feste ID für die Vorlage, damit PC und Tablet dieselbe Ergänzung erzeugen
  pxEnsureSonst(DB.settings.protocol.sections.filter(s => s.active !== false), () => "sonstiges");
  (DB.protocols || []).forEach(p => { if (!pxLocked(p)) pxEnsureSonst(p.sections, () => "sonstiges"); });
};
function pxSonstDlg(pid, room) {
  const p = pById(pid); if (pxLocked(p)) { toast("Protokoll ist unterschrieben und gesperrt"); return; }
  const r = pxSonst(p); if (!r) { toast("Die Protokollvorlage hat keinen Angaben-Abschnitt für „Sonstiges“."); return; }
  let val = r.s.values[r.it.id] || "";
  if (room) val = (val && !val.endsWith("\n") ? val + "\n" : val) + `[${room}] `;
  const ov = modal(PX_SONST, `<div class="hint" style="margin-bottom:8px">Ein Feld für das ganze Protokoll – steht im Ausdruck oberhalb der Vereinbarungen.${room ? " Die neue Zeile beginnt mit dem aktuellen Raum." : ""}</div>
    <textarea name="t" class="pxsonst">${esc(val)}</textarea>`, { ok: "Speichern", onOk: ov => { r.s.values[r.it.id] = v(ov, "t").split("\n").filter(l => !/^\s*\[[^\]]*\]\s*$/.test(l)).join("\n").replace(/\s+$/, ""); /* leere „[Raum]“-Zeilen entfernen */ toast("Sonstiges gespeichert"); pxRedraw(); } });
  const ta = ov.querySelector("textarea"); setTimeout(() => { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); ta.scrollTop = ta.scrollHeight; }, 50);
}

/* ---------- Anmerkungen / weitere Mängel je Raum ---------- */
const pxRoom = (p, sid, rid) => { const s = p.sections.find(x => x.id === sid); return s && s.rooms.find(r => r.id === rid); };
function pxNoteDlg(pid, sid, rid, nid) {
  const p = pById(pid); if (pxLocked(p)) return; const r = pxRoom(p, sid, rid); if (!r) return;
  r.notes = r.notes || []; const n = nid ? r.notes.find(x => x.id === nid) : { type: "note", text: "" };
  const ov = modal(nid ? "Eintrag bearbeiten" : `Anmerkung / weiterer Mangel · ${r.name}`, `<div class="seg pxtype" style="margin-bottom:12px"><button type="button" data-t="note" class="${n.type !== "defect" ? "on" : ""}">Anmerkung</button><button type="button" data-t="defect" class="${n.type === "defect" ? "on" : ""}">Mangel</button></div>
    <textarea name="t" placeholder="Beschreibung …" style="min-height:120px">${esc(n.text || "")}</textarea>
    <p class="hint">Fotos danach direkt am Eintrag hinzufügen. Mängel erscheinen in der Mängelübersicht und werden beim nächsten Protokoll zur Prüfung angeboten.</p>`,
  { ok: nid ? "Speichern" : "Hinzufügen", del: nid ? "Löschen" : null, onDel: () => { if (!confirm("Eintrag löschen?")) return false; (n.photos || []).filter(x => !(n.photosFrom || []).includes(x)).forEach(x => { if (!String(x).startsWith("data:")) delFile(x).catch(() => {}); }); r.notes = r.notes.filter(x => x.id !== nid); pxRedraw(); },
    onOk: ov => { const t = v(ov, "t").trim(); if (!t) throw new Error("Bitte eine Beschreibung eingeben."); n.text = t; n.type = ov.dataset.t || n.type || "note"; if (!nid) { n.id = uid(); n.photos = []; n.at = Date.now(); r.notes.push(n); } toast(n.type === "defect" ? "Mangel erfasst" : "Anmerkung erfasst"); pxRedraw(); } });
  ov.dataset.t = n.type || "note";
  ov.querySelectorAll(".pxtype button").forEach(b => b.onclick = () => { ov.dataset.t = b.dataset.t; ov.querySelectorAll(".pxtype button").forEach(x => x.classList.toggle("on", x === b)); });
}
async function pxAddPhotos(pid, files, rel, list, label) {
  const p = pById(pid), c = caseBy(p.caseId); let n = 0;
  for (const f of files) { const d = await resizeImg(f, 1600, .8); if (!d) continue; try { list.push(await api.writeImage({ dataURL: d, rel: folderRel(c, c.type, { label: "Übergabeprotokoll" }) + "/" + p.no + " Fotos", name: label })); n++; } catch (e) { toast("Foto konnte nicht gespeichert werden: " + e.message); } }
  return n;
}
async function pxNotePhoto(pid, sid, rid, nid, inp) {
  const p = pById(pid), r = pxRoom(p, sid, rid), n = r && (r.notes || []).find(x => x.id === nid); const files = [...inp.files]; inp.value = ""; if (!n || !files.length) return;
  n.photos = n.photos || []; const k = await pxAddPhotos(pid, files, null, n.photos);
  save(); toast(k > 1 ? `${k} Fotos hinzugefügt` : "Foto hinzugefügt"); CAP ? drawCap() : render();
}
function pxNotePhotoRm(pid, sid, rid, nid, k) {
  if (!confirm("Foto entfernen?")) return; const r = pxRoom(pById(pid), sid, rid), n = r.notes.find(x => x.id === nid), x = n.photos.splice(k, 1)[0];
  if (n.photosFrom && n.photosFrom.includes(x)) n.photosFrom = n.photosFrom.filter(y => y !== x); else if (x && !String(x).startsWith("data:")) delFile(x).catch(() => {});
  save(); CAP ? drawCap() : render();
}
function pxPhotoStrip(list, add, rm, lock, big) {
  return `<div class="phs ${big ? "big" : ""} pxphs">${list.map((d, k) => `<span class="ph"><img src="${psrc(d)}" alt="Foto ${k + 1}" onclick="event.stopPropagation();showImg(this.src)">${lock ? "" : `<button aria-label="Foto entfernen" onclick="event.stopPropagation();${rm}(${k})">×</button>`}</span>`).join("")}
    ${lock ? "" : `<label class="cam" title="Foto aufnehmen / hochladen">${ic("plus", 'style="width:14px"')}${big ? "Foto" : ""}📷<input type="file" accept="image/*" capture="environment" multiple hidden onchange="${add}(this)"></label>`}${list.length > 1 ? `<span class="hint">${list.length} Fotos</span>` : ""}</div>`;
}
function pxNotesHTML(p, s, r, big) {
  const ns = r.notes || [], lock = pxLocked(p); if (!ns.length) return "";
  const A = `'${p.id}','${s.id}','${r.id}'`;
  return `<div class="pxnotes"><b>Anmerkungen / weitere Mängel</b>${ns.map(n => `<div class="pxnote ${n.type === "defect" ? "def" : ""}">
    <div class="pxnh"><span class="tag ${n.type === "defect" ? "bad" : n.fixedFrom ? "ok" : "grey"}">${n.fixedFrom ? "behoben" : n.type === "defect" ? "Mangel" : "Anmerkung"}</span><span class="pxnt">${esc(n.text)}${n.from ? ` <span class="hint">· seit ${esc(n.from)}</span>` : ""}${n.fixedFrom ? ` <span class="hint">· behoben seit ${esc(n.fixedFrom)}</span>` : ""}</span>
     ${lock || n.fixedFrom ? "" : `<button class="ib" aria-label="Bearbeiten" onclick="pxNoteDlg(${A},'${n.id}')">${ic("edit")}</button>`}</div>
    ${n.fixedFrom ? "" : pxPhotoStrip(n.photos || [], `(i=>pxNotePhoto(${A},'${n.id}',i))`, `(k=>pxNotePhotoRm(${A},'${n.id}',k))`, lock, big)}</div>`).join("")}</div>`;
}
function pxZtk(p, sid, rid, on) { const r = pxRoom(p = pById(p), sid, rid); if (!r || pxLocked(p)) return; r.ztk = !!on; save(); if (CAP) drawCap(); }
function pxZtkHTML(p, s, r) {
  return `<label class="pxztk ${r.ztk ? "on" : ""}"><input type="checkbox" ${r.ztk ? "checked" : ""} ${pxLocked(p) ? "disabled" : ""} onclick="event.stopPropagation()" onchange="pxZtk('${p.id}','${s.id}','${r.id}',this.checked)"> <b>Zimmertürschlüssel</b></label>`;
}

/* ---------- Anleitungen ---------- */
function pxManDlg(pid, mid, room) {
  const p = pById(pid); if (pxLocked(p)) return; p.manuals = p.manuals || [];
  const m = mid ? p.manuals.find(x => x.id === mid) : { name: "", room: room || "", form: "Papier" };
  const rooms = [...new Set(p.sections.filter(s => s.type === "rooms").flatMap(s => s.rooms.map(r => r.name)))];
  const ov = modal(mid ? "Anleitung bearbeiten" : "Anleitung hinzufügen", `<div class="form"><label>Bezeichnung</label><input name="n" value="${esc(m.name)}" placeholder="z. B. Geschirrspüler Bosch SMV4">
    <label>Raum</label><select name="r"><option value="">–</option>${rooms.map(x => `<option ${x === m.room ? "selected" : ""}>${esc(x)}</option>`).join("")}</select>
    <label>Übergeben</label><div class="seg pxform">${PX_FORMS.map(([k, l]) => `<button type="button" data-f="${k}" class="${m.form === k ? "on" : ""}">${l}</button>`).join("")}</div></div>
    <p class="hint">Foto (z. B. vom Typenschild) danach direkt am Eintrag hinzufügen.</p>`,
  { ok: mid ? "Speichern" : "Hinzufügen", del: mid ? "Löschen" : null, onDel: () => { if (!confirm("Anleitung entfernen?")) return false; (m.photos || []).forEach(x => { if (!String(x).startsWith("data:")) delFile(x).catch(() => {}); }); p.manuals = p.manuals.filter(x => x.id !== mid); pxRedraw(); },
    onOk: ov => { const n = v(ov, "n").trim(); if (!n) throw new Error("Bitte eine Bezeichnung eingeben."); m.name = n; m.room = v(ov, "r"); m.form = ov.dataset.f; if (!mid) { m.id = uid(); m.photos = []; p.manuals.push(m); } toast("Anleitung gespeichert"); pxRedraw(); } });
  ov.dataset.f = m.form;
  ov.querySelectorAll(".pxform button").forEach(b => b.onclick = () => { ov.dataset.f = b.dataset.f; ov.querySelectorAll(".pxform button").forEach(x => x.classList.toggle("on", x === b)); });
}
async function pxManPhoto(pid, mid, inp) { const p = pById(pid), m = (p.manuals || []).find(x => x.id === mid); const files = [...inp.files]; inp.value = ""; if (!m || !files.length) return; m.photos = m.photos || []; await pxAddPhotos(pid, files, null, m.photos, "Anleitung"); save(); CAP ? drawCap() : render(); }
function pxManPhotoRm(pid, mid, k) { if (!confirm("Foto entfernen?")) return; const m = pById(pid).manuals.find(x => x.id === mid), x = m.photos.splice(k, 1)[0]; if (x && !String(x).startsWith("data:")) delFile(x).catch(() => {}); save(); CAP ? drawCap() : render(); }
function pxManualsHTML(p, big) {
  const ms = p.manuals || [], lock = pxLocked(p);
  return `<div class="pxman"><div class="pxmh"><b>Anleitungen</b><span class="hint">${ms.length ? ms.length + (ms.length === 1 ? " Eintrag" : " Einträge") : "noch keine"}</span><span class="sp"></span>${lock ? "" : `<button class="btn ${big ? "" : "sm"}" onclick="pxManDlg('${p.id}')">${ic("plus")}Anleitung</button>`}</div>
    ${ms.map(m => { const f = PX_FORMS.find(x => x[0] === m.form) || PX_FORMS[0]; return `<div class="pxmr"><b class="pxmn">${esc(m.name)}</b><span class="tag grey">${esc(m.room || "–")}</span><span class="tag ${f[2]}">${f[1]}</span>
      ${pxPhotoStrip(m.photos || [], `(i=>pxManPhoto('${p.id}','${m.id}',i))`, `(k=>pxManPhotoRm('${p.id}','${m.id}',k))`, lock, false)}${lock ? "" : `<button class="ib" aria-label="Bearbeiten" onclick="pxManDlg('${p.id}','${m.id}')">${ic("edit")}</button>`}</div>`; }).join("")}</div>`;
}
const pxIsManHost = (p, s) => { const h = pxSonstHost(p.sections); return h && h.id === s.id; };

/* ---------- „+“-Menü je Raum ---------- */
function pxPlus(btn, pid, sid, rid) {
  const p = pById(pid); if (pxLocked(p)) return; const r = pxRoom(p, sid, rid);
  pop(btn, [{ label: "📝 Anmerkung / weiterer Mangel", fn: () => pxNoteDlg(pid, sid, rid) }, { label: "🗒 Sonstiges ergänzen", fn: () => pxSonstDlg(pid, r && r.name) }, { label: "📘 Anleitung (Raum " + (r ? r.name : "") + ")", fn: () => pxManDlg(pid, null, r && r.name) }]);
}

/* ---------- Mängel/Fotos/Statistik einbeziehen ---------- */
const _pxDefects = hoDefects;
hoDefects = function (p) {
  const out = _pxDefects(p);
  p.sections.filter(s => s.type === "rooms").forEach(s => s.rooms.forEach(r => (r.notes || []).forEach(n => {
    if (n.type !== "defect" || n.fixedFrom) return;
    out.push({ s, r, i: { label: "Weiterer Mangel" }, v: { z: "Mangel", note: n.text, photos: n.photos || [], from: n.from }, area: r.name, key: "n|" + r.name + "|" + n.text, note: n });
  })));
  return out;
};
const _pxFixed = hoFixed;
hoFixed = function (p) { const out = _pxFixed(p); p.sections.filter(s => s.type === "rooms").forEach(s => s.rooms.forEach(r => (r.notes || []).forEach(n => { if (n.fixedFrom) out.push({ area: r.name, i: { label: "Weiterer Mangel" }, v: { fixedFrom: n.fixedFrom, fixedNote: n.text } }); }))); return out; };
const _pxCount = countPhotos;
countPhotos = function (p) { let n = _pxCount(p); p.sections.filter(s => s.type === "rooms").forEach(s => s.rooms.forEach(r => (r.notes || []).forEach(x => n += (x.photos || []).length))); (p.manuals || []).forEach(m => n += (m.photos || []).length); return n; };
const _pxStats = protoStats;
protoStats = function (p) { const st = _pxStats(p); p.sections.filter(s => s.type === "rooms").forEach(s => s.rooms.forEach(r => (r.notes || []).forEach(n => { if (n.type === "defect" && !n.fixedFrom) st.def++; }))); return st; };
const _pxPage = pageStat;
pageStat = function (pg) { const st = _pxPage(pg); if (st && pg.r) (pg.r.notes || []).forEach(n => { if (n.type === "defect" && !n.fixedFrom) st.def++; }); return st; };
// Übernahme ins nächste Protokoll: weitere Mängel als Notizen übertragen
const _pxMake = makeProtocol;
makeProtocol = function (st, c, kind, user, opt) {
  const p = _pxMake(st, c, kind, user, opt); if (!DB || !DB.objects) return p;
  pxEnsureSonst(p.sections, uid);
  const base = opt && opt.base ? DB.protocols.find(x => x.id === opt.base) : null; if (!base) return p;
  const dec = opt.defects || {}, rs = p.sections.find(s => s.type === "rooms");
  base.sections.filter(s => s.type === "rooms").forEach(s => s.rooms.forEach(r => (r.notes || []).forEach(n => {
    if (n.type !== "defect" || n.fixedFrom || !rs) return; const how = dec["n|" + r.name + "|" + n.text]; if (!how) return;
    let tr = rs.rooms.find(x => r.hoRid && x.hoRid === r.hoRid) || rs.rooms.find(x => x.name === r.name); if (!tr) { tr = { id: uid(), name: r.name, values: {} }; rs.rooms.push(tr); }
    tr.notes = tr.notes || [];
    if (how === "take") { const ph = opt.withPhotos ? [...(n.photos || [])] : []; tr.notes.push({ id: uid(), type: "defect", text: n.text, photos: ph, photosFrom: [...ph], from: n.from || base.no, at: Date.now() }); }
    else tr.notes.push({ id: uid(), type: "defect", text: n.text, photos: [], fixedFrom: base.no, at: Date.now() });
  })));
  return p;
};
