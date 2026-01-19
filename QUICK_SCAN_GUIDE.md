# 📱 Quick Scan Feature - User Guide

## Overview
Quick Scan omogućava instant skeniranje proizvoda direktno sa Dashboard-a i automatsko dodavanje u inventar.

---

## 🚀 Kako koristiti Quick Scan

### **Metod 1: Quick Scan sa Dashboard-a**

1. **Klikni "Quick Scan Product"** u Dashboard Quick Actions sekciji
2. **Modal se otvara** sa camera stream-om
3. **Skeniraj barcode** proizvoda
4. **Automatski redirect** na Inventory stranicu
5. **Product Form se otvara** sa već popunjenim podacima:
   - SKU (barcode)
   - Name (ako je pronađen u OpenFoodFacts)
   - Description (brand, quantity, categories)
   - Image URL (product image)
6. **Proveri podatke** i dodaj dodatne informacije (price, category)
7. **Save** - proizvod je dodat u inventar

---

### **Metod 2: Scan iz ProductForm-a**

1. **Otvori Inventory** stranicu
2. **Klikni "Add Product"**
3. **Klikni barcode ikonu** pored SKU input-a
4. **Skeniraj barcode**
5. **SKU se automatski popunjava**
6. **Metadata se dohvata** u pozadini
7. **Form fields auto-fill** (name, description, image)
8. **Dodaj price** i ostale podatke
9. **Save**

---

## 🎯 Features

### **Quick Scan Button Lokacija:**
- ✅ **Dashboard** - Quick Actions (prva opcija)
- ✅ **ProductForm** - Pored SKU input-a (barcode ikona)

### **Auto-Fill Intelligent:**
- ✅ **SKU**: Uvek popunjava barcode
- ✅ **Name**: Auto-fill samo ako je prazan
- ✅ **Description**: Auto-fill samo ako je prazan
- ✅ **Image**: Auto-fill samo ako je prazan
- ✅ **Price**: User mora uneti
- ✅ **Category**: User mora odabrati

### **User Flow:**
```
Dashboard → Quick Scan → Scanner Opens → Barcode Detected → 
OpenFoodFacts API Call → Redirect to Inventory → 
Product Form Opens (pre-filled) → User Adds Price → Save
```

---

## 📋 URL Parameters

Kada Quick Scan redirectuje na Inventory, koristi sledeće URL parametre:

```
/inventory?scan=true&sku=[barcode]&name=[product_name]&description=[details]&imageUrl=[image_url]
```

**Example:**
```
/inventory?scan=true&sku=3017620422003&name=Nutella&description=Brand:%20Ferrero&imageUrl=https://...
```

---

## 🎨 UI/UX Details

### **Dashboard Quick Actions:**
```tsx
<QuickScanButton />  // Client Component
```

**Button Style:**
- Full-width
- Outline variant
- ScanBarcode icon
- "Quick Scan Product" tekst

### **ProductForm SKU Input:**
```tsx
<Input sku field />
<Button scan-barcode-icon />
```

**Button Style:**
- Icon only
- Outline variant
- Square (size="icon")
- Loader spinner tokom metadata fetch-a

---

## 🔄 Workflow Diagram

```
┌─────────────────┐
│   Dashboard     │
│  Quick Actions  │
└────────┬────────┘
         │
    [Click Quick Scan]
         │
         ▼
┌─────────────────┐
│  Scanner Modal  │
│  (Full-screen)  │
└────────┬────────┘
         │
   [Scan Barcode]
         │
         ▼
┌─────────────────┐
│ OpenFoodFacts   │
│   API Call      │
└────────┬────────┘
         │
    [Metadata]
         │
         ▼
┌─────────────────┐
│ Redirect to     │
│ Inventory       │
│ + URL Params    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  ProductForm    │
│  Auto-Opens     │
│  (Pre-filled)   │
└────────┬────────┘
         │
   [User Adds Price]
         │
         ▼
┌─────────────────┐
│  Product Saved  │
│  in Database    │
└─────────────────┘
```

