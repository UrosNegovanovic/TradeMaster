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

## Šta je urađeno (2026-10-10, posle #137; #138 čeka "merge")

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
| A3 | Slanje u SEF jednim klikom sa API ključem firme (SEF demo); migracija `sef_sending` i `SEF_KEY_ENCRYPTION_KEY` u produkciji | #95 |
| A3.1-3 | PIB sa kontrolnom cifrom, adresa sa mestom za SEF, žiro-račun proveren pri čuvanju | #99, #100, #101 |
| A3.4 | Test: faktura radi bez SEF ključa (kod); prelazak na pravi SEF čeka A1.14 | #102 |
| A3.x | Poruke za XML kažu gde se ispravlja (Podešavanja / faktura / Kupci); Podešavanja i Kupci imaju ista pravila kao SEF, sa greškom ispod polja (PIB 9 cifara + kontrolna, MB 8 cifara, adresa sa mestom, žiro-račun); faktura samo upozorava | #104, #105 |
| A3.5 | "Preuzmi podatke iz Kupaca" na izmeni fakture; dugme "Izmeni" na fakturi; link "Izmeni fakturu" uz grešku XML-a i u SEF panelu | #107 |
| A9.1-A9.3 | Lista faktura više ne izdaje nacrte sama ("Izdaj fakturu" sa potvrdom); plaćena faktura se ne briše; rok i "N dana" po beogradskom kalendaru | #111, #112, #113 |
| A9.4-A9.5 | Srpski tekst svuda (Zod i API greške, brisanje proizvoda, Brzi sken "Nepoznat proizvod"); neuspelo učitavanje pokazuje "Podaci nisu učitani / Pokušaj ponovo" umesto praznog naloga | #114, #115 |
| A9.9 | PDF fakture: MB prodavca i kupca, mesto i datum izdavanja, datum prometa, "Obveznik nije u sistemu PDV-a"; bez "Status" i polja "LOGO" | #118 |
| A9.10 | Pretraga faktura po broju, kupcu i PIB-u (bez dijakritika); otvorene po roku | #117 |
| A9.11 | Slobodna stavka (usluga, prevoz) bez proizvoda i lagera, nabavna 0; faktura bez asortimana; stavke obrisanih proizvoda zadržavaju trošak pri izmeni | #119 |
| A9.12 | "Sačuvaj kupca u Kupce" na fakturi (sa MB uz PIB); "Faktura" i "Predračun" na kupcu | #121 |
| A9.13 | Minimalna zaliha po proizvodu (polje u formi proizvoda) | #116 |
| A9.15 | "Napravi predračun" na katalogu (kupac, proizvodi, popust kataloga); forma imenuje stavke bez cene | #123 |
| A9.18 | "Ko mi duguje" na Finansijama: otvoreno po kupcu, kašnjenje, link na njegove fakture | #124 |
| A9.19 | Nabavna vrednost lagera u Magacinu; "Lager lista (Excel)" po šifri: stanje, nabavna i prodajna cena i vrednost | #125 |
| A10 | Playwright E2E (javni smoke na svaki deploy, prijava bez lozinke, `@writes` samo nad test bazom); svi unit testovi u CI-ju sa zaštitom liste | #109, #120 |
| B9.0 | **Ručna naplata po kalendarskom mesecu** (2026-10-10): 60 dana proba, 7 dana obaveštenje, 2 dana roka, pa samo pregled; jedna uplata = jedan kalendarski mesec sa istim danom obnove (31.01. → 28/29.02. → 31.03.); `npm run access:extend --ref --paid` sa evidencijom u `access_extensions` (ista uplata nikad dvaput); aktivacija najkasnije narednog radnog dana; `docs/billing-runbook.md`. Migracija `access_extensions` u produkciji | #136, #137 |
| B9.1 | **Automatski predračun za pretplatu** (draft, čeka "merge"): Vercel Cron + Resend, 20 € po srednjem kursu NBS bez PDV-a (T&G Nest paušalac), iz T&G Nest naloga, kopija vlasniku; kupcima tek uz `BILLING_AUTO_SEND=on`, do tada samo vlasniku; naplata pretplate (B) strogo odvojena od faktura korisnika (A); vlasnik filtrira "Pretplate TradeMaster", korisnik vidi svoje u Podešavanja → Pristup i uplata; `billing:send --test`. Migracije `billing_notices` i `billing_notices_test_owner_flags` u produkciji; proba PR-03/2026 (TEST) poslata vlasniku 2026-10-10 | #138 |
| A2.11 | Stranice `/za/veleprodaju`, `/za/preduzetnike`, `/za/proizvodjace`; jedan izvor adrese (`src/lib/site-url.ts`); sitemap i robots očišćeni (`/shared/` se ne indeksira); OG slike iz koda; JSON-LD | #97 |
| O1 | **Panel vlasnika: kapija** (draft, čeka "merge"): `/owner` samo za Clerk id-jeve iz `PLATFORM_OWNER_USER_IDS` uz `OWNER_PANEL=on`, svi ostali 404; svoj izgled i meni; vlasnik sa korisničkih stranica ide na `/owner`. Bez migracije | #142 |
| O2 | **Panel vlasnika: Statistika** (draft, čeka "merge"): firme, nove po nedelji, stanje pristupa, aktivacija, aktivne u 7/30 dana, prelazak probni → plaćen, mesečni prihod, otkazi; samo brojevi, samo čitanje. Bez migracije | #143 |
| O3 | **Panel vlasnika: Nalozi** (draft, čeka "merge"): lista firmi sa mejlom za prijavu, danima do isteka, poslednjom uplatom i predračunom; filteri i pretraga; istorija uplata i predračuna po nalogu; odeljak "Šta operater vidi" u /privatnost. Bez migracije | #144 |

Migracije `invoice_document_type` i `registration_numbers` su u produkciji od 2026-10-05 (provereno u listi migracija Supabase projekta 2026-10-06). Baza je u `eu-west-1`, Vercel funkcije u `dub1` (EU).

## Faza A: do lansiranja (7. oktobar - 1. novembar)

### A1. Na vlasniku

