# Prelazak sa Clerk Development na Clerk Production: povezivanje identiteta

Uputstvo za vlasnika uz `npm run clerk:link` (ROADMAP A0.3). Ceo plan prelaska (domen, proba na kopiji,
odobrenja, povratak) je u `docs/ROADMAP.md`, deo A0. Ovde je samo alat.

## Zašto alat postoji

Firma je `Profile` vezan za Clerk korisnika preko `clerkUserId`. U Production instanci svaki korisnik dobija
nov id, a korisnici se ne prenose između instanci. Ako se samo zamene ključevi, postojeći korisnik posle prijave
dobija novu praznu firmu, a stara ostaje bez vlasnika.

Alat menja `clerkUserId` postojećeg profila na novi id, i to samo za profile koje je vlasnik odobrio u popisu
naloga (A0.1). Ništa drugo se ne menja: proizvodi, dokumenti, katalozi, kupci, kretanja, uplate i fajlovi ostaju
na istom profilu.

## Pravila koja alat sprovodi

- Povezuje se samo profil sa odobrenog spiska, sa `PRENOSI SE = da`. Red bez klase ili odluke zaustavlja
  registraciju celog spiska, kao i profil otvoren posle popisa.
- Stvarnom nalogu se Production korisnik pravi **samo** sa verifikovanim mejlom starog naloga, pročitanim iz
  Development instance u trenutku pravljenja. Mejl se ne uzima iz tabele i ne može se zadati ručno.
- Vlasničkom, demo i testnom nalogu vlasnik može zadati drugi mejl (`--email`), jer njihove probne adrese
  (`+clerk_test`, `example.com`) ne rade u Production instanci.
- Ako u Production instanci već postoji korisnik sa tim mejlom koga alat nije napravio, alat ga ne dira: taj se
  slučaj rešava ručno, uz potvrdu identiteta drugim kanalom.
- Zamena id-ja je "samo ako je i dalje stari": ako je neko u međuvremenu promenio profil, red se odbija i ništa
  se ne menja. Jedan stari id ide na tačno jedan novi i obrnuto.
- Svaki korak se može ponoviti bez posledica i svaki pokazuje šta bi uradio; upisuje tek sa `--yes`.

## Koraci

Pre prvog upisa: migracija `supabase/migrations/20261012090000_clerk_identity_links.sql` primenjena uz odobrenje
vlasnika, i sveža rezervna kopija (A0.5).

| # | Komanda | Šta radi | Upisuje |
|---|---|---|---|
| 1 | `npm run clerk:link -- --list <popis.xlsx>` | Plan: šta bi bilo registrovano, šta nije odlučeno, šta je odbijeno i zašto; spisak profila koji nisu kupci (za `BILLING_EXCLUDE_PROFILE_IDS` i `PLATFORM_DEMO_PROFILE_IDS`) | Ništa |
| 2 | `... --list <popis.xlsx> --register --approved-by "<ime>" --yes` | Upisuje odobrenje: jedan red po profilu koji se prenosi | Tabela veza |
| 3 | `npm run clerk:link -- --create-users --yes` | Pravi korisnike u Clerk Production i upisuje njihov id uz red | Clerk Production, tabela veza |
| 4 | `npm run clerk:link -- --apply --yes` | Predaje firme novim identitetima | `profiles.clerkUserId`, tabela veza |
| - | `npm run clerk:link -- --status` | Gde je koji red i koji id profil trenutno ima | Ništa |
| - | `npm run clerk:link -- --revert --yes` | Vraća stare id-jeve (povratak, A0.10) | `profiles.clerkUserId`, tabela veza |

Dodaci: `--names` ispisuje i naziv firme; `--only <profileId>` ograničava `--apply` i `--revert` na jedan
profil; `--email <profileId>=<mejl>` zadaje mejl vlasničkom, demo ili testnom nalogu u koraku 3.

## Na koju bazu i koji Clerk

- Baza je `DATABASE_URL` iz `.env` (produkcija). Za probu na kopiji postaviti `IDENTITY_LINK_DATABASE_URL`;
  alat uvek prvo ispiše host baze.
- `CLERK_SECRET_KEY` mora biti ključ Development instance (`sk_test_`); iz nje se samo čita stari nalog.
- `CLERK_PRODUCTION_SECRET_KEY` (`sk_live_`) treba samo za korak 3. Ključ pogrešne vrste se odbija pre
  ijednog zahteva.

## Šta alat ne radi

- Ne menja ključeve u Vercelu, ne pravi Production instancu i ne dira DNS.
- Ne sprečava da `GET /api/profile` napravi novu firmu tokom prelaska; to je posebna zaštita (A0.4).
- Ne briše ništa: nalozi koji se ne prenose ostaju u bazi kakvi jesu.
- Ne rešava korisnika koji se sam registrovao na produkciji (put 2 iz ROADMAP-a); taj slučaj alat samo odbije.

## Stanje provere

Pravila i upisi su provereni testovima na test bazi (`src/lib/identity-link-db.db.test.ts`), a ceo tok komandi
na test bazi sa probnim spiskom. Pravljenje korisnika u Clerk Production je provereno samo protiv simuliranog
odgovora: prva stvarna provera je proba na kopiji (A0.6), kad Production instanca bude postojala.
