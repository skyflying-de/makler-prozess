/* Makler-Prozess – Cloud-Sync: Ablauf (Pull/Push/Dateien/Snapshots) und Oberfläche */
"use strict";
const SC = window.SyncCore, PV = window.Providers;
const SY = { on: false, state: null, prov: null, key: null, status: "aus", msg: "", running: false, again: false, timer: null, deb: null, devs: {}, devsAt: 0, devList: [], progress: "", persistT: null };
const SY_TE = new TextEncoder(), SY_TD = new TextDecoder();
const SY_INTERVAL = 120000, SY_DEBOUNCE = 3000, SY_SNAP_EVERY = 150;
const SY_LAZY = !!(window.PLATFORM && PLATFORM.lazyFiles), SY_PKCE = !!(window.PLATFORM && PLATFORM.msFlow === "pkce");

/* ---------- Transport (Electron: über Hauptprozess, ohne Browser-Sperren) ---------- */
const SYT = {
  async http({ method, url, headers, body }) {
    const b = body === undefined || body === null ? null : typeof body === "string" ? SY_TE.encode(body) : body;
    const r = await api.http({ method, url, headers, bodyB64: b ? SC.b64(b) : null });
    const bytes = SC.unb64(r.b64 || "");
    return { status: r.status, headers: r.headers || {}, bytes, get text() { try { return SY_TD.decode(bytes); } catch (e) { return ""; } } };
  }
};

/* ---------- Anbieter aus Konfiguration ---------- */
async function syProvider(cloud) {
  if (!cloud) throw new Error("Keine Cloud konfiguriert.");
  if (cloud.provider === "nextcloud") {
    const pass = await api.secretGet("ncPass");
    if (!pass) { const e = new Error("Nextcloud-App-Passwort fehlt."); e.code = "auth"; throw e; }
    return PV.webdav({ root: cloud.root, folder: cloud.folder, user: cloud.user, pass, host: cloud.host }, SYT);
  }
  if (cloud.provider === "onedrive") return PV.graph(cloud, SYT, { get: () => api.secretGet("msRefresh"), set: v => api.secretSet("msRefresh", v) });
  throw new Error("Unbekannter Anbieter");
}
const syJSON = b => b ? JSON.parse(SY_TD.decode(b)) : null;

/* ---------- Zustand speichern ---------- */
function syPersist(now) {
  clearTimeout(SY.persistT);
  const run = () => { if (SY.state) api.saveSync(JSON.stringify(SY.state)).catch(e => console.warn("sync-state", e)); };
  if (now) return run(); SY.persistT = setTimeout(run, 400);
}

/* ---------- Start / Stopp ---------- */
async function cloudBoot() {
  if (!ENV || ENV.cfg.mode !== "cloud" || !ENV.cfg.cloud) { SY.on = false; return; }
  try {
    const txt = await api.loadSync();
    SY.state = txt ? JSON.parse(txt) : null;
    SY.key = await api.secretGet("officeKey");
    if (!SY.state || !SY.key) { SY.on = true; syStatus("fehler", !SY.key ? "Büro-Schlüssel fehlt – bitte Gerät neu verbinden." : "Sync-Zustand fehlt – bitte „Gerät neu aus Cloud laden“."); return; }
    SY.state.dev = ENV.cfg.deviceId;
    SY.on = true;
    clearInterval(SY.timer); SY.timer = setInterval(() => cloudSync("takt"), SY_INTERVAL);
    window.addEventListener("online", () => cloudSync("online"));
    setTimeout(() => cloudSync("start"), 400);
    setTimeout(syChooseUser, 900);
  } catch (e) { syStatus("fehler", e.message); }
}
function cloudStop() { SY.on = false; clearInterval(SY.timer); clearTimeout(SY.deb); SY.state = null; SY.prov = null; SY.key = null; syStatus("aus", ""); }

/* von der App nach jedem Speichern aufgerufen */
function cloudAfterSave() {
  if (!SY.on || !SY.state || !DB) return;
  try { if (SC.diff(SY.state, DB)) syPersist(); } catch (e) { console.warn(e); }
  clearTimeout(SY.deb); SY.deb = setTimeout(() => cloudSync("änderung"), SY_DEBOUNCE);
  syPill();
}
function cloudLock(pid) { if (SY.on && SY.state) SY.state.forceNext.push("protocols/" + pid); }
function delFile(rel) {
  if (SY.on && SY.state && rel && !String(rel).startsWith("data:")) { SY.state.fileDel.push(rel); delete SY.state.files[rel]; syPersist(); }
  return api.deleteFile(rel);
}