| # | Šta | Rok | Zašto |
|---|---|---|---|
| A1.1 | 🟡 XML za SEF učitan na SEF demo okruženju (demo nalog firme). 2026-10-09: XML fakture 11/2026 sa ispravnim podacima napravljen i proveren (iznosi, PDV, adrese, račun); ostaje učitavanje na portal. Demo prihvata samo PIB firme kojom ste prijavljeni i kupca registrovanog na SEF-u. | 15. okt | Uslov za A3 i za bilo kakvu SEF rečenicu na landingu |
| A1.2 | `docs/device-checklist.md` na Android i iPhone telefonu; IPS QR skeniran pravom bankarskom aplikacijom | 19. okt | Skener i QR su glavne scene u reklami |
| A1.3 | Promeniti lozinku test korisnika u Clerk Dev i učiniti repo `TradeMasterPW` privatnim (lozinka je u javnoj istoriji commit-a) | 12. okt | Bezbednost |
| A1.4 | Pravi podaci operatera u Vercel env: `OPERATOR_PIB`, `OPERATOR_MB`, `OPERATOR_ADDRESS` (od #138 se ne upisuju u kod), pa redeploy | 20. okt | Bez njih /uslovi i /privatnost kažu da podaci tek stižu |
| A1.15 | **Naplata pretplate u Vercel env** (posle spajanja #138): `CRON_SECRET`, `BILLING_ISSUER_PROFILE_ID`, `BILLING_EXCLUDE_PROFILE_IDS`, `RESEND_API_KEY`, `BILLING_EMAIL_BCC`, `BILLING_EMAIL_REPLY_TO`; posle domena (A1.10) verifikovati trademaster.rs u Resend-u i `BILLING_EMAIL_FROM`, pa tek onda `BILLING_AUTO_SEND=on`. Potvrditi probni predračun PR-03/2026 (TEST) i obrisati ga | 30. okt | Prvi pravi predračuni idu početkom decembra (49 firmi ističe u decembru) |
| A1.5 | Kontakt za podršku (telefon/WhatsApp), slika i dve rečenice "ko stoji iza" | 20. okt | Ulazi u landing (A2.9) |
| A1.6 | ✅ (2026-10-10) Cena: 20 € mesečno po srednjem kursu NBS, bez PDV-a (T&G Nest paušalac); najava promene cene 30 dana unapred | 20. okt | Ulazi u landing |
| A1.7 | ✅ (2026-10-10, PR otvoren) Demo firma sa izmišljenim podacima (20-30 artikala sa slikama, katalog, predračun, faktura) za javne primere i video. "Sunčano Polje Veleprodaja d.o.o." na produkciji (nalog `demo+clerk_test@example.com`, alat `e2e/demo`); dugmad "Pogledajte primer kataloga/fakture" na landingu. Za video se vlasnik prijavljuje tim nalogom (ili isti seed na novom nalogu) | 24. okt | "Otvori primer" dugmad i snimanje videa |
| A1.8 | Snimiti demo video 60-90 s i 3 kratka videa (vidi marketing dokument) | 27. okt | Landing i mreže |
| A1.9 | Probno vraćanje Supabase backupa na test projekat | 27. okt | Odgovor na "šta ako izgubim podatke" |
| A1.10 | **Domen** (kupiti najkasnije 28. okt, da ostanu 3 dana za DNS i Clerk), povezati na Vercel, `NEXT_PUBLIC_APP_URL` | 28. okt | Odluka: prodaja 1. novembra |
| A1.11 | **Clerk Production** (`pk_live_`) na domenu; registracija i prijava sa 2FA do kraja | 29. okt | Danas `pk_test_`; korisnici sa 2FA mogu da zapnu |
| A1.12 | U Vercelu: `NEXT_PUBLIC_ANALYTICS=on`, `NEXT_PUBLIC_SENTRY_DSN`, Upstash ključevi, Web Analytics | 29. okt | Bez toga ne znamo gde ljudi odustaju |
| A1.14 | **SEF na produkciju uz PRD release** (odluka vlasnika 2026-10-09: do PRD release-a, kupovine domena i Clerk Production, SEF slanje ostaje uključeno na **demo** za sve, da bismo slali i testirali fakture). Na PRD: demo slanje sa pravim PIB-om firme i kupcem na SEF-u prošlo, pa u Vercelu `SEF_API_BASE_URL=https://efaktura.mfin.gov.rs` i `SEF_ALLOW_PRODUCTION=on`, redeploy. Ako pravi SEF tada nije spreman: spojiti A3.6 (#108) da kupci ne vide demo slanje. | 28-31. okt (PRD) | Prvi kupci ne smeju da "šalju" u demo misleći da je pravi SEF |
| A1.13 | Smoke test na produkcijskom domenu: Playwright `TradeMasterPW` smoke prema novom URL-u + jedna ručna faktura od registracije do PDF-a | 30. okt | Smoke prijavljenog korisnika na produkciji nikad nije prošao |
| A1.16 | **Panel vlasnika u Vercel env** (uz #142-#144): `OWNER_PANEL=on`, `PLATFORM_OWNER_USER_IDS` (Clerk user id vlasnika: Clerk dashboard → Users → korisnik → User ID; posle A1.11 dodati i id iz Clerk Production), `PLATFORM_DEMO_PROFILE_IDS` (profile id demo firme "Sunčano Polje", da se ne broji u Statistici). Prvo Preview + redeploy i provera: vlasnik završava na `/owner`, `/dashboard` ga vraća na `/owner`, drugi nalog dobija "Stranica nije pronađena" na `/owner` i 404 na `/api/owner/ping`; tek onda Production. Pročitati tekst "Šta operater vidi" u /privatnost (#144) | uz "merge" #142-#144 | Bez env-a je `/owner` 404 za sve; panel sa pravom prijavom još nije otvoren u pregledaču |

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
| A3.1 | ✅ (#99) **PIB sa kontrolnom cifrom** | Visoka | S | Nađeno u testu XML-a 2026-10-08: `123124129` i `123456777` imaju 9 cifara, ali ne prolaze kontrolnu cifru (ISO 7064 MOD 11,10), pa ih SEF odbija. Provera pri čuvanju u Podešavanjima i Kupcima (Zod na klijentu i serveru) i u spisku problema za XML/slanje. PIB kupca na samoj fakturi se ne blokira: faktura bez SEF-a radi i sa takvim PIB-om. |
| A3.2 | ✅ (#100) **Adresa sa mestom za SEF** | Visoka | S | Adresa bez zareza ("Kralja Petra I") ide u XML i kao ulica i kao grad. Za XML/slanje adresa mora imati mesto ("Kralja Petra I 10, 11000 Beograd"); polja adrese u Podešavanjima, Kupcima i fakturi dobijaju taj primer. Čuvanje adrese i obična faktura se ne blokiraju. |
| A3.3 | ✅ (#101) **Žiro-račun proveren pri čuvanju** | Srednja | S | Danas se proverava tek na XML-u i IPS QR-u ("1600045454878" je prošao čuvanje). Podešavanja odbijaju račun koji nije 18 cifara sa ispravnim kontrolnim brojem (`normalizeGiroAccount`), sa primerom "160-0000000123456-54". Od #105 je račun u Podešavanjima obavezan. |
| A3.4 | 🟡 (#102, kod gotov; prelazak = A1.14) **SEF u produkciji, fakture i bez SEF-a** | Visoka | S | Kod: test da faktura (izdavanje, PDF, plaćanje) ne zavisi od SEF ključa ni od `SEF_KEY_ENCRYPTION_KEY`, i da se bez ključa SEF panel ne prikazuje niti zove SEF. Vlasnik: demo slanje sa pravim PIB-om firme i kupcem koji je na SEF-u (A1.1), pa tek onda u Vercelu `SEF_API_BASE_URL=https://efaktura.mfin.gov.rs` i `SEF_ALLOW_PRODUCTION=on`. Na produkciji je od 2026-10-08 postavljen samo `SEF_KEY_ENCRYPTION_KEY`, pa slanje ide na demo. |
| A3.5 | ✅ (#107) **"Preuzmi podatke iz Kupaca" na fakturi** | Visoka | S | Nađeno 2026-10-09: faktura čuva svoj snimak kupca, pa ispravka u Kupcima ne popravlja staru fakturu i XML i dalje pada (10/2026, 11/2026). Na izmeni fakture dugme koje upiše naziv, PIB i adresu sačuvanog kupca; uz grešku za XML i u SEF panelu link "Izmeni fakturu". Samo za Nacrt i Otvoreno, nikad posle slanja u SEF. |
| A3.6 | ⏸ (#108, draft, **ne spajati do PRD-a**) **SEF kartica samo kad je SEF stvarno uključen** | Visoka | S | Danas se "SEF API ključ" u Podešavanjima prikazuje svakoj firmi čim postoji `SEF_KEY_ENCRYPTION_KEY`, sa napomenom "SEF demo". Kod je u #108: `SEF_SENDING=on` za sve, inače samo profili iz `SEF_SENDING_PROFILES`; ništa postavljeno = isključeno. Odluka vlasnika 2026-10-09: do PRD-a stanje ostaje kakvo jeste (SEF demo vidljiv, slanje se testira); #108 se spaja na PRD samo ako A1.14 ne stigne, uz `SEF_SENDING_PROFILES` za test nalog. |
| A4 | ✅ (#85) **Skeniranje u fakturu i predračun** | Visoka | M | Dugme "Skeniraj" u formi dodaje stavku po barkodu (ili povećava količinu postojeće). Komercijalista u magacinu kuca fakturu kamerom. Postojeći skener, bez izmene `BarcodeScanner.tsx`. |
| A5 | ✅ (#87) **Kopiraj dokument** | Srednja | S | "Kopiraj" na fakturi i predračunu pravi novi nacrt sa istim kupcem i stavkama, današnjim cenama i troškovima. Stalni kupci često naručuju isto. |
| A6 | ✅ (#89) **Otpremnica za teren** | Srednja | S | Na PDF otpremnice: adresa isporuke (ako se razlikuje), polja "Robu izdao" / "Robu primio" sa potpisom i datumom, broj paketa. Bez nove šeme ako adresa isporuke ide u napomenu; inače mala migracija. |
| A7 | ✅ (#88) **Podsetnik za naplatu** | Srednja | S | Na kartici "Kasni naplata": dugme koje otvara WhatsApp/Viber sa porukom (broj fakture, iznos, link sa IPS QR). |
| A8 | ✅ (#90) **Katalog: QR kod ka linku na PDF-u i broj otvaranja linka** | Srednja | S-M | Štampani katalog vodi na živi link; komercijalista vidi da je kupac otvorio ponudu. |

**Nedelja 3-4 (20-28. okt): landing i SEO**

| # | Šta | Vrednost | Trud | Detalj |
|---|---|---|---|---|
| A2.9 | 🟡 (#94) **Landing: poverenje i dokaz** — čeka samo A1.7 (`landingExamples` u `src/lib/landing-copy.ts`: linkovi demo kataloga i fakture) i A1.8 (novi `public/landing-demo.mp4` i poster; sadašnji poster još kaže "Skeniraj robu"). Cena ostaje 20 € (A1.6). | Visoka | M | Redosled sekcija iz marketing dokumenta: kontakt (WhatsApp/Viber, telefon) u hero-u i footeru; "Ceo posao iz telefona" u 6 koraka; demo video; dugmad "Otvori primer kataloga/fakture" (demo firma); predračun i otpremnica u sekciji o fakturi i u `pricingIncludes`; "Šta TradeMaster nije"; "Vaši podaci" (EU serveri, izvoz, samo-pregled posle isteka); jedan ton ("vi"); FAQ o instalaciji usklađen sa dugmetom "Instaliraj aplikaciju". FAQ o SEF-u menjati tek posle A1.1, a o slanju tek kad A3 radi u produkciji. |
| A2.10 | 🟡 (#93, draft, čeka pregled teksta; menja isti fajl `/privatnost` kao #144, pa drugi koji se spaja traži ručno usklađivanje) Ugovor o obradi podataka (DPA) u /uslovi i obaveštenje o kolačićima kad je analitika uključena | Srednja | S | Tekst da pregleda knjigovođa ili pravnik. |
| A2.12 | 🟡 (PR otvoren: nove funkcije A9 na landingu i `/za/*`; SEF tekst ostaje "Ne" do A1.1/A1.14) Landing i `/za/*` FAQ o SEF-u posle A1.14 | Srednja | S | Danas tačno piše "Ne šalje fakture u SEF" (`landing-copy.ts`, `trade-pages.ts`). Kad slanje radi na pravom SEF-u: "Šalje fakturu u SEF jednim dodirom, sa vašim API ključem". Do tada se može dodati samo "XML za ručno učitavanje na SEF" kad A1.1 prođe. |
| A2.11 | 🟡 (#97) Stranice po delatnosti (veleprodaja, paušalci koji prodaju robu, proizvođači), sitemap, kanonski URL, OG slika | Srednja | M | Posle A1.10; ako domen stiže 28. okt, ovo ide prvih dana novembra. Kod je gotov; posle domena (A1.10) vlasnik podešava `NEXT_PUBLIC_APP_URL` i prijavljuje sitemap u Google Search Console. |

### A9. Usavršavanje pre lansiranja (10-27. okt)

Odluka vlasnika 2026-10-09: preostale nedelje idu na doradu funkcija i izgleda, da aplikacija na marketingu bude vrhunska za ovaj posao. Stavke su iz pregleda koda 2026-10-09 (svaka proverena u kodu). Bez novih modula, sve na postojećem toku. Migracije samo gde piše, uz odobrenje vlasnika.

**Prvo greške (P0, odmah)**

| # | Šta | Vrednost | Trud | Detalj |
|---|---|---|---|---|
| A9.1 | ✅ (#111) **Lista faktura sama izdaje nacrte** | Visoka | S | `src/app/(dashboard)/invoices/page.tsx` pri otvaranju šalje PATCH `UNPAID` za svaki nacrt (i predračun u nacrtu): roba izlazi sa lagera bez korisnika, tiho pada sa 402 na isteklom nalogu. Ukloniti; nacrt se izdaje samo dugmetom. |
| A9.2 | ✅ (#112) **Plaćena faktura može da se obriše** | Visoka | S | Brisanje briše knjižen prihod, vraća robu i pravi rupu u brojevima. Server i lista odbijaju brisanje PAID; prvo "Vrati među otvorene". |
| A9.3 | ✅ (#113) Datumi oko ponoći | Srednja | S | Podrazumevani rok se računa iz UTC datuma (između 00 i 02 h ispadne dan ranije); "Rok plaćanja: N dana" na PDF-u može biti 31. Beogradski kalendarski dani (`src/lib/local-date.ts`). |

**Izgled i doslednost**

| # | Šta | Vrednost | Trud | Detalj |
|---|---|---|---|---|
| A9.4 | ✅ (#114) **Engleski tekst do korisnika** | Visoka | S | Dijalog brisanja proizvoda ("Delete Product"), bedževi "Scanned/Created/Deleted", Zod poruke na fakturi ("quantity must be an integer"), API greške ("Invoice not found", "Internal server error"), "Loading movements...", IN/OUT u istoriji; Brzi sken snima "Unknown Product" u bazu. Srpski tekst + mapa opštih API grešaka u `readApiErrorMessage`. |
| A9.5 | ✅ (#115) **Greška učitavanja izgleda kao prazan nalog** | Visoka | S | Neuspeo `useQuery` daje `[]`, pa Fakture, Asortiman, Kupci i Katalozi na slabom signalu pokazuju "napravite prvu…". Jedna kartica "Nije učitano. Pokušaj ponovo". |
| A9.6 | ✅ (#127) Datumi, procenti i množina po srpski | Srednja | S | Kalendar na engleskom sa nedeljom kao prvim danom, `format(…, 'PPP')` na engleskom, procenti sa tačkom, "1 otvorenih faktura". `sr-Latn` locale, `formatPercent`, pomoćna funkcija za množinu. |
| A9.7 | ✅ (#127) Stari interni izrazi | Srednja | S | "agregiranu količinu svih dnevnih unosa", "SKU" u Asortimanu i izboru proizvoda (katalog već kaže "Šifra"). Svuda "Šifra / barkod". |
| A9.8 | ✅ (#126) Zaglavlje fakture na telefonu | Srednja | S | Do 7 dugmadi jedno ispod drugog; ručno "Nazad" umesto `BackLink`; datum plaćanja se ne vidi. Glavne akcije (Označi plaćeno, PDF) + meni "Više" (Izmeni, Kopiraj, Otpremnica, XML); "Plaćeno: datum". |

**Funkcije u glavnom toku**

| # | Šta | Vrednost | Trud | Detalj |
|---|---|---|---|---|
| A9.9 | ✅ (#118, tekst čeka knjigovođu) **Faktura sa svim podacima koje kupac i knjigovođa očekuju** | Visoka | S | PDF nema matični broj prodavca i kupca, datum prometa, mesto izdavanja ni napomenu "Obveznik nije u sistemu PDV-a"; štampa "Status: Otvoreno" i sivo polje "LOGO". Tekst da potvrdi knjigovođa. |
| A9.10 | ✅ (#117, bez filtera perioda) **Pretraga i filteri faktura** | Visoka | S-M | Pretraga po broju i kupcu, filter kupca i perioda, otvorene poređane po roku. |
| A9.11 | ✅ (#119) **Stavka bez proizvoda** (prevoz, usluga, ambalaža) | Visoka | S-M | Server već prima `productId: null`, a forma briše naziv i cenu. Bez kretanja lagera; nova faktura ne traži pun asortiman. |
| A9.12 | ✅ (#121) **Kupac iz fakture i faktura iz kupca** | Visoka | S | "Sačuvaj kupca" na fakturi (kao u katalogu; XML traži MB iz Kupaca) i "Nova faktura / predračun" na kupcu. |
| A9.13 | ✅ (#116) **Minimalna zaliha po proizvodu** | Visoka | S | `minStock` postoji (podrazumevano 2), ali se ne može menjati, pa je "Nizak lager" besmislen za robu u kutijama. Polje u ProductForm, bez migracije. |
| A9.14 | ✅ (#129) Asortiman: "šta treba dopuniti" | Srednja | S | Filteri "Bez nabavne cene", "Bez prodajne cene", "Nizak lager" i sortiranje (naziv, stanje, cena). Brzi sken namerno ostavlja nabavnu praznu. |
| A9.15 | ✅ (#123) Predračun iz kataloga | Srednja | S | Katalog ima kupca, popust i proizvode; dugme "Napravi predračun" kroz postojeći prefill (`copyFrom`). Zatvara korak katalog → faktura. |
| A9.16 | ✅ (#130) Marža u formi proizvoda | Srednja | S | "Razlika X RSD · Marža Y%" kad su obe cene unete. |
| A9.17 | ✅ (#130) Brze akcije na Početnoj | Srednja | S | "Nova faktura", "Novi predračun", "Ulaz robe" pored Brzog skena; "Naplaćeno ovog meseca". |

**Izveštaji**

| # | Šta | Vrednost | Trud | Detalj |
|---|---|---|---|---|
| A9.18 | ✅ (#124) **Ko mi duguje** (potraživanja po kupcu) | Visoka | S-M | Kupac, otvoreno, najstariji rok, link na njegove fakture. |
| A9.19 | ✅ (#125) **Vrednost lagera po nabavnoj ceni i "Lager lista" XLSX** | Visoka | S | Danas samo po prodajnoj; izvoz: šifra, naziv, stanje, nabavna, prodajna, vrednost (knjigovođa, popis). |
| A9.20 | ✅ (#131) Najprodavaniji proizvodi i najbolji kupci po periodu | Srednja | S-M | Iz snimaka stavki, samo fakture. |

**Sa migracijom (uz odobrenje vlasnika, posle ostalih)**

| # | Šta | Vrednost | Trud | Detalj |
|---|---|---|---|---|
| A9.21 | ✅ (#132; migracija u produkciji 2026-10-10) Telefon i mejl kupca | Srednja | M | Podsetnik i deljenje idu direktno kupcu (`wa.me/<broj>`, `mailto:`). |
| A9.22 | ✅ (#132; migracija u produkciji 2026-10-10) Podrazumevani rok plaćanja i napomena na fakturi | Srednja | S-M | Polja u Podešavanjima; danas je rok uvek 30 dana. |

Redosled: A9.1-A9.5 i A9.9-A9.13 urađeni 2026-10-09. A9.15, A9.18, A9.19 urađeni (#123, #124, A9.19 PR). Sledeće: A9.8, A9.6, A9.7, A9.14, A9.16, A9.17; A9.20-A9.22 ako ostane vremena (A9.21-22 traže migraciju i odobrenje). Jedan mali PR po stavci, sa E2E testom gde menja tok.

### A10. Kvalitet: automatski testovi u pregledaču

| # | Šta | Stanje |
|---|---|---|
| A10.1 | Playwright u glavnom repou: javni smoke (desktop + telefon) na svaki Vercel deploy, prijava bez lozinke (Clerk tiket), `@writes` samo nad test bazom (`e2e/README.md`) | ✅ #109 (javni deo 46/46 lokalno i na produkciji). Na preview-ima se preskače dok vlasnik ne postavi `VERCEL_AUTOMATION_BYPASS_SECRET` |
| A10.2 | Test baza za E2E i DB testove: Postgres u Dockeru (`npm run test:db:up`) i u CI-ju (`test-database.yml`), test korisnik `e2e+clerk_test@example.com` u Clerk Development; `@writes` na localhost-u samo nad test bazom | ✅ (#133). Lokalno: 30 E2E prolazi, 46 DB testova prolazi (prvi put). CI: DB testovi i E2E sa prijavom i upisom (secrets dodati 2026-10-10): 29 prolazi + 1 flaky (A10.7) |
| A10.3 | E2E za svaku A9 stavku koja menja tok (faktura, predračun, katalog, lager) | Uz svaki PR: greška učitavanja (#115), slobodna stavka (#119), kupac iz fakture (#121); čekaju A10.2 |
| A10.5 | Svi unit testovi u CI-ju: 6 fajlova nije bilo u `vitest.config.ts` (`validations.test.ts` bio zastareo); zaštitni test pada kad se novi fajl ne doda | ✅ #120 (108 fajlova / 699 testova) |
| A10.6 | CI ne pravi `next build`; greška u bundle-u se vidi tek na Vercel proveri (#118). Pre spajanja: `npm run build` lokalno i zelen Vercel check | Pravilo za svaki PR |
| A10.4 | A1.13 smoke na domenu: `E2E_BASE_URL=<domen> npm run e2e:public` + ručna faktura od registracije do PDF-a | 30. okt |
| A10.7 | Istražiti povremenu React grešku #418/#422 (hydration) na Podešavanjima za potpuno nov nalog dok drugi test upisuje podatke firme; React se oporavi, korisnik ne vidi ništa, CI prolazi iz drugog pokušaja (1 "flaky" u prvom CI pokretanju #133). Nije reprodukovano bez istovremenih upisa (52 + 5 pokretanja) | Niska prioritet |

**Zamrzavanje koda: 28. oktobar.** Posle toga samo popravke grešaka nađenih u A1.13.

### Uslovi za lansiranje 1. novembra (sve mora biti tačno)

- [ ] Domen radi, Clerk `pk_live_`, registracija i prijava sa 2FA prolaze
- [ ] /uslovi i /privatnost imaju prave podatke operatera
- [x] A2.1-A2.3 spojeni (stanje robe i izolacija firmi)
- [ ] Smoke test na produkcijskom domenu prolazi (A1.13)
- [ ] Landing ima kontakt, primere i nijednu tvrdnju koja ne radi (kontakt i tvrdnje ✅ #94; primeri čekaju A1.7)
- [ ] SEF: na PRD-u pravi SEF uključen (A1.14) ili #108 spojen i demo slanje sakriveno (A3.6); landing usklađen (A2.12)
- [x] A9.1-A9.3 spojeni (greške u fakturama: #111, #112, #113)
- [ ] Javni E2E smoke prolazi na domenu (A10.4)
- [ ] Analitika i Sentry uključeni
- [ ] Backup vraćen bar jednom

## Faza B: prvih 6 nedelja posle lansiranja (novembar-decembar)

| # | Funkcija | Vrednost | Trud | Zašto |
|---|---|---|---|---|
| B1 | SEF slanje, ako nije stiglo u A3; zatim knjižno odobrenje (povraćaj robe) kroz SEF | Visoka | M-L | PDV firme su najveći deo tržišta. |
| B2 | **Tim (Admin + Magacioner)**: vidi "Owner panel i tim", faza T (T0-T7) | Visoka | L | Menja model (`Profile.clerkUserId` je jedinstven): prvo jedna funkcija "trenutna firma", pa tabela članstva, pa provera uloge na serveru. |
| B3 | **Prijem robe kao dokument**: Ulaz sa više stavki skeniranjem u nizu, dobavljač i broj njegove fakture, nabavne cene | Visoka | M | Najduži ručni posao; priprema za C1. |
| B4 | **Inventura skenerom**: skeniraj i prebroj, razlika prema stanju, potvrda kroz postojeće "Ažuriraj stanje" | Srednja | M | Veleprodaja radi popis bar jednom godišnje. |
| B5 | Cenovnik po kupcu (popust ili posebna cena po kupcu u predračunu i katalogu) | Srednja | M | Veleprodaja to danas ima u Excelu; Konty to prodaje. |
| B6 | **Upit sa javnog kataloga**: kupac upiše količine i pošalje, stiže kao nacrt predračuna (bez korpe i plaćanja) | Visoka | M | Najjači razlog da kupac koristi link; treba odobrenje vlasnika jer je blizu korpe. |
| B7 | Štampa nalepnica sa barkodom za robu bez barkoda | Srednja | S-M | Mali proizvođači i prepakovana roba. |
| B8 | Brisanje slike iz Storage-a kad se ukloni sa proizvoda | Niska | S | Sada ostaju fajlovi bez vlasnika. |
| B9 | Naplata pretplate u aplikaciji, faza 1: račun sa IPS QR i ručna potvrda | Srednja | M | Kad bude 10 firmi koje plaćaju. Do tada: `docs/billing-runbook.md` (predračun iz vlasnikovog TradeMaster naloga, `npm run billing:due`, `npm run access:extend --ref --paid` sa evidencijom u `access_extensions`; kalendarski mesec sa istim danom obnove, 7 dana obaveštenje, 2 dana roka, pa samo pregled, aktivacija najkasnije narednog radnog dana). Predračun ide automatski (Vercel Cron + Resend, 20 € po srednjem kursu NBS, bez PDV-a jer je T&G Nest paušalac, iz T&G Nest naloga; kupcima tek uz `BILLING_AUTO_SEND=on`, do tada samo vlasniku); uplata, SEF faktura i `access:extend` ostaju ručni. Odluka vlasnika 2026-10-10. |

## Owner panel i tim: smernice (odluka vlasnika 2026-10-10)

Dva odvojena unapređenja, po redu: **O** = panel vlasnika platforme (samo Uroš: statistika i nalozi), **T** = tim unutar firme korisnika (Admin + Magacioner, zamenjuje B2). O ide prvi jer ne menja model podataka korisnika; T menja kako se firma pronalazi u svakoj API ruti i zato ide tek posle lansiranja, korak po korak.

### Kako je danas (provereno u kodu 2026-10-10)

- Clerk daje samo identitet (`userId`). Firma je `Profile` sa jedinstvenim `clerkUserId`: jedan nalog = jedna firma, nema uloga ni članstva. `GET /api/profile` lenjo pravi profil i daje 60 dana probnog perioda.
- Svaka API ruta sama traži profil (`prisma.profile.findUnique({ where: { clerkUserId } })`, 28 ruta, 36 mesta sa "Profile not found"). Ne postoji jedna funkcija "trenutna firma".
- Pristup: `Profile.accessExpiresAt` + `accessStatus()` (`src/lib/access-period.ts`: unlimited/active/expiring/grace/expired, `daysLeft`), `accessExpiredResponse` na rutama koje pišu. Produženje: `npm run access:extend` → `applyAccessExtension` (`src/lib/access-extension.ts`) sa tragom u `access_extensions`. Spisak za naplatu: `npm run billing:due`. Automatski predračun (#138): Vercel Cron `/api/cron/billing`, tabela `billing_notices` (`isTest`, `ownerOnly`), izdavalac `BILLING_ISSUER_PROFILE_ID` (T&G Nest), firme vlasnika koje se ne naplaćuju `BILLING_EXCLUDE_PROFILE_IDS`; dokumenti pretplate su odvojeni od faktura korisnika (`src/lib/subscription-documents.ts`).
- Javne rute su samo u `isPublicRoute` (`src/lib/route-access.ts`); sve ostalo štiti Clerk middleware.

Zaključak: panel vlasnika može da se napravi **pored** aplikacije, nad postojećim tabelama i postojećim funkcijama (`accessStatus`, `planAccessExtension`, `applyAccessExtension`, logika iz `billing:due`), bez ijedne izmene korisničkih stranica. Tim traži prvo jednu funkciju za "trenutnu firmu", pa tek onda članstvo.

### Pravila koja važe za svaki O i T korak

1. **Korisnik ne vidi razliku** dok ne postoji drugi član firme. Firma sa jednim nalogom radi tačno kao danas: iste stranice, isti API odgovori, isti testovi. Postojeći unit, DB i E2E testovi prolaze **bez izmene** očekivanja (menjaju se samo ako korak to izričito traži).
2. **Server odlučuje.** Uloga i "owner" se proveravaju u API ruti i u server komponenti, nikad samo sakrivanjem dugmeta. Zod na klijentu i serveru kao i do sada.
3. **Prekidač pre svega.** Svaka nova mogućnost ima env prekidač (`OWNER_PANEL=on`, `TEAM_ROLES=on` + `TEAM_ROLES_PROFILES=<id,id>` kao `SEF_SENDING_PROFILES` u #108). Isključeno = kod se ne izvršava. Prvo na test nalogu, pa na T&G Nest, pa za sve.
4. **Migracije samo dodaju** (nova tabela ili nova kolona sa podrazumevanom vrednošću), SQL u `supabase/migrations/` + `prisma/schema.prisma`, primena na produkciju samo uz odobrenje vlasnika, pre toga `prisma migrate status`. Nijedna postojeća kolona se ne briše niti menja tip u istom koraku.
5. **Jedan mali draft PR po koraku**, `npm run typecheck && npm run lint && npm run test:run`, `npm run build` lokalno (nove stranice i server importi), zelen Vercel check; merge samo kad vlasnik kaže "merge".
6. **Privatnost korisnika.** Panel vlasnika vidi metapodatke naloga i brojeve (koliko proizvoda, faktura), **nikad** sadržaj: ne artikle, ne kupce, ne iznose faktura, ne nabavne cene. Nema "uloguj se kao korisnik" (impersonacija) u ovom planu. `/privatnost` dobija rečenicu o tome šta operater vidi pre O3 na produkciji.
7. **Landing ne pominje tim** dok T5 ne radi u produkciji.

### Faza O: panel vlasnika platforme

**Ko je vlasnik.** Lista Clerk user id-jeva u server env `PLATFORM_OWNER_USER_IDS` (ne mejl: mejl se u Clerku menja i dodaje; id je stalan). Prazno = niko. Clerk nalog vlasnika ima uključenu 2FA; akcije koje menjaju podatke traže svežu potvrdu (Clerk reverification, `auth().has({ reverification: 'strict' })`) . Ne koristi se `Profile` niti Clerk `publicMetadata` za ovu ulogu, da je korisnik nikako ne može dobiti preko svog profila.

**Gde.** Stranice `/owner/*` u svojoj grupi `src/app/(owner)/` sa svojim layout-om (ne `DashboardLayout`, bez korisničke navigacije), API `/api/owner/*`. Nisu u `isPublicRoute`. Svaki handler i server stranica počinje sa `requirePlatformOwner()` (`src/lib/platform-owner.ts`), koji za ne-vlasnika vraća **404** (ne 403, da se ne otkriva da panel postoji). `robots` noindex. Nijedan link iz korisničke aplikacije ne vodi na `/owner`.

**Uroševa firma i izgled (odluka vlasnika 2026-10-10).** Vlasnik posle prijave vidi **samo panel**: drugačiji izgled i svoj meni (Statistika, Nalozi, Naplata), bez ijedne korisničke stranice. `src/lib/after-auth.ts` ga vodi na `/owner`, a `src/app/(dashboard)/layout.tsx` za vlasnika radi `redirect('/owner')` (za sve ostale se ništa ne menja). T&G Nest i dalje postoji kao profil u bazi jer iz njega automatski idu predračuni za pretplatu (`BILLING_ISSUER_PROFILE_ID`, cron ne traži prijavu), ali vlasnik ne otvara njegove stranice: ono što danas radi u Fakturama T&G Nest-a ("Pretplate TradeMaster": pretvaranje u fakturu, "Plaćeno") prelazi u panel u O5. Prvi pravi predračuni idu tek u decembru, pa do O5 nema ručnog posla koji bi tražio korisničke stranice. Ako vlasniku ikad zatreba korisnički prikaz za proveru, to je poseban test nalog, ne njegov.

| # | Šta | Menja za korisnike | Migracija | Detalj |
|---|---|---|---|---|
| O1 | 🟡 (#142, draft, čeka "merge") **Kapija vlasnika** | Ništa | Ne | `src/lib/platform-owner.ts` (`isPlatformOwner(userId)`, `requirePlatformOwner()`), prekidač `OWNER_PANEL`, prazna `/owner` stranica "Panel vlasnika", `GET /api/owner/ping`. Testovi: bez env-a niko nije vlasnik; običan korisnik dobija 404 na stranici i na API-ju; `isPublicRoute` ne sadrži `/owner`; `after-auth` vodi vlasnika na `/owner`, sve ostale na `/dashboard` kao do sada; `(dashboard)/layout.tsx` vlasnika preusmerava na `/owner`, ostale pušta kao do sada. Panel ima svoj layout i meni (Statistika, Nalozi, Naplata; stavke koje još ne postoje su sive "uskoro"). **Urađeno 2026-10-10.** Kako je izvedeno: forme za prijavu i dalje vode na `/dashboard`, a `(dashboard)/layout.tsx` odatle šalje vlasnika na `/owner` (kad je `OWNER_PANEL` isključen, Clerk se i ne pita); `(owner)/layout.tsx` i svaka stranica zovu `requirePlatformOwner()`; `/owner` nije upisan u `robots.ts` (javni robots.txt bi otkrio da panel postoji), layout nosi noindex. Zatvorene su samo korisničke **stranice**: korisničke API rute i dalje odgovaraju vlasnikovoj Clerk sesiji za T&G Nest profil. Env u `.env.example`. |
| O2 | 🟡 (#143, draft, naslonjen na #142) **Statistika** (samo čitanje) | Ništa | Ne | `src/lib/owner-stats.ts` (čista funkcija nad redovima, sa testom) + `GET /api/owner/stats` + stranica. Brojevi: ukupno firmi; nove po nedelji (12 nedelja); po stanju pristupa (probni / plaća / ističe za 7 dana / rok 2 dana / samo pregled / bez ograničenja) iz `accessStatus` + `isTrialPeriod`; aktivacija (ima proizvod, izdao prvu fakturu ili predračun, podelio katalog: isto što `src/lib/onboarding.ts`); aktivni u 7/30 dana (poslednji upis u `products`, `invoices`, `stock_movements`); prelazak probni → plaćen (firme sa bar jednim `access_extensions` redom); mesečni prihod = broj firmi sa aktivnom pretplatom × cena (`MONTHLY_PRICE`); otkazi = firme koje su prošle "samo pregled" bez nove uplate. Sve sume računa baza (`count`, `groupBy`), ne učitavaju se svi redovi. Firme vlasnika (`BILLING_ISSUER_PROFILE_ID`, `BILLING_EXCLUDE_PROFILE_IDS`) i demo nalozi se ne broje kao korisnici; `billing_notices` sa `isTest` se nikad ne računaju. **Urađeno 2026-10-10** (`/owner/stats`, `/owner` vodi na nju; `src/lib/owner-stats-query.ts` čita). Razlike od ovog reda: (1) "plaća" se određuje po `access_extensions`, ne samo po `isTrialPeriod`: firma kojoj je datum promenjen ručno je "Ručno produženo" i ne ulazi u prihod; (2) mesečni prihod broji samo firme čiji plaćeni period pokriva danas (aktivne i "ističe"), ne one u roku od 2 dana; cena iz `MONTHLY_PRICE_EUR`; (3) "otkazi" = platili pa su sada samo pregled; probni koji su istekli bez uplate su posebno i ulaze u stopu prelaska; (4) čita se jedan red po firmi (tri datuma) da stanje računa ista `accessStatus`, sve ostalo je `groupBy`; (5) demo nalozi se izuzimaju preko novog env-a `PLATFORM_DEMO_PROFILE_IDS`; (6) `billing_notices` se u O2 uopšte ne čita. |
| O3 | 🟡 (#144, draft, naslonjen na #143) **Nalozi** (samo čitanje) | Ništa | Ne | Tabela: firma, mejl za prijavu (Clerk `users.getUserList` po `clerkUserId`, keš po zahtevu), PIB, otvoren, probni/pretplata, **dana ostalo** (`daysLeft`, crveno ≤ 7), stanje, poslednja uplata (`access_extensions`), poslednji automatski predračun i njegov status (`billing_notices`), broj proizvoda/faktura, poslednja aktivnost. Filteri: "ističe za 10 dana" (isto kao `billing:due`), "u roku", "samo pregled", "probni", pretraga po nazivu/PIB-u/mejlu. Detalj naloga `/owner/accounts/[id]`: istorija produženja i predračuna. Pre produkcije: rečenica u `/privatnost`. **Urađeno 2026-10-10** (`src/lib/owner-accounts.ts`, `owner-accounts-query.ts`, `clerk-emails.ts`). Kako je izvedeno: mejlovi idu sa Clerk Backend API-ja u grupama od 100, jednom po otvaranju stranice; ako Clerk ne odgovori, lista se otvara bez mejlova i to piše; nema `/api/owner/accounts` (stranice čitaju bazu na serveru, pa nijedna ruta ne vraća mejlove korisnika); nema straničenja; firme vlasnika i demo nalozi su u listi sa oznakom; "Probni" = još u besplatnom periodu; prozor od 10 dana je ponovljen kao `DUE_WITHIN_DAYS` dok O5 ne spoji sa skriptom; "poslednja aktivnost" je ista funkcija kao u O2; detalj pokazuje i ID naloga (za env liste i skripte) i probne predračune sa oznakom "test". Rečenica u `/privatnost` je dodata ("Šta operater vidi"), čeka da je vlasnik pročita. |
| O4 | **Produženje iz panela** | Ništa (korisnik vidi novi datum kao i posle skripte) | Da: `owner_audit_log` | Isti tok kao `access:extend`: forma (broj predračuna, datum sa izvoda) → **pregled** (`previewAccessExtension`: stari datum, period, "na vreme / posle zaključavanja") → potvrda sa Clerk reverification → `applyAccessExtension`. Jedinstveni `reference` već sprečava dvostruko produženje. Tabela `owner_audit_log` (ko, kada, akcija, profileId, pre/posle, razlog) za svaku izmenu iz panela. Dodatno: "poklon dana" sa obaveznim razlogom (osnivačka ponuda, kompenzacija), isto kroz audit. Skripte ostaju kao rezerva. Bez brisanja naloga iz panela. |
| O5 | **Naplata u panelu** | Ništa | Ne | Ekran "Danas": `billing:due` logika prebačena u `src/lib/billing-due.ts` (skripta i panel je dele), stanje `billing_notices` (poslato / neuspelo, greška, broj pokušaja), dugme "Pošalji ponovo" za neuspeo predračun kroz postojeći `billing-run`; dokumenti pretplate iz T&G Nest-a (`src/lib/subscription-documents.ts`): "Pretvori u fakturu" i "Plaćeno" iz panela, kroz iste funkcije kao u Fakturama, pa odmah "Produži pristup" (O4). Posle ovoga dnevni rad sa laptopa nije potreban; skripte ostaju za hitne slučajeve. |
| O6 | Kasnije, po potrebi | Ništa | Možda | `lastSeenAt` na profilu (jedan upis dnevno iz `GET /api/profile`) ako aktivnost iz O2 nije dovoljna; obaveštenje vlasniku (mejl) za neuspeo predračun i za firme koje padaju u "samo pregled"; privremeno blokiranje naloga (Clerk ban) samo uz audit. |

Redosled i rokovi: O1-O3 samo čitaju i ne diraju korisničke stranice, pa mogu i pre zamrzavanja koda (28. okt), ali A-stavke za lansiranje imaju prednost. O4-O5 moraju raditi pre isteka prvih probnih perioda (registracija 1. novembra → istek 31. decembra), znači do sredine decembra.

**Stanje 2026-10-10: O1, O2 i O3 su napisani, kao tri draft PR-a naslonjena jedan na drugi (#142 ← #143 ← #144); spajaju se tim redom, svaki na "merge".** Bez migracija i bez izmene korisničkih API ruta; od korisničkih stranica menjaju se samo `(dashboard)/layout.tsx` (preusmerenje vlasnika) i `/privatnost`. Lokalno prolaze typecheck, lint (5 poznatih upozorenja), 129 fajlova / 865 unit testova, 8 fajlova / 79 DB testova na Docker test bazi i `npm run build`; izgled Statistike i Naloga je proveren sa probnim podacima na širini računara i telefona. **Još nije provereno:** prave stranice sa Clerk prijavom i čitanje mejlova sa pravog Clerk-a (traže env iz A1.16 na Preview-u). Sledeće: O4 (prvi korak koji upisuje podatke i traži migraciju `owner_audit_log`).

### Faza T: tim u firmi (Admin + Magacioner), zamenjuje B2

**Ponuda (predlog, čeka potvrdu vlasnika A1.6):** pretplata uključuje 1 Admin nalog (sve stranice, kao danas) i 1 Magacioner nalog. Dodatni članovi kasnije, uz doplatu.

**Šta vidi Magacioner (odluka vlasnika 2026-10-10):**

| Deo | Admin | Magacioner |
|---|---|---|
| Početna | sve | brze akcije i lager upozorenja, bez novca (naplaćeno, profit, "Kasni naplata") |
| Asortiman | sve | vidi i dodaje/menja artikle i Brzi sken; **ne vidi i ne menja nabavnu cenu** (`costPrice`), novi artikal bez nabavne kao Brzi sken, Admin je dopunjava |
| Magacin | sve | Ulaz/Izlaz, lager lista **bez** nabavne vrednosti |
| Predračuni | sve | pravi, menja, deli i štampa predračun; bira postojećeg kupca ili upisuje novog na dokumentu |
| Fakture (izdate), "Pretvori u fakturu", otpremnica, SEF, izvoz | sve | ne |
| Katalozi | sve | ne (prvi korak; lako se doda kasnije) |
| Kupci, Finansije, Podešavanja, Tim | sve | ne |

Pravilo uz to: što magacioner ne sme da vidi, **server ne šalje** (npr. `costPrice`, `unitCost`, vrednost lagera po nabavnoj se brišu iz JSON-a za tu ulogu), ne samo da UI ne prikazuje.

**Zašto sopstvena tabela članstva, a ne Clerk Organizations:** svi podaci i svi upiti su već po `profileId`, izolacija je testirana u našoj bazi (`tenant-isolation.db.test.ts`), a dve uloge ne traže Clerk organizacije, njihove role i biranje aktivne organizacije u UI-ju. Clerk ostaje samo za identitet i pozivnice. Ako jednog dana zatreba više firmi po korisniku ili SSO, prelazak na Clerk Organizations ide preko iste funkcije iz T0.

| # | Šta | Menja za korisnike | Migracija | Detalj |
|---|---|---|---|---|
| T0 | **Jedna funkcija "trenutna firma"** | Ništa | Ne | `src/lib/company-context.ts`: `getCompanyContext()` vraća `{ userId, profile, role: 'ADMIN' }` ili gotov 401/404 odgovor. Zamenjuje 28 kopija traženja profila, ruta po ruta, u 2-3 PR-a (proizvodi + magacin, fakture, ostalo). Odgovori i statusi ostaju bajt-za-bajt isti; `tenant-isolation.db.test.ts` i `access-expired.test.ts` prolaze bez izmene. Zaštitni test: nijedna ruta u `src/app/api` (osim `profile`, `public`, `shared`, `cron`, `owner`) ne zove `profile.findUnique({ where: { clerkUserId` direktno. |
| T1 | **Matrica dozvola u kodu** | Ništa | Ne | `src/lib/permissions.ts`: uloge `ADMIN`, `WAREHOUSE`; akcije (`product:write`, `product:cost:read`, `stock:write`, `proforma:write`, `invoice:issue`, `invoice:read`, `finance:read`, `clients:manage`, `catalog:manage`, `settings:manage`, `team:manage`); `can(role, action)`. Test za svaku ćeliju tabele iznad. Još se nigde ne koristi osim `ADMIN` = sve. |
| T2 | **Tabela članstva** | Ništa | Da: `company_members` | `company_members(id, profileId, clerkUserId UNIQUE, role, status, invitedEmail, createdAt)`. Backfill: jedan `ADMIN` red po postojećem profilu iz `profiles.clerkUserId` (to je postojeći podatak, ne izmišljen). `getCompanyContext()` traži član → profil, sa rezervom na `Profile.clerkUserId` ako reda nema. `Profile.clerkUserId` ostaje i dalje jedinstven i upisan (ne briše se). DB test: svaki postojeći profil ima tačno jednog Admina; nova registracija pravi profil + Admin člana u istoj transakciji. |
| T3 | **Server proverava ulogu** | Ništa za Admina | Ne | Svaka ruta zove `requirePermission(ctx, akcija)` → 403 "Nemate dozvolu". Fakture: magacioner sme samo `documentType = PROFORMA` (kreiranje, izmena, PDF, deljenje), nikad `convert`, `PATCH` statusa na fakturi, SEF, export. Uklanjanje `costPrice`/`unitCost` iz odgovora za ulogu bez `product:cost:read`, i ignorisanje tih polja u upisu (PUT proizvoda ne briše postojeću nabavnu). Novi DB test "magacioner": 403 na finansije, izvoz, kupce, podešavanja, SEF, izdavanje; nijedan JSON ne sadrži `costPrice`/`unitCost`; i dalje ne vidi drugu firmu. Iza `TEAM_ROLES` prekidača. |
| T4 | **UI po ulozi** | Ništa za Admina | Ne | `GET /api/profile` vraća i `role` (dodato polje, ništa uklonjeno). `navigation.ts` filtrira stavke kroz `can()`; stranice van uloge u server komponenti preusmeravaju na `/dashboard`; Početna bez novčanih kartica; forma proizvoda bez polja nabavne; Fakture za magacionera prikazuje samo predračune. E2E: postojeći testovi nepromenjeni + novi `@writes` test sa magacionerom. |
| T5 | **Pozivanje člana** | Admin vidi novu karticu Podešavanja → Tim (samo kad je `TEAM_ROLES` uključen za firmu) | Ne | Admin upiše mejl → Clerk invitation (`clerkClient.invitations.createInvitation` sa `publicMetadata.inviteId`) → `company_members` red `INVITED`. Prihvatanje: **`GET /api/profile` ne sme da napravi novu firmu** za korisnika koji ima pozivnicu ili članstvo (najveći rizik ovog koraka, poseban test). Uklanjanje člana: status `REMOVED` + Clerk revoke sesija. Limit: 1 Admin + 1 Magacioner po firmi. Admin ne može da ukloni sebe ako je jedini Admin. `accessExpiredResponse` važi za celu firmu (članovi nasleđuju pristup). |
| T6 | **Ko je šta uradio** | Novi podatak na dokumentima | Da: kolone `createdByUserId` | Na `invoices` i `stock_movements` (nullable, stari redovi ostaju NULL, ne izmišlja se). "Izdao: ime" na predračunu u aplikaciji, ne na PDF-u. Pun dnevnik izmena ostaje C4. |
| T7 | Landing i uslovi | Tekst | Ne | Tek kad T5 radi u produkciji kod bar jedne pilot firme: "Admin + Magacioner u ceni", FAQ, `/uslovi` (ko je odgovoran za članove). |

Redosled: T0 i T1 posle lansiranja (novembar), čist refaktor bez promene ponašanja. T2-T5 kad prve firme to traže ili kad vlasnik potvrdi ponudu sa magacionerom. Svaki korak se pusti prvo na test nalogu (`TEAM_ROLES_PROFILES`), pa T&G Nest, pa svi.

### Šta namerno ne radimo

- Impersonacija ("uđi u nalog korisnika") i čitanje sadržaja firmi iz panela vlasnika.
- Brisanje naloga ili podataka iz panela (ide kroz ručni postupak uz zahtev korisnika).
- Uloge u Clerk `publicMetadata` kao jedini izvor istine (lako se pokvari ručnom izmenom u Clerk dashboard-u, nema istorije).
- Više firmi po jednom korisniku i SSO (C4 ili kasnije).

## Faza C: 2027

| # | Funkcija | Vrednost | Trud | Uslov |
|---|---|---|---|---|
| C1 | **AI: Ulaz iz fotografije ili PDF-a fakture dobavljača** → nacrt prijema sa artiklima, količinama i nabavnim cenama; korisnik potvrđuje pre snimanja | Visoka | M | Ako pilot korisnici potvrde da je prijem robe problem; dopuna politike privatnosti. |
| C2 | AI: uvoz neurednog cenovnika dobavljača i predlog kategorije/opisa za katalog | Srednja | S-M | Posle C1. |
| C3 | **E-otpremnice**: B2B obaveza od 1. oktobra 2027 (akcizni proizvodi i javni sektor od 1. januara 2026) | Visoka | L | Početi u proleće 2027; dobar prodajni razlog za veleprodaju pića. |
| C4 | Tim, pun: više magacina/lokacija, dnevnik izmena po korisniku | Srednja | L | Posle T6. |
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
