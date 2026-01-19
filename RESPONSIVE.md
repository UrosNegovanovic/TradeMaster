# 📱 TradeMaster - Responsive Design Documentation

## Overview
TradeMaster aplikacija je sada **potpuno responsive** i optimizovana za sve uređaje (mobile, tablet, desktop).

---

## 🎯 Tailwind Breakpoints

TradeMaster koristi standardne Tailwind CSS breakpoints:

| Breakpoint | Min Width | Devices | Prefix |
|------------|-----------|---------|--------|
| **xs** | < 640px | Mobile phones (portrait) | *(default)* |
| **sm** | ≥ 640px | Mobile phones (landscape), Small tablets | `sm:` |
| **md** | ≥ 768px | Tablets (portrait) | `md:` |
| **lg** | ≥ 1024px | Tablets (landscape), Small laptops | `lg:` |
| **xl** | ≥ 1280px | Desktops, Large laptops | `xl:` |
| **2xl** | ≥ 1536px | Large desktops | `2xl:` |

---

## ✅ Implementirane Promene

### 1. **Layout & Navigation**

#### **Sidebar (Desktop)**
- **Komponenta**: `src/components/layout/Sidebar.tsx`
- **Vidljivost**: `hidden md:flex` - Prikazan samo na desktop-u (≥768px)
- **Width**: Fixed `w-64` (256px)

#### **MobileNav (Hamburger Menu)**
- **Komponenta**: `src/components/layout/MobileNav.tsx`
- **Vidljivost**: Prikazan samo na mobilnom (<768px)
- **Tehnologija**: Shadcn UI Sheet (drawer)
- **Features**:
  - Hamburger ikona (☰)
  - Slide-in menu sa leve strane
  - Overlay background
  - Auto-close na klik navigacionog linka

#### **DashboardLayout**
- **Komponenta**: `src/components/layout/DashboardLayout.tsx`
- **Mobile Header**: Sticky header sa MobileNav hamburger-om i logo-om
- **Padding**: `p-4` (mobile) → `md:p-6` (desktop)

---

### 2. **Dashboard Page**

#### **Stats Cards Grid**
```tsx
grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
```
- **Mobile (xs)**: 1 kolona (stacked)
- **Small (sm)**: 2 kolone
- **Large (lg)**: 3 kolone

#### **Charts & Quick Actions Grid**
```tsx
grid-cols-1 lg:grid-cols-3
```
- **Mobile**: Stacked (1 kolona)
- **Desktop**: Analytics Chart (2/3 width) + Quick Actions (1/3 width)

#### **Recent Products Table**
- **Horizontal Scroll**: `overflow-x-auto` wrapper
- **Responsive Columns**:
  - "Created" kolona: `hidden sm:table-cell` (sakrivena na mobilnom)
  - Whitespace: `whitespace-nowrap` za sve ćelije
- **Font Sizes**: `text-xs sm:text-sm` za bolje čitanje

---

### 3. **Forms (Invoice, Catalog, Product)**

#### **InvoiceForm - Invoice Items Table**
**Desktop (md+)**:
- Grid layout `grid-cols-12`
- Table headers vidljivi
- Kompaktni inline input-i

**Mobile (<md)**:
- Stacked layout `grid-cols-1`
- Labels za svaki input (npr. "Product", "Quantity")
- Grid unutar grid-a za grupiranje (2 input-a po redu)
  - Quantity + Unit Price (1 red)
  - Discount + Total (1 red)
- Delete button sa tekstom "Remove" (umesto samo ikone)

#### **Grid Layouts**
```tsx
// Standardni pattern
grid-cols-1 sm:grid-cols-2
```
- 1 kolona na mobilnom
- 2 kolone na tablet+ uređajima

---

### 4. **Tables (Product List, Invoices, etc.)**

#### **ProductList**
```tsx
<div className="rounded-md border overflow-hidden">
  <div className="overflow-x-auto">
    <Table>
      <!-- Table content -->
    </Table>
  </div>
</div>
```

**Features**:
- `overflow-x-auto` omogućava horizontal scroll
- `min-w-[Xpx]` na kolonama sprečava collapse
- `whitespace-nowrap` za tekst koji ne sme da break-uje
- Action buttons: Manje ikone na mobilnom (`h-3 w-3 sm:h-4 sm:w-4`)

