# Doukas Calculator — YouWare code (λειτουργικό demo)

## Τι έφτιαξα
- Έκανα **rebuild** το project από τα αρχεία που έστειλες (ήταν .txt / λάθος ονόματα).
- Διόρθωσα τα σπασμένα imports/props ώστε να **τρέχει**.
- Το **print report** είναι **ακριβώς** από το `src/components/PrintReport.ts` (δεν το πείραξα).
- Το filename στην Αποθήκευση είναι: `ΑΡΙΘΜΟΣ_ΟΝΟΜΑ_DD-MM-YYYY.html`.

## Run (web)
1) `npm install`
2) `npm run dev`
3) Άνοιξε το URL που θα δείξει (συνήθως http://localhost:5173)

## Run (Electron dev)
1) `npm install`
2) `npm run electron:start`
   ή καλύτερα
3) `npm run electron:dev` (τρέχει Vite + Electron μαζί)

## Build (όταν το ζητήσεις)
- `npm run electron:pack`

## Σημείωση
Αυτή η έκδοση κρατάει δεδομένα σε **localStorage** (όπως η YouWare).
Όταν πεις “πάμε για EXE + τοπική βάση”, θα το γυρίσω σε SQLite (χωρίς να αλλάξει το UI/print).


ΝΕΑ:
- PDF αποθήκευση (desktop): κουμπί «Αποθήκευση PDF».
- Κοστολόγηση (προαιρετική): Ρυθμίσεις -> Κοστολόγηση. Δεν επηρεάζει το Print Report.
- Backup/Restore: περιλαμβάνει Πρόχειρο, Πελάτες, Υλικά, Ιστορικό, Αρίθμηση, Πυκνότητα, Ρυθμίσεις κοστολόγησης.


## Σημαντικό (Desktop/EXE)
- Η desktop έκδοση αποθηκεύει τα δεδομένα τοπικά σε αρχείο JSON (KV store) μέσα στο userData της εφαρμογής.
- Δεν χρειάζεται Visual Studio Build Tools / node-gyp γιατί ΔΕΝ υπάρχουν native modules (π.χ. better-sqlite3).
