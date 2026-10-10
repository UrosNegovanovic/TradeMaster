/**
 * Demo company for public examples and the video (ROADMAP A1.7). Everything here is invented: company,
 * brands, buyers and numbers. The žiro-račun uses bank code 999, which belongs to no bank, so the IPS QR
 * on the demo invoice cannot send real money anywhere. Buyers have example.com addresses and no phones.
 */
import { pibProblem } from '../../src/lib/company-fields'
import { normalizeGiroAccount } from '../../src/lib/giro-account'

function validPib(prefix: string): string {
  for (let digit = 0; digit <= 9; digit++) if (!pibProblem(`${prefix}${digit}`)) return `${prefix}${digit}`
  throw new Error(`no valid PIB for ${prefix}`)
}

function demoGiro(): string {
  for (let control = 0; control <= 99; control++) {
    const account = `999-0000000004321-${String(control).padStart(2, '0')}`
    if (normalizeGiroAccount(account)) return account
  }
  throw new Error('no valid demo žiro-račun')
}

export const demoCompany = {
  companyName: 'Sunčano Polje Veleprodaja d.o.o.',
  address: 'Bulevar Primera 12, 11000 Beograd',
  pib: validPib('11223344'),
  registrationNumber: '21234567',
  giroAccount: demoGiro(),
  contactEmail: 'prodaja@suncano-polje.example',
  contactPhone: '',
  inVatSystem: true,
  defaultPaymentDays: 15,
  invoiceNote: 'Demo dokument. Firma, kupci i iznosi su izmišljeni. Reklamacije u roku od 8 dana.',
}

export type DemoProduct = {
  sku: string
  name: string
  category: string
  price: number
  costPrice: number
  quantity: number
  minStock: number
  /** Package look for the generated image. */
  color: string
  brand: string
  size: string
}

const p = (
  sku: string,
  name: string,
  category: string,
  price: number,
  costPrice: number,
  quantity: number,
  minStock: number,
  brand: string,
  size: string,
  color: string
): DemoProduct => ({ sku, name, category, price, costPrice, quantity, minStock, brand, size, color })

export const demoProducts: DemoProduct[] = [
  p('DM-1001', 'Zrno Gold mlevena kafa 200 g', 'Kafa i čaj', 329, 238, 48, 12, 'Zrno', '200 g', '#6b3f1d'),
  p('DM-1002', 'Zrno Espresso u zrnu 1 kg', 'Kafa i čaj', 1890, 1420, 14, 5, 'Zrno', '1 kg', '#3b2414'),
  p('DM-1003', 'Instant kafa 3u1, 10 kesica', 'Kafa i čaj', 249, 171, 6, 10, 'Zrno', '10 × 18 g', '#9c6a3c'),
  p('DM-1004', 'Planinski čaj nana, 20 kesica', 'Kafa i čaj', 149, 92, 36, 8, 'Planinka', '20 × 1,5 g', '#2f8f5b'),
  p('DM-1005', 'Planinski čaj kamilica, 20 kesica', 'Kafa i čaj', 149, 92, 30, 8, 'Planinka', '20 × 1,5 g', '#d9a520'),
  p('DM-2001', 'Hrskavi štapići sa solju 250 g', 'Grickalice', 119, 74, 80, 20, 'Krckko', '250 g', '#e07a1f'),
  p('DM-2002', 'Čips slani 150 g', 'Grickalice', 179, 118, 64, 15, 'Krckko', '150 g', '#e3b505'),
  p('DM-2003', 'Čips paprika 150 g', 'Grickalice', 179, 118, 9, 15, 'Krckko', '150 g', '#c0392b'),
  p('DM-2004', 'Kikiriki prženi slani 200 g', 'Grickalice', 199, 131, 40, 10, 'Zlatno zrno', '200 g', '#b5651d'),
  p('DM-2005', 'Keks sa komadićima čokolade 300 g', 'Grickalice', 239, 162, 28, 10, 'Mrvica', '300 g', '#7b4a2a'),
  p('DM-2006', 'Mlečna čokolada 100 g', 'Grickalice', 139, 88, 120, 30, 'Mrvica', '100 g', '#5b2c83'),
  p('DM-3001', 'Izvorska voda negazirana 1,5 l', 'Piće', 69, 41, 240, 60, 'Bistrica', '1,5 l', '#2b7bb9'),
  p('DM-3002', 'Mineralna voda gazirana 0,5 l', 'Piće', 59, 35, 180, 48, 'Bistrica', '0,5 l', '#1f5f8b'),
  p('DM-3003', 'Sok pomorandža 100% 1 l', 'Piće', 189, 128, 36, 12, 'Voćko', '1 l', '#f39c12'),
  p('DM-3004', 'Sok jabuka 100% 1 l', 'Piće', 179, 121, 4, 12, 'Voćko', '1 l', '#7dbb3a'),
  p('DM-3005', 'Ledeni čaj breskva 1,5 l', 'Piće', 149, 97, 54, 12, 'Voćko', '1,5 l', '#f5a86b'),
  p('DM-4001', 'Deterdžent za sudove limun 1 l', 'Kućna hemija', 219, 147, 44, 10, 'Sjaj', '1 l', '#f1c40f'),
  p('DM-4002', 'Sredstvo za staklo 750 ml', 'Kućna hemija', 249, 166, 26, 8, 'Sjaj', '750 ml', '#3498db'),
  p('DM-4003', 'Prašak za veš 3 kg', 'Kućna hemija', 1190, 862, 18, 6, 'Belina', '3 kg', '#16a085'),
  p('DM-4004', 'Omekšivač za veš 2 l', 'Kućna hemija', 459, 318, 22, 6, 'Belina', '2 l', '#9b59b6'),
  p('DM-4005', 'Tečni sapun 500 ml', 'Kućna hemija', 189, 121, 3, 8, 'Belina', '500 ml', '#e84393'),
  p('DM-5001', 'Toalet papir troslojni, 10 rolni', 'Papirna galanterija', 489, 352, 60, 15, 'Mekana', '10 rolni', '#74b9ff'),
  p('DM-5002', 'Kuhinjski ubrusi, 2 rolne', 'Papirna galanterija', 229, 154, 70, 15, 'Mekana', '2 rolne', '#55efc4'),
  p('DM-5003', 'Salvete bele 100 kom', 'Papirna galanterija', 99, 61, 90, 20, 'Mekana', '100 kom', '#b2bec3'),
]

