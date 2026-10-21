# Changelog – Makler-Prozess

## 2.2.0 – 2026-10-21
Übergabe-Stammdaten am Objekt, vorbelegte Protokolle, Protokollverlauf; Darstellung für jedes Gerät; Windows-Taskleiste.

- **Objekt → Reiter „Übergabe“:** Räume, Zähler (Art, Nummer, Lage, letzter Stand), Schlüssel (Anzahl) und Einbauküche/Geräte anlegen, ändern, löschen, sortieren
- Bestehende Objekte: Stammdaten einmalig aus dem jüngsten Protokoll übernommen (sonst aus der Vorlage); gleiche Kennungen auf allen Geräten, daher keine Dubletten im Cloud-Abgleich
- **Neues Protokoll** vorbelegt aus dem Objekt; **Basis** wählbar (letztes, früheres oder leer); Übernahme per Mehrfachauswahl: Mängel mit/ohne Fotos, Zählernummern, Zählerstände als Vorwert, Schlüsselanzahl, Abschlussanmerkungen; „Als Basis“ direkt aus dem Verlauf
- **Mängelprüfung** beim Anlegen: je Mangel „übernehmen“ oder „behoben“; Kennzeichnung im Protokoll und im Ausdruck („seit UP-…“, „Seit dem vorherigen Protokoll behoben“); geerbte Fotos werden beim Entfernen nicht gelöscht
- **Nach der Unterschrift:** Abweichungen zu den Stammdaten (Zählernummer, Zählerstand, Schlüssel, Räume) anzeigen und per Haken ins Objekt übernehmen
- **Protokollverlauf** als Zeitleiste mit Kurzübersicht (Status, Mieter, Mängel, behoben, Fotos, Zähler, Schlüssel, Nacharbeiten), Details mit Mangelfotos und Verbrauch seit dem vorherigen Protokoll; Hinweisleiste „Letzte Übergabe“ im Objektkopf; 4 Kennzahlen
- **Anzeigegröße:** Automatisch nach Bildschirm/Fenster, je Gerät Kompakt / Normal / Groß (Knopf „Aa“), am PC Strg + / − / 0
- **Hoch- und Querformat:** Tabellen, die nicht passen, werden als Karten untereinander dargestellt; größere Bedienelemente; Druckvorschau-Leiste bricht um; Layout-Prüfung aller Seiten und Dialoge in 8 Formaten
- **Windows-Taskleiste:** Laufzeit im Fenstertitel, Uhr-Symbol im Infobereich (Tooltip, Pause/Fortsetzen/Stopp, Aktion erfassen, Öffnen, Beenden), grüner/gelber Punkt am Programmsymbol, Pause/Stopp in der Vorschau; Schließen bei laufender Zeit → läuft im Infobereich weiter
- Hilfe-Themen „Übergabe am Objekt“ und „Anzeigegröße & Bildschirm“, Anleitung erweitert
- Tests: neuer E2E-Test Übergabe/Taskleiste (44 Prüfungen), Layout-Prüfung (226 Ansichten), bisherige Tests unverändert grün

## 2.1.0 – 2026-10-10
Tablet: Makler-Prozess läuft als **Android-App (APK)** und als **Browser-App (PWA)** – gleicher Code, gleiches Büro, offline-fähig.

