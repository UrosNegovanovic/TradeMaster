import type { Metadata } from 'next'
import { LegalDocument, LegalSection } from '@/components/landing/LegalDocument'
import { operator, operatorLegal, operatorLegalLine } from '@/lib/operator'

export const metadata: Metadata = {
  title: 'Privatnost',
  description:
    'Kako TradeMaster obrađuje podatke naloga, lagera, kataloga i faktura. Prijava ide preko Clerk-a.',
  alternates: { canonical: '/privatnost' },
}

export default function PrivatnostPage() {
  return (
    <LegalDocument title="Privatnost" updated="Ažurirano 10. oktobra 2026.">
      <LegalSection title="Šta je TradeMaster">
        <p>
          TradeMaster je veb aplikacija za trgovce i malu veleprodaju: skeniranje
          barkoda, evidencija lagera, katalozi i interne B2B fakture. Jedan nalog
          po firmi. Radi u pregledaču; na telefonu možete dodati prečicu na
          početni ekran.
        </p>
        <p>
          Operater usluge je {operator.name}, {operatorLegalLine(operatorLegal())}. Kontakt:{' '}
          {operator.email}, {operator.phone}.
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

      <LegalSection title="Mejlovi za naplatu (Resend)">
        <p>
          Predračun za korišćenje TradeMaster-a šaljemo mejlom preko servisa Resend, na mejl firme iz Podešavanja, a
          ako ga nema, na mejl kojim je nalog otvoren. Resend za to dobija adresu primaoca i sadržaj mejla (naziv
          firme, iznos, rok i link ka predračunu). Drugi mejlovi se preko njega ne šalju.
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

      <LegalSection title="Šta operater vidi">
        <p>
          Radi naplate i podrške operater ima pregled naloga: naziv i PIB firme, mejl kojim je nalog otvoren, datum
          otvaranja, stanje i rok pristupa, uplate i predračune za korišćenje TradeMaster-a, broj proizvoda i
          faktura i datum poslednje aktivnosti. U tom pregledu se ne prikazuju vaši proizvodi, kupci, katalozi ni
          fakture, kao ni cene i iznosi.
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
          Koristite ga uz postojeću kasu i SEF, ne umesto njih. Na ovoj
          marketing stranici ne koristimo poseban alat za merenje poseta ni
          oglasne piksele.
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
