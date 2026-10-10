'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { profileSchema, type ProfileFormData } from '@/lib/validations'
import { profileSavePayload, toProfileFormValues } from '@/lib/profile-put'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import React from 'react'
import { ImageUpload } from '@/components/shared/ImageUpload'
import { notify } from '@/lib/notify'
import { PageHeader } from '@/components/layout/PageHeader'
import { SefSettingsCard } from '@/components/sef/SefSettingsCard'
import { SubscriptionDocuments } from '@/components/settings/SubscriptionDocuments'
import { useAuthorizedFetch } from '@/lib/use-authorized-fetch'
import type { SessionFetch } from '@/lib/authorized-fetch'
import type { Profile } from '@/types/profile'
import { ACCESS_ACTIVATION, BILLING_PERIOD_RULE, MONTHLY_PRICE, PRICING_OFFER } from '@/lib/landing-copy'
import { ACCESS_WARNING_DAYS, accessStatus, formatAccessDate, formatDaysLeft } from '@/lib/access-period'
import { accessNotice } from '@/lib/access-notice'
import { billingMailto, billingWhatsApp } from '@/lib/billing-request'
import { sr } from '@/lib/ui-copy'
import { PIB_LENGTH, REGISTRATION_NUMBER_LENGTH, digitsOnly } from '@/lib/company-fields'

async function fetchProfile() {
  const response = await fetch('/api/profile')
  if (!response.ok) {
    throw new Error('Failed to fetch profile')
  }
  return response.json()
}

async function updateProfile(data: ProfileFormData, request: SessionFetch) {
  const response = await request('/api/profile', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update profile')
  }

  return response.json()
}

