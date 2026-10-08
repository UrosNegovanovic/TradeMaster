# Plan do lansiranja 1. novembra 2026

**Odluka vlasnika (2026-10-06): domen i početak prodaje su 1. novembra.** Do tada se aplikacija dorađuje. Posle lansiranja cilj je prvih 10 firmi koje plaćaju.

Stanje koda i baze provereno 2026-10-06. Tekući blokeri su u `docs/STATUS.md`, marketing, cena i landing u Claude Doc-u "TradeMaster: prodaja, marketing i AI do lansiranja". Nalazi ChatGPT, Grok i Claude pregleda su provereni u kodu pre nego što su ušli ovde (tabela "Odakle je šta" na dnu).

Ocena: **vrednost** = koliko pomaže prodaji/zadržavanju, **trud** = S (do 1 dan), M (2-3 dana), L (nedelja+).

## Kome prodajemo (predlog, čeka potvrdu vlasnika)

Vlasnik male B2B firme (1-10 ljudi) koji sam vodi robu i ponude i prodaje **drugim firmama**: mala veleprodaja (potrošni materijal, kozmetika, aksesoari, autodelovi, piće), uvoznici koji snabdevaju radnje, mali proizvođači, komercijalisti na terenu. Danas rade u Excelu, Wordu i preko WhatsApp-a.

- Van PDV sistema: TradeMaster pokriva ceo posao. Izuzetak: faktura javnom sektoru i firme koje su se dobrovoljno prijavile na SEF i dalje idu kroz SEF.
- U PDV sistemu: lager, katalog, predračun i otpremnica odmah; faktura ide u SEF (danas ručno preko XML-a, posle A3 jednim klikom).
- Ne ciljamo sada: maloprodaju kojoj treba fiskalna kasa, prodaju građanima preko Instagrama (traži fiskalni račun), firme gde više zaposlenih mora istovremeno da radi u programu (dok ne postoji B2).

Glavna poruka: **ceo posao sa robom iz telefona**. Skeniraš robu, pošalješ katalog na WhatsApp, napraviš predračun, pretvoriš ga u fakturu i otpremnicu, kupac plati skeniranjem IPS QR koda.

## Šta je urađeno (2026-10-08)

| # | Šta | PR |
|---|---|---|
| 1 | PDV na fakturi (20/10/0, snimak stope po stavci), rabat po stavci | #53 |
| 2 | Onboarding "Prvi koraci" i prazna stanja | #54 |
| 3 | Deljenje fakture i kataloga (opozivi link, WhatsApp/Viber, mejl) | #55 |
| K | Napredni katalog (raspored, grupisanje, redosled, "Cena na upit", PDF sa č/ć/đ) | #56 |
| 4 | Lista kupaca | #57 |
| 5 | Izvoz faktura za knjigovođu (CSV/XLSX) | #58 |
| 6 | IPS QR na fakturi | #59 |
| 7 | Upozorenja: niska zaliha, "Kasni naplata" | #60 |
| 8 | Analitika i Sentry (isključeni dok se ne postave env varijable) | - |
| 9 | Probni period 60 dana, posle toga samo pregled (ručna naplata) | - |
| D | Dizajn: srpska prijava, teal brend tema (`--primary` 167 62% 27%, siva pozadina, bele kartice), boje statusa, landing | #68, #69 |
| P | Predračun, otpremnica, XML za SEF (ručno učitavanje) | #70, #71 |
| A2.1-2 | Ulaz/Izlaz bez trke (atomski upis, Izlaz ne ide ispod nule); izmena proizvoda bez količine čuva stanje | #74 |
| A2.5-6 | Katalog na telefonu: kvadratne slike, 2 kolone, "Šifra"; izbor proizvoda bez duplikata SKU | #73 |
| A2.3 | Test izolacije firmi kroz sve API rute; tuđi katalog vraća 404; DB testovi usklađeni sa brojevima `NN/YYYY` | #78, #79 |
| A2.4 | Skener pišti tek kad je snimanje potvrđeno | #81 |
| A2.7-8 | Finansije objašnjavaju profit; jedna rečenica ispod Asortimana i Magacina | #82, #83 |
| A4 | Skeniranje u fakturu i predračun (dugme "Skeniraj" u stavkama) | #85 |
| A5 | "Kopiraj" fakturu ili predračun u novi dokument (današnje cene, trošak pri čuvanju) | #87 |
| A6 | Otpremnica za teren: adresa isporuke i broj paketa se unose pri štampi (ne čuvaju se), polja za ime, potpis i datum | #89 |
| A7 | Podsetnik za naplatu (WhatsApp/Viber) na kartici "Kasni naplata" | #88 |
| A8 | QR kod ka živom linku na PDF-u kataloga, broj otvaranja linka; migracija `catalog_share_views` u produkciji od 2026-10-07 | #90 |
| A2.9 | Landing (deo bez podataka vlasnika): "Ceo posao iz telefona" u 6 koraka, "Šta TradeMaster nije", "Vaši podaci", predračun i otpremnica u paketu, ton "vi", FAQ o instalaciji, kontakt WhatsApp/Viber/telefon iz `operator.ts` | #94 |
| A2.11 | Stranice `/za/veleprodaju`, `/za/preduzetnike`, `/za/proizvodjace`; jedan izvor adrese (`src/lib/site-url.ts`); sitemap i robots očišćeni (`/shared/` se ne indeksira); OG slike iz koda; JSON-LD | #97 |

