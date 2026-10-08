import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalDocument, LegalSection } from '@/components/landing/LegalDocument'
import { operator } from '@/lib/operator'
import { cookieStatement, currentProcessingFlags, subprocessors } from '@/lib/data-processing'

export const metadata: Metadata = {
  title: 'Privatnost',
  description:
    'Kako TradeMaster obrađuje podatke naloga, lagera, kataloga i faktura. Prijava ide preko Clerk-a.',
  alternates: { canonical: '/privatnost' },
}

export default function PrivatnostPage() {
  const flags = currentProcessingFlags()
  const processors = subprocessors(flags)
  return (
    <LegalDocument title="Privatnost" updated="Ažurirano 8. oktobra 2026.">
      <LegalSection title="Šta je TradeMaster">
        <p>
          TradeMaster je veb aplikacija za trgovce i malu veleprodaju: skeniranje
          barkoda, evidencija lagera, katalozi i interne B2B fakture. Jedan nalog
          po firmi. Radi u pregledaču; na telefonu možete dodati prečicu na
          početni ekran.
        </p>
        <p>
          Operater usluge je {operator.name}, PIB {operator.pib}. Kontakt:{' '}
          {operator.email}, {operator.phone}. Adresa koju je vlasnik naveo je
          „{operator.address}“.
        </p>
      </LegalSection>

      <LegalSection title="Prijava preko Clerk-a">
        <p>
          Registracija i prijava rade preko Clerk-a. Clerk prima podatke koje
          unesete pri otvaranju naloga (npr. e-poštu) i postavlja kolačiće
          potrebne da ostanete prijavljeni. TradeMaster čuva vezu tog naloga
          (Clerk korisnički ID) sa podacima firme u aplikaciji.
        </p>
      </LegalSection>

      <LegalSection title="Šta čuvamo u aplikaciji">
        <p>
          Ako otvorite nalog, u Podešavanjima možete uneti podatke svoje firme
          (naziv, PIB, kontakt, adresa, logo) — to su vaši podaci za katalog i
          fakturu, ne podaci izdavača TradeMaster-a. Čuvamo i asortiman,
          količine, kretanja robe, kataloge i fakture koje unesete, kao i slike
          koje otpremite.
        </p>
      </LegalSection>

      <LegalSection title="Kamera">
        <p>
          Kamera se koristi samo u aplikaciji, kada vi pokrenete skeniranje
          barkoda. Pristup se traži od pregledača. Nije video-nadzor i nije
          uključena van skena.
        </p>
      </LegalSection>

      <LegalSection title="Pretraga barkoda">
        <p>
          Ako artikal nije u vašem asortimanu, sistem može da potraži javne baze
          proizvoda (Open Food Facts, Open Beauty Facts, Open Products Facts i
          UPCitemdb) po barkodu, da predloži naziv i sliku. Predlog možete
          izmeniti pre čuvanja. Nije svaki barkod u bazi.
        </p>
      </LegalSection>

      <LegalSection title="Javni katalog">
        <p>
          Katalog možete podeliti PDF-om ili linkom. Ko ima adresu linka, vidi
          pregled bez prijave.
        </p>
      </LegalSection>

      <LegalSection title="Šta ne radimo">
        <p>
          TradeMaster ne zamenjuje fiskalnu kasu i ne šalje fakture u SEF.
          Koristite ga uz postojeću kasu i SEF, ne umesto njih. Ne prodajemo
          podatke i ne koristimo oglasne piksele.
        </p>
      </LegalSection>

      <LegalSection title="Kolačići i merenje">
        <p>{cookieStatement(flags)}</p>
        {flags.sentry ? (
          <p>
            Tehničke greške prijavljujemo servisu Sentry bez podataka o
            korisniku, kolačića i sadržaja zahteva, da bismo ih brže ispravili.
          </p>
        ) : null}
      </LegalSection>

      <LegalSection title="Ko obrađuje podatke za nas">
        <ul className="list-disc space-y-1 pl-5">
          {processors.map((processor) => (
            <li key={processor.name}>
              <strong>{processor.name}</strong>: {processor.purpose}. Lokacija: {processor.location}.
            </li>
          ))}
        </ul>
        <p>
          Za podatke vaših kupaca koje unesete vaša firma je rukovalac, a mi
          obrađivač; uslovi te obrade su u odeljku „Obrada podataka o ličnosti“
          u <Link href="/uslovi" className="underline">Uslovima korišćenja</Link>.
        </p>
      </LegalSection>

      <LegalSection title="Zahtevi u vezi sa podacima">
        <p>
          Podaci ostaju dok nalog postoji. Za uvid ili brisanje pišite na{' '}
          {operator.email}.
        </p>
      </LegalSection>
    </LegalDocument>
  )
}
