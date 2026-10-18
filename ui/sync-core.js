/* Makler-Prozess – Sync-Kern (plattformunabhängig: Electron, Android, Browser, Node-Tests)
 * - zerlegt die Datenbank in Datensätze und Felder (flatten / unflatten)
 * - erzeugt Feld-Änderungen (Ops) mit Hybrid-Logical-Clock-Zeitstempeln
 * - führt fremde Änderungen feldgenau zusammen (letzte Änderung gewinnt, Konfliktprotokoll)
 * - sperrt unterschriebene Protokolle (Force-Ops + Manifest)
 * - verschlüsselt Pakete mit AES-256-GCM (Schlüssel per PBKDF2 aus dem Büro-Passwort)
 */
(function (G) {
  "use strict";
  const SEP = "\u001f", KEY = "\u001e", ORD = "\u001d", MANI = "\u0003lock";
  const COLLS = ["objects", "cases", "entries", "tasks", "protocols"];
  const PROTO_CONTENT = new Set(["sections", "date", "kind", "states"]);
  const te = new TextEncoder(), td = new TextDecoder();

  /* ---------- Zerlegen / Zusammensetzen ---------- */
  const isObj = v => v !== null && typeof v === "object" && !Array.isArray(v);
  function keyedArray(a) {
    if (!a.length) return false;
    const ids = new Set();
    for (const e of a) { if (!isObj(e) || typeof e.id !== "string" || !e.id || ids.has(e.id)) return false; ids.add(e.id); }
    return true;
  }
  function flatten(val, path = "", out = {}) {
    if (Array.isArray(val)) {
      if (keyedArray(val)) {
        out[(path ? path + SEP : "") + ORD] = JSON.stringify(val.map(e => e.id));
        for (const e of val) flatten(e, (path ? path + SEP : "") + KEY + e.id, out);
      } else out[path] = JSON.stringify(val);
    } else if (isObj(val)) {
      const ks = Object.keys(val).filter(k => val[k] !== undefined);
      if (!ks.length && path) out[path] = "{}";
      for (const k of ks) flatten(val[k], (path ? path + SEP : "") + k, out);
    } else out[path] = JSON.stringify(val === undefined ? null : val);
    return out;
  }
  function unflatten(flat) {
    const root = {};
    const paths = Object.keys(flat).sort((a, b) => a.split(SEP).length - b.split(SEP).length || (a < b ? -1 : 1));
    for (const p of paths) {
      const segs = p.split(SEP), val = JSON.parse(flat[p]);
      let cur = root;
      for (let i = 0; i < segs.length; i++) {
        const s = segs[i], last = i === segs.length - 1;
        if (s === ORD) { cur.__o = val; break; }
        if (s[0] === KEY) {
          if (!cur.__k) cur.__k = {};
          const id = s.slice(1);
          if (last) { if (!isObj(cur.__k[id])) cur.__k[id] = isObj(val) ? val : {}; break; }
          if (!isObj(cur.__k[id])) cur.__k[id] = {};
          cur = cur.__k[id];
          continue;
        }
        if (last) {
          const ex = cur[s];
          if (isObj(ex) && (ex.__k || Object.keys(ex).length) && (Array.isArray(val) || isObj(val))) break; // feinere Daten haben Vorrang
          cur[s] = val;
          break;
        }
        if (!isObj(cur[s])) cur[s] = {};
        cur = cur[s];
      }
    }
    return fix(root);
  }
  function fix(v) {
    if (Array.isArray(v)) return v.map(fix);
    if (!isObj(v)) return v;
    if (v.__k || v.__o) {
      const k = v.__k || {}, order = (v.__o || []).filter(id => k[id]);
      const rest = Object.keys(k).filter(id => !order.includes(id)).sort();
      return [...order, ...rest].map(id => { const e = fix(k[id]); if (isObj(e) && e.id === undefined) e.id = id; return e; });
    }
    const o = {};
    for (const key of Object.keys(v)) o[key] = fix(v[key]);
    return o;
  }
  /* Datenbank → { "coll/id": {pfad: json} } (DB.ui und DB.meta bleiben gerätelokal) */
  function flatDB(db) {
    const out = {};
    for (const c of COLLS) for (const r of db[c] || []) if (r && r.id) out[c + "/" + r.id] = flatten(r);
    out["settings/main"] = flatten(db.settings || {});
    return out;
  }
  function recordFromFlat(key, flat) {
    const r = unflatten(flat);
    if (!key.startsWith("settings/") && r.id === undefined) r.id = key.slice(key.indexOf("/") + 1);
    return r;
  }

  /* ---------- Hybrid Logical Clock ---------- */
  function makeClock(dev, last) {
    let l = 0, c = 0;
    if (last) { const [a, b] = last.split("."); l = parseInt(a, 36); c = parseInt(b, 36); }
    const fmt = () => l.toString(36).padStart(9, "0") + "." + c.toString(36).padStart(4, "0") + "." + dev;
    return {
      now() { const p = Date.now(); if (p > l) { l = p; c = 0; } else c++; return fmt(); },
      recv(t) { const [a, b] = t.split("."); const rl = parseInt(a, 36), rc = parseInt(b, 36), p = Date.now();
        if (p > l && p > rl) { l = p; c = 0; } else if (rl > l) { l = rl; c = rc + 1; } else if (rl === l) c = Math.max(c, rc) + 1; else c++; },
      get last() { return fmt(); }
    };
  }
  const tMs = t => parseInt(t.split(".")[0], 36);

  /* ---------- Zustand ---------- */
  function newState(dev) {
    return { v: 1, dev, base: {}, meta: {}, dead: {}, locks: {}, outbox: [], pending: {}, cursors: {}, seq: 1, clock: null, conflicts: [], files: {}, fileDel: [], forceNext: [], lastSync: null, lastPull: null, snapSeq: 0 };
  }
  /* Ausgangszustand: alle Felder der aktuellen Datenbank mit einem Zeitstempel versehen (Umstieg / neues Büro) */
  function stampAll(st, db) {
    const clk = makeClock(st.dev, st.clock), t = clk.now();
    st.base = flatDB(db); st.meta = {};
    for (const k in st.base) { st.meta[k] = {}; for (const p in st.base[k]) st.meta[k][p] = { t, d: st.dev }; }
    st.clock = clk.last;
  }

  /* ---------- Lokale Änderungen erkennen ---------- */
  function diff(st, db) {
    const cur = flatDB(db), ops = [], clk = makeClock(st.dev, st.clock);
    let t = null; const T = () => (t = t || clk.now());
    const setMeta = (k, p, o) => { (st.meta[k] = st.meta[k] || {})[p] = { t: o.t, d: st.dev, ...(o.f ? { f: 1 } : {}) }; };
    for (const k in cur) {
      if (st.dead[k]) continue;
      const a = st.base[k] || {}, b = cur[k];
      for (const p in b) if (a[p] !== b[p]) { const o = { k, p, v: JSON.parse(b[p]), t: T(), d: st.dev }; ops.push(o); setMeta(k, p, o); st.pending[k + SEP + p] = 1; }
      for (const p in a) if (!(p in b)) { const o = { k, p, x: 1, t: T(), d: st.dev }; ops.push(o); setMeta(k, p, o); st.pending[k + SEP + p] = 1; }
    }
    for (const k in st.base) if (!(k in cur) && !st.dead[k]) { const o = { k, p: "", x: 1, t: T(), d: st.dev }; ops.push(o); st.dead[k] = o.t; delete st.meta[k]; }
    // Sperre unterschriebener Protokolle: kompletter Inhalt als Force-Ops + Manifest
    for (const k of st.forceNext || []) {
      if (!cur[k]) continue;
      const tf = clk.now(), paths = Object.keys(cur[k]).filter(p => PROTO_CONTENT.has(p.split(SEP)[0]));
      for (const p of paths) { const o = { k, p, v: JSON.parse(cur[k][p]), t: tf, d: st.dev, f: 1 }; ops.push(o); setMeta(k, p, o); }
      ops.push({ k, p: MANI, v: paths, t: tf, d: st.dev, f: 1 });
      st.locks[k] = { t: tf, d: st.dev };
    }
    st.forceNext = [];
    st.base = cur; st.clock = clk.last;
    if (ops.length) st.outbox.push(...ops);
    return ops.length;
  }

  /* ---------- Fremde Änderungen anwenden ---------- */
  function apply(st, db, incoming, devNames = {}) {
    if (!incoming.length) return { changed: 0, conflicts: 0 };
    diff(st, db); // eigenen Stand vorher erfassen
    const clk = makeClock(st.dev, st.clock), touched = new Set();
    let conflicts = 0;
    const logC = (o, mine, theirs, winner, reason) => {
      if (mine === theirs) return;
      conflicts++;
      st.conflicts.unshift({ at: Date.now(), k: o.k, raw: o.p, p: o.p.split(SEP).filter(s => s !== ORD).map(s => s[0] === KEY ? "#" + s.slice(1) : s).join(" › "), mine, theirs, winner, dev: o.d, devName: devNames[o.d] || o.d, reason: reason || "" });
    };
    const status = k => { const r = st.base[k]; return r && r.status ? JSON.parse(r.status) : null; };
    incoming.sort((a, b) => (a.t < b.t ? -1 : a.t > b.t ? 1 : 0));
    for (const o of incoming) {
      clk.recv(o.t);
      if (o.d === st.dev) continue;
      const k = o.k;
      if (st.dead[k]) continue;
      if (o.p === "" && o.x) { st.dead[k] = o.t; delete st.base[k]; delete st.meta[k]; touched.add(k); continue; }
      const rec = st.base[k] || (st.base[k] = {}), meta = st.meta[k] || (st.meta[k] = {}), m = meta[o.p];
      const pk = k + SEP + o.p, mine = rec[o.p], theirs = o.x ? undefined : JSON.stringify(o.v);
      // Manifest einer Unterschrift: alle nicht enthaltenen Inhaltsfelder entfernen
      if (o.p === MANI) {
        const lk = st.locks[k];
        if (lk && lk.t >= o.t) continue;
        st.locks[k] = { t: o.t, d: o.d };
        const keep = new Set(o.v);
        for (const p of Object.keys(rec)) if (PROTO_CONTENT.has(p.split(SEP)[0]) && !keep.has(p)) {
          if (st.pending[k + SEP + p]) logC({ ...o, p }, rec[p], undefined, "theirs", "Protokoll wurde unterschrieben");
          delete rec[p]; delete meta[p];
        }
        touched.add(k); continue;
      }
      const content = k.startsWith("protocols/") && PROTO_CONTENT.has(o.p.split(SEP)[0]);
      if (content && status(k) === "signed" && st.locks[k]) {
        if (o.f) {
          if (m && m.f && m.t >= o.t) continue;
          if (st.pending[pk]) logC(o, mine, theirs, "theirs", "Protokoll wurde unterschrieben");
        } else {
          logC(o, mine, theirs, "mine", "Änderung an unterschriebenem Protokoll nicht übernommen");
          continue;
        }
      } else if (m && m.t >= o.t) {
        if (st.pending[pk]) logC(o, mine, theirs, "mine");
        continue;
      } else if (st.pending[pk]) logC(o, mine, theirs, "theirs");
      if (o.x) delete rec[o.p]; else rec[o.p] = theirs;
      meta[o.p] = { t: o.t, d: o.d, ...(o.f ? { f: 1 } : {}) };
      touched.add(k);
    }
    st.clock = clk.last;
    // betroffene Datensätze in die Datenbank zurückschreiben
    for (const k of touched) {
      const [coll, id] = [k.slice(0, k.indexOf("/")), k.slice(k.indexOf("/") + 1)];
      if (coll === "settings") { if (st.base[k]) { db.settings = recordFromFlat(k, st.base[k]); st.base[k] = flatten(db.settings); } continue; }
      const arr = db[coll] || (db[coll] = []), i = arr.findIndex(r => r.id === id);
      if (!st.base[k] || !Object.keys(st.base[k]).length) { if (i >= 0) arr.splice(i, 1); delete st.base[k]; continue; }
      const r = recordFromFlat(k, st.base[k]);
      if (i >= 0) arr[i] = r; else if (coll === "objects" || coll === "cases") arr.unshift(r); else arr.push(r);
      st.base[k] = flatten(r);
    }
    if (st.conflicts.length > 300) st.conflicts.length = 300;
    return { changed: touched.size, conflicts };
  }

  /* ---------- Verschlüsselung ---------- */
  const C = (G.crypto && G.crypto.subtle) ? G.crypto : (typeof require === "function" ? require("crypto").webcrypto : null);
  const b64 = u8 => { let s = ""; const a = u8 instanceof Uint8Array ? u8 : new Uint8Array(u8); for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode.apply(null, a.subarray(i, i + 0x8000)); return (G.btoa ? G.btoa(s) : Buffer.from(s, "binary").toString("base64")); };
  const unb64 = s => { const bin = G.atob ? G.atob(s) : Buffer.from(s, "base64").toString("binary"); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };
  const ITER = 310000;
  async function deriveKey(password, saltB64, iter = ITER) {
    const base = await C.subtle.importKey("raw", te.encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await C.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: unb64(saltB64), iterations: iter }, base, 256);
    return b64(new Uint8Array(bits));
  }
  const keyCache = {};
  async function aesKey(rawB64) { return keyCache[rawB64] || (keyCache[rawB64] = await C.subtle.importKey("raw", unb64(rawB64), "AES-GCM", false, ["encrypt", "decrypt"])); }
  async function gz(u8, mode) {
    if (typeof CompressionStream === "undefined") return u8;
    const s = new Blob([u8]).stream().pipeThrough(mode === "c" ? new CompressionStream("gzip") : new DecompressionStream("gzip"));
    return new Uint8Array(await new Response(s).arrayBuffer());
  }
  async function seal(obj, rawB64) {
    const iv = C.getRandomValues(new Uint8Array(12));
    const plain = await gz(te.encode(JSON.stringify(obj)), "c");
    const ct = new Uint8Array(await C.subtle.encrypt({ name: "AES-GCM", iv }, await aesKey(rawB64), plain));
    const out = new Uint8Array(4 + 12 + ct.length);
    out.set(te.encode("MPK1"), 0); out.set(iv, 4); out.set(ct, 16);
    return out;
  }
  async function open(u8, rawB64) {
    if (td.decode(u8.subarray(0, 4)) !== "MPK1") throw new Error("Unbekanntes Paketformat");
    const plain = new Uint8Array(await C.subtle.decrypt({ name: "AES-GCM", iv: u8.subarray(4, 16) }, await aesKey(rawB64), u8.subarray(16)));
    return JSON.parse(td.decode(await gz(plain, "d")));
  }
  async function newOffice(password) {
    const salt = b64(C.getRandomValues(new Uint8Array(16)));
    const key = await deriveKey(password, salt);
    const check = b64(await seal({ ok: "makler-prozess" }, key));
    return { office: { format: "makler-prozess-office", v: 1, created: new Date().toISOString(), id: b64(C.getRandomValues(new Uint8Array(9))).replace(/[^a-zA-Z0-9]/g, "x"), kdf: { alg: "PBKDF2-SHA256", iter: ITER, salt }, check }, key };
  }
  async function verifyKey(office, key) {
    try { const r = await open(unb64(office.check), key); return r && r.ok === "makler-prozess"; } catch (e) { return false; }
  }
  async function unlockOffice(office, secret) {
    // Büro-Passwort oder Wiederherstellungsschlüssel (MPK-…)
    const s = String(secret || "").trim();
    if (/^MPK-/.test(s)) { const key = s.slice(4).replace(/-/g, ""); if (await verifyKey(office, key)) return key; return null; }
    const key = await deriveKey(s, office.kdf.salt, office.kdf.iter);
    return (await verifyKey(office, key)) ? key : null;
  }
  const recoveryCode = key => "MPK-" + key.match(/.{1,11}/g).join("-");

  /* ---------- Hilfen ---------- */
  function fileRefs(db) {
    const out = new Set();
    const walk = v => {
      if (typeof v === "string") { if (v.startsWith("Objekte/")) out.add(v); return; }
      if (Array.isArray(v)) { v.forEach(walk); return; }
      if (isObj(v)) for (const k in v) walk(v[k]);
    };
    COLLS.forEach(c => walk(db[c] || []));
    return [...out];
  }
  const pad = n => String(n).padStart(8, "0");
  const prettyPath = p => p.split(SEP).filter(s => s !== ORD).map(s => s[0] === KEY ? "#" + s.slice(1) : s).join(" › ");

  const API = { flatten, unflatten, flatDB, recordFromFlat, makeClock, tMs, newState, stampAll, diff, apply, deriveKey, seal, open, newOffice, verifyKey, unlockOffice, recoveryCode, fileRefs, b64, unb64, pad, prettyPath, SEP, MANI, COLLS };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  G.SyncCore = API;
})(typeof globalThis !== "undefined" ? globalThis : window);