Migracije `invoice_document_type` i `registration_numbers` su u produkciji od 2026-10-05 (provereno u listi migracija Supabase projekta 2026-10-06). Baza je u `eu-west-1`, Vercel funkcije u `dub1` (EU).

## Faza A: do lansiranja (7. oktobar - 1. novembar)

### A1. Na vlasniku

| # | Šta | Rok | Zašto |
|---|---|---|---|
| A1.1 | XML za SEF učitan na SEF demo okruženju (demo nalog firme) | 15. okt | Uslov za A3 i za bilo kakvu SEF rečenicu na landingu |
| A1.2 | `docs/device-checklist.md` na Android i iPhone telefonu; IPS QR skeniran pravom bankarskom aplikacijom | 19. okt | Skener i QR su glavne scene u reklami |
| A1.3 | Promeniti lozinku test korisnika u Clerk Dev i učiniti repo `TradeMasterPW` privatnim (lozinka je u javnoj istoriji commit-a) | 12. okt | Bezbednost |
| A1.4 | Pravi podaci operatera za `src/lib/operator.ts` (naziv, PIB od 9 cifara, adresa) | 20. okt | /uslovi i /privatnost sada imaju `12312412312` i "test" |
| A1.5 | Kontakt za podršku (telefon/WhatsApp), slika i dve rečenice "ko stoji iza" | 20. okt | Ulazi u landing (A2.9) |
| A1.6 | Odluka o ceni: 20 € ili predlog 1.990 RSD + osnivačka ponuda za prvih 20 firmi | 20. okt | Ulazi u landing |
| A1.7 | Demo firma sa izmišljenim podacima (20-30 artikala sa slikama, katalog, predračun, faktura) za javne primere i video | 24. okt | "Otvori primer" dugmad i snimanje videa |
| A1.8 | Snimiti demo video 60-90 s i 3 kratka videa (vidi marketing dokument) | 27. okt | Landing i mreže |
| A1.9 | Probno vraćanje Supabase backupa na test projekat | 27. okt | Odgovor na "šta ako izgubim podatke" |
| A1.10 | **Domen** (kupiti najkasnije 28. okt, da ostanu 3 dana za DNS i Clerk), povezati na Vercel, `NEXT_PUBLIC_APP_URL` | 28. okt | Odluka: prodaja 1. novembra |
| A1.11 | **Clerk Production** (`pk_live_`) na domenu; registracija i prijava sa 2FA do kraja | 29. okt | Danas `pk_test_`; korisnici sa 2FA mogu da zapnu |
| A1.12 | U Vercelu: `NEXT_PUBLIC_ANALYTICS=on`, `NEXT_PUBLIC_SENTRY_DSN`, Upstash ključevi, Web Analytics | 29. okt | Bez toga ne znamo gde ljudi odustaju |
| A1.13 | Smoke test na produkcijskom domenu: Playwright `TradeMasterPW` smoke prema novom URL-u + jedna ručna faktura od registracije do PDF-a | 30. okt | Smoke prijavljenog korisnika na produkciji nikad nije prošao |

