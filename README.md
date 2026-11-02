# Morgen — Outfitplaner

**[Android-APK herunterladen](android/app/build/outputs/apk/debug/app-debug.apk)**

Eine eigenständige, lokal nutzbare Web-App für Garderobe, Outfit-Kombinationen und Tagesplanung. Sie ist eine neue Implementierung und enthält keine extrahierten Inhalte oder Programmteile der APK.

## Starten

`index.html` direkt in einem aktuellen Browser öffnen. Es werden keine Pakete oder Build-Schritte benötigt.

## Android-APK bauen

Voraussetzungen: JDK 21 und Android SDK mit Plattform 36. Danach im Projektverzeichnis:

```sh
npm install
npm run android:debug
```

Die installierbare Debug-APK liegt unter `android/app/build/outputs/apk/debug/app-debug.apk`. Sie ist mit einem Debug-Schlüssel signiert und nicht für eine Veröffentlichung im Play Store gedacht.

## Funktionen

- Kleidungsstücke nach Kategorie und Farbe organisieren, suchen, bearbeiten und löschen
- Kleidungsstücke in Android direkt fotografieren oder ein Bild auswählen; Fotos werden lokal gespeichert
- Outfits aus vorhandenen Teilen kombinieren und als Favoriten markieren
- Mit „Mix aus Schrank“ aus Ober- und Unterteilen sowie passenden Ergänzungen neue Kombinationen erzeugen
- Outfits im Monatskalender und für den heutigen Tag planen
- Empfehlungen nach Wetter, Anlass und Stimmung mit einer lokalen, nachvollziehbaren Ranking-Logik erhalten
- Getragene Teile erfassen und die App-Daten als JSON exportieren

Die Daten bleiben im lokalen Browserspeicher dieses Geräts. Die Beispielbilder der Startgarderobe und die Schriftarten werden von externen Diensten geladen; eigene Fotos werden nicht hochgeladen.