#### **Dashboard Tables**
- `-mx-4 sm:mx-0` za full-width na mobilnom (ignoriše padding)
- `inline-block min-w-full` za table wrapper
- `hidden sm:table-cell` za opcione kolone

---

### 5. **Typography**

#### **Responsive Text Sizes**
```tsx
// Heading 1
text-2xl sm:text-3xl

// Heading 2
text-lg sm:text-xl

// Body text
text-sm sm:text-base

// Small text
text-xs sm:text-sm
```

#### **Spacing**
```tsx
// Vertical spacing
space-y-4 md:space-y-6

// Gap in grids
gap-3 sm:gap-4
```

---

## 🛠️ Best Practices

### 1. **Mobile-First Approach**
```tsx
// ✅ GOOD - Default je mobile, zatim override za desktop
<div className="text-sm md:text-base">

// ❌ BAD - Default je desktop
<div className="text-base md:text-sm">
```

### 2. **Flexbox Direction**
```tsx
// Stack na mobilnom, row na desktop-u
flex flex-col sm:flex-row sm:items-center sm:justify-between
```

### 3. **Conditional Visibility**
```tsx
// Desktop only
<div className="hidden md:block">

// Mobile only
<div className="block md:hidden">
```

### 4. **Button Sizing**
```tsx
// Full width na mobilnom, auto na desktop-u
<Button className="w-full sm:w-auto">
```

### 5. **Table Scroll Pattern**
```tsx
<div className="rounded-md border overflow-hidden">
  <div className="overflow-x-auto">
    <table className="w-full">
      <th className="min-w-[150px]">Column</th>
    </table>
  </div>
</div>
```

---

## 📋 Testing Checklist

### Mobile (< 640px)
- [ ] Hamburger menu se otvara/zatvara
- [ ] Sidebar je sakriven
- [ ] Cards su stacked (1 kolona)
- [ ] Forms su stacked
- [ ] Tables imaju horizontal scroll
- [ ] Buttons su full-width gde treba
- [ ] Font sizes su čitljivi

### Tablet (640px - 1024px)
- [ ] 2-kolona grid layout funkcioniše
- [ ] Hamburger menu još uvek aktivan (<768px)
- [ ] Desktop sidebar se pojavljuje (≥768px)
- [ ] Charts su čitljivi

### Desktop (> 1024px)
- [ ] 3-4 kolona grid layout
- [ ] Sidebar stalno vidljiv
- [ ] Tables se ne scrolluju
- [ ] Chart zauzima 2/3 širine

---

## 🚀 Performance Optimizations

1. **Lazy Loading**: Tabele se renderuju samo vidljivi redovi
2. **Debouncing**: Search input-i koriste debounce
3. **Memoization**: React.memo za velike liste
4. **Virtual Scrolling**: (TODO) Za > 100 items u tabelama

---

## 📝 Maintenance Notes

### Adding New Pages
Prilikom kreiranja nove stranice:
1. Koristite `grid-cols-1 sm:grid-cols-2` pattern
2. Dodajte `overflow-x-auto` za tabele
3. Testirajte na svim breakpoint-ima
4. Koristite responsive text sizes

### Common Patterns
```tsx
// Responsive grid
<div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">

// Responsive flex
<div className="flex flex-col sm:flex-row sm:items-center gap-4">

// Responsive text
<h1 className="text-2xl sm:text-3xl font-bold">

// Responsive padding
<div className="p-4 md:p-6">
```

---

## 🔧 Troubleshooting

### Problem: Table ne scrolluje na mobilnom
**Rešenje**: Dodaj `overflow-x-auto` wrapper i `min-w-[Xpx]` na kolone

### Problem: Sidebar se vidi na mobilnom
**Rešenje**: Proveri da ima `hidden md:flex` klasu

### Problem: Text je suviše mali na mobilnom
**Rešenje**: Koristi `text-sm sm:text-base` pattern

### Problem: Buttons su suviše veliki na mobilnom
**Rešenje**: Dodaj `size="sm"` i `text-sm` klasu

---

## 📚 Resources

- [Tailwind CSS Responsive Design](https://tailwindcss.com/docs/responsive-design)
- [Shadcn UI Components](https://ui.shadcn.com/)
- [Radix UI Primitives](https://www.radix-ui.com/)
- [Next.js App Router](https://nextjs.org/docs/app)

---

**Last Updated**: 2026-01-18  
**Status**: ✅ Production Ready
