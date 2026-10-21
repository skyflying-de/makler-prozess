// Erzeugt Anleitung.html aus den Hilfetexten (ui/help.js) + Screenshots: node tools/manual.js
const fs = require("fs"), vm = require("vm"), path = require("path");
const R = path.join(__dirname, ".."), ver = require(path.join(R, "package.json")).version;
const ctx = {}; vm.runInNewContext(fs.readFileSync(path.join(R, "ui/help.js"), "utf8") + ";this.HELP=HELP;", ctx);
const img = f => "data:image/jpeg;base64," + fs.readFileSync(f).toString("base64");
const H = n => path.join(R, "ui/help", n + ".jpg"), D = n => path.join(R, "doc/shots", n + ".jpg");
const intro = [
 { id: "installation", title: "Installation & Start (Windows)", shots: [], html: `
<table><tr><th>Schritt</th><th>Aktion</th></tr>
<tr><td>1</td><td>ZIP <code>MaklerProzess_v${ver}_win-x64.zip</code> entpacken, z.&nbsp;B. nach <code>C:\\Programme-Eigene\\MaklerProzess</code> (nicht im Download-Ordner lassen).</td></tr>
<tr><td>2</td><td><code>MaklerProzess.exe</code> starten. Optional: Rechtsklick → <i>Senden an → Desktop (Verknüpfung erstellen)</i>.</td></tr>
<tr><td>3</td><td>Windows-Hinweis „Der Computer wurde durch Windows geschützt“ → <i>Weitere Informationen → Trotzdem ausführen</i> (die Datei ist nicht signiert).</td></tr>
<tr><td>4</td><td>Einrichtungsassistent: <b>Datenordner</b>, <b>leer oder mit Beispieldaten</b>, eigener Name (wird Admin) – <b>oder</b> „Bestehendem Büro (Cloud) beitreten“.</td></tr></table>
<p class="tip"><b>Update von 1.0:</b> alte Version beenden, neue entpacken und starten. Datenordner und Einstellungen werden übernommen; der Betrieb bleibt lokal, bis Cloud-Sync eingerichtet wird.</p>` },
 { id: "ablage", title: "Wo liegen die Daten?", shots: [], html: `
<table><tr><th>Was</th><th>Ort</th></tr>
<tr><td>Datenbank</td><td><code>&lt;Datenordner&gt;\\daten.json</code> (+ <code>.bak</code>)</td></tr>
<tr><td>Abgleichsstand (nur Cloud-Sync)</td><td><code>&lt;Datenordner&gt;\\sync-state.json</code></td></tr>
<tr><td>Fotos, Anhänge, PDFs</td><td><code>&lt;Datenordner&gt;\\dateien\\Objekte\\…</code> – bei Cloud-Sync zusätzlich im Cloud-Ordner <code>dateien</code></td></tr>
<tr><td>Sicherungen</td><td>Standard: <code>Dokumente\\MaklerProzess-Sicherungen</code></td></tr>
<tr><td>Einstellungen & Zugangsdaten</td><td><code>%APPDATA%\\MaklerProzess\\config.json</code> – Passwörter/Tokens mit Windows verschlüsselt</td></tr></table>` }
];
intro.push({ id: "installation-tablet", title: "Installation auf dem Tablet", shots: [], html: `
<table><tr><th>Weg</th><th>So geht's</th><th>Cloud</th></tr>
<tr><td><b>Android-App</b> (empfohlen)</td><td>Auf dem Tablet die Adresse der Browser-App öffnen und <code>MaklerProzess.apk</code> laden → öffnen → „Installation aus unbekannten Quellen“ für den Browser einmalig erlauben → installieren.</td><td>Nextcloud und OneDrive ohne Zusatzeinstellungen</td></tr>
<tr><td><b>Browser-App</b> (PWA)</td><td>In Chrome die Adresse <code>https://&lt;konto&gt;.github.io/&lt;repo&gt;/</code> öffnen → Menü ⋮ → <b>App installieren</b> bzw. „Zum Startbildschirm hinzufügen“.</td><td>Nextcloud braucht eine CORS-Freigabe, OneDrive eine zusätzliche Umleitungs-URI</td></tr></table>
<p>Danach: <b>Bestehendem Büro beitreten</b> → Cloud-Ordner und Büro-Passwort wie am PC → Mitarbeiter wählen → PIN festlegen. Details zu GitHub, Signierschlüssel, CORS und App-Registrierung: <b>Einrichtung_Tablet.html</b>.</p>
<p class="tip"><b>Updates:</b> Die Android-App wird mit der neuen APK einfach drüber installiert (Daten bleiben). Die Browser-App meldet „Neue Version verfügbar“ → <b>Jetzt aktualisieren</b>.</p>` });
const extra = {
  "uebergabe": [D("56_verlauf"), D("50_objekt_uebergabe"), D("52_neues_protokoll"), D("53_maengel_pruefen"), D("54_erfassung_vorwert"), D("55_abweichungen")],
  "darstellung": [D("60_tablet_hoch_karten"), D("61_tablet_hoch_uebergabe")],
  "tablet": [D("40_tablet_willkommen"), D("42_tablet_pin_festlegen"), D("43_tablet_start"), D("47_tablet_hochformat"), D("44_tablet_offline"), D("46_tablet_geraet")],
  "erste-schritte": [H("01_start")], "protokoll": [H("06_protokoll")], "abrechnung": [H("08_abrechnung")], "sicherung": [H("15_sicherung")],
  "cloud": [D("27_modus_cloud"), D("28_start_cloud")]
};
const cloudSteps = { id: "cloud-einrichten", title: "Cloud-Sync einrichten – Schritt für Schritt", shots: [D("21_wiz_anbieter"), D("22_wiz_nextcloud"), D("30_wiz_onedrive"), D("23_wiz_passwort"), D("24_wiz_fertig"), D("25_wiz_beitreten"), D("29_wer_arbeitet"), D("26_offline")], html: `
<ol><li><b>Anbieter</b> wählen: Nextcloud oder OneDrive/SharePoint.</li><li><b>Verbindung</b>: Nextcloud-Adresse, Benutzer, App-Passwort und Ordner – bzw. Anwendungs-ID und Anmeldung per Code bei Microsoft.</li>
<li><b>Büro-Passwort</b> festlegen (erstes Gerät) bzw. eingeben (weitere Geräte).</li><li><b>Hochladen / Laden</b> – danach fragt ein neu beigetretenes Gerät, wer daran arbeitet.</li>
<li>Ohne Verbindung zeigt die Leiste oben <b>„Offline · n Änderungen warten“</b>. Arbeiten geht normal weiter.</li></ol>
<p class="tip">Vorbereitung (App-Passwort, App-Registrierung): <b>Einrichtung_Cloud.html</b>.</p>` };
const all = [...intro, ...ctx.HELP.map(h => ({ ...h, shots: extra[h.id] || (h.shot ? [H(h.shot)] : []) }))];
all.splice(all.findIndex(t => t.id === "cloud") + 1, 0, cloudSteps);
const sec = all.map((t, i) => `<section id="${t.id}"><div class="num">${i + 1}</div><div><h2>${t.title}</h2>${t.html}${t.shots.length ? `<div class="shots ${t.shots.length > 1 ? "duo" : ""}">${t.shots.filter(f => fs.existsSync(f)).map(f => `<img src="${img(f)}" alt="${t.title}" loading="lazy">`).join("")}</div>` : ""}</div></section>`).join("");
const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Makler-Prozess ${ver} – Anleitung</title><style>
:root{--bg:#f3f4f6;--p:#fff;--ink:#1b2430;--mute:#66717f;--line:#e3e6ea;--acc:#2563eb;--accs:#e8efff;--code:#eef1f4}
@media (prefers-color-scheme:dark){:root{--bg:#13161b;--p:#1b1f26;--ink:#e6eaef;--mute:#9aa4b1;--line:#2b313a;--acc:#6b95ff;--accs:#1f2a44;--code:#262b34}}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 "Segoe UI",system-ui,sans-serif}.w{max-width:1120px;margin:0 auto;padding:36px 22px 80px}
header{display:flex;gap:16px;align-items:center;margin-bottom:22px}.lg{width:54px;height:54px;border-radius:14px;background:var(--acc);display:grid;place-items:center}h1{margin:0;font-size:2rem}header p{margin:4px 0 0;color:var(--mute)}
.v{background:var(--accs);color:var(--acc);border-radius:99px;padding:1px 10px;font-size:.8rem;font-weight:700;margin-left:6px;vertical-align:middle}
nav{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:30px}nav a{text-decoration:none;color:var(--ink);background:var(--p);border:1px solid var(--line);border-radius:99px;padding:5px 12px;font-size:.88rem}nav a:hover{border-color:var(--acc)}
section{display:grid;grid-template-columns:52px 1fr;gap:10px;padding:26px 0;border-top:1px solid var(--line)}.num{width:38px;height:38px;border-radius:50%;background:var(--acc);color:#fff;display:grid;place-items:center;font-weight:700}
h2{margin:4px 0 10px}table{border-collapse:collapse;width:100%;background:var(--p);border:1px solid var(--line);margin:10px 0}th,td{text-align:left;padding:8px 12px;border-bottom:1px solid var(--line);font-size:.94rem;vertical-align:top}th{background:var(--code)}
code{background:var(--code);padding:1px 6px;border-radius:4px;font-size:.88em}.tip{background:var(--accs);border-left:4px solid var(--acc);padding:10px 14px}
.shots{display:grid;gap:14px;margin-top:14px}.shots.duo{grid-template-columns:1fr 1fr}.shots img{width:100%;border-radius:10px;border:1px solid var(--line);box-shadow:0 6px 20px rgba(0,0,0,.08)}
@media(max-width:760px){section{grid-template-columns:1fr}.shots.duo{grid-template-columns:1fr}}@media print{nav{display:none}section{break-inside:avoid}}
</style></head><body><div class="w"><header><div class="lg"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7"/><path d="M6 10v10h12V10"/></svg></div>
<div><h1>Makler-Prozess <span class="v">v${ver}</span></h1><p>Anleitung · Verkauf & Vermietung, Zeiterfassung, Übergabeprotokoll, Cloud-Sync, Tablet, Sicherung</p></div></header>
<nav>${all.map((t, i) => `<a href="#${t.id}">${i + 1}. ${t.title}</a>`).join("")}</nav>${sec}
<p style="color:var(--mute);font-size:.85rem;margin-top:30px">Screenshots mit Beispieldaten. In der App öffnet <b>F1</b> bzw. <b>?</b> die Hilfe passend zur aktuellen Seite.</p></div></body></html>`;
fs.writeFileSync(path.join(R, "Anleitung.html"), html); console.log("Anleitung.html", Math.round(html.length / 1024), "KB,", all.length, "Kapitel");
