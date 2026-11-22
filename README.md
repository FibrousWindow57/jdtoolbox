# JD Toolbox – Windows-App

Die App ist ein eigenes Fenster (Electron) um deine JD Toolbox im Internet. Alle Funktionen (Darlehen, Verleih, Projekte, Adventskalender, Discord-Bot, Benutzer, Tokens, Audit-Log) und alle Daten kommen von der Toolbox bei Cloudflare. Darum gilt:

- **Website-Änderungen sind sofort in der App**, ohne Update der App (nach `npm run deploy` der Toolbox genügt „Neu laden“ bzw. ein Neustart).
- **Die App selbst** aktualisiert sich über GitHub Releases: Sie prüft 10 Sekunden nach dem Start und danach alle 4 Stunden, lädt neue Versionen im Hintergrund und fragt, ob sie neu starten soll (sonst wird beim nächsten Beenden installiert). Neu installieren ist nie nötig.
- Die App braucht Internet. Ohne Verbindung zeigt sie eine Fehlerseite mit „Erneut versuchen“.
- Anmeldung, Rechte, Rollen und Audit-Log sind unverändert die der Toolbox. In der App ist nichts gespeichert außer der Toolbox-Adresse, der Fensterposition und dem Anmelde-Cookie (14 Tage, wie im Browser).

Beim ersten Start fragt die App nach der Adresse deiner Toolbox (z. B. `https://jd-toolbox.dein-name.workers.dev`), prüft sie und merkt sie sich. Ändern: Alt-Taste → Datei → „Adresse der Toolbox ändern …“.

## Einmalig einrichten (GitHub, kostenlos)

Der Installer wird bei GitHub gebaut, weil dafür ein Windows-Rechner nötig ist und du dort nichts installieren musst.

1. Auf github.com ein **öffentliches** Repository anlegen, z. B. `jd-toolbox-app`. Es enthält nur den Programmcode der App, keine Zugangsdaten und nicht die Adresse deiner Toolbox. (Privat geht auch, dann braucht jeder Computer zum Updaten ein Token – deshalb öffentlich.)
2. Den Inhalt dieses Ordners hochladen (Knopf „Add file → Upload files“, alle Dateien und Ordner inkl. `.github`, **ohne** `node_modules`). Wichtig: Der versteckte Ordner `.github/workflows/release.yml` muss mit.
3. Unter *Settings → Actions → General → Workflow permissions* **„Read and write permissions“** wählen und speichern.

## Erste Version veröffentlichen

1. Auf der Repository-Seite: *Releases → Create a new release → Choose a tag*, `v1.0.0` eintippen, „Create new tag“, dann „Publish release“. (Mit Git: `git tag v1.0.0 && git push origin v1.0.0`.)
2. Unter *Actions* läuft „Release“ (ca. 3–6 Minuten). Danach hängt am Release die Datei **`JD-Toolbox-Setup-1.0.0.exe`** (plus `latest.yml`, die der Updater braucht – nicht löschen).
3. Die `.exe` herunterladen und ausführen. Es gibt keinen Installationsdialog: Die App wird für deinen Benutzer installiert (ohne Administratorrechte), legt Startmenü- und Desktop-Verknüpfung „JD Toolbox“ an und startet.

**Windows-Warnung (SmartScreen):** Die App ist nicht mit einem Zertifikat signiert (kostet ca. 100–400 € pro Jahr). Windows zeigt deshalb beim ersten Start „Der Computer wurde durch Windows geschützt“. Dann *Weitere Informationen → Trotzdem ausführen*. Updates der App funktionieren trotzdem.

## Neue Version der App veröffentlichen (Updates)

1. In `package.json` die `version` erhöhen, z. B. `1.0.1`.
2. Änderungen hochladen (Commit) und ein Release mit dem **gleichen** Tag anlegen: `v1.0.1`. Passen Tag und Version nicht zusammen, bricht der Bau mit einer Meldung ab.
3. Alle installierten Apps holen sich die neue Version selbst.

Die Version muss immer höher sein als die letzte, sonst bietet der Updater nichts an.

## Ausprobieren auf dem eigenen Rechner (optional)

Nur nötig, wenn du am Code der App etwas ändern willst. Voraussetzung: Node.js.

```
npm install
npm test
npm start
```
Meldet npm beim Installieren, dass Install-Skripte blockiert sind (so wie bei esbuild), `npm install-scripts approve electron` ausführen und `npm install` wiederholen – Electron lädt sein Programm in diesem Skript herunter.
Einen Installer lokal bauen: `npm run dist -- --config.publish.owner=DEIN-GITHUB-NAME --config.publish.repo=jd-toolbox-app` (Ergebnis in `dist/`). Unter Windows braucht electron-builder dafür evtl. den Entwicklermodus (Einstellungen → Für Entwickler) oder eine Konsole als Administrator.

## Aufbau

| Datei | Aufgabe |
|---|---|
| `main.js` | Fenster, Menü, Sicherheit (nur die eigene Toolbox bleibt im Fenster, fremde Links öffnen im Browser, keine Gerätezugriffe), Auto-Update |
| `preload.js` | Schmale Brücke für die lokalen Seiten (Adresse speichern, erneut versuchen) |
| `lib/url.js` | Prüft und vereinheitlicht die Adresse (getestet in `test/url.test.js`) |
| `pages/` | Einrichtungsseite und Offline-Seite |
| `build/icon.ico`, `build/icon.png` | Logo als Programm- und Installer-Symbol |
| `.github/workflows/release.yml` | Baut und veröffentlicht den Installer bei einem neuen Tag |

Deinstallieren: Windows-Einstellungen → Apps → JD Toolbox. Die Toolbox-Daten bleiben unberührt, sie liegen bei Cloudflare.

## Was getestet ist

Getestet: die Adressprüfung (4 Tests) und die Syntax aller Dateien. **Nicht getestet** sind Start, Fenster, Installer und Auto-Update, weil in der Umgebung, in der die App entstand, weder Electron noch Windows verfügbar waren. Das erste Release ist deshalb der eigentliche Test; bitte Rückmeldung, falls etwas nicht klappt. Den Update-Weg prüfst du mit einem zweiten Release (`v1.0.1`): Die installierte 1.0.0 muss es nach spätestens 10 Sekunden nach dem Start (oder über Datei → „Nach Updates suchen“) anbieten.