/* ---------- Synchronisieren ---------- */
function syStatus(s, msg = "") { SY.status = s; SY.msg = msg; syPill(); if (VIEW === "einstellungen" && SETTAB === "daten" && !document.querySelector(".ov,.wiz")) { const el = document.getElementById("cloudcard"); if (el) el.outerHTML = vCloudCard(); } }
async function cloudSync(reason) {
  if (!SY.on || !SY.state || !SY.key) return;
  if (SY.running) { SY.again = true; return; }
  SY.running = true; SY.progress = ""; syStatus("läuft");
  try {
    await flush();
    SC.diff(SY.state, DB);
    SY.prov = SY.prov || await syProvider(ENV.cfg.cloud);
    await syDevicesLoad();
    const res = await syPull();
    await syPush();
    await syFiles();
    await syDevicePublish();
    if (SY.state.seq - (SY.state.snapSeq || 0) >= SY_SNAP_EVERY) await sySnapshot();
    SY.state.lastSync = Date.now(); syPersist(true);
    syStatus("ok");
    if (res.conflicts) toast(`${res.conflicts} gleichzeitige Änderung${res.conflicts > 1 ? "en" : ""} zusammengeführt – siehe Konfliktprotokoll`);
  } catch (e) {
    console.warn("Sync", reason, e);
    const offline = /Keine Verbindung|ERR_|ENOTFOUND|ECONN|net::|timed out|getaddrinfo/i.test(e.message);
    syStatus(offline ? "offline" : e.code === "auth" ? "anmeldung" : "fehler", offline ? "Keine Verbindung zur Cloud" : e.message);
    if (e.code === "auth") SY.prov = null;
  } finally {
    SY.running = false; SY.progress = "";
    if (SY.again) { SY.again = false; setTimeout(() => cloudSync("nachlauf"), 500); }
  }
}
async function syPull() {
  const P = SY.prov, st = SY.state, me = st.dev;
  const dirs = (await P.list("sync")).filter(d => d.dir && d.name !== me);
  if (dirs.some(d => !SY.devs[d.name])) await syDevicesLoad(true);
  const ops = [], newCur = {};
  for (const d of dirs) {
    const have = st.cursors[d.name] || 0;
    const files = (await P.list("sync/" + d.name)).map(f => f.name).filter(n => /^\d{8}\.mpk$/.test(n)).map(n => parseInt(n, 10)).filter(n => n > have).sort((a, b) => a - b);
    for (let i = 0; i < files.length; i += 4) {
      const chunk = files.slice(i, i + 4);
      SY.progress = `Lade Änderungen ${d.name.slice(0, 6)} (${Math.min(i + 4, files.length)}/${files.length})`; syPill();
      const got = await Promise.all(chunk.map(async n => { const b = await P.get(`sync/${d.name}/${SC.pad(n)}.mpk`); return b ? { n, pkg: await SC.open(b, SY.key) } : null; }));
      for (const g of got) { if (!g) break; ops.push(...g.pkg.ops); newCur[d.name] = g.n; }
    }
  }
  let res = { changed: 0, conflicts: 0 };
  if (ops.length) {
    res = SC.apply(st, DB, ops, SY.devs);
    Object.assign(st.cursors, newCur);
    if (res.changed) { migrate(); await api.save(JSON.stringify(DB)); SC.diff(st, DB); syRefreshUI(); }
  } else Object.assign(st.cursors, newCur);
  st.pending = {}; st.lastPull = Date.now();
  syPersist(true);
  return res;
}
async function syPush() {
  const st = SY.state;
  while (st.outbox.length) {
    const ops = st.outbox.slice(0, 4000);
    const pkg = await SC.seal({ v: 1, dev: st.dev, seq: st.seq, created: Date.now(), ops }, SY.key);
    SY.progress = `Sende ${ops.length} Änderung${ops.length > 1 ? "en" : ""}`; syPill();
    await SY.prov.put(`sync/${st.dev}/${SC.pad(st.seq)}.mpk`, pkg);
    st.outbox.splice(0, ops.length); st.seq++; syPersist(true);
  }
}
async function syFiles() {
  const st = SY.state, P = SY.prov;
  while (st.fileDel.length) { const rel = st.fileDel[0]; try { await P.del("dateien/" + rel); } catch (e) { if (e.code === "auth") throw e; } st.fileDel.shift(); }
  const refs = SC.fileRefs(DB).filter(r => !st.files[r]);
  let i = 0, missing = 0;
  for (const rel of refs) {
    i++; SY.progress = `Dokumente ${i}/${refs.length}`; syPill();
    const local = await api.fileStat(rel);
    if (local) { await P.put("dateien/" + rel, SC.unb64(await api.readB64(rel))); st.files[rel] = 1; }
    else if (SY_LAZY) { st.files[rel] = 2; } // Tablet: fremde Dokumente erst beim Öffnen laden
    else { const b = await P.get("dateien/" + rel); if (b) { await api.writeB64(rel, SC.b64(b)); st.files[rel] = 1; } else missing++; }
    if (i % 10 === 0) syPersist();
  }
  if (refs.length) { syPersist(true); if (refs.length - missing && !SY_LAZY) syRefreshUI(); }
}
/* Tablet: einzelnes Dokument bei Bedarf aus der Cloud holen (von der Plattform-Schicht aufgerufen) */
async function syFetchFile(rel) {
  if (!SY.on || !SY.key || !ENV.cfg.cloud) return null;
  try { SY.prov = SY.prov || await syProvider(ENV.cfg.cloud); return await SY.prov.get("dateien/" + rel); }
  catch (e) { console.warn("Datei laden", rel, e); return null; }
}
async function syDevicesLoad(force) {
  if (!force && Date.now() - SY.devsAt < 600000) return;
  try {
    const fl = (await SY.prov.list("devices")).filter(f => /\.json$/.test(f.name));
    const list = await Promise.all(fl.map(async f => { try { return syJSON(await SY.prov.get("devices/" + f.name)); } catch (e) { return null; } }));
    SY.devList = list.filter(Boolean).sort((a, b) => b.lastSeen - a.lastSeen);
    SY.devList.forEach(d => SY.devs[d.id] = d.name);
    SY.devsAt = Date.now();
  } catch (e) { if (e.code === "auth") throw e; }
}
async function syDevicePublish(force) {
  const st = SY.state;
  if (!force && st.devPublished && Date.now() - st.devPublished < 600000) return;
  const info = await api.deviceInfo();
  const me = { id: st.dev, name: ENV.cfg.deviceName || info.name, platform: info.platform, version: info.version, user: (ME() || {}).name || "", lastSeen: Date.now(), seq: st.seq - 1, cursors: st.cursors };
  await SY.prov.put(`devices/${st.dev}.json`, SY_TE.encode(JSON.stringify(me, null, 1)), "application/json");
  st.devPublished = Date.now(); SY.devs[st.dev] = me.name;
}
async function sySnapshot() {
  const st = SY.state;
  const snap = { v: 1, dev: st.dev, t: st.clock, cursors: { ...st.cursors, [st.dev]: st.seq - 1 }, base: st.base, meta: st.meta, dead: st.dead, locks: st.locks };
  const name = `${st.clock.replace(/\./g, "-")}_${st.dev}.mpk`;
  await SY.prov.put("snapshot/" + name, await SC.seal(snap, SY.key));
  st.snapSeq = st.seq;
  try { // nur die letzten 3 eigenen Snapshots behalten
    const own = (await SY.prov.list("snapshot")).map(f => f.name).filter(n => n.endsWith("_" + st.dev + ".mpk")).sort();
    for (const n of own.slice(0, -3)) await SY.prov.del("snapshot/" + n);
  } catch (e) { /* unkritisch */ }
}
function syRefreshUI() {
  if (typeof CAP !== "undefined" && CAP) { try { drawCap(); } catch (e) {} return; }
  const a = document.activeElement;
  if (a && a.closest && a.closest("main") && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) { a.addEventListener("blur", () => setTimeout(syRefreshUI, 50), { once: true }); return; }
  if (document.querySelector(".ov")) { setTimeout(syRefreshUI, 1500); return; }
  const m = document.getElementById("main"), y = m ? m.scrollTop : 0;
  render(); if (m) m.scrollTop = y;
}

