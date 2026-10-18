// Bildet die CORS-Freigabe vor einer Nextcloud nach (wie die nginx-/Apache-Konfiguration aus Einrichtung_Tablet.html):
// node test/corsproxy.js <port> <ziel-port> <erlaubter-origin>
const http = require("http");
const [port, target, origin] = [+process.argv[2] || 1904, +process.argv[3] || 1901, process.argv[4] || "http://127.0.0.1:1903"];
const H = { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Methods": "GET, PUT, DELETE, PROPFIND, MKCOL, MOVE, COPY, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, Depth, Destination, Overwrite, OCS-APIRequest, If-Match, If-None-Match", "Access-Control-Expose-Headers": "ETag, Content-Length, DAV", "Access-Control-Max-Age": "3600", "Vary": "Origin" };
let opts = 0;
http.createServer((q, s) => {
  if (q.method === "OPTIONS" && q.headers.origin) { opts++; s.writeHead(204, H); return s.end(); }
  const r = http.request({ host: "127.0.0.1", port: target, path: q.url, method: q.method, headers: q.headers }, res => { const up = Object.fromEntries(Object.entries(res.headers).filter(([k]) => !/^access-control-/i.test(k))); s.writeHead(res.statusCode, { ...up, ...(q.headers.origin ? H : {}) }); res.pipe(s); });
  r.on("error", e => { s.writeHead(502); s.end(e.message); }); q.pipe(r);
}).listen(port, "127.0.0.1", () => console.log("bereit " + port));
