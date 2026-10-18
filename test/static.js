// Einfacher Webserver für www/ (Tests der Browser-App): node test/static.js <ordner> <port>
const http = require("http"), fs = require("fs"), path = require("path");
const root = path.resolve(process.argv[2] || "www"), port = +(process.argv[3] || 1903);
const T = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json", ".json": "application/json", ".apk": "application/vnd.android.package-archive" };
http.createServer((q, s) => {
  let p = decodeURIComponent(new URL(q.url, "http://x").pathname); if (p.endsWith("/")) p += "index.html";
  const f = path.join(root, p); if (!f.startsWith(root) || !fs.existsSync(f)) { s.writeHead(404); return s.end("nicht gefunden"); }
  s.writeHead(200, { "Content-Type": T[path.extname(f)] || "application/octet-stream", "Cache-Control": "no-cache" }); fs.createReadStream(f).pipe(s);
}).listen(port, "127.0.0.1", () => console.log("bereit " + port));
