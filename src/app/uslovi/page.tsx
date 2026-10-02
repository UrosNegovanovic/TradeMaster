import type { Metadata } from 'next'
import { LegalDocument, LegalSection } from '@/components/landing/LegalDocument'
import { operator } from '@/lib/operator'
import { PRICING_OFFER } from '@/lib/landing-copy'

export const metadata: Metadata = {
  title: 'Uslovi',
  description:
    'Uslovi korišćenja TradeMaster-a: sken, lager, katalog i interna faktura. Prijava preko Clerk-a. Nije fiskalna kasa ni SEF.',
  alternates: { canonical: '/uslovi' },
}

export default function UsloviPage() {
  return (
    <LegalDocument title="Uslovi korišćenja" updated="Ažurirano 1. oktobra 2026.">
      <LegalSection title="Usluga">
        <p>
          TradeMaster je veb usluga za trgovce i malu veleprodaju: skeniranje
          robe, evidencija lagera, priprema kataloga i internih B2B faktura.
          Jedan nalog po firmi. Radi u pregledaču. Na telefonu možete dodati
          prečicu na početni ekran — to nije aplikacija iz App Store-a ni Google
          Play-a.
        </p>
        <p>
          Uslugu nudi {operator.name}, PIB {operator.pib}. Kontakt:{' '}
          {operator.email}, {operator.phone}. Adresa koju je vlasnik naveo je
          „{operator.address}“.
        </p>
      </LegalSection>

      <LegalSection title="Šta usluga nije">
        <p>
          TradeMaster ne zamenjuje fiskalnu kasu i ne šalje fakture u Sistem
          e-faktura (SEF). Interni zapisi robe, zaliha i B2B dokumenata ostaju u
          vašem nalogu. Koristite uslugu uz postojeću kasu i SEF, ne umesto
          njih.
        </p>
      </LegalSection>

      <LegalSection title="Nalog">
        <p>
          Registracija i prijava idu preko Clerk-a. Vi ste odgovorni za tačnost
          podataka koje unesete (asortiman, cene, podaci firme na katalogu i
          fakturi). Nalog je namenjen jednoj firmi.
        </p>
      </LegalSection>

      <LegalSection title="Naknada">
        <p>
          Aktuelna naknada: {PRICING_OFFER}, navedena na početnoj stranici. Po isteku plaćenog perioda aplikacija prelazi u režim samo za pregled do produženja pristupa.
          Nema pretplate ni checkout-a u aplikaciji — naplata je ručna,
          dogovorom. Nema skrivene cene pored te objavljene. Otkaz pretplate ne
          postoji dok nema pretplate.
        </p>
      </LegalSection>

      <LegalSection title="Vaši podaci u aplikaciji">
        <p>
          Proizvodi, količine, katalozi i fakture koje unesete pripadaju vašem
          nalogu. Javni katalog-link vidi ko ima adresu. Ne tvrdimo broj firmi
          ni korisnika.
        </p>
      </LegalSection>

      <LegalSection title="Dostupnost">
        <p>
          Usluga se nudi onako kako trenutno radi, za rani pristup. Nema
          garantovanog radnog vremena ni obećanja da svaka funkcija ostaje
          nepromenjena. TradeMaster radi online; offline rad nije dostupan.
        </p>
      </LegalSection>

      <LegalSection title="Izmene">
        <p>
          Ove uslove možemo da izmenimo. Datum na vrhu stranice je poslednje
          ažuriranje.
        </p>
      </LegalSection>
    </LegalDocument>
  )
}
