import { operator } from '@/lib/operator'

/** Honest early-access pricing. No in-app checkout until Phase 4. */
export const FREE_PERIOD = '60 dana'
/** Non-breaking space keeps the number and the euro sign on one line. */
export const MONTHLY_PRICE = '20 €'
/** "Prvih 60 dana besplatno, zatim 20 € mesečno" */
export const PRICING_OFFER = `Prvih ${FREE_PERIOD} besplatno, zatim ${MONTHLY_PRICE} mesečno`

export const pricingIncludes = [
  'Neograničen broj proizvoda i dokumenata',
  'Skener, magacin, katalozi sa linkom za kupca',
  'Predračun, faktura sa PDV-om i otpremnica',
  'IPS QR, izvoz za knjigovođu, lista kupaca',
  'Finansije: ko vam duguje i šta se najbolje prodaje',
  'Lager lista u Excelu sa nabavnom vrednošću',
] as const

export const pricingCardPeriod = `mesečno, posle ${FREE_PERIOD} besplatno`

export const pricingCardNote =
  'Bez kartice. Posle probnog perioda šaljemo račun jednom mesečno.'

export const pricingNote = 'Naplata u dinarima po važećem kursu NBS na dan fakturisanja.'

export const paymentFaq = {
  q: 'Šta se dešava posle 60 besplatnih dana?',
  a: `${PRICING_OFFER}. Za sada nema pretplate u aplikaciji: račun za svaki mesec šaljemo ručno, a pristup se produžava posle uplate. Kada pristup istekne, imate još 2 dana da uplatite i sve radi kao do tada; posle toga aplikacija prelazi u režim samo za pregled (vaši podaci ostaju vidljivi i mogu da se izvezu) dok uplata ne stigne. Svaka uplata produžava pristup za 30 dana. Nema otkaza pretplate jer pretplata još ne postoji.`,
} as const

/*
 * Landing page copy (ROADMAP A2.9). One tone: "vi". Every claim here must work in production today:
 * no SEF sending, team accounts or AI until they ship (CLAUDE.md, landing copy must stay honest).
 */

export const heroLead =
  'Skenirajte robu, pošaljite katalog kupcu na WhatsApp, napravite predračun i fakturu sa QR kodom za plaćanje. Sve sa telefona, a i sa računara.'

export const benefits = [
  { title: 'Manje ručnog unosa', line: 'Skenirajte barkod umesto da kucate naziv i šifru.' },
  { title: 'Roba na jednom mestu', line: 'Količine, cene i kretanje robe na telefonu i računaru.' },
  { title: 'Ponuda za par minuta', line: 'Katalog sa cenama i popustom, kao PDF ili link za kupca.' },
] as const

/** "Ceo posao iz telefona": the product loop in six steps. */
export const workflowSteps = [
  { title: 'Skenirajte robu', line: 'Kamera telefona čita barkod; ponovni sken istog artikla povećava količinu.' },
  { title: 'Pratite lager', line: 'Ulaz, izlaz i trenutno stanje, uz upozorenje kad zaliha padne na minimum koji sami zadate.' },
  { title: 'Pošaljite katalog', line: 'Katalog sa cenama kao PDF ili link na WhatsApp i Viber. Vidite koliko puta je link otvoren.' },
  { title: 'Napravite predračun', line: 'Iz kataloga koji ste poslali kupcu jednim dodirom, ili birate stavke i skenirate. Predračun ne skida robu sa lagera.' },
  { title: 'Faktura i otpremnica', line: 'Predračun pretvarate u fakturu jednim dodirom; otpremnica se štampa bez cena.' },
  { title: 'Kupac plaća QR kodom', line: 'Faktura ima IPS QR kod koji kupac skenira u mobilnom bankarstvu.' },
] as const

export const invoicePoints = [
  'Predračun, faktura i otpremnica iz istih stavki',
  'PDV 20% i 10%, obračunat po stavkama',
  'Stavke i za usluge, prevoz ili ambalažu, ne samo za robu sa lagera',
  'IPS QR kod za plaćanje iz mobilnog bankarstva',
  'Podsetnik za naplatu direktno kupcu na WhatsApp, ili preko Vibera',
  'Vaš rok plaćanja i stalna napomena na svakoj fakturi',
  'Izvoz za knjigovođu u Excel',
] as const

/** Plain limits, so nobody signs up for something that is not there. */
export const notList = [
  'Nije fiskalna kasa: za prodaju građanima i dalje vam treba kasa.',
  'Ne šalje fakture u SEF. Interna faktura i predračun su vaši dokumenti; SEF ostaje kako ga danas koristite.',
  'Jedan nalog po firmi: više zaposlenih ne može da radi istovremeno sa svojim nalozima.',
  'Ne radi bez interneta.',
] as const

