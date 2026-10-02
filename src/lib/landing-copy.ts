/** Honest early-access pricing. No in-app checkout until Phase 4. */
export const FREE_PERIOD = '60 dana'
/** Non-breaking space keeps the number and the euro sign on one line. */
export const MONTHLY_PRICE = '20 €'
/** "Prvih 60 dana besplatno, zatim 20 € mesečno" */
export const PRICING_OFFER = `Prvih ${FREE_PERIOD} besplatno, zatim ${MONTHLY_PRICE} mesečno`

export const pricingIncludes = [
  'Neograničen broj proizvoda i faktura',
  'Skener, magacin, katalozi, fakture sa PDV-om',
  'IPS QR, izvoz za knjigovođu, lista kupaca',
] as const

export const pricingCardPeriod = `mesečno, posle ${FREE_PERIOD} besplatno`

export const pricingCardNote =
  'Bez kartice. Posle probnog perioda šaljemo račun jednom mesečno.'

export const pricingNote = 'Naplata u dinarima po važećem kursu NBS na dan fakturisanja.'

export const paymentFaq = {
  q: 'Šta se dešava posle 60 besplatnih dana?',
  a: `${PRICING_OFFER}. Za sada nema pretplate u aplikaciji: račun za svaki mesec šaljemo ručno, a pristup se produžava posle uplate. Kada pristup istekne, aplikacija prelazi u režim samo za pregled (vaši podaci ostaju vidljivi i mogu da se izvezu) dok ne produžite. Nema otkaza pretplate jer pretplata još ne postoji.`,
} as const
