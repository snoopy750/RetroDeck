# RetroDeck

Windows-Programm, das Videos in Echtzeit mit VHS-Effekten und Retro-Pop-Farben versieht. Du stellst den Look mit 16 Drehreglern ein und exportierst das Ergebnis als MP4.

## Funktionen

- **Live-Vorschau:** Jede Änderung ist sofort im Video sichtbar.
- **16 Drehregler:** Sie sind in Signal, Band, Bild und Farbe gruppiert.
- **6 Farb-Presets:** Original VHS, 80er Pop, Synthwave, Miami, Kaputtes Band und Eigene Farben mit 3 frei wählbaren Tönen.
- **Bildrate:** Ein eigener Regler stellt 5 bis 60 Bilder/s ein, niedrige Werte ruckeln bewusst.
- **Vorher/Nachher:** Links siehst du das Original, rechts den Effekt.
- **PLAY-Anzeige:** Die Einblendung im Stil eines Videorekorders lässt sich ein- und ausschalten.
- **Export:** Das Ergebnis wird als MP4 mit gealtertem Ton gespeichert.
- **Viele Formate:** RetroDeck öffnet unter anderem MP4, MOV, MKV, WEBM, AVI, MTS, WMV und MPG.

## Effekte

| Gruppe | Regler |
|---|---|
| Signal | Schärfe, Color Bleed, Farbversatz, Überschärfen |
| Band | Rauschen, Zeilenzittern, Tracking-Fehler, Dropouts |
| Bild | Scanlines, Head-Switching, Flimmern, Vignette |
| Farbe | Sättigung, Farbton, Kontrast, Pop-Stärke |

## Installation

1. Öffne den [aktuellen Build](https://github.com/snoopy750/RetroDeck/actions/runs/42225314463) und melde dich bei GitHub an. Neuere Builds findest du unter [Actions](https://github.com/snoopy750/RetroDeck/actions/workflows/build.yml).
2. Lade unter **Artifacts** den Eintrag `RetroDeck` herunter und entpacke ihn.
3. Starte `RetroDeck.exe`. Eine Installation ist nicht nötig.

Die Datei ist nicht signiert. Windows zeigt beim ersten Start deshalb wahrscheinlich eine SmartScreen-Warnung. Klicke dann auf **Weitere Informationen** und **Trotzdem ausführen**.

## Bedienung

1. Klicke auf **Video öffnen** oder zieh ein Video ins Fenster.
2. Wähle ein Preset und passe die Regler an.
3. Klicke auf **Als MP4 exportieren**.

Für die Regler gilt:

- **Ziehen:** Nach oben oder unten ziehen ändert den Wert. Mit gedrückter Umschalttaste geht es feiner.
- **Mausrad:** Der Wert ändert sich in kleinen Schritten.
- **Doppelklick:** Der Regler springt auf den Wert des Presets zurück.
- **Pfeiltasten:** Sie funktionieren, wenn der Regler ausgewählt ist.

Mit der Leertaste startest und stoppst du das Video. **Einstellungen speichern** legt deinen Look als zusätzliches Preset ab.

Die Vorschau läuft in maximal 480 Zeilen. Der Export nutzt die Originalgrösse bis maximal 1080 Zeilen und übernimmt die Bildrate des Reglers **Bilder/s** (5 bis 60, Standard 25). Dieser Wert gilt auch für die Vorschau.

## Entwicklung

Du brauchst Node.js 22.

```
npm install
npm start
npm run build
```

Jeder Push baut über GitHub Actions eine neue `RetroDeck.exe` und führt dabei einen kurzen Export-Test aus. Das Programm nutzt Electron, WebGL 2 und ffmpeg.
