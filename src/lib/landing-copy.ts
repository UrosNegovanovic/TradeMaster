/** Honest early-access pricing. No in-app checkout until Phase 4. */
export const pricingIncludes = [
  'Neograničen broj proizvoda',
  'Skener, magacin, katalozi, fakture i finansije',
  'Rani pristup: 30 € za 60 dana',
  'Naplata ručno — još nema pretplate u aplikaciji',
] as const

export const pricingNote =
  'Trenutno nema checkout-a ni samouslužne pretplate. Dogovorite početak i naplatu sa nama; račun ide ručno.'

export const pricingFxNote =
  'Naplata u dinarima po važećem kursu NBS na dan fakturisanja.'

export const paymentFaq = {
  q: 'Kako se plaća 30 €?',
  a: 'Za sada nema pretplate u aplikaciji. Rani pristup je 30 € za 60 dana; naplata je ručna, dogovorom. Nema otkaza pretplate jer pretplata još ne postoji.',
} as const
