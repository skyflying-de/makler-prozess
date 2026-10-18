// Erzeugt App-Symbole (PWA + Android) aus einer SVG-Vorlage: node tools/icons.js
const { chromium } = require("playwright"), fs = require("fs"), path = require("path");
const R = path.join(__dirname, ".."), OUT = path.join(R, "assets/icons");
const house = (s, pad) => { const k = s * (1 - 2 * pad) / 24, o = s * pad; return `<g transform="translate(${o} ${o}) scale(${k})" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="square" stroke-linejoin="miter"><path d="M3.5 11.2 12 4.6l8.5 6.6"/><path d="M6.6 10v9.6h10.8V10"/><path d="M10.2 19.4v-5h3.6v5"/></g>`; };
const svg = (s, { round = 0.22, pad = 0.2, bg = "#2563eb", full = false } = {}) => `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">${full ? `<rect width="${s}" height="${s}" fill="${bg}"/>` : bg ? `<rect x="${s * .04}" y="${s * .04}" width="${s * .92}" height="${s * .92}" rx="${s * round}" fill="${bg}"/>` : ""}${house(s, pad)}</svg>`;
const circ = s => `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}"><circle cx="${s / 2}" cy="${s / 2}" r="${s * .47}" fill="#2563eb"/>${house(s, .24)}</svg>`;
const list = [
  ["pwa-192.png", 192, svg(192)], ["pwa-512.png", 512, svg(512)], ["pwa-maskable-512.png", 512, svg(512, { full: true, pad: .27 })], ["apple-touch-180.png", 180, svg(180, { full: true, pad: .22 })], ["favicon-64.png", 64, svg(64)]
];
const dens = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
for (const [d, f] of Object.entries(dens)) {
  list.push([`android/mipmap-${d}/ic_launcher.png`, 48 * f, svg(48 * f)]);
  list.push([`android/mipmap-${d}/ic_launcher_round.png`, 48 * f, circ(48 * f)]);
  list.push([`android/mipmap-${d}/ic_launcher_foreground.png`, 108 * f, svg(108 * f, { bg: "", pad: .3 })]);
}
(async () => {
  const b = await chromium.launch(), p = await b.newPage();
  for (const [name, s, code] of list) {
    await p.setViewportSize({ width: Math.round(s), height: Math.round(s) });
    await p.setContent(`<style>html,body{margin:0;background:transparent}</style>${code}`);
    const f = path.join(OUT, name); fs.mkdirSync(path.dirname(f), { recursive: true });
    await p.screenshot({ path: f, omitBackground: true, clip: { x: 0, y: 0, width: Math.round(s), height: Math.round(s) } });
  }
  fs.writeFileSync(path.join(OUT, "icon.svg"), svg(512));
  await b.close(); console.log(list.length + " Symbole erzeugt");
})();