- **Plattform-Schicht** für Tablet: Daten und Dokumente im Gerätespeicher (IndexedDB), Zugangsdaten mit nicht exportierbarem Geräteschlüssel verschlüsselt, PDF-Erzeugung ohne Druckdienst (A4, Seitenumbrüche an Zeilen/Überschriften)
- **Android-App** (Capacitor 8): eigene native HTTP-Erweiterung (OkHttp) für Nextcloud/WebDAV und OneDrive – ohne CORS-Einschränkungen; Kamera direkt aus dem Protokoll; Teilen-Menü für PDF und E-Mail an Mieter; Zurück-Taste; Android-Sicherung der App-Daten aus
- **Browser-App:** installierbar („App installieren“), Offline-Start über Service Worker, Hinweis „Neue Version verfügbar“; OneDrive-Anmeldung per Autorisierungscode + PKCE (Pop-up), Nextcloud mit CORS-Freigabe
- **Tablet-Modus (Außendienst):** Start, Laufend, Objekte, Fälle (ohne Abrechnung), Termine, Zeiterfassung, Übergabeprotokoll; Auswertungen, Einstellungen, Designer, Sicherung bleiben am PC; neue Seite **Gerät** (Cloud, Anmeldung, Speicher, Zurücksetzen)
- **Touch-Layout:** Navigationsleiste links (quer) bzw. unten (hoch), größere Schaltflächen und Eingabefelder
- **Anmeldung am Tablet:** PIN-Pflicht, automatische Sperre nach 10 Min. ohne Bedienung bzw. im Hintergrund, Sperrknopf oben; PIN kann beim ersten Beitritt einmalig am Tablet festgelegt werden
- **Dokumente bei Bedarf:** eigene Fotos/Protokolle bleiben lokal bis zum Hochladen, fremde Dokumente werden erst beim Öffnen geladen; „Speicher freigeben“
- **Erster Start am Tablet:** „Bestehendem Büro beitreten“ oder „Ausprobieren mit Beispieldaten“
- **Bau über GitHub Actions:** APK (signiert über Secrets) + Veröffentlichung der Browser-App auf GitHub Pages inkl. APK-Download; Versionsnummer aus `package.json`
- Windows: Knopf „Tablet einrichten“ in der Cloud-Karte; neue **Einrichtung_Tablet.html**; Anleitung mit Kapiteln Tablet-Installation und Tablet
- Tests: Browser-App gegen Nextcloud mit/ohne CORS und OneDrive-PKCE (50 Prüfungen), Android-Weg mit nachgebildeter nativer Brücke (17 Prüfungen), bisherige Tests unverändert grün

### Bekannte Einschränkungen 2.1.0
- Die APK wird von GitHub gebaut; in der Entwicklungsumgebung war kein Android-SDK verfügbar – der native Teil ist gegen die Capacitor-Schnittstellen geprüft, aber nicht auf einem Gerät getestet
- Browser-App + OneDrive: Microsoft begrenzt die Anmeldung auf 24 Std. (Bestätigen per Tippen)
- Alte Änderungspakete in der Cloud werden weiterhin nicht automatisch aufgeräumt
- OneDrive weiterhin nur gegen einen Nachbau der Microsoft-Schnittstellen getestet

## 2.0.0 – 2026-10-10
Cloud-Sync: mehrere Geräte (Büro-PC, Tablet) teilen sich die Daten – offline-fähig.

- **Betriebsmodus** wählbar: *Lokal* (wie 1.0) oder *Cloud-Sync*; Umstieg und Rückweg per Assistent
- **Anbieter:** Nextcloud (WebDAV, App-Passwort) oder OneDrive/SharePoint (Microsoft Graph, Anmeldung per Gerätecode); Ziel: eigenes OneDrive, SharePoint-Website oder geteilter Ordner
- **Offline-first:** vollständige lokale Kopie je Gerät, Änderungen warten in einer Warteschlange und werden bei Verbindung abgeglichen
- **Abgleich** 3 Sek. nach jeder Änderung + alle 2 Min. + Knopf „Jetzt synchronisieren“; Status in der Leiste oben
- **Zusammenführen feldgenau**, bei gleichem Feld gewinnt die spätere Änderung (Hybrid-Logical-Clock); **Konfliktprotokoll** mit verständlichen Feldnamen
- **Unterschriebene Übergabeprotokolle** bleiben gesperrt: der unterschriebene Stand gilt auf allen Geräten, spätere Offline-Änderungen werden abgewiesen und gemeldet
- **Verschlüsselung:** alle Daten-Pakete AES-256-GCM, Schlüssel per PBKDF2 aus dem Büro-Passwort; Wiederherstellungsschlüssel exportierbar
- **Dokumente** (Protokolle, Fotos, PDFs, Anhänge) liegen lesbar im Cloud-Ordner `dateien`, gleiche Struktur wie lokal; große Dateien in Teilen hochgeladen
- **Bestehendem Büro beitreten** direkt beim ersten Start; neues Gerät fragt einmalig, wer daran arbeitet
- Geräteliste mit letztem Abgleich, „Gerät neu aus Cloud laden“, „Anmeldung erneuern“
- Zugangsdaten (App-Passwort, Microsoft-Token, Büro-Schlüssel) mit Windows-Kontoverschlüsselung gespeichert
- Hilfe-Thema „Cloud-Sync“, Anleitung erweitert, neue **Einrichtung_Cloud.html** (App-Passwort, App-Registrierung, Ordnerwahl)
- Sicherung enthält den Abgleichsstand; Umzug des Datenordners nimmt ihn mit
- Tests: Sync-Kern (Konvergenz 400 Runden), End-to-End mit WebDAV-Server (2 Geräte, offline, Konflikte, Sperre), OneDrive-Weg gegen Graph-Nachbau

