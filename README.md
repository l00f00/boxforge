# BoxForge

MVP statico per generare piani SVG parametrici di un bartop arcade in MDF.

## Avvio

Apri `index.html` oppure esegui `python3 -m http.server 8080`.

## Verifica

```bash
node test.js
node --check geometry.js
node --check script.js
```

## Stato

Genera pannelli, fori comandi, cornice monitor, linguette laterali e slot sui fianchi. Prima del taglio definitivo vanno misurati monitor reale e kerf della macchina. L'analisi automatica dello sketch non è inclusa in questo primo MVP: l'immagine può essere caricata come riferimento e le quote si inseriscono nei campi.