export default function SettingsPage() {
  const queryClient = useQueryClient()
  const request = useAuthorizedFetch()

  // Fetch profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: fetchProfile,
  })

  const [logoUploading, setLogoUploading] = React.useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    // Show a field's error when the user leaves it, then update it while typing.
    mode: 'onTouched',
    defaultValues: toProfileFormValues(profile),
    shouldUnregister: false,
  })

  const mutation = useMutation({
    mutationFn: (data: ProfileFormData) => updateProfile(data, request),
    onSuccess: (saved: Profile) => {
      queryClient.setQueryData(['profile'], saved)
      reset(toProfileFormValues(saved))
      notify.success('Podaci su sačuvani', {
        description: 'Podaci o firmi su ažurirani.',
      })
    },
    onError: (error: Error) => {
      notify.error('Čuvanje nije uspelo', {
        description: error.message || 'Pokušajte ponovo.',
      })
    },
  })

  React.useEffect(() => {
    register('logoUrl')
  }, [register])

  // Keep a dirty uploaded logo when profile refetch would otherwise wipe it.
  React.useEffect(() => {
    if (profile) {
      reset(toProfileFormValues(profile), { keepDirtyValues: true })
    }
  }, [profile, reset])

  const logoUrl = watch('logoUrl')

  const onSubmit = (data: ProfileFormData) => {
    mutation.mutate(profileSavePayload({ ...data, logoUrl: data.logoUrl ?? logoUrl }))
  }

  const onInvalid = () => {
    notify.error('Podaci nisu sačuvani', { description: 'Ispravite polja označena crvenom bojom.' })
  }

  const digitsField = (name: 'pib' | 'registrationNumber') =>
    register(name, {
      onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
        const digits = digitsOnly(event.target.value)
        if (digits !== event.target.value) setValue(name, digits, { shouldValidate: true })
      },
    })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        className="mb-6"
        title="Podešavanja"
        description="Podaci o firmi i kontakt"
      />

      {/* Billing (manual until in-app payment exists): state, deadline and how to pay. Banner links here. */}
      <Card id="pristup" className="mb-6 scroll-mt-20">
        <CardHeader>
          <CardTitle>Pristup i uplata</CardTitle>
          <CardDescription>{PRICING_OFFER}. Naplata je ručna, preko predračuna. {BILLING_PERIOD_RULE}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {(() => {
            const status = accessStatus(profile?.accessExpiresAt)
            if (status.state === 'unlimited' || !status.untilYmd) return <p>Pristup nije vremenski ograničen.</p>
            const notice = accessNotice(profile?.accessExpiresAt, profile?.createdAt)
            const date = formatAccessDate(status.untilYmd)
            return notice ? (
              <div
                className={
                  notice.tone === 'danger'
                    ? 'rounded-md border border-destructive/40 bg-destructive/10 p-3'
                    : 'rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-950'
                }
              >
                <p className="font-semibold">{notice.title}</p>
                <p className="mt-1">{notice.detail}</p>
              </div>
            ) : (
              <p>
                Pristup važi do <span className="font-medium">{date}</span> (ističe {formatDaysLeft(status.daysLeft ?? 0)}).
              </p>
            )
          })()}
          <div className="space-y-2">
            <p className="font-medium">Kako da platite</p>
            <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
              <li>Predračun sa IPS QR kodom stiže na mejl firme {ACCESS_WARNING_DAYS} dana pre isteka (mejl iz ovih Podešavanja, a ako ga nema, mejl naloga). Možete ga zatražiti i ranije.</li>
              <li>Uplatite {MONTHLY_PRICE} u dinarima po srednjem kursu NBS na dan predračuna, sa pozivom na broj sa predračuna.</li>
              <li>{ACCESS_ACTIVATION} Javljamo vam do kog datuma važi.</li>
            </ol>
            <div className="flex flex-col gap-2 pt-1 sm:flex-row">
              <Button asChild className="min-h-11">
                <a href={billingMailto(profile)}>Zatraži predračun mejlom</a>
              </Button>
              {billingWhatsApp(profile) ? (
                <Button asChild variant="outline" className="min-h-11">
                  <a href={billingWhatsApp(profile)!} target="_blank" rel="noopener noreferrer">
                    WhatsApp
                  </a>
                </Button>
              ) : null}
            </div>
          </div>
          <SubscriptionDocuments />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Podaci o firmi</CardTitle>
          <CardDescription>
            Naziv, PIB, žiro-račun, kontakt i logo koji idu na katalog i fakturu
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6" noValidate>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="companyName">
                  Naziv firme <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="companyName"
                  placeholder="Unesite naziv firme"
                  {...register('companyName')}
                />
                {errors.companyName && (
                  <p className="text-sm text-destructive">
                    {errors.companyName.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="pib">
                  PIB <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="pib"
                  inputMode="numeric"
                  maxLength={PIB_LENGTH}
                  placeholder="9 cifara"
                  aria-invalid={Boolean(errors.pib)}
                  {...digitsField('pib')}
                />
                {errors.pib && (
                  <p className="text-sm text-destructive">
                    {errors.pib.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="registrationNumber">
                  Matični broj <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="registrationNumber"
                  inputMode="numeric"
                  maxLength={REGISTRATION_NUMBER_LENGTH}
                  placeholder="8 cifara"
                  aria-invalid={Boolean(errors.registrationNumber)}
                  {...digitsField('registrationNumber')}
                />
                {errors.registrationNumber && (
                  <p className="text-sm text-destructive">
                    {errors.registrationNumber.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">8 cifara, sa rešenja APR-a. Potreban za XML fakture za SEF.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactEmail">Email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  placeholder="kontakt@firma.rs"
                  {...register('contactEmail')}
                />
                {errors.contactEmail && (
                  <p className="text-sm text-destructive">
                    {errors.contactEmail.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactPhone">Telefon</Label>
                <Input
                  id="contactPhone"
                  type="tel"
                  placeholder="+381 11 123 4567"
                  {...register('contactPhone')}
                />
                {errors.contactPhone && (
                  <p className="text-sm text-destructive">
                    {errors.contactPhone.message}
                  </p>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="giroAccount">
                  Žiro-račun <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="giroAccount"
                  placeholder="npr. 160-0000000123456-54"
                  {...register('giroAccount')}
                />
                {errors.giroAccount && (
                  <p className="text-sm text-destructive">
                    {errors.giroAccount.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Broj računa za uplatu koji ide na fakturu.
                </p>
              </div>

              {/* ROADMAP A9.22: defaults for new invoices and predračuni. */}
              <div className="space-y-2">
                <Label htmlFor="defaultPaymentDays">Podrazumevani rok plaćanja (dana)</Label>
                <Input
                  id="defaultPaymentDays"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={365}
                  step={1}
                  placeholder="30"
                  {...register('defaultPaymentDays', { setValueAs: (value) => (value === '' ? null : Number(value)) })}
                />
                {errors.defaultPaymentDays && (
                  <p className="text-sm text-destructive">{errors.defaultPaymentDays.message}</p>
                )}
                <p className="text-xs text-muted-foreground">Rok na novim dokumentima; prazno = 30 dana.</p>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="invoiceNote">Napomena na fakturi</Label>
                <textarea
                  id="invoiceNote"
                  rows={3}
                  maxLength={1000}
                  placeholder="npr. Reklamacije u roku od 8 dana. Roba ostaje vlasništvo prodavca do uplate."
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  {...register('invoiceNote')}
                />
                {errors.invoiceNote && <p className="text-sm text-destructive">{errors.invoiceNote.message}</p>}
                <p className="text-xs text-muted-foreground">
                  Upisuje se u svaku novu fakturu i predračun, gde je možete izmeniti. Već izdati dokumenti se ne menjaju.
                </p>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label
                  htmlFor="inVatSystem"
                  className="flex cursor-pointer items-start gap-3 text-sm font-medium"
                >
                  <input
                    id="inVatSystem"
                    type="checkbox"
                    className="mt-0.5 h-4 w-4"
                    {...register('inVatSystem')}
                  />
                  <span>
                    Firma je u sistemu PDV-a
                    <span className="mt-1 block text-xs font-normal text-muted-foreground">
                      Nove fakture imaju osnovicu, PDV (20%, 10% ili bez PDV) i ukupno za uplatu.
                      Već izdate fakture se ne menjaju.
                    </span>
                  </span>
                </label>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">
                  Adresa <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="address"
                  placeholder={sr.address.placeholder}
                  {...register('address')}
                />
                {errors.address && (
                  <p className="text-sm text-destructive">
                    {errors.address.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">{sr.address.sefHint}</p>
              </div>

              <div className="space-y-2 md:col-span-2">
                <ImageUpload
                  value={logoUrl}
                  onChange={(url) =>
                    setValue('logoUrl', url ?? '', {
                      shouldValidate: true,
                      shouldDirty: true,
                      shouldTouch: true,
                    })
                  }
                  onUploadingChange={setLogoUploading}
                  bucket="merchant-logos"
                  label="Logo firme"
                  description="PNG, JPG ili GIF. Maksimalno 5 MB."
                />
                {errors.logoUrl && (
                  <p className="text-sm text-destructive">
                    {errors.logoUrl.message}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-4">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => reset(toProfileFormValues(profile))}
                disabled={mutation.isPending || logoUploading}
              >
                Poništi
              </Button>
              <Button
                type="submit"
                className="w-full sm:w-auto"
                disabled={mutation.isPending || logoUploading}
              >
                {mutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Sačuvaj
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <SefSettingsCard />
    </div>
  )
}
