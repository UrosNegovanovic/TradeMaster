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

## Šta je urađeno (2026-10-09, posle #121)

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
| A2.11 | Stranice `/za/veleprodaju`, `/za/preduzetnike`, `/za/proizvodjace`; jedan izvor adrese (`src/lib/site-url.ts`); sitemap i robots očišćeni (`/shared/` se ne indeksira); OG slike iz koda; JSON-LD | #97 |

Migracije `invoice_document_type` i `registration_numbers` su u produkciji od 2026-10-05 (provereno u listi migracija Supabase projekta 2026-10-06). Baza je u `eu-west-1`, Vercel funkcije u `dub1` (EU).

## Faza A: do lansiranja (7. oktobar - 1. novembar)

### A1. Na vlasniku

| # | Šta | Rok | Zašto |
|---|---|---|---|
| A1.1 | 🟡 XML za SEF učitan na SEF demo okruženju (demo nalog firme). 2026-10-09: XML fakture 11/2026 sa ispravnim podacima napravljen i proveren (iznosi, PDV, adrese, račun); ostaje učitavanje na portal. Demo prihvata samo PIB firme kojom ste prijavljeni i kupca registrovanog na SEF-u. | 15. okt | Uslov za A3 i za bilo kakvu SEF rečenicu na landingu |
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
| A1.14 | **SEF na produkciju uz PRD release** (odluka vlasnika 2026-10-09: do PRD release-a, kupovine domena i Clerk Production, SEF slanje ostaje uključeno na **demo** za sve, da bismo slali i testirali fakture). Na PRD: demo slanje sa pravim PIB-om firme i kupcem na SEF-u prošlo, pa u Vercelu `SEF_API_BASE_URL=https://efaktura.mfin.gov.rs` i `SEF_ALLOW_PRODUCTION=on`, redeploy. Ako pravi SEF tada nije spreman: spojiti A3.6 (#108) da kupci ne vide demo slanje. | 28-31. okt (PRD) | Prvi kupci ne smeju da "šalju" u demo misleći da je pravi SEF |
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
| A2.10 | Ugovor o obradi podataka (DPA) u /uslovi i obaveštenje o kolačićima kad je analitika uključena | Srednja | S | Tekst da pregleda knjigovođa ili pravnik. |
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
