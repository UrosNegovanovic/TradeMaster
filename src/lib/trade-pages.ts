import { PRICING_OFFER } from '@/lib/landing-copy'

/**
 * Pages per trade (ROADMAP A2.11): /za/<slug>. Same honesty rule as the landing: only what works in
 * production today (no SEF sending, no team accounts, no label printing, no AI). One tone: "vi".
 */
export type TradePage = {
  slug: string
  /** <title>, kept under 60 characters. */
  title: string
  /** Meta description, 70-160 characters. */
  description: string
  /** Short name for links ("Veleprodaja"). */
  label: string
  h1: string
  lead: string
  /** "Danas" — how the work is done before TradeMaster. */
  today: string[]
  features: { title: string; line: string }[]
  faq: { q: string; a: string }[]
}

const commonFaq = [
  {
    q: 'Koliko košta?',
    a: `${PRICING_OFFER}. Bez kartice; posle probnog perioda šaljemo račun jednom mesečno.`,
  },
  {
    q: 'Da li TradeMaster šalje fakture u SEF?',
    a: 'Ne. Ako ste u sistemu PDV-a, fakturu drugoj firmi i dalje šaljete kroz SEF. TradeMaster vodi robu, lager, katalog, predračun, internu fakturu i otpremnicu.',
  },
  {
    q: 'Može li više zaposlenih da radi istovremeno?',
    a: 'Za sada je jedan nalog po firmi. Nalog možete otvoriti na telefonu i na računaru.',
  },
]

export const tradePages: TradePage[] = [
  {
    slug: 'veleprodaju',
    label: 'Veleprodaja',
    title: 'TradeMaster za malu veleprodaju',
    description:
      'Lager, katalog sa cenama za kupce, predračun i faktura sa IPS QR kodom za malu veleprodaju. Sa telefona i računara, bez Excela.',
    h1: 'Za malu veleprodaju',
    lead: 'Roba, cene za kupce, predračun i faktura na jednom mestu. Katalog šaljete na WhatsApp, a kupac plaća skeniranjem QR koda.',
    today: [
      'Cene i stanje vodite u Excelu i ne znate tačno šta je na lageru dok ne prebrojite.',
      'Ponudu šaljete kao slike ili PDF koji morate ručno da sredite za svakog kupca.',
      'Predračun i fakturu kucate u Wordu, pa prepisujete iste stavke dva puta.',
    ],
    features: [
      { title: 'Asortiman za par minuta', line: 'Skenirajte barkod telefonom ili uvezite postojeći spisak iz Excela ili CSV-a.' },
      { title: 'Lager koji se sam vodi', line: 'Ulaz i izlaz robe, a faktura sama skida robu sa stanja. Upozorenje kad zaliha padne na vaš minimum.' },
      { title: 'Katalog po kupcu', line: 'Cene sa popustom za konkretnog kupca, kao PDF ili link. Iz kataloga jednim dodirom pravite predračun.' },
      { title: 'Predračun, faktura, otpremnica', line: 'Predračun pretvarate u fakturu jednim dodirom; otpremnica se štampa bez cena.' },
      { title: 'Naplata', line: 'IPS QR kod na fakturi, spisak ko vam koliko duguje i podsetnik direktno kupcu na WhatsApp.' },
      { title: 'Za knjigovođu', line: 'Izvoz faktura i lager liste sa nabavnom vrednošću u Excel ili CSV.' },
    ],
    faq: commonFaq,
  },
  {
    slug: 'preduzetnike',
    label: 'Preduzetnici',
    title: 'TradeMaster za preduzetnike koji prodaju robu',
    description:
      'Za preduzetnike i paušalce koji prodaju robu drugim firmama: lager, katalog, predračun i faktura sa QR kodom za plaćanje, sa telefona.',
    h1: 'Za preduzetnike koji prodaju robu',
    lead: 'Ako sami vodite robu, ponude i fakture, TradeMaster vam to drži na jednom mestu u telefonu: od skeniranja robe do uplate kupca.',
    today: [
      'Robu, cene i dugovanja kupaca pamtite u glavi, svesci ili tabeli.',
      'Fakturu pravite iz šablona i ručno računate ukupno.',
      'Kupcu šaljete broj računa i čekate da pravilno prepiše poziv na broj.',
    ],
    features: [
      { title: 'Sve iz telefona', line: 'Skeniranje robe, stanje lagera, katalog, predračun i faktura na istom nalogu, i na računaru.' },
      { title: 'Faktura sa ili bez PDV-a', line: 'U Podešavanjima birate da li ste u sistemu PDV-a; faktura računa iznose prema tome.' },
      { title: 'Kupac plaća QR kodom', line: 'IPS QR kod na fakturi popunjava račun, iznos i poziv na broj u mobilnom bankarstvu.' },
      { title: 'Ko kasni sa uplatom', line: 'Na Finansijama vidite ko vam koliko duguje i koliko kasni; podsetnik ide kupcu na WhatsApp.' },
      { title: 'Stalni kupci i usluge', line: 'Sačuvani kupci popunjavaju fakturu, „Kopiraj“ pravi novu od stare, a uslugu ili prevoz fakturišete bez lagera.' },
      { title: 'Za knjigovođu', line: 'Izvoz faktura u Excel ili CSV kad god zatreba.' },
    ],
    faq: commonFaq,
  },
  {
    slug: 'proizvodjace',
    label: 'Proizvođači',
    title: 'TradeMaster za male proizvođače',
    description:
      'Za male proizvođače koji prodaju trgovcima: katalog proizvoda sa slikama, predračun, faktura i otpremnica sa potpisima, sa telefona.',
    h1: 'Za male proizvođače',
    lead: 'Pokažite trgovcima ponudu sa slikama i cenama, pa iz istih stavki napravite predračun, fakturu i otpremnicu za isporuku.',
    today: [
      'Ponudu šaljete kao fotografije sa cenama u poruci.',
      'Otpremnicu pišete rukom, a fakturu posle prepisujete.',
      'Ne znate koliko gotovih proizvoda imate dok ne obiđete magacin.',
    ],
    features: [
      { title: 'Katalog sa slikama', line: 'Proizvodi sa fotografijom, opisom i cenom, kao PDF ili link koji trgovac otvara bez prijave.' },
      { title: 'Roba bez barkoda', line: 'Šifru proizvoda unosite ručno; skener koristite za robu koja ima barkod.' },
      { title: 'Lager gotovih proizvoda', line: 'Ulaz posle proizvodnje i izlaz pri prodaji, sa trenutnim stanjem.' },
      { title: 'Otpremnica za isporuku', line: 'Mesto isporuke, broj paketa i polja za potpis i datum za vozača i kupca.' },
      { title: 'Predračun i faktura', line: 'Predračun iz kataloga pre isporuke, faktura sa IPS QR kodom posle.' },
      { title: 'Za knjigovođu', line: 'Izvoz faktura u Excel ili CSV za izabrani period.' },
    ],
    faq: commonFaq,
  },
]

export function tradePageBySlug(slug: string): TradePage | undefined {
  return tradePages.find((page) => page.slug === slug)
}

export function tradePagePath(page: Pick<TradePage, 'slug'>): string {
  return `/za/${page.slug}`
}
