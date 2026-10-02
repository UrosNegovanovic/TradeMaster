import { describe, expect, it } from 'vitest'
import { profilePutFields, profileSavePayload, toProfileFormValues } from './profile-put'
import { profileSchema } from './validations'

const stored =
  'https://abc.supabase.co/storage/v1/object/public/merchant-logos/p/logo.jpg'

const base = {
  companyName: 'T&G Nest',
  contactEmail: 'uros@example.com',
  contactPhone: '+381',
  address: 'Kralja Petra I',
  pib: '123124121',
  giroAccount: '',
}

describe('toProfileFormValues', () => {
  it('maps a stored logo into the settings form and drops preview-only srcs', () => {
    expect(toProfileFormValues({ ...base, logoUrl: stored }).logoUrl).toBe(stored)
    expect(toProfileFormValues({ ...base, logoUrl: null }).logoUrl).toBe('')
    expect(toProfileFormValues({ ...base, logoUrl: 'data:image/png;base64,aaa' }).logoUrl).toBe('')
  })
})

describe('profilePutFields', () => {
  it('omits logoUrl when the client did not send one so an existing logo stays', () => {
    const validated = profileSchema.parse(base)
    expect(validated.logoUrl).toBeUndefined()
    expect(profilePutFields(validated, base)).not.toHaveProperty('logoUrl')
    expect(profilePutFields(validated, base).companyName).toBe('T&G Nest')
    expect(profilePutFields(validated, base).giroAccount).toBeNull()
  })

  it('writes a public upload URL and an explicit clear', () => {
    const withUrl = profileSchema.parse({ ...base, logoUrl: stored })
    expect(profilePutFields(withUrl, { ...base, logoUrl: stored }).logoUrl).toBe(stored)

    const cleared = profileSchema.parse({ ...base, logoUrl: '' })
    expect(profilePutFields(cleared, { ...base, logoUrl: '' }).logoUrl).toBeNull()

    const nulled = profileSchema.parse({ ...base, logoUrl: null })
    expect(profilePutFields(nulled, { ...base, logoUrl: null }).logoUrl).toBeNull()
  })

  it('does not persist a FileReader data URL as logoUrl', () => {
    const preview = 'data:image/png;base64,aaa'
    const validated = profileSchema.parse({ ...base, logoUrl: preview })
    expect(profilePutFields(validated, { ...base, logoUrl: preview })).not.toHaveProperty('logoUrl')
  })
})

describe('profileSavePayload', () => {
  it('keeps a stored URL on Sačuvaj and omits a blob-only preview', () => {
    expect(profileSavePayload({ ...base, logoUrl: stored }).logoUrl).toBe(stored)
    expect(profileSavePayload({ ...base, logoUrl: '' }).logoUrl).toBeNull()
    expect(profileSavePayload({ ...base, logoUrl: 'blob:https://app.local/1' })).not.toHaveProperty(
      'logoUrl'
    )
  })
})

describe('inVatSystem', () => {
  it('is written only when the client sent it, so an older client cannot reset the setting', () => {
    const withoutFlag = profileSchema.parse(base)
    expect(profilePutFields(withoutFlag, base)).not.toHaveProperty('inVatSystem')

    const on = { ...base, inVatSystem: true }
    expect(profilePutFields(profileSchema.parse(on), on).inVatSystem).toBe(true)

    const off = { ...base, inVatSystem: false }
    expect(profilePutFields(profileSchema.parse(off), off).inVatSystem).toBe(false)
  })

  it('defaults to false in the settings form', () => {
    expect(toProfileFormValues(null).inVatSystem).toBe(false)
    expect(toProfileFormValues({ inVatSystem: true }).inVatSystem).toBe(true)
  })
})
