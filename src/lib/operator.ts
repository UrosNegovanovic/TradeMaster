/** Marketing-site operator (T&G Nest). Not used on tenant invoices or catalogs. */
// TODO(A1.4): name, pib, registrationNumber and address are placeholders until the owner
// enters the APR data; src/lib/operator.test.ts has the check waiting as it.todo.
export const operator = {
  name: 'T&G Nest',
  pib: '12312412312',
  /** Matični broj (8 digits) from APR. */
  registrationNumber: '',
  email: 'uros.negovanovic35@gmail.com',
  phone: '+381628372900',
  /** Sedište as registered in APR. */
  address: 'test',
  logoSrc: '/landing/tg-nest-logo.jpg',
  logoWidth: 1280,
  logoHeight: 720,
} as const

/** Why operator data cannot go on the legal pages yet; empty when it looks real. */
export function operatorDataProblems(data: { pib: string; registrationNumber: string; address: string }): string[] {
  const problems: string[] = []
  if (data.pib === '12312412312') problems.push('PIB je test vrednost')
  if (!/^\d{9}$/.test(data.pib)) problems.push('PIB mora imati 9 cifara')
  if (!/^\d{8}$/.test(data.registrationNumber)) problems.push('Matični broj mora imati 8 cifara')
  const address = data.address.trim()
  if (!address || address.toLowerCase() === 'test') problems.push('Sedište nije uneto')
  return problems
}