/* ---------- Büro anlegen / beitreten / verlassen ---------- */
async function syCreateOffice(prov, password, onStep) {
  const ex = await prov.get("office.json");
  if (ex) { const e = new Error("In diesem Cloud-Ordner gibt es bereits ein Büro. Bitte „Bestehendem Büro beitreten“ wählen oder einen anderen Ordner."); e.code = "exists"; throw e; }
  onStep("Vollsicherung wird erstellt …"); await flush(); try { await api.backup(); } catch (e) { /* keine Daten → egal */ }
  onStep("Büro wird angelegt …");
  const { office, key } = await SC.newOffice(password);
  await prov.mkdirp(""); await prov.put("office.json", SY_TE.encode(JSON.stringify(office, null, 1)), "application/json");
  const info = await api.deviceInfo();
  DB.ui.chosen = 1; await api.save(JSON.stringify(DB));
  const st = SC.newState(info.id); SC.stampAll(st, DB);
  SY.state = st; SY.key = key; SY.prov = prov; SY.on = true;
  await api.secretSet("officeKey", key);
  onStep("Datenstand wird verschlüsselt hochgeladen …"); await sySnapshot();
  onStep("Dokumente werden hochgeladen …"); await syFiles();
  await syDevicePublish(true);
  st.lastSync = Date.now(); syPersist(true);
  return { office, key };
}
async function syJoinOffice(prov, secret, onStep) {
  onStep("Büro wird gesucht …");
  const office = syJSON(await prov.get("office.json"));
  if (!office || office.format !== "makler-prozess-office") { const e = new Error("In diesem Cloud-Ordner wurde kein Büro gefunden."); e.code = "none"; throw e; }
  onStep("Büro-Passwort wird geprüft …");
  const key = await SC.unlockOffice(office, secret);
  if (!key) { const e = new Error("Büro-Passwort oder Wiederherstellungsschlüssel ist falsch."); e.code = "pw"; throw e; }
  const info = await api.deviceInfo();
  if (DB) { onStep("Vollsicherung des bisherigen Stands …"); await flush(); try { await api.backup(); } catch (e) {} }
  onStep("Datenstand wird geladen …");
  const snaps = (await prov.list("snapshot")).map(f => f.name).filter(n => n.endsWith(".mpk")).sort();
  const st = SC.newState(info.id);
  if (snaps.length) {
    const snap = await SC.open(await prov.get("snapshot/" + snaps[snaps.length - 1]), key);
    Object.assign(st, { base: snap.base, meta: snap.meta, dead: snap.dead || {}, locks: snap.locks || {}, cursors: { ...snap.cursors } });
    delete st.cursors[info.id];
    st.clock = snap.t;
  }
  const db = { settings: {}, objects: [], cases: [], entries: [], tasks: [], protocols: [], ui: {}, meta: { created: Date.now(), joined: Date.now(), demo: false } };
  for (const k in st.base) {
    const r = SC.recordFromFlat(k, st.base[k]), coll = k.slice(0, k.indexOf("/"));
    if (coll === "settings") db.settings = r; else (db[coll] = db[coll] || []).push(r);
  }
  if (MOBILE) db.ui.pinSetup = 1; // gewählter Mitarbeiter darf einmalig seine PIN festlegen
  DB = db;
  if (!DB.settings.users || !DB.settings.users.length) { const e = new Error("Der Cloud-Stand ist unvollständig (keine Mitarbeiter). Bitte am ersten Gerät „Jetzt synchronisieren“ ausführen."); e.code = "empty"; throw e; }
  migrate(); st.base = SC.flatDB(DB);
  SY.state = st; SY.key = key; SY.prov = prov; SY.on = true;
  await api.secretSet("officeKey", key);
  onStep("Neuere Änderungen werden geladen …"); await syPull();
  await api.save(JSON.stringify(DB));
  onStep("Dokumente werden geladen …"); await syFiles();
  await syDevicePublish(true);
  st.lastSync = Date.now(); syPersist(true);
  return office;
}
async function cloudLeave() {
  if (!confirm("Cloud-Sync auf diesem Gerät beenden?\n\nDie Daten bleiben lokal erhalten. Die Cloud und die anderen Geräte sind nicht betroffen. Später kann das Gerät wieder beitreten.")) return;
  try { if (SY.on) await cloudSync("verlassen"); } catch (e) {}
  cloudStop(); await api.dropSync(); await api.secretClear();
  ENV.cfg = { ...ENV.cfg, ...await api.setCfg({ mode: "local", cloud: null }) };
  toast("Lokaler Betrieb – Daten bleiben auf diesem Gerät"); render();
}
async function cloudReload() {
  if (!confirm("Diesen Gerätestand komplett neu aus der Cloud laden?\n\nNoch nicht gesendete Änderungen werden vorher gesendet, der lokale Stand wird zusätzlich gesichert.")) return;
  try {
    syStatus("läuft"); await cloudSync("vor-neuladen");
    if (SY.state && SY.state.outbox.length) throw new Error("Es konnten nicht alle Änderungen gesendet werden. Bitte Verbindung prüfen.");
    const prov = await syProvider(ENV.cfg.cloud), key = await api.secretGet("officeKey");
    await syJoinOffice(prov, SC.recoveryCode(key), m => { SY.progress = m; syPill(); });
    location.reload();
  } catch (e) { syStatus("fehler", e.message); toast(e.message); }
}

/* ---------- Statusanzeige ---------- */
const syAgo = t => { if (!t) return "noch nie"; const m = Math.round((Date.now() - t) / 60000); return m < 1 ? "gerade eben" : m < 60 ? `vor ${m} Min.` : m < 1440 ? `vor ${Math.round(m / 60)} Std.` : dt(t); };
function syPillHTML() {
  if (!SY.on) return "";
  const pend = SY.state ? SY.state.outbox.length + SY.state.fileDel.length : 0;
  const map = {
    "läuft": ["sync", "var(--acc)", SY.progress || "Synchronisiere …"],
    ok: ["ok", "var(--ok)", `Synchron · ${syAgo(SY.state && SY.state.lastSync)}${pend ? ` · ${pend} offen` : ""}`],
    offline: ["off", "var(--warn)", `Offline${pend ? ` · ${pend} Änderung${pend > 1 ? "en" : ""} warten` : ""}`],
    anmeldung: ["auth", "var(--bad)", "Cloud-Anmeldung nötig"],
    fehler: ["err", "var(--bad)", "Sync-Fehler"],
    aus: ["", "var(--mute)", "Cloud"]
  }[SY.status] || ["", "var(--mute)", SY.status];
  return `<button class="syncpill ${map[0]}" id="syncpill" title="${esc(SY.msg || "Klick: jetzt synchronisieren")}" onclick="${SY.status === "anmeldung" ? "cloudReauth()" : SY.status === "fehler" ? "SETTAB='daten';go('einstellungen')" : "cloudSync('knopf')"}"><i style="background:${map[1]}"></i>${esc(map[2])}</button>`;
}
function syPill() { const el = document.getElementById("syncpill"); if (el) el.outerHTML = syPillHTML(); else if (SY.on) { const d = document.querySelector("#dock .sp"); if (d) d.insertAdjacentHTML("afterend", syPillHTML()); } }
setInterval(() => { if (SY.on && SY.status === "ok") syPill(); }, 30000);