export const demoClients = [
  { name: 'Market Kod Mila d.o.o.', email: 'nabavka@kod-mila.example', address: 'Ulica Primer 5, 21000 Novi Sad' },
  { name: 'Prodavnica Jutro STR', email: 'jutro@prodavnica.example', address: 'Trg Primera 3, 34000 Kragujevac' },
  { name: 'Kafić Ugao', email: 'ugao@kafic.example', address: 'Primer ulica 18, 18000 Niš' },
]

/** Products shown in the shared demo catalog (manual order = this order). */
export const demoCatalogSkus = [
  'DM-1001', 'DM-1002', 'DM-1004', 'DM-1005', 'DM-2001', 'DM-2002',
  'DM-2005', 'DM-2006', 'DM-3001', 'DM-3003', 'DM-4001', 'DM-5001',
]

/** A product "packshot" rendered by the seed (no photos, no real brands). */
export function packshotHtml(product: DemoProduct): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body{margin:0;width:600px;height:600px;display:flex;align-items:center;justify-content:center;
      background:linear-gradient(160deg,#f7f7f5,#e9ecef);font-family:Arial,Helvetica,sans-serif}
    .pack{width:330px;height:430px;border-radius:28px;background:linear-gradient(150deg,${product.color},#00000033),${product.color};
      box-shadow:0 24px 40px -12px #00000055, inset 0 2px 0 #ffffff44;display:flex;flex-direction:column;
      align-items:center;justify-content:space-between;padding:36px 26px;box-sizing:border-box;color:#fff;text-align:center}
    .brand{font-size:44px;font-weight:800;letter-spacing:1px;text-shadow:0 2px 6px #00000044}
    .name{font-size:24px;font-weight:600;line-height:1.25;background:#ffffffe6;color:#222;border-radius:14px;padding:14px 12px}
    .size{font-size:22px;font-weight:700;background:#00000033;border-radius:999px;padding:6px 18px}
  </style></head><body><div class="pack"><div class="brand">${product.brand}</div>
  <div class="name">${product.name.replace(/\s\d.*$/, '')}</div><div class="size">${product.size}</div></div></body></html>`
}
