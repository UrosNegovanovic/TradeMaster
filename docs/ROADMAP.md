# Plan do lansiranja i prvih kupaca

Cilj: javno lansiranje 1. novembra 2026 na sopstvenom domenu, zatim prvih 10 firmi koje plaćaju. Stanje koda i baze provereno 2026-10-06; tekući blokeri su u `docs/STATUS.md`, marketing i cena u Claude Doc-u "TradeMaster: prodaja, marketing i AI do lansiranja".

Ocena: **vrednost** = koliko pomaže prodaji/zadržavanju, **trud** = S (do 1 dan), M (2-3 dana), L (nedelja+).

## Kome prodajemo (predlog, vlasnik još nije potvrdio)

Firme i preduzetnici sa 1-10 ljudi koji prodaju robu **drugim firmama**: mala veleprodaja (piće, kozmetika, potrošni materijal, autodelovi), uvoznici koji snabdevaju radnje, mali proizvođači, komercijalisti na terenu. Danas rade u Excelu, Wordu i preko WhatsApp-a.

- Van PDV sistema: TradeMaster pokriva ceo posao, faktura je dovoljna bez SEF-a.
- U PDV sistemu: lager, katalog, predračun i otpremnica odmah; konačna faktura ide u SEF (danas ručno preko XML-a, posle tačke B1 jednim klikom).
- Ne ciljamo: maloprodaju kojoj treba fiskalna kasa, prodaju građanima preko Instagrama (traži fiskalni račun), firme kojima je potrebno više korisnika dok ne postoji B3.

Glavna poruka: **ceo posao sa robom iz telefona**. Komercijalista kod kupca otvori katalog, napravi predračun, pošalje ga na WhatsApp, kupac plati skeniranjem IPS QR koda.

## Šta je urađeno (2026-10-06)

| # | Šta | PR |
|---|---|---|
| 1 | PDV na fakturi (20/10/0, snimak stope po stavci) | #53 |
| 2 | Onboarding "Prvi koraci" i prazna stanja | #54 |
| 3 | Deljenje fakture i kataloga (opozivi link, WhatsApp/Viber, mejl) | #55 |
| K | Napredni katalog (raspored, grupisanje, redosled, "Cena na upit", PDF sa č/ć/đ) | #56 |
| 4 | Lista kupaca | #57 |
| 5 | Izvoz faktura za knjigovođu (CSV/XLSX) | #58 |
| 6 | IPS QR na fakturi | #59 |
| 7 | Upozorenja: niska zaliha, "Kasni naplata" | #60 |
| 8 | Analitika i Sentry (isključeni dok se ne postave env varijable) | - |
| 9 | Probni period 60 dana, posle toga samo pregled (ručna naplata) | - |
| P | Predračun, otpremnica, XML za SEF (ručno učitavanje) | #70, #71 |
| D | Dizajn: srpska prijava, boje statusa, landing prodaje fakturu, kartica cene | #68, #69 |

Migracije `invoice_document_type` i `registration_numbers` su primenjene u produkciji 2026-10-05 (provereno u Supabase listi migracija 2026-10-06). Baza je u `eu-west-1`, Vercel funkcije u `dub1` (EU).

## Faza A: pre lansiranja (do 31. oktobra)

Bez novih velikih funkcija. Cilj je da prvi kupac ne naiđe ni na jednu grešku i da veruje stranici.

### A1. Na vlasniku (blokira sve ostalo)

| # | Šta | Zašto |
|---|---|---|
| A1.1 | Kupiti domen, povezati ga na Vercel, `NEXT_PUBLIC_APP_URL` | Clerk Production, kanonski URL, sitemap, mejl |
| A1.2 | Clerk Production (`pk_live_`) na domenu; proći registraciju i prijavu sa 2FA do kraja | Development ključevi nisu za prave korisnike |
| A1.3 | Pravi podaci operatera u `src/lib/operator.ts` (naziv, PIB od 9 cifara, adresa) | /uslovi i /privatnost sada imaju `12312412312` i "test" |
| A1.4 | `docs/device-checklist.md` na Android i iPhone telefonu; IPS QR skeniran pravom bankarskom aplikacijom | Skener i QR su glavne scene u reklami |
| A1.5 | XML za SEF učitan na SEF demo okruženju | Dok ne prođe, ne pominjati na landingu |
| A1.6 | U Vercelu: `NEXT_PUBLIC_ANALYTICS=on`, `NEXT_PUBLIC_SENTRY_DSN`, Upstash ključevi; uključiti Web Analytics | Bez toga ne znamo gde ljudi odustaju |
| A1.7 | Probno vraćanje Supabase backupa na test projekat | Prvo pitanje ozbiljnog kupca: "šta ako izgubim podatke" |
| A1.8 | Odluka o ceni (20 € ili predlog 1.990 RSD + osnivačka ponuda) i kontakt za podršku (telefon/WhatsApp) | Ulazi u landing |

### A2. Kod (mali PR-ovi, po redu)

