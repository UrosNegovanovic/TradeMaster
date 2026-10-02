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
import { useAuthorizedFetch } from '@/lib/use-authorized-fetch'
import type { SessionFetch } from '@/lib/authorized-fetch'
import type { Profile } from '@/types/profile'
import { PRICING_OFFER } from '@/lib/landing-copy'
import { accessStatus, formatAccessDate, formatDaysLeft } from '@/lib/access-period'

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

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Pristup</CardTitle>
          <CardDescription>{PRICING_OFFER}. Naplata je ručna, računom.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm">
          {(() => {
            const status = accessStatus(profile?.accessExpiresAt)
            if (status.state === 'unlimited' || !status.untilYmd) return <p>Pristup nije vremenski ograničen.</p>
            const date = formatAccessDate(status.untilYmd)
            return status.state === 'expired' ? (
              <p>
                Period pristupa je istekao <span className="font-medium">{date}</span>.
              </p>
            ) : (
              <p>
                Pristup važi do <span className="font-medium">{date}</span> (ističe {formatDaysLeft(status.daysLeft ?? 0)}).
              </p>
            )
          })()}
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
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="companyName">Naziv firme</Label>
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
                <Label htmlFor="pib">PIB</Label>
                <Input
                  id="pib"
                  placeholder="Unesite PIB"
                  {...register('pib')}
                />
                {errors.pib && (
                  <p className="text-sm text-destructive">
                    {errors.pib.message}
                  </p>
                )}
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
                <Label htmlFor="giroAccount">Žiro-račun</Label>
                <Input
                  id="giroAccount"
                  placeholder="npr. 160-0000000000000-00"
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
                <Label htmlFor="address">Adresa</Label>
                <Input
                  id="address"
                  placeholder="Unesite adresu firme"
                  {...register('address')}
                />
                {errors.address && (
                  <p className="text-sm text-destructive">
                    {errors.address.message}
                  </p>
                )}
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
    </div>
  )
}
