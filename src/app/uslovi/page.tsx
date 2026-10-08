import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalDocument, LegalSection } from '@/components/landing/LegalDocument'
import { operator } from '@/lib/operator'
import { PRICING_OFFER } from '@/lib/landing-copy'
import { currentProcessingFlags, subprocessorStatus, subprocessors } from '@/lib/data-processing'

export const metadata: Metadata = {
  title: 'Uslovi',
  description:
    'Uslovi korišćenja TradeMaster-a: sken, lager, katalog i interna faktura. Prijava preko Clerk-a. Nije fiskalna kasa ni SEF.',
  alternates: { canonical: '/uslovi' },
}

export default function UsloviPage() {
  const processors = subprocessors(currentProcessingFlags())
  return (
    <LegalDocument title="Uslovi korišćenja" updated="Ažurirano 8. oktobra 2026.">
      <LegalSection title="Usluga">
        <p>
          TradeMaster je veb usluga za trgovce i malu veleprodaju: skeniranje
          robe, evidencija lagera, priprema kataloga i internih B2B faktura.
          Jedan nalog po firmi. Radi u pregledaču. Na telefonu možete dodati
          prečicu na početni ekran — to nije aplikacija iz App Store-a ni Google
          Play-a.
        </p>
        <p>
          Uslugu nudi {operator.name}, PIB {operator.pib}
          {operator.registrationNumber ? `, matični broj ${operator.registrationNumber}` : ''}. Sedište:{' '}
          {operator.address}. Kontakt: {operator.email}, {operator.phone}.
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

      <LegalSection title="Obrada podataka o ličnosti (ugovor o obradi)">
        <p>
          U podatke koje unesete u TradeMaster spadaju i podaci o ličnosti
          drugih ljudi: ime i adresa kupca, PIB preduzetnika, kontakt osobe na
          katalogu i fakturi. Za te podatke vaša firma je <strong>rukovalac</strong>,
          a {operator.name} je <strong>obrađivač</strong> u smislu Zakona o
          zaštiti podataka o ličnosti (ZZPL). Ovaj odeljak je ugovor o obradi
          između vas i nas i važi dok koristite uslugu. Podatke za prijavu na
          vaš nalog obrađujemo kao rukovalac; to je opisano u{' '}
          <Link href="/privatnost" className="underline">Obaveštenju o privatnosti</Link>.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Predmet i svrha:</strong> čuvanje i prikaz podataka koje
            unesete, izrada kataloga, predračuna, faktura, otpremnica i izvoza,
            i deljenje linka koji vi uključite. Podatke ne koristimo ni za šta
            drugo, ne prodajemo ih i ne šaljemo ih oglašivačima.
          </li>
          <li>
            <strong>Vrste podataka i lica:</strong> identifikacioni i kontakt
            podaci vaših kupaca i njihovih kontakt osoba (naziv, adresa, PIB,
            matični broj, telefon, e-pošta) i stavke i iznosi dokumenata.
          </li>
          <li>
            <strong>Uputstva:</strong> obrađujemo podatke samo onako kako vi
            radite u aplikaciji (unos, izmena, deljenje, brisanje) ili kako
            nam pismeno naložite, osim ako zakon ne nalaže drugačije. Ako
            smatramo da vaše uputstvo krši zakon, odmah vas obaveštavamo.
          </li>
          <li>
            <strong>Poverljivost:</strong> od ljudi pristup podacima ima samo{' '}
            {operator.name}, i to kada je potrebno za podršku koju tražite,
            ispravku greške ili kada to nalaže zakon. Sva lica sa pristupom su
            obavezana na poverljivost.
          </li>
          <li>
            <strong>Bezbednost:</strong> šifrovana veza (HTTPS), prijava preko
            Clerk-a, svaki upit u bazi je ograničen na vaš nalog, javni linkovi
            se mogu opozvati i ne prikazuju nabavne cene ni stanje lagera,
            otpremljene slike se proveravaju, a zahtevi su ograničeni protiv
            zloupotrebe.
          </li>
          <li>
            <strong>Povreda podataka:</strong> ako saznamo za povredu koja se
            tiče vaših podataka, obavestićemo vas bez nepotrebnog odlaganja, uz
            ono što znamo o obimu i preduzetim merama, da biste mogli da
            ispunite svoje obaveze prema Povereniku i licima.
          </li>
          <li>
            <strong>Pomoć rukovaocu:</strong> prema prirodi obrade i
            informacijama koje imamo, pomažemo vam oko bezbednosti obrade,
            obaveštavanja o povredi podataka i procene uticaja na zaštitu
            podataka.
          </li>
          <li>
            <strong>Prava lica:</strong> pomažemo vam da odgovorite na zahtev
            lica (uvid, ispravka, brisanje): podatke možete sami izmeniti ili
            obrisati u aplikaciji i izvesti fakture u CSV/XLSX; za ostalo pišite
            na {operator.email}.
          </li>
          <li>
            <strong>Kraj korišćenja:</strong> po prestanku korišćenja birate
            da li vam podatke vraćamo (izvoz) ili ih brišemo. Posle isteka
            pristupa nalog ostaje dostupan samo za pregled i izvoz. Na vaš
            zahtev brišemo podatke naloga u roku od 30 dana. Ako pristup nije
            produžen 12 meseci posle isteka, šaljemo poruku na e-poštu naloga i
            posle 30 dana brišemo podatke. Obrisani podaci nestaju iz rezervnih
            kopija najkasnije 30 dana posle brisanja.
          </li>
          <li>
            <strong>Podobrađivači:</strong> koristimo dobavljače navedene ispod,
            sa kojima imamo ugovore o obradi. Ti ugovori ih obavezuju na iste
            obaveze zaštite podataka koje mi imamo prema vama. O novom podobrađivaču
            vas obaveštavamo na ovoj stranici pre nego što počne da obrađuje
            vaše podatke; ako se ne slažete, možete prestati da koristite uslugu
            i izvesti podatke.
          </li>
          <li>
            {/* TODO(A2.10, posle pravnika): osnov prenosa u SAD (čl. 64/65 ZZPL, npr. standardne
                ugovorne klauzule Poverenika) dodati tek kada ga možemo pokazati. */}
            <strong>Gde su podaci:</strong> podaci vaših kupaca su u bazi u EU
            (Irska) i obrađuju se na Vercel serverskim funkcijama u Dablinu.
            Vercel Inc. je kompanija iz SAD i može imati pristup radi rada
            usluge (logovi, podrška), na osnovu svog ugovora o obradi.
          </li>
          <li>
            <strong>Provera:</strong> na zahtev vam dajemo informacije potrebne
            da proverite da poštujemo ovaj odeljak.
          </li>
        </ul>
        <p>Podobrađivači:</p>
        <ul className="list-disc space-y-1 pl-5">
          {processors.map((processor) => (
            <li key={processor.name}>
              <strong>{processor.name}</strong>: {processor.purpose}. Lokacija: {processor.location}. Status:{' '}
              {subprocessorStatus(processor)}.
            </li>
          ))}
        </ul>
        <p>
          Kada artikal nije u vašem asortimanu, skener može da pošalje samo
          barkod javnim bazama proizvoda (Open Food Facts, Open Beauty Facts,
          Open Products Facts, UPCitemdb). Njima ne šaljemo podatke o ličnosti.
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