| # | Funkcija | Vrednost | Trud | Napomena |
|---|---|---|---|---|
| A2.1 | **Landing: poverenje i dokaz**: sekcija "Ko stoji iza" sa kontaktom (WhatsApp/Viber, telefon) i u footeru; dugmad "Otvori primer kataloga" i "Otvori primer fakture" (javni linkovi demo firme sa izmišljenim podacima); predračun i otpremnica u sekciji o fakturi i u `pricingIncludes`; jedan ton ("vi"); FAQ o instalaciji usklađen sa dugmetom "Instaliraj aplikaciju" | Visoka | S-M | Bez novih tvrdnji koje ne postoje. FAQ o SEF-u menjati tek posle A1.5. |
| A2.2 | **Landing: "Ceo posao iz telefona"** sekcija sa tokom komercijaliste (katalog → predračun → WhatsApp → IPS QR), i demo video 60-90 s sa glasom | Visoka | M | Video snima vlasnik; kod samo menja izvor u `LandingDemo`. |
| A2.3 | **Test izolacije tenanta**: firma A ne može da čita ni menja proizvode, fakture, kupce, kataloge i kretanja firme B (DB test pored `catalog-access.db.test.ts`) | Visoka | S-M | Bezbednost; danas postoji samo za katalog. |
| A2.4 | **Ulaz/Izlaz bez trke**: `POST /api/stock-movements` čita količinu van transakcije i upisuje apsolutnu vrednost; dva istovremena zahteva gube jedan upis. Uslovni `decrement`/`increment` u transakciji | Srednja | S | Pravila u `docs/stock-invoice-rules.md`. |
| A2.5 | **Skener pišti pre snimanja**: `BarcodeScanner.tsx` pušta zvuk na svako čitanje, a `docs/scanner-ux-rules.md` kaže da zvuk pušta samo `QuickScanButton` posle snimanja | Srednja | S | Ovo je greška po pravilima, pa je izmena dozvoljena; samo zvuk, bez refaktora. |
| A2.6 | **Ugovor o obradi podataka i kolačići**: DPA odeljak u /uslovi, kratko obaveštenje o kolačićima ako je analitika uključena | Srednja | S | Tekst da pregleda pravnik ili knjigovođa. |
| A2.7 | Stranice po delatnosti (veleprodaja, paušalci koji prodaju robu, proizvođači), sitemap, kanonski URL, OG slika | Srednja | M | Posle A1.1. |

Zamrzavanje koda 28. oktobra; posle toga samo popravke grešaka.

## Faza B: prvih 6 nedelja posle lansiranja (novembar-decembar)

Redosled po onome što kupci najčešće traže od konkurencije (Konty i Minimax uključuju SEF u cenu).

| # | Funkcija | Vrednost | Trud | Zašto |
|---|---|---|---|---|
| B1 | **Slanje fakture u SEF preko API-ja** (API ključ firme iz SEF-a, šifrovan po tenantu; slanje postojećeg UBL-a; status prihvaćeno/odbijeno na fakturi; test na SEF demo okruženju) | Visoka | L | Otvara PDV firme, najveći deo tržišta. XML već postoji (`src/lib/sef-ubl.ts`). Ključ je tajna: nikad u logu, nikad na klijentu. |
| B2 | **Uvoz ulazne fakture dobavljača** (Ulaz sa više stavki odjednom, nabavne cene, broj dokumenta dobavljača) | Visoka | M | Prijem robe je najduži ručni posao; priprema teren za C1. |
| B3 | **Tim, prvi korak**: pozovi jednog do tri člana u firmu, uloge Vlasnik i Prodaja/Magacin (bez finansija i nabavnih cena za ulogu Prodaja) | Visoka | L | Menja model (`Profile.clerkUserId` je jedinstven): nova tabela članstva, svi upiti po firmi, ne po korisniku. Zasebna migracija i test izolacije pre koda. |
| B4 | Cenovnik po kupcu (popust ili posebna cena po kupcu, primenjuje se u predračunu i katalogu) | Srednja | M | Veleprodaja to ima u Excelu; Konty to prodaje. |
| B5 | Broj otvaranja deljenog kataloga i fakture | Srednja | S | Komercijalista zna kad da pozove. |
| B6 | Naplata u aplikaciji, faza 1: račun za pretplatu sa IPS QR i ručna potvrda | Srednja | M | Tek kad bude 10 firmi koje plaćaju. |

## Faza C: posle prvih 10 kupaca (2027)

| # | Funkcija | Vrednost | Trud | Uslov |
|---|---|---|---|---|
| C1 | **AI: Ulaz iz fotografije ili PDF-a fakture dobavljača** → nacrt Ulaza sa artiklima, količinama i nabavnim cenama, povezan sa postojećim SKU; korisnik potvrđuje pre snimanja | Visoka | M | Ako prvi korisnici potvrde da je prijem robe problem. Jedina AI funkcija koja vredi pre ostalih. Dopuna politike privatnosti. |
| C2 | AI: uvoz neurednog cenovnika dobavljača (prepoznavanje kolona) i predlog kategorije/opisa za katalog | Srednja | S-M | Posle C1. |
| C3 | **E-otpremnice**: B2B obaveza od 1. oktobra 2027 (akcizni proizvodi i javni sektor već od 1. januara 2026) | Visoka | L | Rok je dobar prodajni razlog za veleprodaju pića; početi u proleće 2027. |
| C4 | Tim, pun: više magacina/lokacija, dnevnik izmena po korisniku | Srednja | L | Posle B3. |
| C5 | Banka/kartica za pretplatu (Monri ili sl.), Paddle za strane kupce | Srednja | M | Posle B6. |

## Namerno van plana

Fiskalna kasa i maloprodaja, nativne aplikacije (PWA ostaje), javna prodavnica i korpa, CRM, AI "pitaj svoje podatke" i AI izveštaji o novcu (rizik od pogrešnog broja), modul dobavljača van ulaza robe.

## Pravila za izvršavanje

- Jedan PR po tački, draft, bez merge-a bez odobrenja vlasnika.
- Migracije kao SQL u `supabase/migrations/`, primena na produkciju samo uz odobrenje vlasnika, bez izmišljanja istorijskih vrednosti.
- Landing ne obećava ništa što ne postoji: SEF slanje, tim i AI se reklamiraju tek kada su u produkciji.
- Svaka tačka ima testove za promenjeno ponašanje; detalji u `docs/CLAUDE_CODE_PROMPT.md`.
