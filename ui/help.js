/* Hilfetexte – werden im Hilfe-Overlay (F1 / ?) und in der Anleitung verwendet. shot = Screenshot-Datei für die Anleitung */
const HELP=[
{id:"erste-schritte",title:"Erste Schritte",shot:"01_start",html:`
<p>Makler-Prozess steuert <b>Verkäufe und Vermietungen</b> vom Auftrag bis zur Abrechnung und erfasst dabei jede Tätigkeit als Zeitbuchung.</p>
<ol><li><b>Einstellungen → Mitarbeiter</b>: Kollegen anlegen (Admin pflegt Einstellungen, Mitarbeiter arbeiten mit allen Fällen).</li>
<li><b>Einstellungen → Design & Dokumente</b>: Logo, Firmendaten und Farben für Ausdrucke festlegen.</li>
<li><b>Objekte</b>: Objekt anlegen (Adresse, Flächen, Unterlagen).</li>
<li><b>Neuer Auftrag</b>: Verkauf oder Vermietung zum Objekt anlegen.</li>
<li>Im Fall eine <b>Aktion starten</b> – die Zeit läuft, Pause/Stopp oben in der Leiste.</li></ol>
<p>Mehrere Geräte (PC + Tablet)? → Hilfe-Thema <b>Cloud-Sync</b>.</p>
<p class="tip">Taste <b>F1</b> oder <b>?</b> oben rechts öffnet jederzeit die Hilfe zur aktuellen Seite.</p>`},
{id:"start",title:"Startseite",shot:"01_start",html:`
<p>Überblick über offene Fälle, die eigene Zeit dieser Woche, fällige <b>Termine & Wiedervorlagen</b> und was gerade im Büro läuft.</p>
<ul><li><b>Termin starten</b>: Bei Terminen mit geplanter Aktion startet „Starten“ direkt die Zeitbuchung.</li><li>Haken = erledigt.</li></ul>`},
{id:"laufend",title:"Laufende Aktionen",shot:"02_laufend",html:`
<p>Alle gerade laufenden Aktionen <b>aller Mitarbeiter</b>, gruppiert nach Person. Erreichbar über den Menüpunkt <b>Laufend</b> oder „Alle laufenden“ in der Leiste oben.</p>
<ul><li>Klick auf eine Karte öffnet den Fall.</li><li>Knöpfe: Pause/Weiter, Leistung wechseln (⇄), Stopp, Bearbeiten, Öffnen.</li>
<li>Aktionen von Kollegen lassen sich ebenfalls steuern – mit Rückfrage; die Änderung wird protokolliert.</li></ul>`},
{id:"objekte",title:"Objekte",shot:"03_objekt",html:`
<p>Ein <b>Objekt</b> ist die Immobilie. Es kann mehrere Fälle haben (z. B. erst vermietet, später verkauft). Objektdaten werden nur einmal erfasst und gelten für alle Fälle.</p>
<ul><li>Anhänge (Grundbuch, Grundrisse, Fotos …) werden in den Datenordner kopiert: <code>dateien\\Objekte\\&lt;Nr. Objekt&gt;\\…</code>. „Ordner öffnen“ zeigt sie im Explorer.</li>
<li>„Aktion“ startet direkt eine Aktion am offenen Fall des Objekts.</li>
<li>Reiter <b>Übergabe</b>: Kennzahlen der letzten Übergabe, <b>Protokollverlauf</b> mit Kurzübersicht und die <b>Übergabe-Stammdaten</b> (siehe Hilfe-Thema „Übergabe am Objekt“).</li></ul>`},
{id:"uebergabe",title:"Übergabe am Objekt",shot:"18_uebergabe",html:`
<p>Im Objekt, Reiter <b>Übergabe</b>, liegt alles rund um Wohnungsübergaben an einer Stelle. Oben zeigt die farbige Leiste die <b>letzte Übergabe</b> mit Status und offenen Mängeln.</p>
<table><tr><th>Bereich</th><th>Inhalt</th></tr>
<tr><td>Kennzahlen</td><td>Status der letzten Übergabe · offene Mängel (neu / übernommen / behoben) · Zähler mit letzter Ablesung · Schlüssel</td></tr>
<tr><td>Protokollverlauf</td><td>alle Protokolle als Zeitleiste: Art, Datum, Status, Mieter, Mängel, Fotos, Zähler, Schlüssel, Nacharbeiten. <b>Details</b> zeigt Mängel mit Foto und Zählerstände mit Verbrauch seit dem vorherigen Protokoll. Knöpfe: Öffnen · PDF · <b>Als Basis</b></td></tr>
<tr><td>Übergabe-Stammdaten</td><td><b>Räume, Zähler</b> (Art, Nummer, Lage, letzter Stand), <b>Schlüssel</b> (Anzahl) und <b>Einbauküche/Geräte</b> – je „Bearbeiten“: Zeilen anlegen, ändern, löschen, mit ▲▼ sortieren</td></tr></table>
<p><b>Neues Protokoll</b> (hier oder im Fall „+ Einzug/Auszug“):</p>
<ol><li>Vorgang und Art wählen. Räume, Zähler, Schlüssel und Geräte kommen aus den Stammdaten.</li>
<li><b>Basis</b>: letztes Protokoll, ein anderes früheres Protokoll oder leer.</li>
<li><b>Übernehmen</b> (Mehrfachauswahl): bisherige Mängel mit oder ohne Fotos · Zählernummern · bisherige Zählerstände als Vorwert · Anzahl Schlüssel · Abschlussanmerkungen.</li>
<li><b>Mängel prüfen</b>: je Mangel <b>übernehmen</b> (besteht noch) oder <b>behoben</b>. Behobene erscheinen im neuen Protokoll als Hinweis und im Ausdruck unter „Seit dem vorherigen Protokoll behoben“.</li></ol>
<p>Zählernummern lassen sich im Protokoll jederzeit ändern. <b>Nach der Unterschrift</b> zeigt die App Abweichungen zu den Stammdaten (neue Zählernummer, Zählerstand, Schlüsselanzahl, Räume) – angehakte Punkte werden ins Objekt übernommen.</p>
<p class="tip">Bei bestehenden Objekten wurden die Stammdaten einmalig aus dem jüngsten Protokoll übernommen (sonst aus der Protokollvorlage).</p>`},
{id:"faelle",title:"Fälle & Phasen",shot:"04_faelle",html:`
<p>Jeder Fall durchläuft fünf Phasen: <b>Neuer Auftrag → Datenaufnahme → Durchführung → Abschluss → Abrechnung</b>. Ansicht als Phasen-Board oder Liste, filterbar nach Verkauf/Vermietung.</p>
<p>Ein Klick auf eine Phase im Fall setzt sie; die Daten der Phasenwechsel fließen in die Pipeline-Auswertung.</p>`},
{id:"fall",title:"Fall bearbeiten",shot:"05_fall",html:`
<p><b>Aktivitäten</b>: Kacheln je Phase – ein Klick startet die Zeit mit der Standardleistung. Oben rechts im Fall: „Läuft gerade“ mit allen Steuerknöpfen und darunter der Verlauf.</p>
<p><b>Nachtragen</b>: erledigte Aktion mit Datum, Von/Bis und Pause erfassen. Jede Buchung ist nachträglich änderbar (Änderungsprotokoll).</p>
<p><b>Falldaten</b> / <b>Objektdaten</b>: Erfassung in der unter Einstellungen festgelegten Reihenfolge; Pflichtfelder mit Fortschrittsanzeige.</p>
<p><b>Termine & Wiedervorlagen</b> direkt am Fall.</p>`},
{id:"protokoll",title:"Übergabeprotokoll",shot:"06_protokoll",html:`
<p>Bei Vermietungen im Tab <b>Übergabeprotokoll</b>. Ablauf:</p>
<ol><li><b>+ Einzug</b> oder <b>+ Auszug</b> – Basis und Übernahme wählen (siehe „Übergabe am Objekt“), danach öffnet sich das Erfassungsfenster (Touch).</li><li>Räume, Küche, Zähler, Schlüssel erfassen – mit Fotos.</li>
<li><b>Fertig → Unterschrift</b>: <b>Digital am Gerät</b> (alle unterschreiben auf dem Bildschirm, PDF wird abgelegt) oder <b>Ausdruck auf Papier</b> (drucken, unterschreiben, Scan hochladen).</li>
<li>Bei digital: Versand an den Mieter – die E-Mail-Adresse wird abgefragt und in den Falldaten gespeichert; das Einverständnis ist Pflicht.</li></ol>
<p>Nach der Unterschrift ist das Protokoll gesperrt (Admin kann entsperren).</p>`},
{id:"erfassung",title:"Protokoll-Erfassung (Touch)",shot:"07_erfassung",html:`
<p>Vollflächiges Fenster für Tablet oder Notebook mit Touch. Links die Seiten (jeder Raum eine Seite), unten <b>Zurück / Weiter</b>.</p>
<ul><li>Zustand per großer Taste; nochmaliges Tippen hebt auf. „Alle übrigen in Ordnung“ füllt den Rest.</li>
<li><b>+ Foto 📷</b> öffnet am Tablet die Kamera; Fotos werden im Datenordner abgelegt.</li>
<li>Schlüssel per − / +. Zählerstände mit Foto als Nachweis.</li><li><b>Abschluss</b>: offene Punkte, Mängel, Druckvorschau, Unterschrift.</li>
<li>Tasten: ← → blättern, Esc schließen. Alles wird sofort gespeichert.</li></ul>`},
{id:"abrechnung",title:"Abschluss & Abrechnung",shot:"08_abrechnung",html:`
<p>Je Fall wählbare <b>Abrechnungsart</b>: Courtage (Zeit nur Nachweis), Stunden nach Leistungskatalog, Courtage + Zusatzleistungen (ankreuzen) oder Pauschale.</p>
<p><b>Drucken / PDF</b> erzeugt den Leistungsnachweis im Firmendesign (Druckvorschau mit „Drucken“ und „Als PDF speichern“).</p>`},
{id:"termine",title:"Termine & Wiedervorlagen",shot:"09_termine",html:`
<p>Wochenansicht aller Termine (farbig nach Verkauf/Vermietung) und Wiedervorlagen. Klick öffnet den Eintrag; „+“ im Tag legt einen Termin an.</p>`},
{id:"zeiten",title:"Zeiterfassung",shot:"10_zeiten",html:`
<p>Alle Zeitbuchungen – eigene oder alle. Eine Buchung = eine Aktion mit genau einer Leistung. Klick zum Bearbeiten; Änderungen werden mit Person und Zeitpunkt protokolliert.</p>
<p><b>Windows-Taskleiste:</b> Läuft eine eigene Aktion, steht die Zeit im Fenstertitel („▶ 0:42 Besichtigung · M-2026-046“), das Programmsymbol trägt einen grünen (läuft) bzw. gelben Punkt (Pause), in der Vorschau gibt es <b>Pause/Fortsetzen</b> und <b>Stopp</b>. Das <b>Uhr-Symbol im Infobereich</b> (neben der Uhrzeit) zeigt die Zeit als Tooltip; Rechtsklick: Pause, Fortsetzen, Stopp, Aktion erfassen, Öffnen, Beenden. Schließen (X) bei laufender Zeit lässt die App im Infobereich weiterlaufen.</p>`},
{id:"auswertung",title:"Auswertungen",shot:"11_auswertung",html:`
<ul><li><b>Zeiten je Mitarbeiter</b> (Woche/Monat, nach Leistung)</li><li><b>Aufwand je Aktion/Leistung</b> mit Ø je Fall – Richtwert für die Kalkulation</li>
<li><b>Pipeline</b>: Fälle je Phase, Verweildauer, Dauer bis Abschluss</li><li><b>Leistungsnachweise</b> aller abgeschlossenen Fälle</li></ul>`},
{id:"einstellungen",title:"Einstellungen",shot:"12_einstellungen",html:`
<p>Nur für Admins. <b>Erfassungsfelder</b> (Objekt, Verkauf, Vermietung: Reihenfolge, Pflicht, aktiv), <b>Aktionen</b> je Phase mit erlaubten Leistungen und Standardleistung, <b>Leistungskatalog</b> mit Stundensätzen, <b>Mitarbeiter</b> mit Rolle und PIN.</p>
<p><b>Anmeldung</b>: Standard ist die Benutzerauswahl. Unter Mitarbeiter auf „Mitarbeiter + PIN“ umschalten, sobald alle eine PIN haben.</p>`},
{id:"vorlage",title:"Protokoll-Vorlage",shot:"13_vorlage",html:`
<p>Abschnitte des Übergabeprotokolls: Angaben, Räume × Prüfpunkte, Checkliste, Zählerstände, Schlüssel. Eine Zeile je Punkt; bei Angaben Feldtyp anhängen: <code>[ja/nein]</code>, <code>[datum]</code>, <code>[zahl]</code>, <code>[text lang]</code>, <code>[auswahl: A;B]</code>.</p>
<p>Bestehende Protokolle bleiben unverändert – jedes Protokoll ist eine Kopie der Vorlage zum Zeitpunkt der Anlage.</p>`},
{id:"design",title:"Design & Dokumente",shot:"14_design",html:`
<p>Gemeinsames Firmendesign für Leistungsnachweis und Übergabeprotokoll: Logo (Hausfarbe wird automatisch erkannt), Position, Schrift, Kopfbereich, Tabellenstil, Fußzeile und Dokumenttexte – mit Live-Vorschau.</p>
<p><b>Import/Export</b> als JSON (inkl. Logo, optional Protokollvorlage); Vorlage „Lugtiv“ ist enthalten.</p>`},
{id:"cloud",title:"Cloud-Sync (PC + Tablet)",shot:"16_cloud",html:`
<p>Mit <b>Cloud-Sync</b> teilen sich mehrere Geräte (z. B. Büro-PC und Tablet) die Daten über <b>Nextcloud</b> oder <b>OneDrive/SharePoint</b>. Jedes Gerät hat eine vollständige lokale Kopie und arbeitet auch <b>ohne Internet</b> weiter; Änderungen werden abgeglichen, sobald wieder Verbindung besteht.</p>
<ol><li><b>Erstes Gerät:</b> Einstellungen → Daten & Sicherung → <b>Cloud-Sync einrichten</b>: Anbieter wählen, anmelden, <b>Büro-Passwort</b> festlegen. Die Daten dieses Geräts werden zum Büro-Stand.</li>
<li><b>Weitere Geräte:</b> beim ersten Start „Bestehendem Büro (Cloud) beitreten“ – oder später unter Einstellungen: gleicher Cloud-Ordner, gleiches Büro-Passwort.</li>
<li>Abgleich automatisch <b>3 Sek. nach jeder Änderung</b> und <b>alle 2 Minuten</b>. Der Knopf oben rechts („Synchron · vor 1 Min.“) gleicht sofort ab.</li></ol>
<table><tr><th>Anzeige</th><th>Bedeutung</th></tr><tr><td>Synchron</td><td>alles abgeglichen</td></tr><tr><td>Offline · n Änderungen warten</td><td>keine Verbindung – Arbeiten geht weiter, Abgleich folgt automatisch</td></tr><tr><td>Cloud-Anmeldung nötig</td><td>App-Passwort bzw. Microsoft-Anmeldung erneuern (Klick)</td></tr></table>
<p><b>Gleichzeitige Änderungen</b> werden feldgenau zusammengeführt; ändern zwei Geräte dasselbe Feld, gewinnt die spätere Änderung. Alles wird im <b>Konfliktprotokoll</b> festgehalten. <b>Unterschriebene Übergabeprotokolle</b> bleiben gesperrt – spätere Offline-Änderungen daran werden nicht übernommen.</p>
<p><b>Sicherheit:</b> Die Daten liegen mit AES-256 verschlüsselt in der Cloud (Schlüssel aus dem Büro-Passwort). Dokumente, Fotos und PDFs liegen lesbar im Ordner <code>dateien</code>. Den <b>Wiederherstellungsschlüssel</b> sicher aufbewahren – ohne Passwort oder Schlüssel sind die Cloud-Daten nicht lesbar.</p>
<p class="tip">Einrichtung von Nextcloud-App-Passwort und OneDrive-App-Registrierung: <b>Einrichtung_Cloud.html</b> im Programmordner.</p>`},
{id:"tablet",title:"Tablet (Android & Browser)",shot:"17_tablet",html:`
<p>Auf dem <b>Android-Tablet</b> läuft Makler-Prozess als <b>Android-App</b> oder als <b>Browser-App</b> (PWA, „Zum Startbildschirm hinzufügen“). Beide arbeiten mit dem <b>Büro-Stand aus der Cloud</b> und auch offline.</p>
<table><tr><th>Bereich</th><th>Tablet</th></tr><tr><td>Start, Laufend, Objekte, Fälle, Termine, Zeiterfassung</td><td>✓ voll</td></tr><tr><td>Übergabeprotokoll inkl. Fotos, Unterschrift, PDF, Versand</td><td>✓ voll</td></tr>
<tr><td>Auswertungen, Abschluss & Abrechnung, Einstellungen, Designer, Sicherung</td><td>nur am PC</td></tr></table>
<ol><li><b>Beitreten:</b> beim ersten Start „Bestehendem Büro beitreten“ → Cloud-Ordner und Büro-Passwort wie am PC.</li>
<li><b>Mitarbeiter wählen</b> und – falls noch keine vorhanden – einmalig eine <b>PIN festlegen</b> (4–6 Ziffern).</li>
<li>Das Tablet <b>sperrt sich nach 10 Minuten</b> ohne Bedienung bzw. im Hintergrund. Sperren sofort: Symbol mit dem Schloss oben rechts.</li></ol>
<p><b>Dokumente:</b> eigene Fotos und Protokolle bleiben auf dem Tablet, bis sie in der Cloud liegen. Dokumente anderer Geräte werden erst beim Öffnen geladen (dafür ist Verbindung nötig). <b>Gerät → Speicher freigeben</b> entfernt bereits synchronisierte fremde Dokumente wieder.</p>
<p><b>PDF und Versand:</b> „Als PDF speichern“ und „Per E-Mail senden“ öffnen das Android-Teilen-Menü (z. B. Gmail, Outlook). Die Mieter-E-Mail-Adresse wird dabei in die Zwischenablage kopiert.</p>
<p class="tip"><b>Verlust des Tablets:</b> in Nextcloud (Einstellungen → Sicherheit) das App-Passwort des Tablets widerrufen bzw. im Microsoft-Konto die Sitzungen abmelden. Die Daten auf dem Gerät sind zusätzlich durch PIN-Sperre und Android-Verschlüsselung geschützt.</p>`},
{id:"darstellung",title:"Anzeigegröße & Bildschirm",html:`
<p>Oben rechts <b>Aa</b>: <b>Automatisch</b> (Standard – passt die Größe an Bildschirm bzw. Fenster an), <b>Kompakt</b> (85 %), <b>Normal</b>, <b>Groß</b> (115 %). Die Wahl gilt nur für dieses Gerät.</p>
<p>Am PC zusätzlich <kbd>Strg</kbd> + <kbd>+</kbd> / <kbd>−</kbd>, <kbd>Strg</kbd> + <kbd>0</kbd> = Automatisch. Am Tablet funktionieren alle Seiten, Dialoge und die Protokollerfassung im <b>Hoch- und Querformat</b>.</p>`},
{id:"sicherung",title:"Daten & Sicherung",shot:"15_sicherung",html:`
<p><b>Datenordner</b>: enthält <code>daten.json</code> und den Ordner <code>dateien</code>. „Speicherort ändern / Umziehen“ kopiert alles in einen neuen Ordner (z. B. NAS) oder verwendet dort vorhandene Daten.</p>
<p><b>Vollsicherung</b>: eine ZIP-Datei mit allem. Automatisch täglich beim ersten Start (Anzahl einstellbar, Standard 14). <b>Wiederherstellen</b> aus der Liste oder einer Datei – vorher wird der aktuelle Stand gesichert.</p>
<p class="tip">Sicherungsordner möglichst auf einem anderen Laufwerk als die Daten anlegen.</p>`}
];
