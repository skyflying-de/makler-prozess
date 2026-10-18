/* Makler-Prozess – Plattform-Schicht für Tablet: Android-App (Capacitor) und Browser-App (PWA).
   Stellt dieselbe Schnittstelle window.api bereit wie die Windows-App (preload.js), damit die
   Oberfläche (app.js, sync.js) unverändert bleibt. In Electron ist window.api schon vorhanden. */
"use strict";
(function () {
  if (window.api) return; // Windows-App
  const VERSION = "__VERSION__";
  const CAP = window.Capacitor;
  const NATIVE = !!(CAP && CAP.isNativePlatform && CAP.isNativePlatform());
  const ANDROID_UA = /Android/i.test(navigator.userAgent);
  const plug = name => {
    if (!NATIVE) return null;
    if (CAP.registerPlugin) return CAP.registerPlugin(name);
    return new Proxy({}, { get: (_, m) => o => CAP.nativePromise(name, m, o) });
  };
  const NativeHttp = plug("NativeHttp"), Filesystem = plug("Filesystem"), Share = plug("Share"), Browser = plug("Browser"), App = plug("App");

  /* ---------- Base64 ---------- */
  const b64 = u8 => { let s = ""; const c = 0x8000; for (let i = 0; i < u8.length; i += c) s += String.fromCharCode.apply(null, u8.subarray(i, i + c)); return btoa(s); };
  const unb64 = s => { const bin = atob(s || ""); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };
  const te = new TextEncoder();

  /* ---------- IndexedDB ---------- */
  let dbp = null;
  const openDB = () => dbp || (dbp = new Promise((res, rej) => {
    const r = indexedDB.open("makler-prozess", 1);
    r.onupgradeneeded = () => { r.result.createObjectStore("kv"); r.result.createObjectStore("files"); };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  }));
  async function tx(store, mode, fn) {
    const db = await openDB();
    return new Promise((res, rej) => {
      const t = db.transaction(store, mode), s = t.objectStore(store); let out;
      const r = fn(s, v => { out = v; });
      if (r && "onsuccess" in r) r.onsuccess = () => { out = r.result; };
      t.oncomplete = () => res(out); t.onerror = t.onabort = () => rej(t.error || new Error("Speicherfehler"));
    });
  }
  const I = {
    get: (st, k) => tx(st, "readonly", s => s.get(k)),
    put: (st, k, v) => tx(st, "readwrite", s => s.put(v, k)),
    del: (st, k) => tx(st, "readwrite", s => s.delete(k)),
    keys: st => tx(st, "readonly", s => s.getAllKeys()),
    clear: st => tx(st, "readwrite", s => s.clear())
  };

  /* ---------- Konfiguration ---------- */
  const rnd = n => [...crypto.getRandomValues(new Uint8Array(n))].map(b => b.toString(16).padStart(2, "0")).join("");
  const STORE_LABEL = NATIVE ? "App-Speicher (Android)" : "Browser-Speicher (PWA)";
  let cfg = null;
  async function getCfg() {
    if (cfg) return cfg;
    cfg = (await I.get("kv", "cfg")) || {};
    cfg = { mode: "local", cloud: null, autoBackup: false, keep: 0, authMode: "pin", ...cfg };
    if (!cfg.deviceId) { cfg.deviceId = rnd(6); cfg.deviceName = NATIVE ? "Android-Tablet" : ANDROID_UA ? "Tablet (Browser)" : "Browser"; await I.put("kv", "cfg", cfg); }
    return cfg;
  }
  const pubCfg = () => ({ ...cfg, dataDir: STORE_LABEL, backupDirEff: null, defaultData: STORE_LABEL, hasSecrets: [] });

  /* ---------- Geheimnisse: AES-GCM mit nicht exportierbarem Geräteschlüssel ---------- */
  async function wrapKey() {
    let k = await I.get("kv", "wrapKey");
    if (!k) { k = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]); await I.put("kv", "wrapKey", k); }
    return k;
  }
  async function secretSet(name, value) {
    const all = (await I.get("kv", "secrets")) || {};
    if (value === null || value === undefined) delete all[name];
    else { const iv = crypto.getRandomValues(new Uint8Array(12)); const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await wrapKey(), te.encode(String(value)))); all[name] = { iv, ct }; }
    await I.put("kv", "secrets", all); return true;
  }
  async function secretGet(name) {
    const all = (await I.get("kv", "secrets")) || {}, e = all[name]; if (!e) return null;
    try { return new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: e.iv }, await wrapKey(), e.ct)); } catch (x) { return null; }
  }

  /* ---------- Dateien ---------- */
  const safeRel = rel => String(rel || "").replace(/[<>:"|?*\u0000-\u001f]/g, "_").replace(/\\/g, "/").split("/").filter(s => s && s !== "." && s !== "..").map(s => s.trim().replace(/[. ]+$/, "")).join("/");
  async function uniqueName(dir, name) {
    const keys = new Set((await I.keys("files")).filter(k => k.startsWith(dir + "/")));
    const base = String(name).replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_"), dot = base.lastIndexOf("."), ext = dot > 0 ? base.slice(dot) : "", stem = dot > 0 ? base.slice(0, dot) : base;
    let out = base, n = 1; while (keys.has(dir + "/" + out)) out = `${stem} (${++n})${ext}`;
    return out;
  }
  const mimeOf = n => { const e = (String(n).split(".").pop() || "").toLowerCase(); return { pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", webp: "image/webp", svg: "image/svg+xml", txt: "text/plain", json: "application/json", doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }[e] || "application/octet-stream"; };
  async function putFile(rel, u8, own) { await I.put("files", rel, { buf: u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength), size: u8.byteLength, mtime: Date.now(), own: !!own }); }
  async function getFile(rel) { const e = await I.get("files", safeRel(rel)); return e ? new Uint8Array(e.buf) : null; }
  /* holt eine Datei bei Bedarf aus der Cloud (nur wenn Cloud-Sync aktiv) */
  async function ensureLocal(rel) {
    rel = safeRel(rel);
    let u8 = await getFile(rel); if (u8) return u8;
    if (typeof window.syFetchFile === "function") { u8 = await window.syFetchFile(rel); if (u8) { await putFile(rel, u8, false); return u8; } }
    return null;
  }

  /* Bilder: Platzhalter + Nachladen aus dem Gerätespeicher bzw. der Cloud */
  const PH = "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==";
  const urls = new Map(), loading = new Map();
  function fileSrc(rel) { const r = safeRel(rel); return urls.get(r) || PH + "#mp=" + encodeURIComponent(r); }
  function blobUrl(rel) {
    rel = safeRel(rel);
    if (urls.has(rel)) return Promise.resolve(urls.get(rel));
    if (!loading.has(rel)) loading.set(rel, ensureLocal(rel).then(u8 => { loading.delete(rel); if (!u8) return null; const u = URL.createObjectURL(new Blob([u8], { type: mimeOf(rel) })); urls.set(rel, u); return u; }).catch(() => { loading.delete(rel); return null; }));
    return loading.get(rel);
  }
  async function hydrate(root) {
    const imgs = [...(root || document).querySelectorAll('img[src*="#mp="]')];
    await Promise.all(imgs.map(async img => {
      const rel = decodeURIComponent(img.getAttribute("src").split("#mp=")[1] || "");
      img.classList.add("mpload");
      const u = await blobUrl(rel);
      if (u) { await new Promise(res => { img.onload = img.onerror = res; img.src = u; }); img.classList.remove("mpload"); }
      else { img.classList.remove("mpload"); img.classList.add("mpmiss"); img.setAttribute("src", PH); img.title = "Datei nicht verfügbar (offline oder noch nicht hochgeladen)"; }
    }));
  }
  let hyT = 0;
  new MutationObserver(() => { if (hyT) return; hyT = requestAnimationFrame(() => { hyT = 0; hydrate(document); }); }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["src"] });

  /* ---------- Teilen / Herunterladen / Öffnen ---------- */
  function download(u8, name) {
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([u8], { type: mimeOf(name) })); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  }
  async function nativeCacheUri(u8, name) {
    const r = await Filesystem.writeFile({ path: "teilen/" + name, data: b64(u8), directory: "CACHE", recursive: true });
    return r.uri;
  }
  async function shareFile(u8, name, { title = name, text = "" } = {}) {
    if (NATIVE) {
      const uri = await nativeCacheUri(u8, name);
      try { await Share.share({ title, text, files: [uri], dialogTitle: title }); } catch (e) { if (/cancel/i.test(e && e.message)) return true; throw e; }
      return true;
    }
    const f = new File([u8], name, { type: mimeOf(name) });
    if (navigator.canShare && navigator.canShare({ files: [f] })) { try { await navigator.share({ files: [f], title, text }); return true; } catch (e) { if (e.name === "AbortError") return true; } }
    download(u8, name); return false;
  }
  async function openBytes(u8, name) {
    if (/^image\//.test(mimeOf(name)) && typeof window.showImg === "function") { window.showImg(URL.createObjectURL(new Blob([u8], { type: mimeOf(name) })), name); return; }
    if (NATIVE) { await shareFile(u8, name, { title: "Öffnen: " + name }); return; }
    if (!ANDROID_UA && mimeOf(name) === "application/pdf") { const w = window.open(URL.createObjectURL(new Blob([u8], { type: "application/pdf" })), "_blank"); if (w) return; }
    download(u8, name);
  }
  async function openRelFile(rel) {
    const t = typeof window.toast === "function" ? window.toast : () => {};
    const local = await getFile(rel); if (!local) t("Datei wird geladen …");
    const u8 = local || await ensureLocal(rel);
    if (!u8) throw new Error("Datei ist auf diesem Gerät nicht vorhanden und konnte nicht aus der Cloud geladen werden.");
    await openBytes(u8, rel.split("/").pop());
  }
  function docViewer(name) {
    document.querySelectorAll(".docov").forEach(x => x.remove());
    const ov = document.createElement("div"); ov.className = "docov";
    ov.innerHTML = `<div class="docbar"><b>${name.replace(/[_.]/g, " ").replace(/ html$/, "")}</b><span class="sp"></span><button class="btn">Schließen</button></div><iframe src="${encodeURI(name)}" title="Dokument"></iframe>`;
    ov.querySelector("button").onclick = () => ov.remove(); document.body.appendChild(ov);
  }

  /* ---------- PDF aus der Druckansicht (ohne Druckdienst) ---------- */
  const loadScript = src => new Promise((res, rej) => { if (document.querySelector(`script[data-src="${src}"]`)) return res(); const s = document.createElement("script"); s.src = src; s.dataset.src = src; s.onload = res; s.onerror = () => rej(new Error("Baustein fehlt: " + src)); document.head.appendChild(s); });
  async function renderPdf() {
    await loadScript("vendor/html2canvas.min.js"); await loadScript("vendor/jspdf.umd.min.js");
    const src = document.getElementById("printarea");
    const host = document.createElement("div"); host.className = "pdfhost";
    host.innerHTML = src.innerHTML; document.body.appendChild(host);
    try {
      await hydrate(host);
      await Promise.all([...host.querySelectorAll("img")].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; })));
      const doc = host.firstElementChild || host, W = 718, PAGE = 1047; // A4 bei 96 dpi abzüglich 10 mm Rand
      const top0 = doc.getBoundingClientRect().top, total = doc.scrollHeight;
      const rect = el => { const r = el.getBoundingClientRect(); return [r.top - top0, r.bottom - top0]; };
      const atoms = [...doc.querySelectorAll("tr,h2,h3,p,figure,.sigs,.band,.legal,img,.dfoot")].map(rect).filter(([a, b]) => b - a < PAGE * 0.9);
      const heads = [...doc.querySelectorAll("h2,h3")].map(rect);
      const forced = [...doc.querySelectorAll(".photoapp")].map(el => rect(el)[0]);
      const breaks = []; let start = 0;
      while (start < total - 2) {
        let end = Math.min(start + PAGE, total);
        const f = forced.find(y => y > start + 20 && y < end); if (f) end = f;
        if (end < total) {
          for (let i = 0; i < 4; i++) { const cut = atoms.filter(([a, b]) => a < end && b > end && a > start + 40); if (!cut.length) break; end = Math.min(...cut.map(x => x[0])); }
          const h = heads.find(([a, b]) => b <= end && b > end - 40 && a > start + 40); if (h) end = h[0];
        }
        breaks.push([start, end]); start = end;
      }
      const { jsPDF } = window.jspdf, pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
      const scale = breaks.length > 6 ? 1.5 : 2, mmPerPx = 190 / W;
      for (let i = 0; i < breaks.length; i++) {
        const [a, b] = breaks[i];
        const pg = document.createElement("div"); pg.className = "pdfpage"; pg.style.height = (b - a) + "px";
        const inner = doc.cloneNode(true); inner.style.top = -a + "px"; pg.appendChild(inner); document.body.appendChild(pg);
        try {
          const cv = await window.html2canvas(pg, { scale, backgroundColor: "#ffffff", useCORS: true, logging: false });
          if (i) pdf.addPage();
          pdf.addImage(cv.toDataURL("image/jpeg", 0.88), "JPEG", 10, 10, 190, (b - a) * mmPerPx);
        } finally { pg.remove(); }
      }
      return new Uint8Array(pdf.output("arraybuffer"));
    } finally { host.remove(); }
  }

  /* ---------- HTTP: Android nativ (ohne CORS), Browser per fetch ---------- */
  async function http({ method, url, headers, bodyB64 }) {
    if (NATIVE) {
      try { return await NativeHttp.request({ method, url, headers: headers || {}, bodyB64: bodyB64 || null }); }
      catch (e) { throw new Error("Keine Verbindung: " + (e.message || e)); }
    }
    let res;
    try { res = await fetch(url, { method, headers: headers || {}, body: bodyB64 ? unb64(bodyB64) : undefined, redirect: "follow", cache: "no-store", credentials: "omit", mode: "cors" }); }
    catch (e) { throw new Error(navigator.onLine === false ? "Keine Verbindung: Gerät ist offline" : "Keine Verbindung: Server nicht erreichbar oder Zugriff aus dem Browser (CORS) nicht freigegeben"); }
    const hdr = {}; res.headers.forEach((v, k) => { hdr[k.toLowerCase()] = v; });
    return { status: res.status, headers: hdr, b64: b64(new Uint8Array(await res.arrayBuffer())) };
  }

  /* ---------- window.api ---------- */
  const NOPE = what => () => Promise.reject(new Error(what + " ist auf dem Tablet nicht verfügbar – bitte am PC erledigen."));
  const closeFns = [];
  const fireClose = () => closeFns.forEach(f => { try { f(); } catch (e) {} });
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") fireClose(); });
  window.addEventListener("pagehide", fireClose);

  window.api = {
    async load() {
      await getCfg();
      let db = null; const txt = await I.get("kv", "daten");
      if (txt) { try { db = JSON.parse(txt); } catch (e) { const bak = await I.get("kv", "daten.bak"); if (bak) db = JSON.parse(bak); else throw new Error("Daten beschädigt: " + e.message); } }
      return { db, cfg: pubCfg(), version: VERSION, autoBackup: null, platform: NATIVE ? "android" : "web", user: "", host: cfg.deviceName };
    },
    async save(text) {
      await tx("kv", "readwrite", s => { const g = s.get("daten"); g.onsuccess = () => { if (g.result) s.put(g.result, "daten.bak"); s.put(text, "daten"); }; });
      return true;
    },
    async setup() { await getCfg(); return { exists: !!(await I.get("kv", "daten")), backupDir: null }; },
    pickFolder: async () => null,
    async checkFolder() { return { exists: true, hasData: !!(await I.get("kv", "daten")), writable: true }; },
    moveData: NOPE("Speicherort ändern"),
    async setCfg(p) { await getCfg(); p = { ...p }; delete p.secrets; Object.assign(cfg, p); await I.put("kv", "cfg", cfg); return pubCfg(); },
    backup: async () => ({ file: "(Tablet: Sicherung erfolgt über die Cloud)", size: 0 }),
    listBackups: async () => [],
    restore: NOPE("Wiederherstellen"),
    async openPath(rel) { if (rel === "@data" || rel === "@backup") throw new Error("Ordner lassen sich auf dem Tablet nicht öffnen."); await openRelFile(safeRel(rel)); return ""; },
    async showItem(rel) { await openRelFile(safeRel(rel)); },
    async importFiles({ paths, rel }) {
      rel = safeRel(rel); const out = [];
      for (const f of paths) { if (!(f instanceof Blob)) continue; const n = await uniqueName(rel, f.name || "Datei"); await putFile(rel + "/" + n, new Uint8Array(await f.arrayBuffer()), true); out.push({ n, p: safeRel(rel + "/" + n) }); }
      return out;
    },
    async writeImage({ dataURL, rel, name }) {
      const m = /^data:image\/(\w+);base64,(.*)$/.exec(dataURL || ""); if (!m) throw new Error("Bilddaten ungültig");
      rel = safeRel(rel); const n = await uniqueName(rel, (name || rnd(5)) + "." + (m[1] === "jpeg" ? "jpg" : m[1]));
      await putFile(rel + "/" + n, unb64(m[2]), true); return safeRel(rel + "/" + n);
    },
    async deleteFile(rel) { rel = safeRel(rel); await I.del("files", rel); const u = urls.get(rel); if (u) { URL.revokeObjectURL(u); urls.delete(rel); } return true; },
    async pdf({ name, rel, open }) {
      const u8 = await renderPdf();
      if (rel) { rel = safeRel(rel); const n = await uniqueName(rel, name); await putFile(rel + "/" + n, u8, true); if (open) await openBytes(u8, n); return { file: n, rel: safeRel(rel + "/" + n) }; }
      await shareFile(u8, name, { title: name }); return { file: name, rel: null };
    },
    async print() {
      if (NATIVE) { const u8 = await renderPdf(); await shareFile(u8, "Druck.pdf", { title: "Drucken" }); return { ok: true }; }
      window.print(); return { ok: true };
    },
    async saveText({ name, text }) { await shareFile(te.encode(text), name); return name; },
    async mail({ to, subject, body, attachRel }) {
      try { if (to && navigator.clipboard) await navigator.clipboard.writeText(to); } catch (e) {}
      const u8 = attachRel ? await ensureLocal(attachRel) : null;
      if (u8) { await shareFile(u8, attachRel.split("/").pop(), { title: subject, text: body }); if (to && window.toast) setTimeout(() => window.toast("E-Mail-Adresse kopiert: " + to), 400); return true; }
      const href = `mailto:${encodeURIComponent(to || "")}?subject=${encodeURIComponent(subject || "")}&body=${encodeURIComponent(body || "")}`;
      location.href = href; // Android-App: die WebView übergibt mailto: an die Mail-App
      return true;
    },
    async hash(text) { const d = new Uint8Array(await crypto.subtle.digest("SHA-256", te.encode(String(text)))); return [...d].map(b => b.toString(16).padStart(2, "0")).join(""); },
    async openManual() { docViewer("Anleitung.html"); },
    async openDoc(name) { docViewer(String(name).split("/").pop()); },
    pathOf: file => file,
    http,
    secretSet: (name, value) => secretSet(name, value),
    secretGet: name => secretGet(name),
    secretClear: async () => { await I.del("kv", "secrets"); return true; },
    async fileStat(rel) { const e = await I.get("files", safeRel(rel)); return e ? { size: e.size, mtime: e.mtime } : null; },
    async readB64(rel) { const u8 = await getFile(rel); if (!u8) throw new Error("Datei fehlt: " + rel); return b64(u8); },
    async writeB64(rel, data) { await putFile(safeRel(rel), unb64(data), false); return true; },
    loadSync: () => I.get("kv", "sync").then(x => x || null),
    async saveSync(t) { await I.put("kv", "sync", t); return true; },
    async dropSync() { const t = await I.get("kv", "sync"); if (t) await I.put("kv", "sync_alt_" + Date.now(), t); await I.del("kv", "sync"); return true; },
    async openExternal(url) { if (!/^https:\/\//.test(url)) return true; if (NATIVE) await Browser.open({ url }); else window.open(url, "_blank", "noopener"); return true; },
    async deviceInfo() { await getCfg(); return { id: cfg.deviceId, name: cfg.deviceName, platform: NATIVE ? "Android-App" : ANDROID_UA ? "Android (PWA)" : "Browser (PWA)", host: "", version: VERSION }; },
    onBeforeClose: fn => closeFns.push(fn)
  };

  /* ---------- Zusatzfunktionen für den Tablet-Modus ---------- */
  window.PLATFORM = {
    kind: NATIVE ? "android" : "web", native: NATIVE, mobile: true, version: VERSION, lazyFiles: true,
    msFlow: NATIVE ? "device" : "pkce",
    authRedirect: () => new URL("auth.html", location.href.split("#")[0].split("?")[0]).href,
    fileSrc, hydrate, ensureLocal, blobUrl,
    async storageInfo() {
      const keys = await I.keys("files"); let est = null;
      try { est = navigator.storage && navigator.storage.estimate ? await navigator.storage.estimate() : null; } catch (e) {}
      let persisted = null; try { persisted = navigator.storage && navigator.storage.persisted ? await navigator.storage.persisted() : null; } catch (e) {}
      return { files: keys.length, usage: est ? est.usage : null, quota: est ? est.quota : null, persisted: NATIVE ? true : persisted };
    },
    async dropCache() { // fremde, bereits synchronisierte Dateien entfernen (werden bei Bedarf neu geladen)
      let n = 0; const st = await I.get("kv", "sync"); const synced = st ? (JSON.parse(st).files || {}) : {};
      for (const k of await I.keys("files")) { const e = await I.get("files", k); if (e && !e.own && synced[k]) { await I.del("files", k); n++; } }
      urls.forEach(u => URL.revokeObjectURL(u)); urls.clear(); return n;
    },
    async resetDevice() { await I.clear("files"); await I.clear("kv"); try { localStorage.clear(); } catch (e) {} cfg = null; },
    onBack(fn) { if (NATIVE && App) App.addListener("backButton", fn); },
    exitApp() { if (NATIVE && App) App.exitApp(); }
  };

  /* Browser: dauerhaften Speicher anfordern, damit nichts automatisch gelöscht wird */
  if (!NATIVE && navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
})();