export const dataPoints = [
  'Baza je na serverima u EU (Irska).',
  'Fakture i lager listu izvozite u CSV ili Excel kad god hoćete.',
  'Kad pristup istekne, podaci ostaju vidljivi i mogu da se izvezu; aplikacija prelazi u režim samo za pregled.',
  'Javni linkovi ka katalogu i fakturi mogu da se opozovu i ne prikazuju nabavne cene ni stanje lagera.',
] as const

export const installFaq = {
  q: 'Da li moram da instaliram aplikaciju?',
  a: 'Ne morate: radi i u pregledaču. Na Android telefonu dodirnite „Instaliraj aplikaciju“ na ovoj stranici i TradeMaster dobija svoju ikonicu. Na iPhone-u u Safariju izaberite Podeli → „Dodaj na početni ekran“.',
} as const

export const faqs = [
  {
    q: 'Radi li na telefonu i računaru?',
    a: 'Da. Isti nalog i isti lager na telefonu i računaru.',
  },
  installFaq,
  {
    q: 'Šta ako barkod nije pronađen?',
    a: 'Ako artikal nije u vašem asortimanu, sistem potraži javne baze proizvoda. Ako ga ni tamo nema, otvara se forma da unesete naziv i cenu. Nije svaki barkod u bazi.',
  },
  {
    q: 'Da li je potreban internet?',
    a: 'Da. TradeMaster radi online; rad bez interneta nije dostupan.',
  },
  {
    q: 'Kako kupac dobija katalog?',
    a: 'Pripremite katalog sa cenama i popustom, pa pošaljete PDF ili link. Link se otvara bez prijave, a možete ga opozvati kad hoćete.',
  },
  {
    q: 'Da li TradeMaster zamenjuje fiskalnu kasu ili šalje fakture u SEF?',
    a: 'Ne. TradeMaster vodi vašu robu, zalihe, predračune i interne B2B fakture. Koristite ga uz svoju fiskalnu kasu i SEF, ne umesto njih.',
  },
  {
    q: 'Mogu li da fakturišem uslugu ili prevoz?',
    a: 'Da. Na fakturi i predračunu svaka stavka može biti „slobodna“: upišete naziv i cenu, bez proizvoda iz asortimana i bez promene lagera.',
  },
  {
    q: 'Šta dobija knjigovođa?',
    a: 'Izvoz faktura za izabrani period (osnovica, PDV, ukupno) i lager listu sa nabavnom i prodajnom vrednošću, oba u Excelu ili CSV-u. Na fakturi su matični broj, datum prometa i mesto izdavanja.',
  },
  {
    q: 'Mogu li da uvezem postojeći asortiman odjednom (Excel/CSV)?',
    a: 'Da. U Magacinu postoje dva uvoza: „Uvezi iz CSV/Excel“ za nove proizvode i „Ažuriraj stanje“ koje po šifri postavlja količinu postojećih artikala. Pregled pokaže neispravne redove i oni se ne šalju.',
  },
  paymentFaq,
] as const

/**
 * Filled by the owner before launch; each part stays hidden while it is null.
 * - contact: ROADMAP A1.5. The support phone is the operator's phone (one source), also used for WhatsApp/Viber.
 * - examples: ROADMAP A1.7, public share paths of the demo company's catalog and invoice.
 */
export const landingContact: { phone: string | null } = { phone: operator.phone }

// Demo company "Sunčano Polje Veleprodaja d.o.o." (invented), seeded with e2e/demo on 2026-10-10.
// The shared links live in the database, so they keep working after the switch to Clerk Production.
export const landingExamples: { catalogPath: string | null; invoicePath: string | null } = {
  catalogPath: '/shared/catalog/ef75826456bdcec23c3e9f96ae0c8ad422e1c6b82db5e69c78199f374a77b003',
  invoicePath: '/shared/invoice/27fbee82d97de0fd2b406a2f46cf980c8fc1e5c82bb4a1a3ee6c38c3ca5003a6',
}

export type ContactLinks = { display: string; tel: string; whatsapp: string; viber: string }

/** "+381 62 123 4567" → tel:, wa.me and Viber chat links; null for anything that is not a full number. */
export function contactLinks(phone: string | null): ContactLinks | null {
  if (!phone) return null
  const digits = phone.replace(/[^\d+]/g, '')
  const international = digits.startsWith('+') ? digits.slice(1) : digits.startsWith('0') ? `381${digits.slice(1)}` : digits
  if (!/^\d{9,15}$/.test(international)) return null
  return {
    display: phone.trim(),
    tel: `tel:+${international}`,
    whatsapp: `https://wa.me/${international}`,
    viber: `viber://chat?number=%2B${international}`,
  }
}
