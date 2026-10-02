/** Honest early-access pricing. No in-app checkout until Phase 4. */
export const EARLY_ACCESS_PRICE = '20 €'
export const EARLY_ACCESS_PERIOD = '60 dana'
export const EARLY_ACCESS_OFFER = `${EARLY_ACCESS_PRICE} za ${EARLY_ACCESS_PERIOD}`

export const pricingIncludes = [
  'Neograničen broj proizvoda',
  'Skener, magacin, katalozi, fakture i finansije',
  `Rani pristup: ${EARLY_ACCESS_OFFER} (uvodna cena)`,
  'Naplata ručno — još nema pretplate u aplikaciji',
] as const

export const pricingNote =
  'Trenutno nema checkout-a ni samouslužne pretplate. Dogovorite početak i naplatu sa nama; račun ide ručno.'

export const pricingFxNote =
  'Naplata u dinarima po važećem kursu NBS na dan fakturisanja.'

export const paymentFaq = {
  q: `Kako se plaća ${EARLY_ACCESS_PRICE}?`,
  a: `Za sada nema pretplate u aplikaciji. Rani pristup je ${EARLY_ACCESS_OFFER} (uvodna cena); naplata je ručna, dogovorom. Nema otkaza pretplate jer pretplata još ne postoji.`,
} as const