/* ---------- Einstellungen: Karte Betriebsmodus ---------- */
function vCloudCard() {
  const c = ENV.cfg;
  if (c.mode !== "cloud") return `<div class="card" id="cloudcard"><h2>${ic("swap", 'style="width:17px"')}Betriebsmodus<span class="sp"></span><div class="seg"><button class="on">Lokal</button><button onclick="cloudWizard('${MOBILE ? "join" : "create"}')">Cloud-Sync</button></div></h2>
    <p class="hint" style="margin-top:0">Aktuell arbeitet die App <b>nur auf diesem Gerät</b>. Mit Cloud-Sync teilen sich PC und Tablet die Daten über <b>Nextcloud</b> oder <b>OneDrive</b> – jedes Gerät arbeitet auch offline und gleicht später ab. Dokumente liegen lesbar im Cloud-Ordner, die Daten selbst werden verschlüsselt.</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap">${MOBILE ? "" : `<button class="btn pri" onclick="cloudWizard('create')">${ic("plus")}Cloud-Sync einrichten (neues Büro)</button>`}<button class="btn ${MOBILE ? "pri" : ""}" onclick="cloudWizard('join')">${ic("down")}Bestehendem Büro beitreten</button></div>${MOBILE ? '<p class="hint">Das Büro wird am PC eingerichtet. Beim Beitritt werden die Beispieldaten dieses Tablets ersetzt.</p>' : ""}</div>`;
  const st = SY.state || {}, cl = c.cloud || {}, pend = (st.outbox || []).length;
  const devs = (SY.devList || []).map(d => `<div class="devrow">${ic(/Android|Tablet/i.test(d.platform) ? "doc" : "home", 'style="width:16px"')}<b>${esc(d.name)}</b>${d.id === st.dev ? ' <span class="tag grey">dieses Gerät</span>' : ""}<span class="hint">${esc(d.platform || "")} · v${esc(d.version || "?")}${d.user ? " · " + esc(d.user) : ""}</span><span class="sp"></span><span class="hint">${syAgo(d.lastSeen)}</span></div>`).join("") || '<div class="hint">Wird beim nächsten Abgleich geladen.</div>';
  const conf = (st.conflicts || []).slice(0, 15);
  const short = v => { if (v === undefined) return "– (entfernt)"; let x = v; try { x = JSON.parse(v); } catch (e) {} x = typeof x === "object" ? JSON.stringify(x) : String(x); return esc(x.length > 60 ? x.slice(0, 57) + "…" : x); };
  return `<div class="card" id="cloudcard"><h2>${ic("swap", 'style="width:17px"')}Betriebsmodus<span class="sp"></span><div class="seg"><button onclick="cloudLeave()">Lokal</button><button class="on">Cloud-Sync</button></div></h2>
   <div class="two" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr)"><div class="ro">
    <span>Anbieter</span><span><b>${esc(cl.provider === "onedrive" ? "OneDrive / SharePoint" : "Nextcloud")}</b> · ${esc(cl.provider === "onedrive" ? (cl.folderLabel || "") : (cl.host || "") + " / " + (cl.folder || ""))}</span>
    ${cl.provider === "nextcloud" ? `<span>Benutzer</span><span>${esc(cl.user || "")}</span>` : `<span>Anmeldung</span><span>${esc(cl.account || "Microsoft-Konto")}</span>`}
    <span>Gerät</span><span><input value="${esc(c.deviceName || "")}" style="max-width:220px;padding:4px 8px" onchange="cloudRename(this.value)"></span>
    <span>Status</span><span>${syPillHTML().replace('id="syncpill"', "")}${SY.msg && SY.status !== "ok" ? `<div class="hint" style="color:var(--bad)">${esc(SY.msg)}</div>` : ""}</span>
    <span>Ausstehend</span><span>${pend} Änderung${pend === 1 ? "" : "en"} · ${(st.fileDel || []).length} Löschungen</span>
    <span>Verschlüsselung</span><span style="color:var(--ok)">${ic("lock", 'style="width:13px;vertical-align:-2px"')} AES-256 · Büro-Passwort</span>
    <span>Takt</span><span>3 Sek. nach Änderung + alle 2 Min.</span></div>
    <div><b style="font-size:13px">Geräte im Büro</b><div style="margin-top:6px">${devs}</div></div></div>
   <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px"><button class="btn pri" onclick="cloudSync('knopf')">${ic("swap")}Jetzt synchronisieren</button><button class="btn" onclick="cloudRecovery()">${ic("lock")}Wiederherstellungsschlüssel</button>
    ${cl.provider === "nextcloud" ? `<button class="btn" onclick="api.openExternal('${esc((cl.web || "").replace(/'/g, ""))}')">${ic("folder")}Cloud-Ordner im Browser</button>` : ""}
    <button class="btn" onclick="cloudReauth()">${ic("edit")}Anmeldung erneuern</button><button class="btn" onclick="cloudReload()">${ic("down")}Gerät neu aus Cloud laden</button>${MOBILE ? "" : `<button class="btn" onclick="api.openDoc('Einrichtung_Tablet.html').catch(e=>toast(e.message))">${ic("doc")}Tablet einrichten</button>`}</div>
   <h3 style="font-size:14px;margin:16px 0 6px">Konfliktprotokoll <span class="hint">gleichzeitige Änderungen am selben Feld</span>${conf.length ? `<button class="btn sm" style="float:right" onclick="SY.state.conflicts=[];syPersist();render()">Leeren</button>` : ""}</h3>
   ${conf.length ? `<table><tr><th>Zeit</th><th>Datensatz · Feld</th><th>Hier</th><th>Anderes Gerät</th><th>Ergebnis</th></tr>${conf.map(x => `<tr><td class="muted">${dt(x.at)} ${tm(x.at)}</td><td>${esc(syRecLabel(x.k))}<div class="hint">${esc(syFieldLabel(x))}</div></td><td>${short(x.mine)}</td><td>${short(x.theirs)}<div class="hint">${esc(SY.devs[x.dev] || x.devName || "")}</div></td><td>${x.winner === "theirs" ? '<span class="tag sale">anderes Gerät</span>' : '<span class="tag grey">dieses Gerät</span>'}${x.reason ? `<div class="hint">${esc(x.reason)}</div>` : ""}</td></tr>`).join("")}</table>` : '<div class="hint">Keine Konflikte.</div>'}
  </div>`;
}
function syRecLabel(k) {
  const [coll, id] = [k.slice(0, k.indexOf("/")), k.slice(k.indexOf("/") + 1)];
  const r = coll === "settings" ? null : (DB[coll] || []).find(x => x.id === id);
  if (coll === "settings") return "Einstellungen";
  if (!r) return { objects: "Objekt", cases: "Fall", entries: "Zeitbuchung", tasks: "Termin", protocols: "Protokoll" }[coll] + " (gelöscht)";
  if (coll === "objects") return r.no + " " + r.title; if (coll === "cases") return r.no + " " + r.title;
  if (coll === "protocols") return r.no + " " + r.kind; if (coll === "tasks") return "Termin " + r.title;
  return "Zeitbuchung " + dt(r.start);
}
const SY_FL = { title: "Bezeichnung", client: "Auftraggeber", stage: "Phase", status: "Status", note: "Notiz", start: "Beginn", end: "Ende", pause: "Pause", z: "Zustand", nr: "Zählernummer", stand: "Zählerstand", n: "Anzahl", photos: "Fotos", values: "", sections: "", rooms: "", items: "", data: "", files: "Anhänge", name: "Name", due: "Fällig", done: "Erledigt", billing: "Abrechnungsart", owner: "Zuständig", serviceId: "Leistung", actionId: "Aktion", userId: "Mitarbeiter", date: "Datum", kind: "Art", sigs: "Unterschriften" };
function syFieldLabel(x) {
  if (!x.raw) return x.p;
  const segs = x.raw.split(SC.SEP).filter(s => s !== "\u001d"), coll = x.k.slice(0, x.k.indexOf("/")), id = x.k.slice(x.k.indexOf("/") + 1);
  const rec = coll === "settings" ? DB.settings : (DB[coll] || []).find(r => r.id === id);
  const out = []; let cur = rec, sec = null;
  for (const s of segs) {
    if (s[0] === "\u001e") { const kid = s.slice(1), el = Array.isArray(cur) ? cur.find(e => e.id === kid) : null; if (el) { out.push(el.title || el.name || el.label || "#" + kid); if (el.items) sec = el; cur = el; } else out.push("#" + kid); continue; }
    if (cur && cur.items === undefined && sec && sec.items && sec.items.find(i => i.id === s)) { out.push(sec.items.find(i => i.id === s).label); cur = cur ? cur[s] : null; continue; }
    if ((coll === "cases" || coll === "objects") && segs[0] === "data" && s !== "data") { const scope = coll === "objects" ? "object" : rec && rec.type; const f = (DB.settings.fields[scope] || []).find(f => f.id === s); out.push(f ? f.label : s); cur = null; continue; }
    if (SY_FL[s] !== undefined) { if (SY_FL[s]) out.push(SY_FL[s]); } else out.push(s);
    cur = cur && typeof cur === "object" ? cur[s] : null;
  }
  return out.filter(Boolean).join(" › ") || x.p;
}
function syChooseUser() {
  if (!DB || MOBILE || DB.settings.authMode === "pin" || DB.ui.chosen || ENV.cfg.mode !== "cloud") return;
  const ov = modal("Wer arbeitet an diesem Gerät?", `<p class="hint" style="margin-top:0">Neue Zeitbuchungen werden diesem Mitarbeiter zugeordnet. Umstellen jederzeit links unten.</p><div class="utiles">${DB.settings.users.map(u => `<button data-u="${u.id}"><span class="av" style="--c:${u.color};width:44px;height:44px;font-size:16px">${esc(u.short)}</span><b>${esc(u.name)}</b><span class="hint">${u.role === "admin" ? "Admin" : "Mitarbeiter"}</span></button>`).join("")}</div>`, { ok: null });
  ov.querySelectorAll("[data-u]").forEach(b => b.onclick = () => { DB.ui.user = b.dataset.u; DB.ui.chosen = 1; save(); ov.close(); render(); toast("Angemeldet als " + ME().name); });
}
async function cloudRename(n) { ENV.cfg = { ...ENV.cfg, ...await api.setCfg({ deviceName: n.trim() || ENV.cfg.deviceName }) }; if (SY.on) { SY.state.devPublished = 0; cloudSync("name"); } toast("Gerätename gespeichert"); }
async function cloudRecovery() {
  const key = await api.secretGet("officeKey"); if (!key) { toast("Kein Büro-Schlüssel vorhanden"); return; }
  const code = SC.recoveryCode(key);
  const ov = modal("Wiederherstellungsschlüssel", `<p style="margin-top:0">Dieser Schlüssel ersetzt das Büro-Passwort, z. B. beim Beitritt eines neuen Geräts, falls das Passwort vergessen wurde. <b>Ausdrucken oder im Passwort-Manager ablegen</b> – nicht in der Cloud speichern.</p>
    <div class="path" style="font-size:14px;padding:12px;user-select:all;word-break:break-all">${esc(code)}</div>`, { ok: "Kopieren", onOk: () => { navigator.clipboard.writeText(code).then(() => toast("Kopiert")); } });
}

