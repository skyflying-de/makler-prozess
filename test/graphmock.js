// Nachbau Microsoft Login + Graph (OneDrive) für Tests: node test/graphmock.js <port>
const http = require("http"), url = require("url"), crypto = require("crypto");
const port = +process.argv[2] || 1902, base = `http://127.0.0.1:${port}`;
const files = new Map(), folders = new Set([""]), sessions = new Map();
const codes = new Map();
let pending = 0, tokens = new Set(["at-start"]), refresh = new Set(), stats = { pkce: 0, put: 0, get: 0, list: 0, session: 0, chunk: 0, redirects: 0, refresh: 0 };
const ROOT = "fold-mp", DRIVE = "drv1";
const jwt = o => "x." + Buffer.from(JSON.stringify(o)).toString("base64url") + ".y";
let CORS = {};
const send = (res, code, body, hdr = {}) => { res.writeHead(code, { "Content-Type": "application/json", ...CORS, ...hdr }); res.end(typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body)); };
const readBody = req => new Promise(r => { const a = []; req.on("data", c => a.push(c)); req.on("end", () => r(Buffer.concat(a))); });
const addParents = p => { const a = p.split("/"); a.pop(); let acc = ""; for (const s of a) { acc += (acc ? "/" : "") + s; folders.add(acc); } };
http.createServer(async (req, res) => {
  const u = url.parse(req.url, true), p = decodeURIComponent(u.pathname), body = await readBody(req);
  // ---- Browser (CORS) wie bei Microsoft: Graph und Token-Endpunkt erlauben fremde Herkunft ----
  CORS = req.headers.origin ? { "Access-Control-Allow-Origin": req.headers.origin, "Access-Control-Allow-Headers": "Authorization, Content-Type, Content-Range", "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS", "Access-Control-Expose-Headers": "Location, Retry-After" } : {};
  if (req.method === "OPTIONS") { res.writeHead(204, CORS); return res.end(); }
  // ---- Anmeldung im Browser (Autorisierungscode + PKCE) ----
  if (/\/oauth2\/v2\.0\/authorize$/.test(p)) {
    const q = u.query; if (q.code_challenge_method !== "S256" || !q.code_challenge || !q.redirect_uri || !q.state) return send(res, 400, { error: "invalid_request" });
    const code = "code-" + Math.random().toString(36).slice(2); codes.set(code, { ch: q.code_challenge, ru: q.redirect_uri, cid: q.client_id });
    res.writeHead(302, { Location: q.redirect_uri + "?code=" + encodeURIComponent(code) + "&state=" + encodeURIComponent(q.state) }); return res.end();
  }
  // ---- Login ----
  if (/\/oauth2\/v2\.0\/devicecode$/.test(p)) return send(res, 200, { user_code: "MPKX-7Q2B", device_code: "dc-1", verification_uri: "https://microsoft.com/devicelogin", interval: 1, expires_in: 300 });
  if (/\/oauth2\/v2\.0\/token$/.test(p)) {
    const f = new URLSearchParams(body.toString());
    if (f.get("grant_type") === "authorization_code") {
      const c = codes.get(f.get("code")); codes.delete(f.get("code"));
      if (!c || c.ru !== f.get("redirect_uri") || c.cid !== f.get("client_id")) return send(res, 400, { error: "invalid_grant", error_description: "code" });
      if (crypto.createHash("sha256").update(f.get("code_verifier") || "").digest("base64url") !== c.ch) return send(res, 400, { error: "invalid_grant", error_description: "PKCE" });
      if (!req.headers.origin) return send(res, 400, { error: "invalid_request", error_description: "AADSTS9002327: Tokens issued for the 'Single-Page Application' client-type may only be redeemed via cross-origin requests." });
      stats.pkce++;
    } else if (f.get("grant_type").includes("device_code")) { if (pending++ < 1) return send(res, 400, { error: "authorization_pending" }); }
    else if (f.get("grant_type") === "refresh_token") { stats.refresh++; if (!refresh.has(f.get("refresh_token"))) return send(res, 400, { error: "invalid_grant" }); }
    const at = "at-" + Math.random().toString(36).slice(2), rt = "rt-" + Math.random().toString(36).slice(2);
    tokens.add(at); refresh.add(rt);
    return send(res, 200, { access_token: at, refresh_token: rt, expires_in: 3600, id_token: jwt({ preferred_username: "buero@lugtiv.de" }) });
  }
  // ---- Download-/Upload-Endpunkte ohne Auth ----
  if (p.startsWith("/dl/")) { stats.get++; if (req.headers.authorization) return send(res, 400, { error: "auth-header-an-dritte-weitergegeben" }); const f = files.get(p.slice(4)); return f ? send(res, 200, f, { "Content-Type": "application/octet-stream" }) : send(res, 404, {}); }
  if (p.startsWith("/up/")) {
    const s = sessions.get(p.slice(4)); if (!s) return send(res, 404, {});
    const m = /bytes (\d+)-(\d+)\/(\d+)/.exec(req.headers["content-range"] || ""); if (!m) return send(res, 400, { error: "range" });
    stats.chunk++; s.parts.push(body);
    if (+m[2] + 1 === +m[3]) { files.set(s.path, Buffer.concat(s.parts)); addParents(s.path); sessions.delete(p.slice(4)); return send(res, 201, { id: "f" }); }
    return send(res, 202, { nextExpectedRanges: [`${+m[2] + 1}-`] });
  }
  // ---- Graph ----
  if (!p.startsWith("/v1.0/")) return send(res, 404, {});
  const tk = (req.headers.authorization || "").replace("Bearer ", "");
  if (!tokens.has(tk)) return send(res, 401, { error: { code: "InvalidAuthenticationToken", message: "token" } });
  const g = p.slice(5);
  if (g === "/me/drive") return send(res, 200, { id: DRIVE });
  if (g === "/me/drive/sharedWithMe") return send(res, 200, { value: [{ name: "Büro Lugtiv", remoteItem: { id: ROOT, folder: {}, parentReference: { driveId: DRIVE }, shared: { owner: { user: { displayName: "Sandra Lugt" } } } } }] });
  let m;
  if ((m = g.match(/^\/drives\/drv1\/root:\/(.+)$/))) return folders.has("") && rootCreated ? send(res, 200, { id: ROOT, name: m[1] }) : send(res, 404, { error: { message: "nf" } });
  if (g === "/drives/drv1/root/children" && req.method === "POST") { rootCreated = true; return send(res, 201, { id: ROOT, name: JSON.parse(body).name }); }
  if ((m = g.match(/^\/drives\/drv1\/items\/fold-mp(?::\/(.*?):)?(\/children|\/content|\/createUploadSession)?$/))) {
    const rel = m[1] || "", op = m[2] || "";
    if (op === "/children") {
      stats.list++;
      if (rel && !folders.has(rel)) return send(res, 404, { error: { message: "nf" } });
      const pre = rel ? rel + "/" : "", names = new Map();
      for (const f of folders) if (f.startsWith(pre) && f !== rel && !f.slice(pre.length).includes("/")) names.set(f.slice(pre.length), { folder: {} });
      for (const [f, b] of files) if (f.startsWith(pre) && !f.slice(pre.length).includes("/")) names.set(f.slice(pre.length), { file: {}, size: b.length });
      const all = [...names].map(([name, o]) => ({ name, ...o })), skip = +(u.query.skip || 0), page = all.slice(skip, skip + 3);
      return send(res, 200, { value: page, ...(skip + 3 < all.length ? { "@odata.nextLink": `${base}/v1.0/drives/drv1/items/fold-mp${rel ? ":/" + encodeURI(rel) + ":" : ""}/children?skip=${skip + 3}` } : {}) });
    }
    if (op === "/content" && req.method === "GET") { if (!files.has(rel)) return send(res, 404, { error: { message: "nf" } }); stats.redirects++; res.writeHead(302, { Location: `${base}/dl/${encodeURIComponent(rel)}` }); return res.end(); }
    if (op === "/content" && req.method === "PUT") { stats.put++; if (body.length > 4 * 1024 * 1024) return send(res, 413, { error: { message: "too large" } }); files.set(rel, body); addParents(rel); return send(res, 201, { id: "x" }); }
    if (op === "/createUploadSession") { stats.session++; const id = Math.random().toString(36).slice(2); sessions.set(id, { path: rel, parts: [] }); return send(res, 200, { uploadUrl: `${base}/up/${id}` }); }
    if (!op && req.method === "DELETE") { files.delete(rel); return send(res, 204, ""); }
    if (!op && req.method === "GET") {
      if (!rel) return send(res, 200, { id: ROOT, name: "MaklerProzess" });
      if (!files.has(rel)) return send(res, 404, { error: { message: "nf" } });
      return send(res, 200, { id: "f", size: files.get(rel).length, "@microsoft.graph.downloadUrl": `${base}/dl/${encodeURIComponent(rel)}` });
    }
  }
  if (g === "/__stats") return send(res, 200, { ...stats, files: [...files.keys()] });
  send(res, 404, { error: { message: "unbekannt " + g } });
}).listen(port, "127.0.0.1", () => console.log("GRAPH bereit " + port));
let rootCreated = false;
// Test-Hilfe: Statistik ohne Auth
http.createServer((req, res) => send(res, 200, { ...stats, files: [...files.keys()] })).listen(port + 100, "127.0.0.1");
