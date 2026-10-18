# Makler-Prozess 2.1.0

Programm für Verkauf & Vermietung: Fälle, Objekte, Aktionen mit Zeiterfassung, Übergabeprotokoll, Leistungsnachweis – lokal oder mit **Cloud-Sync** (Nextcloud / OneDrive) für mehrere Geräte.

| Gerät | Form | Anleitung |
|---|---|---|
| Windows-PC | `MaklerProzess.exe` (Electron, ohne Installation) | `Anleitung.html` |
| Android-Tablet | Android-App (APK) oder Browser-App (PWA) | `Einrichtung_Tablet.html` |
| Cloud | Nextcloud oder OneDrive/SharePoint | `Einrichtung_Cloud.html` |

## Aufbau
- `ui/` – Oberfläche (gemeinsam für alle Geräte); `ui/sync-core.js` Abgleich, `ui/providers.js` Nextcloud/OneDrive
- `main.js`, `preload.js` – Windows-Hülle (Electron)
- `ui/platform-web.js` – Tablet-Hülle (Browser-App und Android-App), `web/` Service Worker & Anmelderückkehr
- `android/` – Android-Projekt (Capacitor) mit `NativeHttpPlugin.java`
- `.github/workflows/tablet-app.yml` – baut APK und veröffentlicht die Browser-App (GitHub Pages)

## Entwicklung
- `npm install` · Windows-App starten: `npx electron .`
- Tablet-Version bauen: `node tools/build-web.js` (Ausgabe `www/`), Android-Projekt aktualisieren: `npx cap sync android`
- Tests: `node test/core.test.js` · `xvfb-run -a node test/sync.e2e.js <tmp>` · `xvfb-run -a node test/graph.e2e.js <tmp>` · `node tools/build-web.js --test && xvfb-run -a node test/pwa.e2e.js <tmp>` · `xvfb-run -a node test/apk-mock.e2e.js <tmp>`
- Anleitung neu erzeugen: `node tools/manual.js` · App-Symbole: `node tools/icons.js`
