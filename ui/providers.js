/* Makler-Prozess – Cloud-Anbieter: Nextcloud/WebDAV und OneDrive/SharePoint (Microsoft Graph)
 * Gemeinsame Schnittstelle: test(), list(dir), get(rel), put(rel, bytes), del(rel), mkdirp(dir)
 * Netzwerk über T.http({method,url,headers,body}) → {status, headers, bytes:Uint8Array}
 */
(function (G) {
  "use strict";
  const te = new TextEncoder(), td = new TextDecoder();
  const encPath = rel => String(rel || "").split("/").filter(Boolean).map(encodeURIComponent).join("/");
  const parentOf = rel => { const a = String(rel).split("/").filter(Boolean); a.pop(); return a.join("/"); };
  class CloudError extends Error { constructor(msg, code) { super(msg); this.code = code; } }
  const errFor = (r, what) => {
    if (r.status === 401 || r.status === 403) return new CloudError(`Keine Berechtigung (${r.status}) – Anmeldung oder Freigabe prüfen.`, "auth");
    if (r.status === 507) return new CloudError("Cloud-Speicher ist voll.", "full");
    return new CloudError(`${what}: Fehler ${r.status}${r.text ? " – " + r.text.slice(0, 160) : ""}`, "http");
  };

  /* =================== Nextcloud / WebDAV =================== */
  function webdav(cfg, T) {
    // cfg: {root: "https://host/remote.php/dav/files/USER", folder: "MaklerProzess", user, pass}
    const root = cfg.root.replace(/\/+$/, ""), folder = String(cfg.folder || "MaklerProzess").replace(/^\/+|\/+$/g, "");
    const auth = "Basic " + G.btoa(unescape(encodeURIComponent(cfg.user + ":" + cfg.pass)));
    const url = rel => root + "/" + encPath(folder + "/" + (rel || "")) + (rel === "" || rel === undefined ? "/" : "");
    const req = async (method, rel, opt = {}) => {
      const r = await T.http({ method, url: opt.abs || url(rel), headers: { Authorization: auth, ...(opt.headers || {}) }, body: opt.body });
      return r;
    };
    async function mkdirp(dir) {
      const segs = (folder + "/" + (dir || "")).split("/").filter(Boolean);
      let acc = "";
      for (const s of segs) {
        acc += (acc ? "/" : "") + s;
        const r = await T.http({ method: "MKCOL", url: root + "/" + encPath(acc) + "/", headers: { Authorization: auth } });
        if (![201, 405, 301, 302].includes(r.status) && !(r.status === 409 && false)) {
          if (r.status === 401 || r.status === 403) throw errFor(r, "Ordner anlegen");
          if (r.status >= 400 && r.status !== 405) throw errFor(r, "Ordner anlegen " + acc);
        }
      }
    }
    function parse(xml, selfHref) {
      const out = [], res = xml.match(/<(?:[\w-]+:)?response\b[\s\S]*?<\/(?:[\w-]+:)?response>/g) || [];
      const norm = h => decodeURIComponent(h.replace(/^https?:\/\/[^/]+/, "")).replace(/\/+$/, "");
      const self = norm(selfHref);
      for (const r of res) {
        const h = (r.match(/<(?:[\w-]+:)?href>([^<]*)</) || [])[1]; if (!h) continue;
        const p = norm(h); if (p === self) continue;
        out.push({ name: p.split("/").pop(), dir: /<(?:[\w-]+:)?collection\s*\/?>/.test(r), size: +((r.match(/getcontentlength>(\d+)</) || [])[1] || 0) });
      }
      return out;
    }
    return {
      kind: "nextcloud", label: `Nextcloud · ${cfg.host || root.replace(/^https?:\/\//, "").split("/")[0]}`,
      async test() {
        const r = await req("PROPFIND", "", { headers: { Depth: "0" } });
        if (r.status === 404) { await mkdirp(""); return true; }
        if (r.status >= 400) throw errFor(r, "Verbindung");
        return true;
      },
      async list(dir) {
        const u = url(dir ? dir + "/" : "").replace(/\/?$/, "/");
        const r = await T.http({ method: "PROPFIND", url: u, headers: { Authorization: auth, Depth: "1", "Content-Type": "application/xml" },
          body: te.encode('<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:resourcetype/><d:getcontentlength/></d:prop></d:propfind>') });
        if (r.status === 404) return [];
        if (r.status >= 400) throw errFor(r, "Ordner lesen");
        return parse(td.decode(r.bytes), u);
      },
      async get(rel) {
        const r = await req("GET", rel);
        if (r.status === 404) return null;
        if (r.status >= 400) throw errFor(r, "Laden " + rel);
        return r.bytes;
      },
      async put(rel, bytes, ct = "application/octet-stream") {
        let r = await req("PUT", rel, { body: bytes, headers: { "Content-Type": ct } });
        if (r.status === 409 || r.status === 404) { await mkdirp(parentOf(rel)); r = await req("PUT", rel, { body: bytes, headers: { "Content-Type": ct } }); }
        if (r.status >= 400) throw errFor(r, "Speichern " + rel);
        return true;
      },
      async del(rel) { const r = await req("DELETE", rel); if (r.status >= 400 && r.status !== 404) throw errFor(r, "Löschen " + rel); return true; },
      mkdirp
    };
  }
  /* Nextcloud-Server-Adresse → WebDAV-Wurzel */
  function nextcloudRoot(server, user) {
    let s = String(server || "").trim().replace(/\/+$/, "");
    if (!/^https?:\/\//i.test(s)) s = "https://" + s;
    if (/\/remote\.php\/(dav|webdav)/.test(s)) return s; // bereits WebDAV-Adresse
    s = s.replace(/\/index\.php.*$/, "").replace(/\/apps\/.*$/, "");
    return s + "/remote.php/dav/files/" + encodeURIComponent(user);
  }

  /* =================== OneDrive / SharePoint (Microsoft Graph) =================== */
  const GRAPH = "https://graph.microsoft.com/v1.0";
  const SCOPE = "Files.ReadWrite.All Sites.ReadWrite.All User.Read offline_access";
  const form = o => te.encode(Object.entries(o).map(([k, v]) => encodeURIComponent(k) + "=" + encodeURIComponent(v)).join("&"));
  const json = r => { try { return JSON.parse(td.decode(r.bytes)); } catch (e) { return {}; } };
  const loginBase = cfg => (cfg.loginBase || "https://login.microsoftonline.com") + "/" + encodeURIComponent(cfg.tenant || "organizations") + "/oauth2/v2.0";

  async function msDeviceCode(cfg, T) {
    const r = await T.http({ method: "POST", url: loginBase(cfg) + "/devicecode", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form({ client_id: cfg.clientId, scope: SCOPE }) });
    const j = json(r);
    if (r.status >= 400) throw new CloudError("Microsoft-Anmeldung nicht möglich: " + (j.error_description || j.error || r.status).toString().split("\r\n")[0], "auth");
    return j; // user_code, verification_uri, device_code, interval, expires_in, message
  }
  async function msPollToken(cfg, T, dc, onTick) {
    const until = Date.now() + (dc.expires_in || 900) * 1000; let wait = (dc.interval || 5) * 1000;
    while (Date.now() < until) {
      await new Promise(res => setTimeout(res, wait));
      if (onTick && onTick() === false) throw new CloudError("Anmeldung abgebrochen.", "cancel");
      const r = await T.http({ method: "POST", url: loginBase(cfg) + "/token", headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form({ grant_type: "urn:ietf:params:oauth:grant-type:device_code", client_id: cfg.clientId, device_code: dc.device_code }) });
      const j = json(r);
      if (r.status < 400 && j.access_token) return j;
      if (j.error === "authorization_pending") continue;
      if (j.error === "slow_down") { wait += 5000; continue; }
      throw new CloudError("Anmeldung fehlgeschlagen: " + (j.error_description || j.error || r.status).toString().split("\r\n")[0], "auth");
    }
    throw new CloudError("Anmeldecode abgelaufen – bitte erneut versuchen.", "auth");
  }

  function graph(cfg, T, secrets) {
    // cfg: {clientId, tenant, driveId, itemId, folderLabel, graphBase?}; secrets: {get(), set(refreshToken)}
    const base = cfg.graphBase || GRAPH;
    let token = null, tokenUntil = 0;
    async function access() {
      if (token && Date.now() < tokenUntil - 60000) return token;
      const rt = await secrets.get();
      if (!rt) throw new CloudError("Nicht bei Microsoft angemeldet – bitte unter Einstellungen neu anmelden.", "auth");
      const r = await T.http({ method: "POST", url: loginBase(cfg) + "/token", headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form({ grant_type: "refresh_token", client_id: cfg.clientId, refresh_token: rt, scope: SCOPE }) });
      const j = json(r);
      if (r.status >= 400 || !j.access_token) throw new CloudError("Microsoft-Anmeldung abgelaufen – bitte neu anmelden (" + (j.error || r.status) + ").", "auth");
      token = j.access_token; tokenUntil = Date.now() + (j.expires_in || 3600) * 1000;
      if (j.refresh_token) await secrets.set(j.refresh_token);
      return token;
    }
    async function call(method, path, opt = {}) {
      for (let attempt = 0; attempt < 3; attempt++) {
        const tk = await access();
        const r = await T.http({ method, url: /^https?:/.test(path) ? path : base + path, headers: { Authorization: "Bearer " + tk, ...(opt.headers || {}) }, body: opt.body });
        if (r.status === 401 && attempt === 0) { token = null; continue; }
        if (r.status === 429 || r.status === 503) { const ra = +((r.headers || {})["retry-after"] || 2); await new Promise(res => setTimeout(res, Math.min(ra, 20) * 1000)); continue; }
        return r;
      }
      throw new CloudError("Microsoft Graph antwortet nicht (zu viele Anfragen).", "http");
    }
    const item = rel => `/drives/${cfg.driveId}/items/${cfg.itemId}` + (rel ? `:/${encPath(rel)}:` : "");
    return {
      kind: "onedrive", label: `OneDrive · ${cfg.folderLabel || "MaklerProzess"}`,
      async test() { const r = await call("GET", item("") + "?$select=id,name"); if (r.status >= 400) throw errFor(r, "Verbindung"); return true; },
      async list(dir) {
        let url = (dir ? item(dir) : item("")) + "/children?$select=name,size,folder,file&$top=999", out = [];
        while (url) {
          const r = await call("GET", url);
          if (r.status === 404) return out;
          if (r.status >= 400) throw errFor(r, "Ordner lesen");
          const j = json(r);
          for (const it of j.value || []) out.push({ name: it.name, dir: !!it.folder, size: it.size || 0 });
          url = j["@odata.nextLink"] || null;
        }
        return out;
      },
      async get(rel) {
        // Download-Adresse abfragen und ohne Anmeldedaten laden (vorab signierte Adresse)
        const m = await call("GET", item(rel) + "?$select=id,size,@microsoft.graph.downloadUrl");
        if (m.status === 404) return null;
        if (m.status >= 400) throw errFor(m, "Laden " + rel);
        const dl = json(m)["@microsoft.graph.downloadUrl"];
        if (!dl) throw new CloudError("Keine Download-Adresse für " + rel, "http");
        const r = await T.http({ method: "GET", url: dl, headers: {} });
        if (r.status >= 400) throw errFor(r, "Laden " + rel);
        return r.bytes;
      },
      async put(rel, bytes) {
        if (bytes.length <= 4 * 1024 * 1024) {
          const r = await call("PUT", item(rel) + "/content", { body: bytes, headers: { "Content-Type": "application/octet-stream" } });
          if (r.status >= 400) throw errFor(r, "Speichern " + rel);
          return true;
        }
        const s = await call("POST", item(rel) + "/createUploadSession", { body: te.encode(JSON.stringify({ item: { "@microsoft.graph.conflictBehavior": "replace" } })), headers: { "Content-Type": "application/json" } });
        if (s.status >= 400) throw errFor(s, "Upload starten " + rel);
        const up = json(s).uploadUrl, CH = 10 * 327680;
        for (let a = 0; a < bytes.length; a += CH) {
          const b = Math.min(bytes.length, a + CH);
          const r = await T.http({ method: "PUT", url: up, headers: { "Content-Range": `bytes ${a}-${b - 1}/${bytes.length}`, "Content-Type": "application/octet-stream" }, body: bytes.subarray(a, b) });
          if (r.status >= 400) throw errFor(r, "Upload " + rel);
        }
        return true;
      },
      async del(rel) { const r = await call("DELETE", item(rel)); if (r.status >= 400 && r.status !== 404) throw errFor(r, "Löschen " + rel); return true; },
      async mkdirp() { /* Graph legt Ordner beim Hochladen per Pfad automatisch an */ },
      call
    };
  }
  /* Zielordner auflösen: eigenes OneDrive, SharePoint-Bibliothek oder geteilter Ordner */
  async function graphResolveTarget(cfg, T, secrets, target) {
    const g = graph({ ...cfg, driveId: "x", itemId: "x" }, T, secrets);
    const J = async r => { const j = json(r); if (r.status >= 400) throw new CloudError((j.error && j.error.message) || ("Fehler " + r.status), r.status === 403 ? "auth" : "http"); return j; };
    const ensure = async (driveId, parentPath, name) => {
      const p = (parentPath ? parentPath.replace(/^\/|\/$/g, "") + "/" : "") + name;
      let r = await g.call("GET", `/drives/${driveId}/root:/${encPath(p)}`);
      if (r.status === 404) {
        const parent = parentPath ? `/drives/${driveId}/root:/${encPath(parentPath.replace(/^\/|\/$/g, ""))}:/children` : `/drives/${driveId}/root/children`;
        r = await g.call("POST", parent, { body: te.encode(JSON.stringify({ name, folder: {}, "@microsoft.graph.conflictBehavior": "fail" })), headers: { "Content-Type": "application/json" } });
      }
      const j = await J(r); return { driveId, itemId: j.id, folderLabel: p };
    };
    if (target.type === "me") { const d = await J(await g.call("GET", "/me/drive?$select=id")); return ensure(d.id, "", target.folder || "MaklerProzess"); }
    if (target.type === "site") {
      const u = new URL(target.siteUrl.trim()); const m = u.pathname.match(/^\/(sites|teams)\/[^/]+/);
      if (!m) throw new CloudError("SharePoint-Adresse erwartet, z. B. https://firma.sharepoint.com/sites/Makler", "input");
      const site = await J(await g.call("GET", `/sites/${u.hostname}:${m[0]}?$select=id,displayName`));
      const drive = await J(await g.call("GET", `/sites/${site.id}/drive?$select=id`));
      const res = await ensure(drive.id, "", target.folder || "MaklerProzess"); res.folderLabel = site.displayName + " / " + res.folderLabel; return res;
    }
    if (target.type === "shared") return { driveId: target.driveId, itemId: target.itemId, folderLabel: "Geteilt: " + target.name };
    throw new CloudError("Unbekanntes Ziel", "input");
  }
  async function graphSharedFolders(cfg, T, secrets) {
    const g = graph({ ...cfg, driveId: "x", itemId: "x" }, T, secrets);
    const r = await g.call("GET", "/me/drive/sharedWithMe");
    const j = json(r); if (r.status >= 400) throw new CloudError((j.error && j.error.message) || "Fehler " + r.status, "http");
    return (j.value || []).filter(it => (it.remoteItem && it.remoteItem.folder) || it.folder).map(it => ({ name: it.name, driveId: it.remoteItem.parentReference.driveId, itemId: it.remoteItem.id, by: ((it.remoteItem.shared || {}).owner || {}).user ? it.remoteItem.shared.owner.user.displayName : "" }));
  }

  /* Anmeldung im Browser (PWA): Autorisierungscode mit PKCE, Umleitung auf auth.html */
  function msAuthUrl(cfg, redirectUri, challenge, state) {
    const q = { client_id: cfg.clientId, response_type: "code", redirect_uri: redirectUri, response_mode: "query", scope: SCOPE, code_challenge: challenge, code_challenge_method: "S256", state, prompt: "select_account" };
    return loginBase(cfg) + "/authorize?" + Object.entries(q).map(([k, v]) => encodeURIComponent(k) + "=" + encodeURIComponent(v)).join("&");
  }
  async function msCodeToken(cfg, T, code, verifier, redirectUri) {
    const r = await T.http({ method: "POST", url: loginBase(cfg) + "/token", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form({ grant_type: "authorization_code", client_id: cfg.clientId, code, redirect_uri: redirectUri, code_verifier: verifier, scope: SCOPE }) });
    const j = json(r);
    if (r.status >= 400 || !j.access_token) throw new CloudError("Anmeldung fehlgeschlagen: " + (j.error_description || j.error || r.status).toString().split("\r\n")[0], "auth");
    return j;
  }

  const API = { webdav, nextcloudRoot, graph, graphResolveTarget, graphSharedFolders, msDeviceCode, msPollToken, msAuthUrl, msCodeToken, CloudError, encPath, parentOf };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  G.Providers = API;
})(typeof globalThis !== "undefined" ? globalThis : window);
