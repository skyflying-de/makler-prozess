// Unit-Tests Sync-Kern: node test/core.test.js
const vm = require("vm"), fs = require("fs"), path = require("path"), assert = require("assert");
const S = require("../ui/sync-core.js");
// Beispieldaten aus der App erzeugen (seed) – DOM minimal stubben
const noop = () => {}, el = { innerHTML: "", addEventListener: noop, appendChild: noop, querySelector: () => null, querySelectorAll: () => [], classList: { add: noop, remove: noop, toggle: noop }, style: {} };
const ctx = { console, Date, Math, JSON, setTimeout: noop, clearTimeout: noop, setInterval: noop, window: {}, navigator: {}, location: {},
  document: { querySelector: () => el, querySelectorAll: () => [], getElementById: () => el, createElement: () => ({ ...el, getContext: () => { throw 0; } }), addEventListener: noop, body: el, title: "" },
  addEventListener: noop, api: { load: () => new Promise(noop), onBeforeClose: noop } };
ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, "../ui/app.js"), "utf8") + "\n;this.__seed=seed;", ctx);
const fresh = () => JSON.parse(JSON.stringify(ctx.__seed()));
const clone = o => JSON.parse(JSON.stringify(o));
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };

(async () => {
  // 1 Roundtrip
  const db = fresh();
  const flat = S.flatDB(db);
  for (const coll of S.COLLS) for (const r of db[coll]) assert.deepStrictEqual(S.recordFromFlat(coll + "/" + r.id, flat[coll + "/" + r.id]), r, "Roundtrip " + coll);
  assert.deepStrictEqual(S.recordFromFlat("settings/main", flat["settings/main"]), db.settings); n++;
  console.log("✓ Roundtrip", Object.keys(flat).length, "Datensätze");

  // 2 Zwei Geräte, Startzustand per Snapshot
  const A = { db: fresh(), st: S.newState("devA") }; S.stampAll(A.st, A.db);
  const B = { db: clone(A.db), st: Object.assign(clone(A.st), { dev: "devB", outbox: [], pending: {} }) };
  const sync = (from, to) => { const ops = from.st.outbox.splice(0); return S.apply(to.st, to.db, clone(ops), { devA: "PC", devB: "Tablet" }); };
  const caseA = A.db.cases[0], cid = caseA.id;

  // 2a verschiedene Felder desselben Datensatzes → zusammengeführt
  A.db.cases[0].title = "Titel von A"; S.diff(A.st, A.db);
  B.db.cases.find(c => c.id === cid).client = "Kunde von B"; S.diff(B.st, B.db);
  sync(A, B); sync(B, A);
  for (const X of [A, B]) { const c = X.db.cases.find(c => c.id === cid); ok(c.title === "Titel von A" && c.client === "Kunde von B", "Feldgenaues Zusammenführen"); }
  console.log("✓ Verschiedene Felder → zusammengeführt");

  // 2b gleiches Feld → spätere Änderung gewinnt, Konflikt protokolliert
  A.db.cases.find(c => c.id === cid).title = "A früh"; S.diff(A.st, A.db);
  await new Promise(r => setTimeout(r, 5));
  B.db.cases.find(c => c.id === cid).title = "B später"; S.diff(B.st, B.db);
  const rB = sync(A, B), rA = sync(B, A);
  for (const X of [A, B]) ok(X.db.cases.find(c => c.id === cid).title === "B später", "LWW");
  ok(rA.conflicts === 1 && rB.conflicts === 1, "Konflikt auf beiden Seiten protokolliert");
  ok(A.st.conflicts[0].winner === "theirs" && B.st.conflicts[0].winner === "mine", "Gewinner richtig");
  A.st.pending = {}; B.st.pending = {};
  console.log("✓ Gleiches Feld → letzte Änderung gewinnt, Konfliktprotokoll");

  // 2c neue Datensätze + Löschen
  A.db.entries.push({ id: "eNEW", caseId: cid, start: 1, end: 2, note: "neu", history: [] }); S.diff(A.st, A.db);
  const delId = B.db.tasks[0].id; B.db.tasks.shift(); S.diff(B.st, B.db);
  sync(A, B); sync(B, A);
  for (const X of [A, B]) { ok(X.db.entries.some(e => e.id === "eNEW"), "neu angelegt"); ok(!X.db.tasks.some(t => t.id === delId), "gelöscht"); }
  // Bearbeiten eines gelöschten Datensatzes auf anderem Gerät bleibt gelöscht
  console.log("✓ Anlegen und Löschen");

  // 2d keyed Arrays: zwei Geräte fügen je einen Raum hinzu
  const pid = A.db.protocols[0].id;
  const pA = A.db.protocols.find(p => p.id === pid), pB = B.db.protocols.find(p => p.id === pid);
  pA.status = "ready"; S.diff(A.st, A.db); sync(A, B); A.st.pending = {}; B.st.pending = {};
  A.db.protocols.find(p => p.id === pid).sections.find(s => s.type === "rooms").rooms.push({ id: "rA", name: "Gäste-WC", values: {} }); S.diff(A.st, A.db);
  B.db.protocols.find(p => p.id === pid).sections.find(s => s.type === "rooms").rooms.push({ id: "rB", name: "Hobbyraum", values: {} }); S.diff(B.st, B.db);
  sync(A, B); sync(B, A);
  for (const X of [A, B]) { const rooms = X.db.protocols.find(p => p.id === pid).sections.find(s => s.type === "rooms").rooms.map(r => r.id); ok(rooms.includes("rA") && rooms.includes("rB"), "beide Räume vorhanden: " + rooms.slice(-3)); }
  A.st.pending = {}; B.st.pending = {};
  console.log("✓ Listen (Räume) aus zwei Geräten zusammengeführt");

  // 3 Unterschrift sperrt: B ändert offline, A unterschreibt später → A gewinnt, B übernimmt
  const room0 = p => p.sections.find(s => s.type === "rooms").rooms[0];
  const it0 = A.db.protocols.find(p => p.id === pid).sections.find(s => s.type === "rooms").items[0].id;
  room0(B.db.protocols.find(p => p.id === pid)).values[it0] = { z: "Mängel", note: "B offline" }; S.diff(B.st, B.db);
  await new Promise(r => setTimeout(r, 5));
  const pa = A.db.protocols.find(p => p.id === pid); pa.status = "signed"; room0(pa).values[it0] = { z: "in Ordnung" };
  A.st.forceNext.push("protocols/" + pid); S.diff(A.st, A.db);
  await new Promise(r => setTimeout(r, 5));
  room0(B.db.protocols.find(p => p.id === pid)).values[it0] = { z: "Mängel", note: "B noch später" }; S.diff(B.st, B.db);
  sync(B, A); sync(A, B);
  for (const X of [A, B]) { const v = room0(X.db.protocols.find(p => p.id === pid)).values[it0]; ok(v.z === "in Ordnung" && !v.note, "unterschriebener Stand gilt überall: " + JSON.stringify(v)); }
  ok(A.st.conflicts.some(c => /unterschrieben/.test(c.reason)), "Konfliktmeldung Sperre");
  console.log("✓ Unterschriebenes Protokoll gesperrt, Offline-Änderung abgewiesen");

  // 4 Verschlüsselung
  const { office, key } = await S.newOffice("Geheim-Buero-2026");
  ok(await S.unlockOffice(office, "Geheim-Buero-2026") === key, "Passwort entsperrt");
  ok(await S.unlockOffice(office, "falsch") === null, "falsches Passwort");
  ok(await S.unlockOffice(office, S.recoveryCode(key)) === key, "Wiederherstellungsschlüssel");
  const pkg = await S.seal({ ops: A.st.outbox.concat([{ big: "x".repeat(50000) }]) }, key);
  const back = await S.open(pkg, key); ok(back.ops.length >= 1, "Paket entschlüsselt"); ok(pkg.length < 5000, "komprimiert: " + pkg.length + " Bytes");
  let threw = false; try { const { key: k2 } = await S.newOffice("anders"); await S.open(pkg, k2); } catch (e) { threw = true; } ok(threw, "fremder Schlüssel scheitert");
  console.log("✓ AES-256-GCM, Passwort, Wiederherstellungsschlüssel, Kompression");

  // 5 Konvergenz nach vielen zufälligen Änderungen
  const R = () => Math.random();
  for (let round = 0; round < 400; round++) {
    for (const X of [A, B]) {
      const c = X.db.cases[Math.floor(R() * X.db.cases.length)];
      if (R() < .5) c.title = "T" + round + X.st.dev; else c.stage = Math.floor(R() * 5);
      if (R() < .2) X.db.entries.push({ id: "r" + round + X.st.dev, caseId: c.id, start: round, end: round + 1, note: "", history: [] });
      if (R() < .1 && X.db.entries.length > 5) X.db.entries.splice(Math.floor(R() * X.db.entries.length), 1);
      S.diff(X.st, X.db);
    }
    if (R() < .4) { sync(A, B); sync(B, A); A.st.pending = {}; B.st.pending = {}; }
  }
  sync(A, B); sync(B, A); sync(A, B);
  const canon = v => Array.isArray(v) ? "[" + v.map(canon).join(",") + "]" : v && typeof v === "object" ? "{" + Object.keys(v).sort().map(k => JSON.stringify(k) + ":" + canon(v[k])).join(",") + "}" : JSON.stringify(v);
  const norm = db => JSON.stringify(S.COLLS.map(c => (db[c] || []).map(canon).sort())) + canon(db.settings);
  ok(norm(A.db) === norm(B.db), "Konvergenz");
  console.log("✓ Konvergenz nach 400 Runden zufälliger Offline-Änderungen");
  console.log(`\nAlle ${n} Prüfungen bestanden.`);
})().catch(e => { console.error("FEHLER:", e.message); process.exit(1); });
