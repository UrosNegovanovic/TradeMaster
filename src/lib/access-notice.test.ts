import { describe, expect, it } from 'vitest'
import { accessNotice } from './access-notice'
import { initialAccessExpiry, planAccessExtension } from './access-period'

const created = new Date('2026-08-11T10:00:00.000Z')
const trialEnd = initialAccessExpiry(created) // expiry day 10.10.2026

describe('accessNotice (billing banner)', () => {
  it('says nothing while more than 7 days remain', () => {
    expect(accessNotice(trialEnd, created, new Date('2026-09-01T10:00:00.000Z'))).toBeNull()
    expect(accessNotice(null, created)).toBeNull()
  })

  it('warns in amber before the end of the trial, mentioning the 2 grace days', () => {
    const notice = accessNotice(trialEnd, created, new Date('2026-10-05T10:00:00.000Z'))
    expect(notice).toMatchObject({ tone: 'warning', state: 'expiring' })
    expect(notice?.title).toBe('Probni period ističe za 5 dana (10.10.2026.).')
    expect(notice?.detail).toMatch(/još 2 dana za uplatu/)
  })

  it('turns red after the trial ended, with the payment deadline 2 days later', () => {
    const notice = accessNotice(trialEnd, created, new Date('2026-10-11T08:00:00.000Z'))
    expect(notice).toMatchObject({ tone: 'danger', state: 'grace' })
    expect(notice?.title).toBe('Probni period je istekao 10.10.2026. Uplatite do 12.10.2026. (rok ističe sutra).')
    expect(notice?.detail).toMatch(/Do tada sve radi normalno/)
  })

  it('uses "Pretplata je istekla" after a paid month, and read-only wording after the deadline', () => {
    const paidUntil = planAccessExtension({ expiresAt: trialEnd, paidOn: '2026-10-01', now: new Date('2026-10-02T10:00:00.000Z') }).expiresAt
    const grace = accessNotice(paidUntil, created, new Date('2026-11-11T10:00:00.000Z'))
    expect(grace?.title).toMatch(/^Pretplata je istekla 10\.11\.2026\./)
    const locked = accessNotice(paidUntil, created, new Date('2026-11-13T10:00:00.000Z'))
    expect(locked).toMatchObject({ tone: 'danger', state: 'expired' })
    expect(locked?.title).toMatch(/režimu samo za pregled/)
  })
})

describe('notice copy follows the monthly model and the honest activation time', () => {
  it('never says 30 days or promises access "as soon as the payment arrives"', () => {
    for (const day of ['2026-10-05', '2026-10-11', '2026-10-20']) {
      const notice = accessNotice(trialEnd, created, new Date(`${day}T10:00:00.000Z`))
      const text = `${notice?.title} ${notice?.detail}`
      expect(text).not.toMatch(/30 dana|čim uplata/)
    }
    expect(accessNotice(trialEnd, created, new Date('2026-10-05T10:00:00.000Z'))?.detail).toMatch(/za sledeći mesec/)
    expect(accessNotice(trialEnd, created, new Date('2026-10-20T10:00:00.000Z'))?.detail).toMatch(/najkasnije narednog radnog dana/)
  })
})

describe('notice punctuation', () => {
  it('never puts two periods after a date', () => {
    for (const day of ['2026-10-05', '2026-10-11', '2026-10-20']) {
      const notice = accessNotice(trialEnd, created, new Date(`${day}T10:00:00.000Z`))
      expect(notice?.title ?? '').not.toMatch(/\.\./)
    }
  })
})