### Bekannte Einschränkungen 2.0.0
- Alte Änderungspakete in der Cloud werden noch nicht automatisch aufgeräumt (Snapshots alle 150 Pakete beschleunigen neue Geräte)
- OneDrive wurde gegen einen Nachbau der Microsoft-Schnittstellen getestet, nicht gegen ein echtes Microsoft-365-Konto
- Android-App (APK/PWA) folgt in Etappe 2

## 1.0.0 – 2026-10-05
Erste ausführbare Version (Windows, ohne Installation).

- Fälle Verkauf/Vermietung mit 5 Phasen, Objekte als Stammdaten, konfigurierbare Erfassungsfelder
- Aktionen je Phase mit erlaubten Leistungen und Standardleistung, erweiterbarer Leistungskatalog
- Zeiterfassung Start/Pause/Stopp, Leistungswechsel, Nachtragen, Änderungsprotokoll
- „Laufend“: alle laufenden Aktionen aller Mitarbeiter, steuerbar mit Rückfrage
- Termine & Wiedervorlagen mit Wochenansicht
- Übergabeprotokoll (Einzug/Auszug) mit konfigurierbarer Vorlage, Touch-Erfassung, Fotos je Prüfpunkt/Zähler
- Unterschrift digital am Gerät (PDF wird abgelegt) oder auf Papier (Scan hochladen); Mail an Mieter mit Einverständnis
- Leistungsnachweis je Fall mit Abrechnungsart (Courtage, Stunden, Courtage + Zusatzleistungen, Pauschale)
- Designer für Ausdrucke inkl. Logo, Import/Export (JSON), Vorlage „Lugtiv“; Druckvorschau, Drucken, PDF
- Auswertungen: Zeiten je Mitarbeiter, Aufwand je Aktion/Leistung, Pipeline, Leistungsnachweise
- Datenordner frei wählbar, Umzug (z. B. auf NAS) per Assistent
- Vollsicherung/Wiederherstellung als ZIP, automatische Tagessicherung (letzte 14)
- Anmeldung per Benutzerauswahl, umschaltbar auf Mitarbeiter + PIN
- Hilfe-Overlay (F1 / ?) je Seite, Anleitung.html
- Einrichtungsassistent beim ersten Start (leer oder mit Beispieldaten)

### Bekannte Einschränkungen 1.0.0
- Einzelplatz: gleichzeitiges Arbeiten mehrerer PCs auf demselben Datenordner wird noch nicht abgesichert (geplant: Mehrplatz-Sperre / Server-DB)
- E-Mail: Mailprogramm öffnet sich mit vorbereiteter Nachricht, PDF wird zum Anhängen im Explorer markiert
- Programmdatei ist nicht digital signiert (Windows SmartScreen-Hinweis beim ersten Start)
