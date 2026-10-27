# 🏗️ S. Doukas Calculator - ULTIMATE + DXF Edition 🚀

## 🎉 ALL FEATURES COMPLETE!

### ✅ **10 Major Features:**
1. ⚡ Material Search/Filter
2. 🖼️ Material Icons  
3. ✨ Smooth Animations
4. 🔄 Material Comparison
5. 🤖 AI Assistant
6. 🎮 3D Visualizer
7. ⚙️ Custom Densities
8. 📏 Flat Bars Dropdown
9. 📐 Angles Dropdown
10. **📎 DXF/DWG Attachment** ← ΝΕΟ!

---

## 📎 DXF/DWG ATTACHMENT FEATURE

### Τι Κάνει:
- **Upload** DXF ή DWG files στην παραγγελία
- **Αποθήκευση** στο desktop app directory
- **Εμφάνιση** στα HTML/PDF reports
- **Προβολή** με ένα κλικ
- **Αφαίρεση** όποτε θέλεις

### Πώς το Χρησιμοποιείς:

**1. Upload Drawing:**
```
┌─────────────────────────────┐
│ 📎 Σχέδιο Κατασκευής       │
│                             │
│  [📁 Επιλογή DXF/DWG]      │
│                             │
│  Δεν έχει προστεθεί σχέδιο  │
└─────────────────────────────┘
```

**2. After Upload:**
```
┌──────────────────────────────────┐
│ 📎 Σχέδιο Κατασκευής            │
├──────────────────────────────────┤
│ 📐 building_frame.dxf            │
│ Μέγεθος: 245.3 KB                │
│                                  │
│ [👁️ Προβολή] [✕ Αφαίρεση]      │
└──────────────────────────────────┘
```

**3. In Report:**
```html
┌──────────────────────────────┐
│ ΠΑΡΑΓΓΕΛΙΑ #47               │
│ Πελάτης: Kyriakos Flatzes    │
│ ...                          │
├──────────────────────────────┤
│ 📎 Σχέδιο Κατασκευής         │
│ ┌──────┐                     │
│ │  📐  │ building_frame.dxf  │
│ │      │ Μέγεθος: 245.3 KB   │
│ └──────┘                     │
│                              │
│ ΥΛΙΚΑ:                       │
│ ...                          │
└──────────────────────────────┘
```

### Technical Details:

**File Storage (Desktop):**
```javascript
// Saved to: %APPDATA%/S. Doukas S.A./drawings/
// Filename: CustomerName_OrderNum_OriginalName.dxf
// Example: kyriakos_flatzes_47_building_frame.dxf
```

**Supported Formats:**
- ✅ `.dxf` (AutoCAD Drawing Exchange Format)
- ✅ `.dwg` (AutoCAD Drawing)

**State Management:**
```javascript
attachedDrawing: {
  name: string;    // Original filename
  size: number;    // File size in bytes
  path: string;    // Full path on disk
}
```

**Persistence:**
- Saves with order state
- Loads on app restart
- Included in Backup/Restore

---

## 📦 Installation

```bash
cd doukas-calculator-clean
npm install
npm run dev              # Web
npm run electron:dev     # Desktop
```

## 🏗️ Build EXE

```powershell
# Clean
Remove-Item -Recurse -Force dist, release -ErrorAction SilentlyContinue

# Build
npm run build
npm run electron:pack

# Output: release/S. Doukas S.A. Setup [version].exe
```

---

## 🎯 Feature Overview

### Core Features:
- ✅ IPE, IPN, UPN, HEA, HEB, RHS, CHS
- ✅ Flat Bars με dropdown ✨
- ✅ Γωνίες με dropdown ✨
- ✅ Λαμαρίνες (Μαύρη, Γαλβανιζέ, Κριθαράκι, Inox)
- ✅ Σωλήνες

### Advanced Features:
- ⚡ **Material Search** - Real-time filtering
- 🖼️ **Material Icons** - Visual indicators
- ✨ **Animations** - Smooth transitions
- 🔄 **Comparison Tool** - Side-by-side
- 🤖 **AI Assistant** - Chat helper (demo)
- 🎮 **3D Visualizer** - Interactive preview
- ⚙️ **Custom Densities** - Per-material override
- 📎 **DXF Attachment** - Drawing upload

### Management:
- 👥 Customer Manager
- 📜 Order History
- 🖨️ Print Reports (HTML)
- 📄 PDF Export (desktop)
- 💾 Backup/Restore
- 💰 Κοστολόγηση

---

## 🔍 DXF Feature Use Cases

**1. Construction Projects:**
```
Upload: Steel frame design
Result: Report with materials + drawing reference
Benefit: Complete documentation
```

**2. Custom Fabrication:**
```
Upload: Client's CAD file
Result: Quote with visual proof
Benefit: Client confidence
```

**3. Archive & Reference:**
```
Upload: Historical projects
Result: Searchable order history with drawings
Benefit: Easy retrieval
```

---

## 💡 Tips & Tricks

### DXF Best Practices:
- Name files descriptively: `project_name_v2.dxf`
- Keep files under 5 MB for best performance
- Use "👁️ Προβολή" to verify file location
- DXF stays attached even after app restart

### General Workflow:
1. Επίλεξε πελάτη
2. **Upload DXF** (νέο!)
3. Πρόσθεσε υλικά
4. Print/PDF report (includes DXF info)

---

## 🗂️ File Structure

```
%APPDATA%/S. Doukas S.A./
├── kvjson-data.json          # App data
└── drawings/                  # DXF files (νέο!)
    ├── client1_order47_frame.dxf
    ├── client2_order48_roof.dwg
    └── ...
```

---

## 🐛 Troubleshooting

**Problem:** DXF upload fails
**Solution:** Check file format (.dxf or .dwg only)

**Problem:** Can't find uploaded file
**Solution:** Click "👁️ Προβολή" to open folder

**Problem:** File too large
**Solution:** Optimize DXF (remove unused layers/blocks)

---

## 📝 Changelog

**v3.0 - DXF Support:**
- ➕ DXF/DWG file attachment
- ➕ Desktop file storage
- ➕ Report integration
- ➕ View/Remove controls

**v2.0 - Ultimate Features:**
- ➕ Material Search
- ➕ Material Icons
- ➕ Animations
- ➕ Comparison Tool
- ➕ AI Assistant
- ➕ 3D Visualizer

**v1.0 - Core:**
- ➕ Material calculator
- ➕ Customer management
- ➕ PDF reports

---

## 🚀 Ready to Use!

**Όλα τα features implemented and tested!** ✅

Build your EXE and enjoy! 🎉

---

**Made with ❤️ for S. Doukas A.E.**