/* ---------- Assistent: Cloud einrichten / beitreten ---------- */
function cloudWizard(mode, opt = {}) {
  const W = { mode, step: 1, prov: (ENV.cfg.cloud && ENV.cfg.cloud.provider) || "nextcloud", nc: { server: "", user: "", pass: "", folder: "MaklerProzess" }, ms: { clientId: (ENV.cfg.lastMs || {}).clientId || "", tenant: (ENV.cfg.lastMs || {}).tenant || "organizations", target: "me", folder: "MaklerProzess", siteUrl: "", shared: null, sharedList: null, logged: false, account: "" }, pw: "", pw2: "", secret: "", devName: ENV.cfg.deviceName || "", busy: false, log: [], provider: null, cloudCfg: null, err: "" };
  const el = document.createElement("div"); el.className = "wiz"; document.body.appendChild(el);
  const steps = mode === "create" ? ["Anbieter", "Verbindung", "Büro-Passwort", "Hochladen"] : ["Anbieter", "Verbindung", "Büro-Passwort", "Laden"];
  const close = () => { W.cancel = true; el.remove(); if (opt.first) location.reload(); };
  const draw = () => {
    let body = "";
    if (W.step === 1) body = `<p>${mode === "create" ? "Die Daten dieses Geräts werden zum gemeinsamen Büro-Stand in der Cloud." : "Dieses Gerät übernimmt den Büro-Stand aus der Cloud."} Wo liegt der Cloud-Ordner?</p>
      <div class="choice"><button data-p="nextcloud" class="${W.prov === "nextcloud" ? "sel" : ""}">${ic("folder", 'style="width:24px;height:24px"')}<b>Nextcloud</b><span>Eigene oder gehostete Nextcloud. Anmeldung mit Benutzername und App-Passwort.</span></button>
      <button data-p="onedrive" class="${W.prov === "onedrive" ? "sel" : ""}">${ic("doc", 'style="width:24px;height:24px"')}<b>OneDrive / SharePoint</b><span>Microsoft 365. Einmalig ist eine App-Registrierung des Büros nötig (Anwendungs-ID).</span></button></div>`;
    else if (W.step === 2 && W.prov === "nextcloud") body = `<div class="form"><label>Nextcloud-Adresse</label><input name="server" value="${esc(W.nc.server)}" placeholder="https://cloud.beispiel.de">
      <label>Benutzername</label><input name="user" value="${esc(W.nc.user)}" autocomplete="username">
      <label>App-Passwort</label><input name="pass" type="password" value="${esc(W.nc.pass)}" autocomplete="new-password" placeholder="Nextcloud → Einstellungen → Sicherheit → App-Passwort">
      <label>Ordner</label><input name="folder" value="${esc(W.nc.folder)}"></div>
      <p class="hint">Empfehlung: ein eigenes Konto oder einen <b>geteilten Ordner</b> für das Büro verwenden, damit alle Geräte denselben Ordner sehen. Das App-Passwort wird verschlüsselt ${MOBILE ? "auf diesem Gerät" : "im Windows-Konto"} gespeichert.${MOBILE && !PLATFORM.native ? " <b>Browser-App:</b> Die Nextcloud muss den Zugriff von dieser Adresse erlauben (CORS) – siehe Anleitung." : ""} <a href="#" onclick="api.openDoc('Einrichtung_Cloud.html');return false">Anleitung: App-Passwort erstellen</a></p>`;
    else if (W.step === 2) body = `<div class="form"><label>Anwendungs-ID (Client-ID)</label><input name="clientId" value="${esc(W.ms.clientId)}" placeholder="00000000-0000-0000-0000-000000000000">
      <label>Mandant</label><input name="tenant" value="${esc(W.ms.tenant)}" placeholder="organizations oder Mandanten-ID / Domäne"></div>
      ${W.ms.logged ? `<div class="banner" style="margin:12px 0">${ic("check", 'style="width:16px"')}Angemeldet${W.ms.account ? " als " + esc(W.ms.account) : ""}.</div>
       <div class="form"><label>Zielordner</label><div class="seg">${[["me", "Mein OneDrive"], ["site", "SharePoint-Website"], ["shared", "Mit mir geteilt"]].map(([k, l]) => `<button data-t="${k}" class="${W.ms.target === k ? "on" : ""}">${l}</button>`).join("")}</div>
       ${W.ms.target === "site" ? `<label>Website-Adresse</label><input name="siteUrl" value="${esc(W.ms.siteUrl)}" placeholder="https://firma.sharepoint.com/sites/Makler">` : ""}
       ${W.ms.target !== "shared" ? `<label>Ordnername</label><input name="msfolder" value="${esc(W.ms.folder)}">` : `<label>Geteilter Ordner</label><div>${W.ms.sharedList ? (W.ms.sharedList.length ? `<select name="shared">${W.ms.sharedList.map((s, i) => `<option value="${i}" ${W.ms.shared === i ? "selected" : ""}>${esc(s.name)}${s.by ? " (von " + esc(s.by) + ")" : ""}</option>`).join("")}</select>` : '<span class="hint">Keine geteilten Ordner gefunden.</span>') : '<span class="hint">Wird geladen …</span>'}</div>`}</div>
       <p class="hint">Für mehrere Mitarbeiter mit eigenen Konten: SharePoint-Website oder einen geteilten Ordner wählen. „Mein OneDrive“ passt, wenn alle Geräte dasselbe Büro-Konto nutzen.</p>`
      : SY_PKCE ? `<p class="hint">Die Anmeldung öffnet ein Microsoft-Fenster. In der App-Registrierung muss dafür die Plattform <b>Single-Page-Anwendung</b> mit dieser Umleitungs-URI eingetragen sein:</p><div class="path" style="user-select:all;word-break:break-all">${esc(PLATFORM.authRedirect())}</div>
       ${W.ms.wait ? `<div class="mscode"><i class="spin"></i><span class="hint">Anmeldefenster ist geöffnet – dort anmelden und zustimmen …</span></div>` : `<button class="btn pri" data-a="mslogin" style="margin-top:10px">${ic("lock")}Bei Microsoft anmelden</button>`}`
      : `<p class="hint">Die Anmeldung erfolgt im Browser mit einem Code (keine Passwort-Eingabe in dieser App). Die Anwendungs-ID stammt aus der App-Registrierung im Microsoft-365-Admincenter – <a href="#" onclick="api.openDoc('Einrichtung_Cloud.html');return false">Anleitung zur App-Registrierung öffnen</a>.</p>
       ${W.ms.code ? `<div class="mscode"><span>Code</span><b>${esc(W.ms.code.user_code)}</b><button class="btn" data-a="openms">${ic("fwd")}microsoft.com/devicelogin öffnen</button><span class="hint">Code eingeben, mit dem Büro-Konto anmelden und zustimmen. Dieses Fenster wartet automatisch …</span></div>` : `<button class="btn pri" data-a="mslogin">${ic("lock")}Bei Microsoft anmelden</button>`}`}`;
    else if (W.step === 3 && mode === "create") body = `<p>Das <b>Büro-Passwort</b> verschlüsselt alle Daten in der Cloud. Es wird auf jedem Gerät einmal eingegeben. Mindestens 10 Zeichen.</p>
      <div class="form"><label>Büro-Passwort</label><input name="pw" type="password" value="${esc(W.pw)}" autocomplete="new-password"><label>Wiederholen</label><input name="pw2" type="password" value="${esc(W.pw2)}" autocomplete="new-password">
      <label>Name dieses Geräts</label><input name="dev" value="${esc(W.devName)}"></div>
      <div class="banner" style="background:var(--warn-soft);color:var(--warn);margin-top:12px">${ic("lock", 'style="width:16px"')}Ohne Passwort bzw. Wiederherstellungsschlüssel sind die Cloud-Daten nicht lesbar. Den Schlüssel danach unter Einstellungen sichern.</div>`;
    else if (W.step === 3) body = `<p>Büro-Passwort (oder Wiederherstellungsschlüssel <code>MPK-…</code>) eingeben.</p>
      <div class="form"><label>Büro-Passwort</label><input name="secret" type="password" value="${esc(W.secret)}" autocomplete="current-password"><label>Name dieses Geräts</label><input name="dev" value="${esc(W.devName)}"></div>
      ${DB && !opt.first ? `<div class="banner" style="background:var(--warn-soft);color:var(--warn);margin-top:12px">${ic("bell", 'style="width:16px"')}Die bisherigen Daten auf diesem Gerät werden durch den Büro-Stand ersetzt (vorher wird automatisch gesichert).</div>` : ""}`;
    else body = `<div class="wizlog">${W.log.map((l, i) => `<div>${i === W.log.length - 1 && W.busy ? '<i class="spin"></i>' : ic("check", 'style="width:14px;color:var(--ok)"')}${esc(l)}</div>`).join("")}</div>
      ${!W.busy && !W.err ? `<div class="banner" style="margin-top:12px">${ic("check", 'style="width:16px"')}${mode === "create" ? "Cloud-Sync ist eingerichtet. Weitere Geräte: „Bestehendem Büro beitreten“ mit demselben Cloud-Ordner und Büro-Passwort." : "Dieses Gerät ist mit dem Büro verbunden."}</div>` : ""}`;
    el.innerHTML = `<div class="wizbox"><div class="wizhead"><div class="lg big">${ic("swap", 'style="width:26px;height:26px"')}</div><div><h1>${mode === "create" ? "Cloud-Sync einrichten" : "Bestehendem Büro beitreten"}</h1><span class="hint">${mode === "create" ? "Neues Büro aus den Daten dieses Geräts" : "Büro-Stand aus der Cloud übernehmen"}</span></div></div>
     <div class="steps" style="margin:16px 0">${steps.map((s, i) => `<div class="step ${i + 1 < W.step ? "done" : i + 1 === W.step ? "cur" : ""}" style="cursor:default"><b>${i + 1}</b>${s}</div>`).join("")}</div>
     ${body}<div class="err" id="werr">${esc(W.err)}</div>
     <div class="wizfoot">${W.step < 4 || W.err ? `<button class="btn" data-a="cancel">Abbrechen</button>` : ""}${W.step > 1 && W.step < 4 ? `<button class="btn" data-a="back">Zurück</button>` : ""}<span class="sp"></span>
      ${W.step < 3 ? `<button class="btn pri big2" data-a="next" ${W.busy ? "disabled" : ""}>${W.busy ? "Bitte warten …" : "Weiter"}</button>` : W.step === 3 ? `<button class="btn pri big2" data-a="next" ${W.busy ? "disabled" : ""}>${mode === "create" ? "Einrichten & hochladen" : "Beitreten & laden"}</button>` : !W.busy ? (W.err ? `<button class="btn pri big2" data-a="back3">Zurück</button>` : `<button class="btn pri big2" data-a="done">Fertig</button>`) : ""}</div></div>`;
    el.querySelectorAll("[data-p]").forEach(b => b.onclick = () => { W.prov = b.dataset.p; draw(); });
    el.querySelectorAll("[data-t]").forEach(b => b.onclick = () => { grab(); W.ms.target = b.dataset.t; draw(); if (W.ms.target === "shared" && !W.ms.sharedList) loadShared(); });
    const on = (a, f) => { const b = el.querySelector(`[data-a=${a}]`); if (b) b.onclick = f; };
    on("cancel", close); on("back", () => { grab(); W.err = ""; W.step--; draw(); }); on("back3", () => { W.err = ""; W.step = 3; W.log = []; draw(); });
    on("done", () => { el.remove(); if (opt.first) location.reload(); else render(); });
    on("mslogin", msLogin); on("openms", () => api.openExternal(W.ms.code.verification_uri || "https://microsoft.com/devicelogin"));
    on("next", next);
    const f = el.querySelector("input:not([type=hidden])"); if (f && W.step < 4) setTimeout(() => f.focus(), 30);
  };
  const grab = () => {
    const g = n => { const i = el.querySelector(`[name=${n}]`); return i ? i.value : undefined; };
    if (W.step === 2 && W.prov === "nextcloud") { W.nc.server = g("server").trim(); W.nc.user = g("user").trim(); W.nc.pass = g("pass"); W.nc.folder = g("folder").trim() || "MaklerProzess"; }
    if (W.step === 2 && W.prov === "onedrive") { W.ms.clientId = g("clientId").trim(); W.ms.tenant = g("tenant").trim() || "organizations"; if (g("siteUrl") !== undefined) W.ms.siteUrl = g("siteUrl").trim(); if (g("msfolder") !== undefined) W.ms.folder = g("msfolder").trim() || "MaklerProzess"; if (g("shared") !== undefined) W.ms.shared = +g("shared"); }
    if (W.step === 3) { if (g("pw") !== undefined) { W.pw = g("pw"); W.pw2 = g("pw2"); } if (g("secret") !== undefined) W.secret = g("secret"); W.devName = (g("dev") || "").trim(); }
  };
  const fail = e => { W.busy = false; W.err = e.message || String(e); draw(); };
  async function msLogin() {
    grab(); W.err = "";
    if (!/^[0-9a-f-]{36}$/i.test(W.ms.clientId)) return fail(new Error("Bitte die Anwendungs-ID (GUID) aus der App-Registrierung eintragen."));
    try {
      W.busy = true; const cfg = { clientId: W.ms.clientId, tenant: W.ms.tenant, ...(ENV.cfg.msTest || {}) };
      if (SY_PKCE) {
        W.ms.wait = true; draw();
        const tok = await syMsPkce(cfg); W.ms.wait = false; W.busy = false;
        await api.secretSet("msRefresh", tok.refresh_token);
        try { const p = JSON.parse(atob(tok.id_token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))); W.ms.account = p.preferred_username || p.email || p.name || ""; } catch (e) {}
        W.ms.logged = true; draw(); return;
      }
      W.ms.code = await PV.msDeviceCode(cfg, SYT); W.busy = false; draw();
      api.openExternal(W.ms.code.verification_uri || "https://microsoft.com/devicelogin");
      const tok = await PV.msPollToken(cfg, SYT, W.ms.code, () => !W.cancel);
      await api.secretSet("msRefresh", tok.refresh_token);
      try { const p = JSON.parse(atob(tok.id_token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))); W.ms.account = p.preferred_username || p.email || p.name || ""; } catch (e) {}
      W.ms.logged = true; W.ms.code = null; draw();
    } catch (e) { W.ms.code = null; W.ms.wait = false; if (!W.cancel) fail(e); }
  }
  async function loadShared() {
    try { W.ms.sharedList = await PV.graphSharedFolders({ clientId: W.ms.clientId, tenant: W.ms.tenant, ...(ENV.cfg.msTest || {}) }, SYT, { get: () => api.secretGet("msRefresh"), set: v => api.secretSet("msRefresh", v) }); W.ms.shared = 0; draw(); }
    catch (e) { W.ms.sharedList = []; fail(e); }
  }
  async function connect() {
    if (W.prov === "nextcloud") {
      if (!W.nc.server || !W.nc.user || !W.nc.pass) throw new Error("Bitte Adresse, Benutzer und App-Passwort angeben.");
      const root = PV.nextcloudRoot(W.nc.server, W.nc.user), host = new URL(root).host;
      await api.secretSet("ncPass", W.nc.pass);
      const web = root.split("/remote.php")[0] + "/apps/files/?dir=/" + encodeURIComponent(W.nc.folder);
      W.cloudCfg = { provider: "nextcloud", root, folder: W.nc.folder, user: W.nc.user, host, web };
    } else {
      if (!W.ms.logged) throw new Error("Bitte zuerst bei Microsoft anmelden.");
      const cfg = { clientId: W.ms.clientId, tenant: W.ms.tenant, ...(ENV.cfg.msTest || {}) }, sec = { get: () => api.secretGet("msRefresh"), set: v => api.secretSet("msRefresh", v) };
      const tgt = W.ms.target === "site" ? { type: "site", siteUrl: W.ms.siteUrl, folder: W.ms.folder } : W.ms.target === "shared" ? { type: "shared", ...(W.ms.sharedList || [])[W.ms.shared || 0] } : { type: "me", folder: W.ms.folder };
      if (tgt.type === "shared" && !tgt.itemId) throw new Error("Bitte einen geteilten Ordner wählen.");
      if (tgt.type === "site" && !/^https:\/\//.test(tgt.siteUrl || "")) throw new Error("Bitte die SharePoint-Adresse angeben.");
      const r = await PV.graphResolveTarget(cfg, SYT, sec, tgt);
      W.cloudCfg = { provider: "onedrive", ...cfg, ...r, account: W.ms.account };
      await api.setCfg({ lastMs: cfg });
    }
    W.provider = await syProvider(W.cloudCfg);
    await W.provider.test();
    const office = await W.provider.get("office.json");
    if (mode === "create" && office) throw new Error("In diesem Ordner gibt es bereits ein Büro. Abbrechen und „Bestehendem Büro beitreten“ wählen – oder einen anderen Ordnernamen.");
    if (mode === "join" && !office) throw new Error("In diesem Ordner wurde kein Büro gefunden. Ordner prüfen oder am ersten Gerät „Cloud-Sync einrichten“.");
  }
  async function next() {
    grab(); W.err = "";
    try {
      if (W.step === 1) { W.step = 2; draw(); return; }
      if (W.step === 2) { W.busy = true; draw(); await connect(); W.busy = false; W.step = 3; draw(); return; }
      if (W.step === 3) {
        if (mode === "create") { if ((W.pw || "").length < 10) throw new Error("Das Büro-Passwort braucht mindestens 10 Zeichen."); if (W.pw !== W.pw2) throw new Error("Die Passwörter stimmen nicht überein."); }
        else if (!W.secret) throw new Error("Bitte das Büro-Passwort eingeben.");
        W.step = 4; W.busy = true; W.log = []; draw();
        const say = m => { W.log.push(m); draw(); };
        await api.setCfg({ deviceName: W.devName || ENV.cfg.deviceName });
        ENV.cfg.deviceName = W.devName || ENV.cfg.deviceName;
        cloudStop();
        if (mode === "create") await syCreateOffice(W.provider, W.pw, say); else await syJoinOffice(W.provider, W.secret, say);
        ENV.cfg = { ...ENV.cfg, ...await api.setCfg({ mode: "cloud", cloud: W.cloudCfg }) };
        say(mode === "create" ? "Fertig – Büro-Stand liegt verschlüsselt in der Cloud." : "Fertig – Büro-Stand geladen.");
        W.busy = false; draw();
        SY.on = false; await cloudBoot();
        if (!opt.first) render();
      }
    } catch (e) {
      if (W.step === 4) { SY.on = false; SY.state = null; }
      if (e.code === "pw") { W.step = 3; W.busy = false; W.err = e.message; draw(); return; }
      fail(e);
    }
  }
  draw();
}
async function cloudReauth() {
  const cl = ENV.cfg.cloud; if (!cl) return;
  if (cl.provider === "nextcloud") {
    modal("Nextcloud-Anmeldung erneuern", `<div class="form"><label>Benutzer</label><div>${esc(cl.user)} · ${esc(cl.host)}</div><label>App-Passwort</label><input name="p" type="password" autocomplete="new-password"></div>`,
      { ok: "Speichern & testen", onOk: ov => { const p = v(ov, "p"); if (!p) throw new Error("Bitte App-Passwort eingeben."); (async () => { await api.secretSet("ncPass", p); SY.prov = null; await cloudSync("anmeldung"); })(); } });
  } else if (SY_PKCE) {
    try { const tok = await syMsPkce(cl); await api.secretSet("msRefresh", tok.refresh_token); SY.prov = null; cloudSync("anmeldung"); toast("Neu angemeldet"); }
    catch (e) { toast(e.message); }
  } else {
    const W = { cancel: false };
    const ov = modal("Microsoft-Anmeldung erneuern", `<div id="msre"><span class="hint">Code wird angefordert …</span></div>`, { ok: null });
    ov.querySelector("[data-x=c]").addEventListener("click", () => W.cancel = true);
    try {
      const dc = await PV.msDeviceCode(cl, SYT);
      ov.querySelector("#msre").innerHTML = `<div class="mscode"><span>Code</span><b>${esc(dc.user_code)}</b><button class="btn" id="msopen">${ic("fwd")}microsoft.com/devicelogin öffnen</button><span class="hint">Code eingeben und anmelden – dieses Fenster schließt sich danach.</span></div>`;
      ov.querySelector("#msopen").onclick = () => api.openExternal(dc.verification_uri); api.openExternal(dc.verification_uri);
      const tok = await PV.msPollToken(cl, SYT, dc, () => !W.cancel);
      await api.secretSet("msRefresh", tok.refresh_token); ov.close(); SY.prov = null; cloudSync("anmeldung"); toast("Neu angemeldet");
    } catch (e) { if (!W.cancel) ov.querySelector("#msre").innerHTML = `<div class="err">${esc(e.message)}</div>`; }
  }
}