### A2. Kod pre lansiranja (mali draft PR-ovi, po redu)

**Nedelja 1 (7-12. okt): ispravnost podataka**

| # | Šta | Vrednost | Trud | Detalj |
|---|---|---|---|---|
| A2.1 | ✅ (#74) **Ulaz/Izlaz bez trke** | Visoka | S | `POST /api/stock-movements` čita količinu van transakcije i upisuje apsolutnu vrednost; dva istovremena zahteva gube jedan upis. Uslovni `increment`/`decrement` u transakciji, Izlaz odbijen ako bi stanje palo ispod nule. |
| A2.2 | ✅ (#74) **Izmena proizvoda ne resetuje stanje** | Visoka | S | `productSchema` ima `quantity ... .default(1)` i `productPutFields` piše `quantity ?? 1`: PUT bez količine tiho postavlja stanje na 1. PUT bez količine čuva postojeće stanje. |
| A2.3 | ✅ (#78, #79) **Test izolacije tenanta** | Visoka | S-M | Firma A ne može da čita ni menja proizvode, fakture, kupce, kataloge i kretanja firme B (DB test pored `catalog-access.db.test.ts`). |
| A2.4 | ✅ (#81) **Skener pišti tek posle snimanja** | Srednja | S | `BarcodeScanner.tsx` pušta zvuk na svako čitanje; `docs/scanner-ux-rules.md` kaže da zvuk pušta samo `QuickScanButton` posle snimanja. Samo zvuk, bez refaktora. |
| A2.5 | ✅ (#73) **Katalog na telefonu bez praznog prostora** | Visoka | S | Mreža 4 na telefonu je jedna kolona sa slikom `h-48` i `object-contain`, pa četvrtasta slika ima prazno levo i desno. Kvadratna slika, 2 kolone na telefonu (kompaktno 3), naziv u najviše 2 reda, "Šifra" umesto "SKU". |
| A2.6 | ✅ (#73) **Duplikati SKU u izboru za katalog** | Srednja | S | Stari dnevni batch redovi imaju isti `(profileId, sku)`; izbor proizvoda za katalog prikazuje samo najnoviji red po SKU (isto pravilo kao prijem robe), bez brisanja redova. |
| A2.7 | ✅ (#82) "Profit" objašnjen | Srednja | S | Na Finansijama: "Zarada = naplaćeno (osnovica) minus nabavna vrednost prodate robe; ne uključuje ostale troškove firme." |
| A2.8 | ✅ (#83) Asortiman i Magacin objašnjeni | Srednja | S | Jedna rečenica ispod naslova: Asortiman = šta prodaješ i po kojoj ceni; Magacin = koliko imaš i kretanja robe. |

**Nedelja 2-3 (13-26. okt): ono što kupci koriste najviše**

| # | Šta | Vrednost | Trud | Detalj |
|---|---|---|---|---|
| A3 | ✅ (#95, SEF demo) **Slanje fakture u SEF jednim klikom (opcija)** | Visoka | L | Konty i Minimax ga daju u ceni. Uključuje se samo kad firma u Podešavanjima unese svoj SEF API ključ; bez ključa ništa se ne menja. Šalje se postojeći UBL iz `src/lib/sef-ubl.ts` (`POST /api/publicApi/sales-invoice/ubl`), status (poslato, prihvaćeno, odbijeno) se vidi na fakturi, posle slanja faktura se ne briše i ne menja (storno ide kroz SEF). Ključ šifrovan po tenantu, nikad u logu ni na klijentu. Migracija za ključ i SEF status. Prvo na SEF demo okruženju; produkcija tek kad A1.1 i demo slanje prođu. Ako ne bude gotovo do 24. okt, ostaje za B1 i ne pominje se na landingu. |
| A3.1 | 🟡 (#99) **PIB sa kontrolnom cifrom** | Visoka | S | Nađeno u testu XML-a 2026-10-08: `123124129` i `123456777` imaju 9 cifara, ali ne prolaze kontrolnu cifru (ISO 7064 MOD 11,10), pa ih SEF odbija. Provera pri čuvanju u Podešavanjima i Kupcima (Zod na klijentu i serveru) i u spisku problema za XML/slanje. PIB kupca na samoj fakturi se ne blokira: faktura bez SEF-a radi i sa takvim PIB-om. |
| A3.2 | 🟡 (#100) **Adresa sa mestom za SEF** | Visoka | S | Adresa bez zareza ("Kralja Petra I") ide u XML i kao ulica i kao grad. Za XML/slanje adresa mora imati mesto ("Kralja Petra I 10, 11000 Beograd"); polja adrese u Podešavanjima, Kupcima i fakturi dobijaju taj primer. Čuvanje adrese i obična faktura se ne blokiraju. |
| A3.3 | 🟡 (#101) **Žiro-račun proveren pri čuvanju** | Srednja | S | Danas se proverava tek na XML-u i IPS QR-u ("1600045454878" je prošao čuvanje). Podešavanja odbijaju račun koji nije 18 cifara sa ispravnim kontrolnim brojem (`normalizeGiroAccount`), sa primerom "160-0000000123456-78". Prazan račun ostaje dozvoljen. |
| A3.4 | **SEF u produkciji, fakture i bez SEF-a** | Visoka | S | Kod: test da faktura (izdavanje, PDF, plaćanje) ne zavisi od SEF ključa ni od `SEF_KEY_ENCRYPTION_KEY`, i da se bez ključa SEF panel ne prikazuje niti zove SEF. Vlasnik: demo slanje sa pravim PIB-om firme i kupcem koji je na SEF-u (A1.1), pa tek onda u Vercelu `SEF_API_BASE_URL=https://efaktura.mfin.gov.rs` i `SEF_ALLOW_PRODUCTION=on`. Na produkciji je od 2026-10-08 postavljen samo `SEF_KEY_ENCRYPTION_KEY`, pa slanje ide na demo. |
| A4 | ✅ (#85) **Skeniranje u fakturu i predračun** | Visoka | M | Dugme "Skeniraj" u formi dodaje stavku po barkodu (ili povećava količinu postojeće). Komercijalista u magacinu kuca fakturu kamerom. Postojeći skener, bez izmene `BarcodeScanner.tsx`. |
| A5 | ✅ (#87) **Kopiraj dokument** | Srednja | S | "Kopiraj" na fakturi i predračunu pravi novi nacrt sa istim kupcem i stavkama, današnjim cenama i troškovima. Stalni kupci često naručuju isto. |
| A6 | ✅ (#89) **Otpremnica za teren** | Srednja | S | Na PDF otpremnice: adresa isporuke (ako se razlikuje), polja "Robu izdao" / "Robu primio" sa potpisom i datumom, broj paketa. Bez nove šeme ako adresa isporuke ide u napomenu; inače mala migracija. |
| A7 | ✅ (#88) **Podsetnik za naplatu** | Srednja | S | Na kartici "Kasni naplata": dugme koje otvara WhatsApp/Viber sa porukom (broj fakture, iznos, link sa IPS QR). |
| A8 | ✅ (#90) **Katalog: QR kod ka linku na PDF-u i broj otvaranja linka** | Srednja | S-M | Štampani katalog vodi na živi link; komercijalista vidi da je kupac otvorio ponudu. |

**Nedelja 3-4 (20-28. okt): landing i SEO**

| # | Šta | Vrednost | Trud | Detalj |
|---|---|---|---|---|
| A2.9 | 🟡 (#94) **Landing: poverenje i dokaz** — čeka samo A1.7 (`landingExamples` u `src/lib/landing-copy.ts`: linkovi demo kataloga i fakture) i A1.8 (novi `public/landing-demo.mp4` i poster; sadašnji poster još kaže "Skeniraj robu"). Cena ostaje 20 € (A1.6). | Visoka | M | Redosled sekcija iz marketing dokumenta: kontakt (WhatsApp/Viber, telefon) u hero-u i footeru; "Ceo posao iz telefona" u 6 koraka; demo video; dugmad "Otvori primer kataloga/fakture" (demo firma); predračun i otpremnica u sekciji o fakturi i u `pricingIncludes`; "Šta TradeMaster nije"; "Vaši podaci" (EU serveri, izvoz, samo-pregled posle isteka); jedan ton ("vi"); FAQ o instalaciji usklađen sa dugmetom "Instaliraj aplikaciju". FAQ o SEF-u menjati tek posle A1.1, a o slanju tek kad A3 radi u produkciji. |
| A2.10 | Ugovor o obradi podataka (DPA) u /uslovi i obaveštenje o kolačićima kad je analitika uključena | Srednja | S | Tekst da pregleda knjigovođa ili pravnik. |
| A2.11 | 🟡 (#97) Stranice po delatnosti (veleprodaja, paušalci koji prodaju robu, proizvođači), sitemap, kanonski URL, OG slika | Srednja | M | Posle A1.10; ako domen stiže 28. okt, ovo ide prvih dana novembra. Kod je gotov; posle domena (A1.10) vlasnik podešava `NEXT_PUBLIC_APP_URL` i prijavljuje sitemap u Google Search Console. |

**Zamrzavanje koda: 28. oktobar.** Posle toga samo popravke grešaka nađenih u A1.13.

### Uslovi za lansiranje 1. novembra (sve mora biti tačno)

- [ ] Domen radi, Clerk `pk_live_`, registracija i prijava sa 2FA prolaze
- [ ] /uslovi i /privatnost imaju prave podatke operatera
- [x] A2.1-A2.3 spojeni (stanje robe i izolacija firmi)
- [ ] Smoke test na produkcijskom domenu prolazi (A1.13)
- [ ] Landing ima kontakt, primere i nijednu tvrdnju koja ne radi (kontakt i tvrdnje ✅ #94; primeri čekaju A1.7)
- [ ] Analitika i Sentry uključeni
- [ ] Backup vraćen bar jednom

## Faza B: prvih 6 nedelja posle lansiranja (novembar-decembar)

| # | Funkcija | Vrednost | Trud | Zašto |
|---|---|---|---|---|
| B1 | SEF slanje, ako nije stiglo u A3; zatim knjižno odobrenje (povraćaj robe) kroz SEF | Visoka | M-L | PDV firme su najveći deo tržišta. |
| B2 | **Tim, prvi korak**: 1-3 člana, uloge Vlasnik i Prodaja/Magacin (Prodaja ne vidi finansije ni nabavne cene) | Visoka | L | Menja model (`Profile.clerkUserId` je jedinstven): tabela članstva, svi upiti po firmi. Zasebna migracija i test izolacije pre koda. Tek kad ga pilot firme traže. |
| B3 | **Prijem robe kao dokument**: Ulaz sa više stavki skeniranjem u nizu, dobavljač i broj njegove fakture, nabavne cene | Visoka | M | Najduži ručni posao; priprema za C1. |
| B4 | **Inventura skenerom**: skeniraj i prebroj, razlika prema stanju, potvrda kroz postojeće "Ažuriraj stanje" | Srednja | M | Veleprodaja radi popis bar jednom godišnje. |
| B5 | Cenovnik po kupcu (popust ili posebna cena po kupcu u predračunu i katalogu) | Srednja | M | Veleprodaja to danas ima u Excelu; Konty to prodaje. |
| B6 | **Upit sa javnog kataloga**: kupac upiše količine i pošalje, stiže kao nacrt predračuna (bez korpe i plaćanja) | Visoka | M | Najjači razlog da kupac koristi link; treba odobrenje vlasnika jer je blizu korpe. |
| B7 | Štampa nalepnica sa barkodom za robu bez barkoda | Srednja | S-M | Mali proizvođači i prepakovana roba. |
| B8 | Brisanje slike iz Storage-a kad se ukloni sa proizvoda | Niska | S | Sada ostaju fajlovi bez vlasnika. |
| B9 | Naplata pretplate u aplikaciji, faza 1: račun sa IPS QR i ručna potvrda | Srednja | M | Kad bude 10 firmi koje plaćaju. |

## Faza C: 2027

| # | Funkcija | Vrednost | Trud | Uslov |
|---|---|---|---|---|
| C1 | **AI: Ulaz iz fotografije ili PDF-a fakture dobavljača** → nacrt prijema sa artiklima, količinama i nabavnim cenama; korisnik potvrđuje pre snimanja | Visoka | M | Ako pilot korisnici potvrde da je prijem robe problem; dopuna politike privatnosti. |
| C2 | AI: uvoz neurednog cenovnika dobavljača i predlog kategorije/opisa za katalog | Srednja | S-M | Posle C1. |
| C3 | **E-otpremnice**: B2B obaveza od 1. oktobra 2027 (akcizni proizvodi i javni sektor od 1. januara 2026) | Visoka | L | Početi u proleće 2027; dobar prodajni razlog za veleprodaju pića. |
| C4 | Tim, pun: više magacina/lokacija, dnevnik izmena po korisniku | Srednja | L | Posle B2. |
| C5 | Kartica za pretplatu (domaći procesor), Paddle za strane kupce | Srednja | M | Posle B9. |

## Namerno van plana

Fiskalna kasa i maloprodaja, nativne aplikacije (PWA ostaje), javna prodavnica i korpa sa plaćanjem, CRM, AI "pitaj svoje podatke" i AI izveštaji o novcu (rizik od pogrešnog broja), modul dobavljača van prijema robe.

## Odakle je šta (provera predloga 2026-10-06)

| Predlog | Izvor | Provereno | Odluka |
|---|---|---|---|
| Race kod ručnog Ulaza/Izlaza | Grok, ChatGPT | Tačno (`src/app/api/stock-movements/route.ts`) | A2.1 |
| PUT bez količine resetuje stanje na 1 | ChatGPT | Tačno (`productSchema` default 1, `productPutFields`) | A2.2 |
| Test izolacije firmi | Grok | Postoji samo za katalog | A2.3 |
| Beep pre upisa | Grok | Tačno, suprotno `docs/scanner-ux-rules.md` | A2.4 |
| Ponovljeni SKU i dugački nazivi u katalogu | ChatGPT | Tačno: izbor ne spaja stare batch redove | A2.5, A2.6 |
| "Profit" bez ostalih troškova | ChatGPT | Tačno | A2.7 |
| Test lozinka u javnoj istoriji | ChatGPT | Tačno (repo `TradeMasterPW`) | A1.3 |
| Van PDV-a ne znači uvek bez SEF-a | ChatGPT | Tačno (javni sektor, dobrovoljni korisnici) | "Kome prodajemo" |
| SEF preko API-ja | Grok, vlasnik | Konty i Minimax ga imaju | A3 (opcija), inače B1 |
| Teal tema (`#0F766E`), sivi canvas, bele kartice | Grok | Već urađeno u #68/#69 (`--primary` 167 62% 27%, `--background` 210 20% 98%) | Ne treba |
| Migracije od 5. oktobra | Grok | Primenjene | Zatvoreno |
| Supabase i Vercel u EU | Grok | `eu-west-1`, `dub1` | Zatvoreno |
| Tim i AI pre lansiranja | vlasnik | Tim menja svaki upit; AI ne rešava blokere | B2, C1 |
| 64% firmi se ne reklamira online (RNIDS) | Grok | Izvor nije nađen | Ne koristiti |

## Pravila za izvršavanje

- Jedan PR po tački, draft, bez merge-a bez odobrenja vlasnika.
- Migracije kao SQL u `supabase/migrations/`, primena na produkciju samo uz odobrenje vlasnika, bez izmišljanja istorijskih vrednosti.
- Landing ne obećava ništa što ne postoji: SEF slanje, tim i AI se reklamiraju tek kada rade u produkciji.
- Svaka tačka ima testove za promenjeno ponašanje; pre push-a `npm run typecheck && npm run lint && npm run test:run`.
