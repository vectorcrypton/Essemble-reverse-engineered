# Morgen — Outfitplaner

**[Android-APK herunterladen](Morgen-debug.apk)**

Eine eigenständige, lokal nutzbare Web-App für Garderobe, Outfit-Kombinationen und Tagesplanung. Sie ist eine neue Implementierung und enthält keine extrahierten Inhalte oder Programmteile der APK.

## Starten

`index.html` direkt in einem aktuellen Browser öffnen. Es werden keine Pakete oder Build-Schritte benötigt.

## Android-APK bauen

Voraussetzungen: JDK 21 und Android SDK mit Plattform 36. Danach im Projektverzeichnis:

```sh
npm install
npm run android:debug
cp android/app/build/outputs/apk/debug/app-debug.apk Morgen-debug.apk
```

Die installierbare APK wird nach dem Build als `Morgen-debug.apk` im Repository-Stamm bereitgestellt. Sie ist mit einem Debug-Schlüssel signiert und nicht für eine Veröffentlichung im Play Store gedacht.

## KI-Fotoanalyse aktivieren

Die App kann mehrere Teile auf einem Foto analysieren, Einzelbilder zuschneiden und Name, Kategorie, Farbe, Palette und sichtbare Details vorschlagen. Dafür braucht sie einen eigenen HTTPS-Server; der OpenAI-Schlüssel wird ausschließlich dort gesetzt und niemals in die APK eingebaut.

```sh
OPENAI_API_KEY=... AI_PROXY_TOKEN=... OPENAI_MODEL=gpt-4o-mini node server/vision-server.mjs
```

Den Server hinter einem HTTPS-Reverse-Proxy betreiben und nur privat bzw. mit zusätzlicher Zugriffsbeschränkung verfügbar machen. In der App unter **Einstellungen** die vollständige URL mit `/analyze-clothing`, dasselbe `AI_PROXY_TOKEN` und die Foto-Upload-Zustimmung eintragen. Das Token bleibt nur für die aktuelle App-Sitzung im Arbeitsspeicher. Die Analyse nutzt einen externen Modellanbieter und kann Kosten verursachen. Fotos werden nur nach dieser Zustimmung an den eingetragenen Server gesendet.

## Funktionen

- Kleidungsstücke nach Kategorie und Farbe organisieren, suchen, bearbeiten und löschen
- Kleidungsstücke in Android direkt fotografieren oder ein Bild auswählen; Fotos werden lokal gespeichert
- Outfits aus vorhandenen Teilen kombinieren und als Favoriten markieren
- Mit „Mix aus Schrank“ aus Ober- und Unterteilen sowie passenden Ergänzungen neue Kombinationen erzeugen
- Outfits im Monatskalender und für den heutigen Tag planen
- Empfehlungen nach Wetter, Anlass und Stimmung mit einer lokalen, nachvollziehbaren Ranking-Logik erhalten
- Getragene Teile erfassen und die App-Daten als JSON exportieren

Die Garderobe und Fotos bleiben im lokalen Speicher dieses Geräts. Nur wenn die optionale KI-Analyse aktiviert und bestätigt ist, werden Analysefotos an den konfigurierten Server übertragen. Die Beispielbilder der Startgarderobe und die Schriftarten werden von externen Diensten geladen.