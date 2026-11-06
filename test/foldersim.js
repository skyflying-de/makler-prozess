// Simulierter Sync-Dienst (OneDrive / FolderSync) für die Ordner-Modus-Tests:
// gleicht zwei Ordner nur auf Zuruf ab – so lassen sich Verzögerung, halbe Dateien und Ausfälle nachstellen.
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const walk = (root, rel = "") => { const out = []; const d = path.join(root, rel); if (!fs.existsSync(d)) return out; for (const e of fs.readdirSync(d, { withFileTypes: true })) { if (e.name.startsWith(".")) continue; const r = rel ? rel + "/" + e.name : e.name; if (e.isDirectory()) out.push(...walk(root, r)); else out.push(r); } return out; };
const H = b => crypto.createHash("sha1").update(b).digest("hex");
function makeMirror(RA, RB) {
  const KNOWN = new Map();
  // was sich seit dem letzten Abgleich auf einer Seite geändert hat, wird auf die andere übertragen
  return function mirror({ truncate = null, only = null } = {}) {
    let n = 0;
    for (const rel of new Set([...walk(RA), ...walk(RB)])) {
      if (only && !only.test(rel)) continue;
      const a = path.join(RA, rel), b = path.join(RB, rel), k = KNOWN.get(rel);
      const ha = fs.existsSync(a) ? H(fs.readFileSync(a)) : null, hb = fs.existsSync(b) ? H(fs.readFileSync(b)) : null;
      if (ha === hb) { if (ha) KNOWN.set(rel, ha); continue; }
      const [from, to] = ha && (ha !== k || !hb) ? [a, b] : [b, a];
      const src = fs.readFileSync(from), out = truncate && truncate.test(rel) ? src.subarray(0, Math.floor(src.length / 2)) : src;
      fs.mkdirSync(path.dirname(to), { recursive: true }); fs.writeFileSync(to, out); KNOWN.set(rel, H(out)); n++;
    }
    return n;
  };
}
module.exports = { walk, makeMirror };