---

## 🧪 Testing Scenarios

### **Scenario 1: Poznati proizvod (Nutella)**
1. Click "Quick Scan Product"
2. Scan barcode: `3017620422003`
3. ✅ **Expected**: Redirect sa punim podacima (name, image, description)
4. ✅ **User action**: Dodaj price (npr. 599 RSD) i save

### **Scenario 2: Nepoznati proizvod**
1. Click "Quick Scan Product"
2. Scan random barcode: `1234567890123`
3. ⚠️ **Expected**: Redirect samo sa SKU-om
4. ✅ **User action**: Manually unesi name, price, itd.

### **Scenario 3: Scan iz ProductForm-a**
1. Click "Add Product"
2. Click barcode icon
3. Scan barcode
4. ✅ **Expected**: SKU popunjen, ostalo auto-fill
5. ✅ **User action**: Proveri podatke i save

---

## 📱 Mobile Optimization

### **Quick Scan Button:**
- Full-width na svim veličinama
- Touch-friendly tap target (44px+)
- Responsive text size

### **Scanner Modal:**
- Full-screen na mobile (`h-[90vh]`)
- Large targeting area
- Easy cancel button
- Auto-close na uspešan scan

---

## ⚡ Performance

### **Optimizations:**
- ✅ **Instant SKU fill** - No delay
- ✅ **Background metadata fetch** - Ne blokira UI
- ✅ **Loading states** - Spinner tokom API call-a
- ✅ **Toast notifications** - Real-time feedback
- ✅ **Client-side routing** - No full page reload

### **Error Handling:**
- ✅ Camera permission denied
- ✅ No camera found
- ✅ Invalid barcode format
- ✅ API timeout/error
- ✅ Network offline

---

## 🎯 Use Cases

### **1. Brzo dodavanje poznatih proizvoda:**
- Korisnik ima fizički proizvod sa barcoden
- Skeniraj → Auto-fill sve → Dodaj price → Save
- **Time saved**: ~80% (no manual typing)

### **2. Bulk inventory import:**
- Skeniraj više proizvoda u nizu
- Svaki scan otvara novi form
- Quick add sa minimal input

### **3. Re-stocking:**
- Skeniraj proizvod koji već postoji
- Check existing price/details
- Add new quantity (future feature)

---

## 🛠️ Developer Notes

### **Files Modified:**
1. `src/components/inventory/ProductForm.tsx` - Dodat scan button
2. `src/app/(dashboard)/inventory/page.tsx` - URL params handling
3. `src/app/(dashboard)/dashboard/page.tsx` - Quick Actions update

### **Files Created:**
1. `src/components/dashboard/QuickScanButton.tsx` - Dashboard scan button
2. `QUICK_SCAN_GUIDE.md` - Ova dokumentacija

### **Dependencies:**
- `@yudiel/react-qr-scanner` - Scanner functionality
- `sonner` - Toast notifications
- `next/navigation` - URL params & routing

---

## 🚨 Known Limitations

1. **OpenFoodFacts coverage**: Primarily food products, electronics may not be found
2. **Internet required**: API calls need network connection
3. **Camera access**: Must allow browser permissions
4. **Mobile Safari**: May require HTTPS (production only)

---

## 🔮 Future Enhancements

1. **Offline mode**: Cache scanned products locally
2. **Bulk scan**: Scan multiple products without closing modal
3. **Smart detection**: Auto-detect duplicate products
4. **Price suggestions**: Fetch prices from e-commerce APIs
5. **Inventory check**: Show if product already exists

---

## 📊 Success Metrics

- **Scan Success Rate**: % of scans that return product data
- **Time to Add Product**: Avg. time from scan to save
- **Feature Adoption**: % of users using Quick Scan vs manual
- **Error Rate**: % of failed scans / permission errors

---

**Status**: ✅ **Production Ready**  
**Last Updated**: 2026-01-18  
**Feature**: Quick Scan Product (Dashboard + ProductForm)
