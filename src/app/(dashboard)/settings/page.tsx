'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { profileSchema, type ProfileFormData } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import React from 'react'
import { ImageUpload } from '@/components/shared/ImageUpload'
import { notify } from '@/lib/notify'
import { PageHeader } from '@/components/layout/PageHeader'

async function fetchProfile() {
  const response = await fetch('/api/profile')
  if (!response.ok) {
    throw new Error('Failed to fetch profile')
  }
  return response.json()
}

async function updateProfile(data: ProfileFormData) {
  const response = await fetch('/api/profile', {
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

  // Fetch profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: fetchProfile,
  })

  // Update profile mutation
  const mutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
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

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      companyName: profile?.companyName ?? '',
      contactEmail: profile?.contactEmail ?? '',
      contactPhone: profile?.contactPhone ?? '',
      address: profile?.address ?? '',
      pib: profile?.pib ?? '',
      logoUrl: profile?.logoUrl ?? '',
    },
  })

  // Reset form when profile data loads
  React.useEffect(() => {
    if (profile) {
      reset({
        companyName: profile.companyName ?? '',
        contactEmail: profile.contactEmail ?? '',
        contactPhone: profile.contactPhone ?? '',
        address: profile.address ?? '',
        pib: profile.pib ?? '',
        logoUrl: profile.logoUrl ?? '',
      })
    }
  }, [profile, reset])

  const onSubmit = (data: ProfileFormData) => {
    mutation.mutate(data)
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

      <Card>
        <CardHeader>
          <CardTitle>Podaci o firmi</CardTitle>
          <CardDescription>
            Naziv, PIB, kontakt i logo koji idu na katalog i fakturu
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
                  value={watch('logoUrl')}
                  onChange={(url) => setValue('logoUrl', url ?? null, { shouldValidate: true })}
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
                onClick={() => reset()}
                disabled={mutation.isPending}
              >
                Poništi
              </Button>
              <Button type="submit" className="w-full sm:w-auto" disabled={mutation.isPending}>
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
