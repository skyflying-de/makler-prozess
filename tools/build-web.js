// Baut die Tablet-Version (Browser-App/PWA und Android-App) nach www/:  node tools/build-web.js [--test] [--apk Pfad]
// Gleiche Oberfläche wie Windows (ui/), plus Plattform-Schicht, Service Worker, Manifest, Symbole und Anleitungen.
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const R = path.join(__dirname, ".."), OUT = path.join(R, "www"), ver = require(path.join(R, "package.json")).version;
const args = process.argv.slice(2), TEST = args.includes("--test"), apkIdx = args.indexOf("--apk"), APK = apkIdx >= 0 ? args[apkIdx + 1] : null;

fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
const cp = (src, dst) => { fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.copyFileSync(src, dst); };
const cpDir = (src, dst) => { for (const e of fs.readdirSync(src, { withFileTypes: true })) { const s = path.join(src, e.name), d = path.join(dst, e.name); if (e.isDirectory()) cpDir(s, d); else cp(s, d); } };

// 1) Oberfläche
cpDir(path.join(R, "ui"), OUT);
fs.writeFileSync(path.join(OUT, "platform-web.js"), fs.readFileSync(path.join(R, "ui/platform-web.js"), "utf8").replace("__VERSION__", ver));
// 2) Bausteine
cp(path.join(R, "node_modules/html2canvas/dist/html2canvas.min.js"), path.join(OUT, "vendor/html2canvas.min.js"));
cp(path.join(R, "node_modules/jspdf/dist/jspdf.umd.min.js"), path.join(OUT, "vendor/jspdf.umd.min.js"));
cp(path.join(R, "node_modules/@capacitor/core/dist/capacitor.js"), path.join(OUT, "vendor/capacitor.js"));
// 3) Browser-App: Anmelderückkehr, Service Worker, Symbole, Anleitungen
for (const f of ["auth.html", "pwa.js"]) cp(path.join(R, "web", f), path.join(OUT, f));
for (const f of ["pwa-192.png", "pwa-512.png", "pwa-maskable-512.png", "apple-touch-180.png", "favicon-64.png", "icon.svg"]) cp(path.join(R, "assets/icons", f), path.join(OUT, "icons", f));
for (const f of ["Anleitung.html", "Einrichtung_Cloud.html", "Einrichtung_Tablet.html"]) if (fs.existsSync(path.join(R, f))) cp(path.join(R, f), path.join(OUT, f));
if (APK) cp(APK, path.join(OUT, "MaklerProzess.apk"));
fs.writeFileSync(path.join(OUT, "manifest.webmanifest"), JSON.stringify({
  name: "Makler-Prozess", short_name: "Makler-Prozess", description: "Vorgänge, Zeiterfassung und Übergabeprotokolle für das Maklerbüro",
  id: "./", start_url: "./index.html", scope: "./", display: "standalone", orientation: "any", lang: "de",
  background_color: "#f3f4f6", theme_color: "#2563eb",
  icons: [{ src: "icons/pwa-192.png", sizes: "192x192", type: "image/png" }, { src: "icons/pwa-512.png", sizes: "512x512", type: "image/png" }, { src: "icons/pwa-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }]
}, null, 1));

// 4) index.html anpassen
let html = fs.readFileSync(path.join(R, "ui/index.html"), "utf8");
const connect = "connect-src 'self' https:" + (TEST ? " http://127.0.0.1:* http://localhost:*" : "");
html = html.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/, `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; font-src 'self' data:; ${connect}; worker-src 'self'; frame-src 'self'">`);
html = html.replace('<meta name="viewport" content="width=device-width, initial-scale=1">', '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<meta name="theme-color" content="#2563eb">\n<link rel="manifest" href="manifest.webmanifest">\n<link rel="icon" href="icons/favicon-64.png">\n<link rel="apple-touch-icon" href="icons/apple-touch-180.png">\n<meta name="mobile-web-app-capable" content="yes">');
html = html.replace('<script src="help.js"></script>', '<script src="vendor/capacitor.js"></script>\n<script src="platform-web.js"></script>\n<script src="help.js"></script>');
html = html.replace('<script src="start.js"></script>', '<script src="start.js"></script>\n<script src="pwa.js"></script>');
if (!html.includes("platform-web.js") || !html.includes("pwa.js")) throw new Error("index.html: Einbindung fehlgeschlagen");
fs.writeFileSync(path.join(OUT, "index.html"), html);

// 5) Service Worker mit Dateiliste und Inhalts-Prüfsumme
const files = [];
const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else files.push(path.relative(OUT, p).split(path.sep).join("/")); } };
walk(OUT);
const pre = files.filter(f => !/\.apk$|^platform-web\.js\.map$|\.map$/.test(f)).sort();
const h = crypto.createHash("sha256"); pre.forEach(f => h.update(f).update(fs.readFileSync(path.join(OUT, f))));
const cache = `mp-${ver}-${h.digest("hex").slice(0, 10)}`;
fs.writeFileSync(path.join(OUT, "sw.js"), fs.readFileSync(path.join(R, "web/sw.template.js"), "utf8").replace("__CACHE__", cache).replace("__FILES__", JSON.stringify(["./", ...pre.map(f => "./" + f)])));
fs.writeFileSync(path.join(OUT, ".nojekyll"), "");
const size = pre.reduce((s, f) => s + fs.statSync(path.join(OUT, f)).size, 0);
console.log(`www/ gebaut: Version ${ver}, ${pre.length} Dateien, ${(size / 1048576).toFixed(1)} MB, Cache ${cache}${TEST ? " (Testmodus)" : ""}${APK ? ", mit APK" : ""}`);