/* ---------- OneDrive-Anmeldung in der Browser-App: Autorisierungscode + PKCE über Pop-up ---------- */
async function syMsPkce(cfg) {
  const rb = n => crypto.getRandomValues(new Uint8Array(n));
  const b64u = u8 => SC.b64(u8).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const verifier = b64u(rb(32)), state = b64u(rb(12));
  const challenge = b64u(new Uint8Array(await crypto.subtle.digest("SHA-256", SY_TE.encode(verifier))));
  const redirect = PLATFORM.authRedirect();
  const code = await new Promise((res, rej) => {
    const bc = "BroadcastChannel" in window ? new BroadcastChannel("mp-auth") : null;
    let timer = null;
    const cleanup = () => { clearTimeout(timer); window.removeEventListener("message", onMsg); window.removeEventListener("storage", onStore); if (bc) bc.close(); try { localStorage.removeItem("mp-auth"); } catch (e) {} };
    const done = d => { if (!d || d.state !== state) return; cleanup(); if (d.error) rej(new Error("Microsoft-Anmeldung: " + (d.error_description || d.error).split("\n")[0])); else res(d.code); };
    const onMsg = e => { if (e.origin === location.origin) done(e.data); };
    const onStore = e => { if (e.key === "mp-auth" && e.newValue) { try { done(JSON.parse(e.newValue)); } catch (x) {} } };
    window.addEventListener("message", onMsg); window.addEventListener("storage", onStore); if (bc) bc.onmessage = e => done(e.data);
    timer = setTimeout(() => { cleanup(); rej(new Error("Anmeldung abgebrochen (Zeitüberschreitung).")); }, 10 * 60000);
    const w = window.open(PV.msAuthUrl(cfg, redirect, challenge, state), "mpauth", "width=520,height=720");
    if (!w) { cleanup(); rej(new Error("Das Anmeldefenster wurde blockiert – bitte Pop-ups für diese Seite erlauben.")); }
  });
  return PV.msCodeToken(cfg, SYT, code, verifier, redirect);
}
