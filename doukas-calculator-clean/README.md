# 🏗️ S. Doukas Calculator - Clean Build

## ✅ Τι Διορθώθηκε

### 1. **Flat Bars & Γωνίες Dropdown** ✅
- Προστέθηκε `requiresThickness: true` στα `flat_bar` και `angles_equal`
- Τώρα εμφανίζεται dropdown επιλογής πάχους για όλες τις λάμες και γωνίες

### 2. **Cached Materials Bug** ✅
- Αφαιρέθηκε η φόρτωση materials από storage (που προκαλούσε το bug)
- Τα materials φορτώνονται **πάντα από τον κώδικα** (`src/data/materials.ts`)
- Έτσι οι αλλαγές στον κώδικα εφαρμόζονται **αμέσως** σε κάθε build

### 3. **Αλλαγή Πυκνοτήτων Υλικών** 🆕
- Νέο feature: Μπορείς να αλλάξεις την πυκνότητα **οποιουδήποτε υλικού**
- Πρόσβαση: **Ρυθμίσεις → Αλλαγή Πυκνοτήτων**
- Οι custom πυκνότητες αποθηκεύονται και χρησιμοποιούνται στους υπολογισμούς
- Κουμπί επαναφοράς για κάθε υλικό ξεχωριστά ή για όλα μαζί

### 4. **Backup/Restore** ✅
- Το backup περιλαμβάνει τώρα:
  - Πρόχειρο
  - Πελάτες
  - **Custom Πυκνότητες** (νέο!)
  - Ιστορικό
  - Αρίθμηση
  - Global Density Override
  - Ρυθμίσεις Κοστολόγησης
  - Report Folder

---

## 📦 Εγκατάσταση & Εκτέλεση

### Web (Development)
```bash
npm install
npm run dev
```
Μετά άνοιξε: http://localhost:5173

### Desktop (Development)
```bash
npm install
npm run electron:dev
```

### Build EXE
```bash
# Καθάρισμα παλιών builds
Remove-Item -Recurse -Force dist, release -ErrorAction SilentlyContinue

# Build
npm run build
npm run electron:pack
```

Το EXE θα είναι στο: `release/S. Doukas S.A. Setup [version].exe`

---

## 🎯 Πώς να Αλλάξεις Πυκνότητες

### Μέθοδος 1: Μέσω UI (Συνιστάται)
1. Άνοιξε την εφαρμογή
2. Πήγαινε στο **menu Settings** (εικονίδιο ⚙️)
3. Επίλεξε **"Αλλαγή Πυκνοτήτων"**
4. Άλλαξε τις τιμές που θέλεις
5. Πάτα **"Κλείσιμο"** για αποθήκευση

### Μέθοδος 2: Αλλαγή στον Κώδικα
Άνοιξε: `src/data/materials.ts`

Για materials:
```javascript
flat_bar: {
    label: "Λάμες (flat bars, μαύρες)",
    type: "flat",
    requiresThickness: true,
    density: 7850,  // ⬅️ Άλλαξε εδώ (σε kg/m³)
    sizes: [...]
}
```

Για λαμαρίνες (sheets):
```javascript
black: {
    key: "black",
    label: "Μαύρη",
    density: 7850,  // ⬅️ Άλλαξε εδώ
    thicknesses: [...]
}
```

Για σωλήνες (pipes):
```javascript
black: {
    key: "black",
    label: "Μαύρη",
    density: 7850,  // ⬅️ Άλλαξε εδώ
    sizes: [...]
}
```

---

## 📂 Δομή Project

```
doukas-calculator-clean/
├── src/
│   ├── components/
│   │   ├── MaterialCalculator.tsx  ← Κύριο component
│   │   ├── MaterialEditor.tsx
│   │   ├── CustomerManager.tsx
│   │   ├── OrderHistory.tsx
│   │   └── PrintReport.ts
│   ├── data/
│   │   └── materials.ts           ← Ορισμός όλων των υλικών
│   ├── types/
│   │   ├── index.ts
│   │   └── Customer.ts
│   ├── utils/
│   │   ├── calculations.ts        ← Υπολογισμοί βάρους
│   │   └── phone.ts
│   └── assets/
│       └── logo.png
├── electron/
│   ├── main.cjs                   ← Electron main process
│   ├── preload.cjs
│   └── kvjson.cjs                 ← Local storage για desktop
├── package.json
├── vite.config.ts
└── tsconfig.json
```

---

## 🔧 Storage Keys

Η εφαρμογή χρησιμοποιεί τα εξής keys:

- `doukas-calculator-state` - Τρέχουσα κατάσταση (draft)
- `doukas-customers` - Λίστα πελατών
- `doukas-custom-densities-v1` - Custom πυκνότητες ⭐ ΝΕΟ
- `doukas-history` - Ιστορικό παραγγελιών
- `doukas-doc-counters-v1` - Αυτόματη αρίθμηση
- `doukas-global-density-v1` - Global density override
- `doukas-costing-v1` - Ρυθμίσεις κοστολόγησης
- `doukas-report-folder-ui-v1` - Φάκελος αποθήκευσης reports

---

## 🆕 Νέο Feature: Custom Densities

### Πώς λειτουργεί:
1. Τα materials φορτώνονται **πάντα** από το `materials.ts`
2. Όταν αλλάζεις πυκνότητα μέσω UI, αποθηκεύεται στο `customDensities` state
3. Οι υπολογισμοί χρησιμοποιούν την custom πυκνότητα (αν υπάρχει), αλλιώς την default
4. Οι custom πυκνότητες αποθηκεύονται στο localStorage/desktop storage
5. Συμπεριλαμβάνονται στο Backup/Restore

### Προτεραιότητα:
1. **Global Density Override** (Ctrl+Shift+D) - αν ορίστηκε, χρησιμοποιείται για ΟΛΑ
2. **Custom Density** - για συγκεκριμένο υλικό
3. **Default Density** - από το materials.ts

---

## 🚀 Tips

### Για Development:
- Use `npm run electron:dev` για hot reload
- Developer Tools: Ctrl+Shift+I (στο Electron)

### Για Production Build:
- Πάντα κάνε clean build: σβήσε `dist/` και `release/`
- Τρέξε `npm run build` πριν το `electron:pack`

### Αν κάτι πάει λάθος:
```bash
# Καθάρισε ΟΛΑ
Remove-Item -Recurse -Force node_modules, dist, release
npm install
npm run build
npm run electron:pack
```

---

## 📝 Σημαντικό

- **ΔΕΝ** υπάρχει πια το `MATERIALS_KEY` στο storage - τα materials φορτώνονται από κώδικα
- Οι αλλαγές στο `materials.ts` εφαρμόζονται αμέσως σε κάθε rebuild
- Τα δεδομένα χρηστών (πελάτες, παραγγελίες) παραμένουν ασφαλή
- Desktop: Δεδομένα αποθηκεύονται στο `%APPDATA%/S. Doukas S.A./`

---

## 📞 Support

Αν έχεις ερωτήσεις ή bugs, ενημέρωσέ με!
