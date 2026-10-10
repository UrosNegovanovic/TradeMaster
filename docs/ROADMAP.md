# Plan do lansiranja 1. novembra 2026

**Odluka vlasnika (2026-10-06): domen i početak prodaje su 1. novembra.** Do tada se aplikacija dorađuje. Posle lansiranja cilj je prvih 10 firmi koje plaćaju.

Stanje koda, baze i dokumentacije servisa provereno 2026-10-10 (vidi "Provereno stanje"). Tekući blokeri su u `docs/STATUS.md`, marketing, cena i landing u Claude Doc-u "TradeMaster: prodaja, marketing i AI do lansiranja". Nalazi ChatGPT, Grok i Claude pregleda su provereni u kodu pre nego što su ušli ovde (tabela "Odakle je šta" na dnu).

Ocena: **vrednost** = koliko pomaže prodaji/zadržavanju, **trud** = S (do 1 dan), M (2-3 dana), L (nedelja+).

## Kako čitati stanje

Četiri stanja, da "postoji kod" ne bi značilo "radi":

| Oznaka | Stanje | Šta znači |
|---|---|---|
| ⬜ | planirano | Opisano, nije započeto. |
| 🔧 | kod spreman | Napisano, testovi u CI-ju prolaze. Spoljni servisi (Clerk, Resend, SEF, banka, kamera) su u tim testovima simulirani. |
| 🧪 | provere prošle | Provereno sa pravim servisom ili uređajem van produkcije (test baza, preview, SEF demo), sa zapisanim dokazom. |
| 🟢 | potvrđeno na produkciji | Vlasnik je video da radi na produkciji; naveden je dokaz (datum, ko, šta je gledao). |

U starijim tabelama ✅ uz broj PR-a znači samo **spojeno u main**, dakle najviše 🔧; 🟡 je delimično ili PR otvoren, ⏸ namerno zaustavljeno. Šta je 🧪 ili 🟢 piše u "Uslovi za puštanje u rad". Stanje se podiže samo uz dokaz naveden u toj tabeli.

## Prioriteti do 1. novembra

Po redu: **(1) prijava i identitet** (A0), **(2) izolacija firmi**, **(3) tačnost podataka** (stanje robe, dokumenti, brojevi), **(4) oporavak** (A1.9), **(5) postojeći poslovni tok kod pravih firmi** (A11). Sve drugo čeka dok ovih pet nije bar 🧪. Tim (faza T), AI (faza C) i statistika panela (O2) ne uzimaju vreme ovim stavkama i ne ulaze u produkciju pre lansiranja ako neka od njih kasni.

## Provereno stanje (2026-10-10)

Iz produkcione baze (samo čitanje, zbirni brojevi bez naziva i sadržaja firmi) i iz zvanične dokumentacije servisa:

| Šta | Nalaz | Posledica |
|---|---|---|
| Nalozi | 55 profila. 6 bez datuma isteka (otvoreni januar-septembar, 5 ima podatke). 49 otvoreno 5-10. oktobra sa istekom probe **4-9. decembra**; od tih 49 samo 1 ima ijedan proizvod, dokument ili katalog, a 5 ima naziv firme. | Ranija rečenica "49 firmi ističe u decembru" znači 49 **naloga**, većinom bez podataka. Ko je stvarna firma utvrđuje A0.1. |
| Naplata | 0 evidentiranih uplata, 0 automatskih predračuna (probni je obrisan). | Naplata još nijednom nije prošla sa pravim kupcem. |
| Fajlovi | 101 fajl u 2 Storage bucket-a (slike proizvoda, logotipi). | Ulaze u probu oporavka (A1.9). |
| Supabase | Organizacija je na **besplatnom planu**. Dnevne kopije postoje od Pro plana (poslednjih 7 dana); za besplatni plan Supabase upućuje na sopstveni `db dump`. Kopija baze ne sadrži Storage fajlove. | Danas nema automatske rezervne kopije: A1.18 (plan) i A1.9 (proba). |
| Clerk | Produkcija radi na **Development** instanci (`pk_test_`): najviše 100 korisnika, "nije za produkcijski rad", korisnici se **ne mogu preneti** između instanci. Production traži sopstveni domen i DNS zapise; SSO veze, integracije i podešavanja putanja se ne kopiraju. | Posle prelaska svaki korisnik dobija nov Clerk id, a `Profile.clerkUserId` čuva stari. Sama zamena ključeva odvaja sve firme od njihovih vlasnika: A0. |
| Vercel Cron | Neuspelo pokretanje se ne ponavlja; isporuka je "best effort" (može izostati ili stići dvaput). Na Hobby planu: jednom dnevno, bilo kad u okviru zadatog sata; runtime logovi se čuvaju 1 sat; plan je po uslovima samo za nekomercijalnu upotrebu. | Naplata ne sme da zavisi od logova ni od toga da je cron sigurno radio: B9.7. Plan naloga nije proveren: A1.18. |
| Resend | Uspešan API odgovor znači "prihvaćeno, pokušaćemo isporuku" (`email.sent`), ne "isporučeno" (`email.delivered`). Ključ idempotentnosti važi 24 h; isti ključ sa drugačijim sadržajem vraća grešku 409. | B9.4 i B9.6. |

Izvori (pročitano 2026-10-10): Clerk [Environments](https://clerk.com/docs/deployments/environments), [Deploy to production](https://clerk.com/docs/deployments/overview), [Migrating users](https://clerk.com/docs/deployments/migrate-overview); Vercel [Managing Cron Jobs](https://vercel.com/docs/cron-jobs/manage-cron-jobs), [Hobby plan](https://vercel.com/docs/plans/hobby); Resend [Event types](https://resend.com/docs/dashboard/webhooks/event-types), [Idempotency keys](https://resend.com/docs/dashboard/emails/idempotency-keys); Supabase [Backups](https://supabase.com/docs/guides/platform/backups).

## Odluke koje čekaju vlasnika

1. **Kalendar** (Faza A): domen do 14. okt umesto 28. okt, prelazak na Clerk Production 22. okt umesto 29. okt.
2. **Razvrstavanje 55 naloga** na stvarne, vlasničke, demo i testne (A0.1).
3. **Način povezivanja identiteta**: Production korisnici se prave unapred iz odobrenog spiska; migracija tabele veza (A0.3).
4. **Uslov i rok za povratak** posle prelaska (predlog: 2 sata, A0.10) i termin prelaska.
5. **Planovi servisa i trošak**: Supabase Pro zbog rezervnih kopija; Vercel plan koji dozvoljava prodaju (A1.18).
6. **Preview okruženje**: test baza ili isključena prijava, da ne piše u produkcionu bazu (A0.11).
7. **Šta ako uslovi 1-5 iz "Uslovi za puštanje u rad" nisu ispunjeni 30. okt.** Predlog: prodaja kreće 1. novembra samo ako su prijava, izolacija i oporavak 🟢; ako nisu, novi nalozi se ne primaju dok se ne ispune.
8. **Naplata**: izvor kursa (ogledalo ili zvanični servis NBS), da li test predračun troši broj iz niza, prvo slanje ručno po odobrenom spisku (B9.5, B9.8, B9.9).
9. **Panel vlasnika**: ispraviti nazive metrika u #143 i #144 pre "merge" ili presložiti PR-ove (vidi "Metrike").
10. Već otvoreno: kome prodajemo (ispod), pravni tekst A2.10 (#93), ponuda sa magacionerom (faza T).

## Kome prodajemo (predlog, čeka potvrdu vlasnika)

Vlasnik male B2B firme (1-10 ljudi) koji sam vodi robu i ponude i prodaje **drugim firmama**: mala veleprodaja (potrošni materijal, kozmetika, aksesoari, autodelovi, piće), uvoznici koji snabdevaju radnje, mali proizvođači, komercijalisti na terenu. Danas rade u Excelu, Wordu i preko WhatsApp-a.

- Van PDV sistema: TradeMaster pokriva ceo posao. Izuzetak: faktura javnom sektoru i firme koje su se dobrovoljno prijavile na SEF i dalje idu kroz SEF.
- U PDV sistemu: lager, katalog, predračun i otpremnica odmah; faktura ide u SEF. Danas: XML fajl koji firma sama učita na portal (🔧; učitavanje na SEF demo još nije potvrđeno, A1.1). Slanje jednim klikom (A3) radi samo prema SEF **demo** okruženju i ne prodaje se kao gotovo dok A1.14 nije 🟢.
- Ne ciljamo sada: maloprodaju kojoj treba fiskalna kasa, prodaju građanima preko Instagrama (traži fiskalni račun), firme gde više zaposlenih mora istovremeno da radi u programu (dok ne postoji B2).

Glavna poruka: **ceo posao sa robom iz telefona**. Skeniraš robu, pošalješ katalog na WhatsApp, napraviš predračun, pretvoriš ga u fakturu i otpremnicu, kupac plati skeniranjem IPS QR koda.

## Šta je spojeno u main (2026-10-10, posle #138)

Spojeno znači 🔧 (kod spreman), ne 🟢. Redovi O1-O3 su draft PR-ovi koji čekaju "merge".

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
| B9.1 | **Automatski predračun za pretplatu**: Vercel Cron + Resend, 20 € po srednjem kursu NBS bez PDV-a (T&G Nest paušalac), iz T&G Nest naloga, kopija vlasniku; kupcima tek uz `BILLING_AUTO_SEND=on`, do tada samo vlasniku; naplata pretplate (B) strogo odvojena od faktura korisnika (A); vlasnik filtrira "Pretplate TradeMaster", korisnik vidi svoje u Podešavanja → Pristup i uplata; `billing:send --test`. Migracije `billing_notices` i `billing_notices_test_owner_flags` u produkciji; proba PR-03/2026 (TEST) poslata vlasniku i obrisana 2026-10-10; otvoreni nalazi su u B9 | #138 |
| A2.11 | Stranice `/za/veleprodaju`, `/za/preduzetnike`, `/za/proizvodjace`; jedan izvor adrese (`src/lib/site-url.ts`); sitemap i robots očišćeni (`/shared/` se ne indeksira); OG slike iz koda; JSON-LD | #97 |
| O1 | **Panel vlasnika: kapija** (draft, čeka "merge"): `/owner` samo za Clerk id-jeve iz `PLATFORM_OWNER_USER_IDS` uz `OWNER_PANEL=on`, svi ostali 404; svoj izgled i meni; vlasnik sa korisničkih stranica ide na `/owner`. Bez migracije | #142 |
| O2 | **Panel vlasnika: Statistika** (draft, čeka "merge"): firme, nove po nedelji, stanje pristupa, aktivacija, aktivne u 7/30 dana, prelazak probni → plaćen, mesečni prihod, otkazi; samo brojevi, samo čitanje. Bez migracije | #143 |
| O3 | **Panel vlasnika: Nalozi** (draft, čeka "merge"): lista firmi sa mejlom za prijavu, danima do isteka, poslednjom uplatom i predračunom; filteri i pretraga; istorija uplata i predračuna po nalogu; odeljak "Šta operater vidi" u /privatnost. Bez migracije | #144 |

Migracije `invoice_document_type` i `registration_numbers` su u produkciji od 2026-10-05 (provereno u listi migracija Supabase projekta 2026-10-06). Baza je u `eu-west-1`, Vercel funkcije u `dub1` (EU).

## Faza A: do lansiranja (7. oktobar - 1. novembar)

### Predlog kalendara (čeka potvrdu vlasnika; početak prodaje ostaje 1. novembra)

Domen i produkcijska prijava se pomeraju sa 28-29. oktobra na sredinu meseca, da prelazak identiteta, proba oporavka i pilot stanu pre zamrzavanja koda. Vlasnikov krajnji rok za domen (28. okt) ostaje kao poslednji mogući dan, ali tada A0 i A11 ne mogu da se završe pre 1. novembra.

| Do | Šta |
|---|---|
| 13. okt | A0.1 popis i razvrstavanje naloga; A1.18 planovi servisa; ime domena odlučeno |
| 14. okt | A1.10 domen kupljen i povezan na Vercel |
| 16. okt | A0.2 Clerk Production instanca i DNS zapisi (ključevi još nisu u Vercelu); domen verifikovan u Resend-u (A1.15) |
| 19. okt | A0.3-A0.5 tabela veza, skripta, zaštita i rezervna kopija; A1.9 proba oporavka; A1.2 uređaji |
| 21. okt | A0.6 proba prelaska i povratka na obnovljenoj kopiji |
| 22. okt | A0.8 prelazak na produkciji (uz odobrenja iz A0.7) i A0.9 provera; A1.12 Sentry i analitika |
| 22-27. okt | A11 pilot sa 2-3 firme; A1.14 SEF |
| 28. okt | Zamrzavanje koda |
| 30. okt | A1.13 smoke na domenu; pregled tabele "Uslovi za puštanje u rad" |
| 1. nov | Početak prodaje |

### A0. Clerk Production: prelazak identiteta (prvi tehnički prioritet)

**Zašto ovo nije "zameni ključeve".** Firma je `Profile` sa jedinstvenim `clerkUserId`. Production instanca svakom korisniku daje nov id, a korisnici se ne prenose (vidi "Provereno stanje"). Ako se samo zamene ključevi, postojeći korisnik posle prijave nema profil, `GET /api/profile` mu napravi **novu praznu firmu** sa 60 dana probe, a njegovi proizvodi, fakture i katalozi ostaju vezani za stari id kome niko više ne može da pristupi. Isto važi za T&G Nest (izdavalac predračuna za pretplatu) i za demo firmu sa landinga. Javni linkovi kataloga i faktura ne zavise od Clerk-a i rade i dalje; fajlovi u Storage-u su po `profile.id` i ne menjaju se. Dok se ovo ne uradi, registracija staje na 100 korisnika.

**Pravilo povezivanja.** Produkcijski identitet se vezuje za postojeći profil **samo preko odobrenog reda u tabeli veza** (A0.3), nikad automatski zato što je neko pri registraciji upisao isti mejl. Dva dozvoljena puta:

1. *Unapred (redovan put).* Za nalog sa odobrenog spiska vlasnik skriptom, preko Clerk Backend API, pravi korisnika u Production instanci sa mejlom iz izvoza Development instance. Novi id je poznat u trenutku pravljenja i upisuje se u tabelu veza; korisnik se prijavljuje kodom na mejl ili postavlja novu lozinku.
2. *Naknadno (podrška).* Korisnik se sam registrovao na produkciji. Veza se pravi tek kad je sve troje tačno: mejl je verifikovan u Production instanci, jednak je verifikovanom mejlu starog naloga, i vlasnik je potvrdio identitet drugim kanalom (telefon ili poznat kontakt firme). Ako je taj korisnik u međuvremenu dobio novu praznu firmu, ona se **odvaja, ne briše**, i samo ako je dokazano prazna (nema proizvoda, dokumenata, kataloga, kupaca ni kretanja).

Svaka veza je zamena "samo ako je i dalje staro" (`UPDATE ... WHERE clerkUserId = <stari id>`) u jednoj transakciji sa upisom u tabelu veza; jedan stari id ide na tačno jedan novi i obrnuto.

| # | Korak | Odgovoran | Zavisi od | Dokaz da je završeno | Stanje |
|---|---|---|---|---|---|
| A0.1 | **Popis i razvrstavanje naloga.** Izvoz korisnika iz Clerk Development (Dashboard → Settings → User exports) spojen sa listom profila (id, datum, ima li podatke, naziv i PIB, datum isteka). Svaki od 55 dobija klasu: **stvarni** (firma koja koristi ili će koristiti aplikaciju), **vlasnički** (T&G Nest i drugi Uroševi), **demo** (Sunčano Polje), **testni** (probe, E2E, prazni nalozi nepoznatog porekla), i odluku: prenosi se ili ne. Ništa se ne briše; testni samo ne dobijaju vezu. | Claude priprema spisak, **vlasnik** razvrstava | - | Tabela od 55 redova, svaki sa klasom i odlukom, potvrđena od vlasnika (datum). Čuva se van repoa jer sadrži mejlove. | ⬜ |
| A0.2 | **Production instanca bez prebacivanja.** Instanca u Clerk-u na domenu, DNS zapisi, isti načini prijave i 2FA kao u Development, sopstveni OAuth kredencijali ako se koristi prijava preko Google-a, putanje `/sign-in` i `/sign-up`, posle prijave `/dashboard`. Ključevi `pk_live_` i `sk_live_` se još ne upisuju u Vercel Production. | **Vlasnik** (nalozi, DNS), Claude (lista podešavanja) | A1.10 | Clerk dashboard pokazuje sve DNS zapise kao verifikovane; snimak podešavanja prijave; ključevi sačuvani kod vlasnika. | ⬜ |
| A0.3 | **Tabela veza i skripta.** Nova tabela (migracija koja samo dodaje, uz odobrenje): profil, stari id, novi id, klasa, ko je odobrio, kada povezano, kada vraćeno. Skripta `clerk:link` bez `--apply` samo prikazuje šta bi uradila; pravi Production korisnike za odobrene redove (put 1), upisuje vezu, odbija red koji nije na spisku, dvostruku vezu i profil čiji se stari id u međuvremenu promenio. | Claude | A0.1 (oblik spiska) | Draft PR; DB testovi na test bazi: povezan profil zadržava sve redove; isti red primenjen dvaput ne menja ništa; red van spiska je odbijen; povratak vraća stari id. | ⬜ |
| A0.4 | **Zaštita od nove prazne firme.** `GET /api/profile` ne pravi firmu dok traje prelazak (env prekidač, stranica "Kratko održavanje") i nikad za Production korisnika koji ima odobren, a još neprimenjen red veze. Posle prelaska nov korisnik bez reda dobija novu firmu kao danas. | Claude | A0.3 | Unit i DB test za oba slučaja; postojeći testovi profila prolaze bez izmene očekivanja. | ⬜ |
| A0.5 | **Rezervna kopija pre probe i pre prelaska.** `db dump` cele baze, kopija oba Storage bucket-a, spisak env promenljivih (imena i gde se čuva vrednost) za Vercel, Clerk, Resend i Supabase. | Claude izvodi, **vlasnik** čuva | A1.18 | Fajlovi sa datumom i veličinom; ista kopija je ulaz za A1.9 i A0.6. | ⬜ |
| A0.6 | **Proba na kopiji.** Obnovljena kopija baze i fajlova u zasebnom Supabase projektu; aplikacija na poddomenu istog domena sa `pk_live_` i bazom kopije (prvo proveriti da Production instanca radi na poddomenu; ako ne radi, proba ide na samom domenu pre objave). Izvesti ceo prelazak, pa ceo povratak. | Claude izvodi, **vlasnik** gleda | A0.2-A0.5, A1.9 | Zapisnik probe: (a) po svakom prenetom profilu broj proizvoda, dokumenata, kataloga, kupaca i kretanja pre = posle; (b) T&G Nest: dokumenti i podešavanja isti, sledeći broj predračuna nastavlja niz, `access_extensions` i `billing_notices` netaknuti; (c) nov korisnik dobija novu praznu firmu sa 60 dana; (d) korisnik A dobija 404 na katalog, fakturu i proizvod korisnika B; (e) povratak izveden, trajanje u minutima. | ⬜ |
| A0.7 | **Odobrenja vlasnika**, pismeno (u PR-u ili poruci): spisak iz A0.1, migracija iz A0.3, termin prelaska, uslov za povratak iz A0.10. | **Vlasnik** | A0.6 | Četiri potvrde sa datumom. | ⬜ |
| A0.8 | **Prelazak na produkciji.** Van radnog vremena, najavljen stvarnim korisnicima. Redom: prekidač iz A0.4 → sveža kopija (A0.5) → primena veza → `pk_live_`, `sk_live_` i `NEXT_PUBLIC_APP_URL` u Vercel Production → deploy na domenu → env iz A0.9 → prekidač isključen. | Claude izvodi uz **vlasnika** | A0.7 | Vreme početka i kraja; izlaz skripte (broj povezanih redova, 0 odbijenih); id deploy-a. | ⬜ |
| A0.9 | **Provera posle prelaska, isti dan.** `PLATFORM_OWNER_USER_IDS` sadrži **novi** id vlasnika, stari je uklonjen. `BILLING_ISSUER_PROFILE_ID` je id profila i ne menja se, ali se proverava da taj profil i dalje ima naziv, PIB i žiro-račun T&G Nest-a i da ga otvara vlasnikov novi id. Svaki id u `BILLING_EXCLUDE_PROFILE_IDS` i `PLATFORM_DEMO_PROFILE_IDS` i dalje pokazuje na profil koji treba. `npm run billing:send` bez slanja prikazuje ispravne mejlove (mejl se čita po `clerkUserId`, pa stari id više ne daje adresu). | **Vlasnik** + Claude | A0.8 | Lista sa potvrdama: vlasnik vidi `/owner`, drugi nalog dobija 404; postojeći korisnik vidi iste brojeve kao u A0.6(a); nov korisnik dobija novu firmu; A ne vidi B (ručno, dva naloga); probni spisak naplate nema testnih ni vlasničkih naloga. | ⬜ |
| A0.10 | **Povratak.** Uslov (predlog): u roku od 2 sata posle A0.8 stvarni korisnik ne može da se prijavi ili vidi prazne ili tuđe podatke, a popravka nije poznata. Postupak: Vercel vraćanje na prethodni deploy (sa starim ključevima) i skripta koja vraća stare id-jeve iz tabele veza. Firme koje su novi korisnici otvorili u tom prozoru ostaju u bazi i povezuju se u sledećem pokušaju. Development instanca i njeni ključevi se ne diraju dok A0.9 nije 🟢 i još 14 dana posle toga. | Claude izvodi, **vlasnik** odlučuje | A0.3 | Izvedeno u A0.6(e); na produkciji se dokazuje samo ako zatreba. | ⬜ |
| A0.11 | **Posle prelaska.** Development instanca služi samo za localhost i CI. Preview okruženja ne smeju da pišu u produkcionu bazu sa Development identitetima, jer bi pravila nove prazne firme: proveriti koju bazu Preview danas koristi, pa mu dati test bazu ili isključiti prijavu. Demo nalog i nalog za smoke prijavljenog korisnika dobijaju Production identitet kroz isti spisak. `e2e/README.md`, `CLAUDE.md`, `AGENTS.md` i `docs/STATUS.md` se ažuriraju. | Claude; **vlasnik** odlučuje o Preview bazi | A0.9 | Preview deploy otvoren i proveren: ne vidi i ne menja produkcione firme; dokumenti ažurirani u PR-u. | ⬜ |

### A1. Na vlasniku

Odgovoran za svaki red je vlasnik. Dokaz za kritične stavke je u tabeli "Uslovi za puštanje u rad".

| # | Šta | Rok | Zašto |
|---|---|---|---|
| A1.1 | 🟡 XML za SEF učitan na SEF demo okruženju (demo nalog firme). 2026-10-09: XML fakture 11/2026 sa ispravnim podacima napravljen i proveren (iznosi, PDV, adrese, račun); ostaje učitavanje na portal. Demo prihvata samo PIB firme kojom ste prijavljeni i kupca registrovanog na SEF-u. | 15. okt | Uslov za A3 i za bilo kakvu SEF rečenicu na landingu |
| A1.2 | `docs/device-checklist.md` na Android i iPhone telefonu; IPS QR skeniran pravom bankarskom aplikacijom | 19. okt | Skener i QR su glavne scene u reklami |
| A1.3 | Promeniti lozinku test korisnika u Clerk Dev i učiniti repo `TradeMasterPW` privatnim (lozinka je u javnoj istoriji commit-a) | 12. okt | Bezbednost |
| A1.4 | Pravi podaci operatera u Vercel env: `OPERATOR_PIB`, `OPERATOR_MB`, `OPERATOR_ADDRESS` (od #138 se ne upisuju u kod), pa redeploy | 20. okt | Bez njih /uslovi i /privatnost kažu da podaci tek stižu |
| A1.15 | **Naplata pretplate u Vercel env** (#138 je spojen): `CRON_SECRET`, `BILLING_ISSUER_PROFILE_ID`, `BILLING_EXCLUDE_PROFILE_IDS` (puni se iz A0.1), `RESEND_API_KEY`, `BILLING_EMAIL_BCC`, `BILLING_EMAIL_REPLY_TO`; posle domena (A1.10) verifikovati domen u Resend-u i postaviti `BILLING_EMAIL_FROM`. `BILLING_AUTO_SEND=on` **tek posle B9.9** (odobren spisak primalaca), ne zajedno sa ostalim promenljivama. | 30. okt | Najraniji istek probe je 4. decembar, pa prvi predračun ide 27. novembra (B9) |
| A1.5 | Kontakt za podršku (telefon/WhatsApp), slika i dve rečenice "ko stoji iza" | 20. okt | Ulazi u landing (A2.9) |
| A1.6 | ✅ (2026-10-10) Cena: 20 € mesečno po srednjem kursu NBS, bez PDV-a (T&G Nest paušalac); najava promene cene 30 dana unapred | 20. okt | Ulazi u landing |
| A1.7 | ✅ (#135 spojen) Demo firma sa izmišljenim podacima (20-30 artikala sa slikama, katalog, predračun, faktura) za javne primere i video. "Sunčano Polje Veleprodaja d.o.o." na produkciji (nalog `demo+clerk_test@example.com`, alat `e2e/demo`); dugmad "Pogledajte primer kataloga/fakture" na landingu. Za video se vlasnik prijavljuje tim nalogom (ili isti seed na novom nalogu) | 24. okt | "Otvori primer" dugmad i snimanje videa Posle A0 demo nalog dobija Production identitet kroz spisak iz A0.1. |
| A1.8 | Snimiti demo video 60-90 s i 3 kratka videa (vidi marketing dokument) | 27. okt | Landing i mreže |
| A1.9 | **Proba oporavka: baza, fajlovi i podešavanja.** Iz kopije (A0.5) podići nov Supabase projekat: baza iz `db dump`, oba Storage bucket-a iz kopije, env po spisku, i na njega usmeriti probni deploy. **Uspeh znači da aplikacija radi sa obnovljenim podacima**: prijava, lista proizvoda sa slikama, javni link kataloga sa slikama, PDF fakture sa logom, broj redova po tabeli jednak izvoru. Zapisati koliko je trajalo i koliko su podaci stari. Pre toga A1.18: na besplatnom planu nema automatskih kopija. | 19. okt (predlog; ranije 27. okt) | Odgovor na "šta ako izgubim podatke"; ista kopija služi za probu prelaska (A0.6) |
| A1.10 | **Domen**: kupiti i povezati na Vercel. Predlog **do 14. okt**; vlasnikov krajnji rok 28. okt ostaje, ali tada A0 i A11 ne staju pre 1. novembra. `NEXT_PUBLIC_APP_URL` se menja tek u A0.8. Domen je uslov za Clerk Production (A0.2), Resend (A1.15) i SEO (A2.11). | 14. okt (predlog) | Odluka: prodaja 1. novembra |
| A1.11 | **Clerk Production** (`pk_live_`): ceo postupak je A0, jer sama zamena ključeva odvaja postojeće firme od vlasnika. Registracija i prijava sa 2FA do kraja se proveravaju u A0.6 i A0.9. | 22. okt (predlog; ranije 29. okt) | Danas `pk_test_`: najviše 100 korisnika, nije za produkciju; korisnici sa 2FA mogu da zapnu |
| A1.12 | U Vercelu: `NEXT_PUBLIC_ANALYTICS=on`, `NEXT_PUBLIC_SENTRY_DSN`, Upstash ključevi, Web Analytics | 22. okt (predlog, uz A0.8; ranije 29. okt) | Bez toga ne znamo gde ljudi odustaju, a pilot (A11) ostaje bez praćenja grešaka |
| A1.14 | **SEF na produkciju uz PRD release** (odluka vlasnika 2026-10-09: do PRD release-a, kupovine domena i Clerk Production, SEF slanje ostaje uključeno na **demo** za sve, da bismo slali i testirali fakture). Na PRD: demo slanje sa pravim PIB-om firme i kupcem na SEF-u prošlo, pa u Vercelu `SEF_API_BASE_URL=https://efaktura.mfin.gov.rs` i `SEF_ALLOW_PRODUCTION=on`, redeploy. Ako pravi SEF tada nije spreman: spojiti A3.6 (#108) da kupci ne vide demo slanje. | 28-31. okt (PRD; po predlogu kalendara prelazak na domen i Clerk Production je 22. okt, pa ovo može ranije) | Prvi kupci ne smeju da "šalju" u demo misleći da je pravi SEF |
| A1.13 | Smoke test na produkcijskom domenu: Playwright `TradeMasterPW` smoke prema novom URL-u + jedna ručna faktura od registracije do PDF-a | 30. okt | Smoke prijavljenog korisnika na produkciji nikad nije prošao Zavisi od A0.9. |
| A1.16 | **Panel vlasnika u Vercel env** (uz #142-#144): `OWNER_PANEL=on`, `PLATFORM_OWNER_USER_IDS` (Clerk user id vlasnika: Clerk dashboard → Users → korisnik → User ID; posle A0.8 zameniti ga id-jem iz Clerk Production), `PLATFORM_DEMO_PROFILE_IDS` (profile id demo firme "Sunčano Polje", da se ne broji u Statistici). Prvo Preview + redeploy i provera: vlasnik završava na `/owner`, `/dashboard` ga vraća na `/owner`, drugi nalog dobija "Stranica nije pronađena" na `/owner` i 404 na `/api/owner/ping`; tek onda Production. Pročitati tekst "Šta operater vidi" u /privatnost (#144) | uz "merge" #142-#144 | Bez env-a je `/owner` 404 za sve; panel sa pravom prijavom još nije otvoren u pregledaču |
| A1.18 | **Planovi servisa pre prodaje** (odluka i trošak). Supabase je na besplatnom planu: bez dnevnih kopija, Pro čuva poslednjih 7 dana. Vercel: proveriti plan u Settings → Billing; Hobby je po uslovima nekomercijalan i čuva logove 1 sat. Clerk i Resend: proveriti ograničenja plana za Production instancu i za broj mejlova. | 13. okt (predlog) | Bez kopija nema oporavka (A1.9); bez logova se ne vidi zašto je naplata pala (B9.7) |

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
| A2.9 | 🟡 (#94) **Landing: poverenje i dokaz** — primeri su spojeni (#135); čeka samo A1.8 (novi `public/landing-demo.mp4` i poster; sadašnji poster još kaže "Skeniraj robu"). Cena ostaje 20 € (A1.6). | Visoka | M | Redosled sekcija iz marketing dokumenta: kontakt (WhatsApp/Viber, telefon) u hero-u i footeru; "Ceo posao iz telefona" u 6 koraka; demo video; dugmad "Otvori primer kataloga/fakture" (demo firma); predračun i otpremnica u sekciji o fakturi i u `pricingIncludes`; "Šta TradeMaster nije"; "Vaši podaci" (EU serveri, izvoz, samo-pregled posle isteka); jedan ton ("vi"); FAQ o instalaciji usklađen sa dugmetom "Instaliraj aplikaciju". FAQ o SEF-u menjati tek posle A1.1, a o slanju tek kad A3 radi u produkciji. |
| A2.10 | 🟡 (#93, draft, čeka pregled teksta; menja isti fajl `/privatnost` kao #144, pa drugi koji se spaja traži ručno usklađivanje) Ugovor o obradi podataka (DPA) u /uslovi i obaveštenje o kolačićima kad je analitika uključena | Srednja | S | Tekst da pregleda knjigovođa ili pravnik. |
| A2.12 | 🟡 (#134 spojen: nove funkcije A9 na landingu i `/za/*`; SEF tekst ostaje "Ne" do A1.1/A1.14) Landing i `/za/*` FAQ o SEF-u posle A1.14 | Srednja | S | Danas tačno piše "Ne šalje fakture u SEF" (`landing-copy.ts`, `trade-pages.ts`). Kad slanje radi na pravom SEF-u: "Šalje fakturu u SEF jednim dodirom, sa vašim API ključem". Do tada se može dodati samo "XML za ručno učitavanje na SEF" kad A1.1 prođe. |
| A2.11 | 🟡 (#97) Stranice po delatnosti (veleprodaja, paušalci koji prodaju robu, proizvođači), sitemap, kanonski URL, OG slika | Srednja | M | Kod je spojen (#97). Posle domena (A1.10) vlasnik podešava `NEXT_PUBLIC_APP_URL` (u A0.8) i prijavljuje sitemap u Google Search Console. |

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

Stanje: svi redovi A9.1-A9.22 su spojeni (🔧). Otvoreno je samo: tekst na PDF-u fakture čeka potvrdu knjigovođe (A9.9), a pretraga faktura je bez filtera perioda (A9.10).

### A10. Kvalitet: automatski testovi u pregledaču

| # | Šta | Stanje |
|---|---|---|
| A10.1 | Playwright u glavnom repou: javni smoke (desktop + telefon) na svaki Vercel deploy, prijava bez lozinke (Clerk tiket), `@writes` samo nad test bazom (`e2e/README.md`) | ✅ #109 (javni deo 46/46 lokalno i na produkciji). Na preview-ima se preskače dok vlasnik ne postavi `VERCEL_AUTOMATION_BYPASS_SECRET` |
| A10.2 | Test baza za E2E i DB testove: Postgres u Dockeru (`npm run test:db:up`) i u CI-ju (`test-database.yml`), test korisnik `e2e+clerk_test@example.com` u Clerk Development; `@writes` na localhost-u samo nad test bazom | ✅ (#133). Lokalno: 30 E2E prolazi, 46 DB testova prolazi (prvi put). CI: DB testovi i E2E sa prijavom i upisom (secrets dodati 2026-10-10): 29 prolazi + 1 flaky (A10.7) |
| A10.3 | E2E za svaku A9 stavku koja menja tok (faktura, predračun, katalog, lager) | Uz svaki PR: greška učitavanja (#115), slobodna stavka (#119), kupac iz fakture (#121) |
| A10.5 | Svi unit testovi u CI-ju: 6 fajlova nije bilo u `vitest.config.ts` (`validations.test.ts` bio zastareo); zaštitni test pada kad se novi fajl ne doda | ✅ #120 (108 fajlova / 699 testova) |
| A10.6 | CI ne pravi `next build`; greška u bundle-u se vidi tek na Vercel proveri (#118). Pre spajanja: `npm run build` lokalno i zelen Vercel check | Pravilo za svaki PR |
| A10.4 | A1.13 smoke na domenu: `E2E_BASE_URL=<domen> npm run e2e:public` + ručna faktura od registracije do PDF-a | 30. okt |
| A10.7 | Istražiti povremenu React grešku #418/#422 (hydration) na Podešavanjima za potpuno nov nalog dok drugi test upisuje podatke firme; React se oporavi, korisnik ne vidi ništa, CI prolazi iz drugog pokušaja (1 "flaky" u prvom CI pokretanju #133). Nije reprodukovano bez istovremenih upisa (52 + 5 pokretanja) | Niska prioritet |

### A11. Pilot sa 2-3 stvarne firme (22-27. okt, pre zamrzavanja koda)

Cilj: da postojeći tok prođe kod ljudi koji nisu pravili aplikaciju, na njihovim telefonima i sa njihovom robom, na produkcijskim identitetima (posle A0.8). Firme bira i vodi vlasnik; svaka dobija isti spisak. Nalazi idu kao GitHub issue, bez ličnih podataka.

| # | Korak koji firma sama izvodi | Dokaz |
|---|---|---|
| A11.1 | Registracija i podaci firme (naziv, PIB, MB, adresa, žiro-račun) | Datum i uređaj; firma je sama stigla do Početne |
| A11.2 | Unos robe: bar 10 artikala, od toga bar 3 skeniranjem barkoda telefonom | Artikli su u Asortimanu; skener se oglasi tek posle snimanja |
| A11.3 | Magacin: jedan Ulaz i jedan Izlaz | Stanje u Magacinu jednako ručnom zbiru firme |
| A11.4 | Katalog poslat kupcu ili kolegi i otvoren na drugom telefonu | Brojač otvaranja veći od 0; slike i cene ispravne |
| A11.5 | Predračun, pa "Pretvori u fakturu" | Brojevi `PR-NN/GGGG` i `NN/GGGG`; roba skinuta sa stanja jednom |
| A11.6 | PDF fakture i otpremnice | Firma potvrđuje da su podaci na PDF-u tačni (PIB, MB, iznosi, PDV ako je u sistemu) |
| A11.7 | IPS QR skeniran bankarskom aplikacijom firme ili kupca | Aplikacija banke prikazuje ispravnog primaoca, račun i iznos (plaćanje nije obavezno) |

Odgovoran: **vlasnik** (dogovor sa firmama, prisustvo), Claude (popravke istog dana). Zavisi od: A0.8, A1.2. Završeno je kad je tabela firme × 7 koraka popunjena (prošlo / nije / zaobiđeno) i nema otvorenog nalaza koji menja podatke ili zaustavlja tok. Sa dve firme pilot važi; sa manje od dve uslov nije ispunjen.

**Zamrzavanje koda: 28. oktobar.** Posle toga samo popravke grešaka nađenih u A11 i A1.13. Prelazak identiteta (A0.8) se ne radi posle zamrzavanja.

### Uslovi za puštanje u rad (pregled 30. okt)

Prodaja kreće 1. novembra. Ovo su proverljivi uslovi, a ne tvrdnja da grešaka nema: svaki ima odgovornog, zavisnosti i dokaz. Šta se radi ako neki od prvih pet nije ispunjen do 30. okt odlučuje vlasnik ("Odluke koje čekaju vlasnika", tačka 7).

| # | Uslov | Odgovoran | Zavisi od | Dokaz | Stanje |
|---|---|---|---|---|---|
| 1 | Prijava na produkcijskim identitetima: postojeći korisnik vidi svoje podatke, nov dobija novu firmu | Claude izvodi, **vlasnik** odobrava | A1.10, A0.1-A0.8 | Zapisnik A0.9; `pk_live_` u Vercel Production; registracija i prijava sa 2FA prošle do kraja | ⬜ |
| 2 | Izolacija firmi | Claude | A0.8 | `tenant-isolation.db.test.ts` zelen na commit-u koji je u produkciji; ručno sa dva naloga na produkciji: tuđi katalog, faktura i proizvod daju 404 | 🔧 (A2.3 spojen); ručna provera ⬜ |
| 3 | Tačnost podataka: stanje robe, dokumenti, brojevi | Claude | A11 | CI zelen (unit, DB, E2E) na istom commit-u; u pilotu se A11.3 i A11.5 slažu sa ručnim zbirom firme | 🔧 (A2.1-A2.2, A9.1-A9.3 spojeni) |
| 4 | Oporavak baze, fajlova i podešavanja | **Vlasnik** + Claude | A1.18, A0.5 | Zapisnik A1.9: aplikacija radi na obnovljenoj kopiji; trajanje i starost podataka zapisani | ⬜ |
| 5 | Poslovni tok kod pravih firmi | **Vlasnik** | A0.8, A1.2 | Tabela A11 za bar 2 firme, bez otvorenog nalaza koji menja podatke ili zaustavlja tok | ⬜ |
| 6 | Uređaji: kamera, zvuk, instalacija, IPS QR | **Vlasnik** | - | `docs/device-checklist.md` popunjen za Android i iPhone; QR skeniran pravom bankarskom aplikacijom (A1.2) | ⬜ |
| 7 | /uslovi i /privatnost imaju prave podatke operatera | **Vlasnik** | A1.4 | Stranice na produkciji prikazuju PIB, MB i adresu | ⬜ |
| 8 | Landing: kontakt, primeri i nijedna tvrdnja koja ne radi | **Vlasnik** + Claude | A1.5, A1.8, A2.12 | Svaka tvrdnja sa landinga i `/za/*` upoređena sa ovom tabelom; rečenica o SEF-u odgovara uslovu 9 | 🔧 (kontakt #94, primeri #135) |
| 9 | SEF: pravi SEF uključen (A1.14) ili demo slanje sakriveno (#108, A3.6) | **Vlasnik** | A1.1 | Jedna faktura poslata i prihvaćena na pravom SEF-u, ili #108 spojen i kartica se ne vidi običnom nalogu | ⬜ |
| 10 | Smoke na domenu | Claude + **vlasnik** | A1.10, A0.8 | `E2E_BASE_URL=<domen> npm run e2e:public` prolazi; ručno jedna faktura od registracije do PDF-a (A1.13, A10.4) | ⬜ |
| 11 | Greške i posete se vide | **Vlasnik** | A1.10, A1.12 | Probna greška vidljiva u Sentry-ju; poseta vidljiva u Vercel Analytics | ⬜ |
| 12 | Servisi su na planovima koji dozvoljavaju prodaju i imaju kopije | **Vlasnik** | A1.18 | Plan Supabase i plan Vercel potvrđeni u njihovim podešavanjima | ⬜ |

Sa svojim rokom, van ove tabele: **prva naplata** (B9) mora biti 🧪 do 20. novembra. To nije uslov za 1. novembar.

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
| B9 | **Naplata pretplate**: pravila, otvoreni nalazi i rokovi su na jednom mestu, u "B9. Naplata pretplate" ispod | Visoka | M | Prvi predračun ide 27. novembra (najraniji istek probe je 4. decembar). |

### B9. Naplata pretplate: od koda do potvrđene produkcije

**Pravila (odluka vlasnika 2026-10-10; ovde se ne menjaju).** 20 € mesečno u dinarima po srednjem kursu NBS, bez PDV-a prema potvrđenom statusu T&G Nest (PDV zavisi samo od `inVatSystem` izdavaoca); jedna uplata je jedan kalendarski mesec sa istim danom obnove; 60 dana probe; upozorenje i predračun 7 dana pre isteka; 2 dana dodatnog roka; posle toga samo pregled. Pristup se produžava posle provere izvoda, najkasnije narednog radnog dana.

**Stanje.** B9.0 ručna naplata (#136, #137) i B9.1 automatski predračun (#138) su 🔧. Jedini pravi mejl do sada je probni predračun poslat vlasniku (2026-10-10, obrisan). Nijedan kupac još nije dobio predračun, nijedna uplata nije evidentirana, env iz A1.15 nije postavljen.

**Rokovi iz stvarnih datuma.** Najraniji istek probe je **4. decembar** (provereno u bazi), ne 31. decembar. Otuda: žuta traka i predračun **27. novembra**, dodatni rok 5-6. decembra, samo pregled od 7. decembra. Sve što ispod nosi "pre prvog slanja" treba da bude 🧪 do **20. novembra**; što ne stigne, radi se ručno po `docs/billing-runbook.md` (B9.10). Ako A0.1 pokaže da među nalozima sa istekom 4-9. decembra nema stvarnih firmi, prvi stvarni rok je 53 dana posle prve stvarne registracije; do tada se sve proverava na demo nalogu.

**Da li #138 rešava ranije nalaze (pregled koda 2026-10-10)**

| Nalaz | Šta kod radi danas | Ocena | Ostaje |
|---|---|---|---|
| Nepotpuni podaci kupca | Predračun se izdaje i kad firma nema naziv ili PIB: kao naziv kupca ide mejl adresa, a PIB i adresa ostaju prazni. Neispravan PIB se izostavlja. | Nije rešeno | B9.3 |
| Nepromenljiv sadržaj pri ponovnom slanju | Ponovni pokušaj koristi **isti predračun** (broj, iznos, link) i isti ključ idempotentnosti. Tekst mejla se, međutim, pravi iznova iz današnjeg kursa i današnjeg stanja naloga, pa narednog dana može da se razlikuje od predračuna; dok ključ važi, Resend takav zahtev odbija (409). | Delimično | B9.4 |
| Kursna lista | Kurs se čita sa `kurs.resenje.org` (ogledalo liste NBS, nije NBS). Bez odgovora ili sa kursom van 100-150 nema predračuna i ništa se ne upisuje. Na predračunu su kurs, datum i broj liste u napomeni; u `billing_notices` je samo kurs. | Delimično | B9.5 |
| Neizvestan ishod slanja | `sent` se upisuje kad Resend prihvati zahtev. Ako zahtev istekne (15 s) ili se funkcija ugasi posle prihvatanja, red ostaje `failed` ili `pending`; sledeće pokretanje je za oko 24 h, a ključ idempotentnosti važi 24 h, pa je drugi mejl moguć. Isporuka i odbijanje se ne prate. Kad pokretanje padne, niko ne dobija poruku. | Nije rešeno | B9.6, B9.7 |
| Test i evidencija pravog kupca | `--test` ima svoj red (`isTest`) i ne troši red pravog kupca, ali troši broj iz niza predračuna izdavaoca. Slanje "samo vlasniku" (`BILLING_AUTO_SEND` isključen) upisuje **pravi** red kao poslat, pa kupac za taj mesec više ne dobija automatski mejl. | Delimično | B9.8 |

| # | Šta | Kada | Odgovoran | Dokaz | Stanje |
|---|---|---|---|---|---|
| B9.3 | **Bez naziva i PIB-a nema automatskog predračuna.** Takva firma ide na spisak "dopuniti podatke" i vlasnik je kontaktira. Kupac se na predračun upisuje iz podataka firme u trenutku izdavanja i više se ne menja. | Pre prvog slanja | Claude | DB test: firma bez naziva ili PIB-a daje ishod "nepotpuni podaci", bez predračuna i bez mejla | ⬜ |
| B9.4 | **Mejl iz snimka.** Uz red predračuna se čuvaju kurs, datum i broj kursne liste, period, rok i primalac; svaki ponovni pokušaj šalje isti sadržaj. Promena primaoca je nova, izričita radnja vlasnika, ne tihi ponovni pokušaj. | Pre prvog slanja | Claude | Test: pokušaj narednog dana sa drugim kursom šalje isti tekst i isti ključ; migracija samo dodaje kolone (uz odobrenje) | ⬜ |
| B9.5 | **Kursna lista.** Zapisati koja lista važi na dan izdavanja (i vikendom i praznikom) i potvrditi to na zvaničnoj listi NBS; čuvati datum i broj liste (B9.4); prvi pravi predračun vlasnik upoređuje sa nbs.rs pre slanja; ako izvor ne odgovori, vlasnik dobija upozorenje (B9.7). Odluka: ostaje ogledalo ili se uvodi zvanični servis NBS (traži registraciju). | Pre prvog slanja | **Vlasnik** (pravilo, odluka), Claude (kod) | Pravilo upisano u `docs/billing-runbook.md`; poređenje prvog predračuna sa nbs.rs zapisano | ⬜ |
| B9.6 | **Tri ishoda, ne jedan.** "Servis prihvatio" (današnji `sent`), "isporučeno" (`delivered`) i "odbijeno" (`bounced`, `failed`, `complained`, `suppressed`), uz "odloženo". Stanje se čita od Resend-a: upitom po id-ju mejla u narednom pokretanju, ili webhook-om sa proverom potpisa (nova javna ruta, ulazi u `isPublicRoute`). Red sa nepoznatim ishodom se pre ponovnog slanja proverava kod Resend-a po id-ju; ako id ne postoji, odlučuje vlasnik. Panel i `billing:due` prikazuju sva tri. | Uz automatiku, pre `BILLING_AUTO_SEND=on` | Claude | Slanje na Resend test adrese za isporučeno i odbijeno sa pravog naloga; DB test za prelaze stanja | ⬜ |
| B9.7 | **Upozorenje vlasniku uz automatiku** (ranije u O6 kao "kasnije"). Mejl vlasniku kad celo pokretanje padne (kurs, izdavalac, baza), kad predračun nije prihvaćen, nema mejla, ima nepotpune podatke ili je odbijen; dnevni sažetak kad je bilo slanja. Svako pokretanje ostavlja trag u bazi (kada, ishod), jer Vercel ne ponavlja pokretanje, može ga preskočiti, a logovi se na Hobby planu čuvaju 1 sat. Panel (O5) pokazuje poslednje uspešno pokretanje i crveno ako ga nema duže od 26 h. | Uz automatiku | Claude | Test: namerno pogrešan kurs i nepostojeći izdavalac daju mejl vlasniku; izostalo pokretanje se vidi u panelu; tabela tragova je migracija koja samo dodaje | ⬜ |
| B9.8 | **Izolovan stvarni test.** Pravi mejl sa pravog domena ide samo na vlasnikovu adresu, za demo firmu, sa oznakom "TEST, ne plaćati"; ne upisuje i ne menja red nijednog pravog kupca i ne produžava pristup. Odluka: test predračun troši broj iz vlasnikovog niza `PR-NN/GGGG` (danas da) ili dobija poseban niz. Red upisan u režimu "samo vlasniku" ne sme da važi kao "kupac je obavešten": pre uključivanja slanja kupcima svaki takav red se izričito šalje kupcu ili poništava. | Pre prvog slanja | Claude; odluka **vlasnika** | DB test: posle testa i posle slanja "samo vlasniku" kupac za isti mesec i dalje dobija svoj predračun; nijedan red pravog kupca nije promenjen | ⬜ |
| B9.9 | **Odobren spisak pre prvog masovnog slanja.** `npm run billing:send` bez slanja daje spisak: firma, PIB, mejl, period, iznos, klasa iz A0.1. Testni, demo i vlasnički nalozi su isključeni (`BILLING_EXCLUDE_PROFILE_IDS` iz A0.1 i pravilo za probne adrese). Vlasnik pismeno odobrava spisak; prvo slanje ide ručno (`--send`) baš po njemu. `BILLING_AUTO_SEND=on` tek kad jedan ceo ciklus prođe: predračun isporučen, uplata, produženje. | 26. nov (dan pre prvog slanja) | **Vlasnik** odobrava, Claude priprema | Odobren spisak sa datumom; izlaz slanja jednak spisku (isti broj, iste adrese) | ⬜ |
| B9.10 | **Ručni postupak kao proverena rezerva.** Vlasnik jednom prolazi ceo `docs/billing-runbook.md` na demo nalogu: predračun ručno, uplata, `access:extend` sa pregledom pa `--yes`, provera datuma u aplikaciji. | Do 20. nov | **Vlasnik** | Datum probe i šta je u runbook-u ispravljeno posle nje | ⬜ |
| B9.11 | Potvrda uplate i naplata iz aplikacije su O4 i O5 (panel vlasnika). Plaćanje karticom ostaje C5. | Vidi O4, O5 | - | - | ⬜ |

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

**Uroševa firma i izgled (odluka vlasnika 2026-10-10).** Vlasnik posle prijave vidi **samo panel**: drugačiji izgled i svoj meni (Statistika, Nalozi, Naplata), bez ijedne korisničke stranice. `src/lib/after-auth.ts` ga vodi na `/owner`, a `src/app/(dashboard)/layout.tsx` za vlasnika radi `redirect('/owner')` (za sve ostale se ništa ne menja). T&G Nest i dalje postoji kao profil u bazi jer iz njega automatski idu predračuni za pretplatu (`BILLING_ISSUER_PROFILE_ID`, cron ne traži prijavu), ali vlasnik ne otvara njegove stranice: ono što danas radi u Fakturama T&G Nest-a ("Pretplate TradeMaster": pretvaranje u fakturu, "Plaćeno") prelazi u panel u O5. Prvi predračuni idu 27. novembra (B9); ako O5 do tada nije gotov, pretvaranje u fakturu i "Plaćeno" vlasnik radi skriptama i ručnim postupkom iz `docs/billing-runbook.md`, ne kroz korisničke stranice svog naloga. Ako vlasniku ikad zatreba korisnički prikaz za proveru, to je poseban test nalog, ne njegov.

| # | Šta | Menja za korisnike | Migracija | Detalj |
|---|---|---|---|---|
| O1 | 🟡 (#142, draft, čeka "merge") **Kapija vlasnika** | Ništa | Ne | `src/lib/platform-owner.ts` (`isPlatformOwner(userId)`, `requirePlatformOwner()`), prekidač `OWNER_PANEL`, prazna `/owner` stranica "Panel vlasnika", `GET /api/owner/ping`. Testovi: bez env-a niko nije vlasnik; običan korisnik dobija 404 na stranici i na API-ju; `isPublicRoute` ne sadrži `/owner`; `after-auth` vodi vlasnika na `/owner`, sve ostale na `/dashboard` kao do sada; `(dashboard)/layout.tsx` vlasnika preusmerava na `/owner`, ostale pušta kao do sada. Panel ima svoj layout i meni (Statistika, Nalozi, Naplata; stavke koje još ne postoje su sive "uskoro"). **Urađeno 2026-10-10.** Kako je izvedeno: forme za prijavu i dalje vode na `/dashboard`, a `(dashboard)/layout.tsx` odatle šalje vlasnika na `/owner` (kad je `OWNER_PANEL` isključen, Clerk se i ne pita); `(owner)/layout.tsx` i svaka stranica zovu `requirePlatformOwner()`; `/owner` nije upisan u `robots.ts` (javni robots.txt bi otkrio da panel postoji), layout nosi noindex. Zatvorene su samo korisničke **stranice**: korisničke API rute i dalje odgovaraju vlasnikovoj Clerk sesiji za T&G Nest profil. Env u `.env.example`. |
| O2 | 🟡 (#143, draft, naslonjen na #142) **Statistika** (samo čitanje) | Ništa | Ne | `src/lib/owner-stats.ts` (čista funkcija nad redovima, sa testom) + `GET /api/owner/stats` + stranica. Brojevi: ukupno firmi; nove po nedelji (12 nedelja); po stanju pristupa (probni / plaća / ističe za 7 dana / rok 2 dana / samo pregled / bez ograničenja) iz `accessStatus` + `isTrialPeriod`; aktivacija (ima proizvod, izdao prvu fakturu ili predračun, podelio katalog: isto što `src/lib/onboarding.ts`); aktivni u 7/30 dana (poslednji upis u `products`, `invoices`, `stock_movements`); prelazak probni → plaćen (firme sa bar jednim `access_extensions` redom); mesečni prihod = broj firmi sa aktivnom pretplatom × cena (`MONTHLY_PRICE`); otkazi = firme koje su prošle "samo pregled" bez nove uplate. Sve sume računa baza (`count`, `groupBy`), ne učitavaju se svi redovi. Firme vlasnika (`BILLING_ISSUER_PROFILE_ID`, `BILLING_EXCLUDE_PROFILE_IDS`) i demo nalozi se ne broje kao korisnici; `billing_notices` sa `isTest` se nikad ne računaju. **Urađeno 2026-10-10** (`/owner/stats`, `/owner` vodi na nju; `src/lib/owner-stats-query.ts` čita). Razlike od ovog reda: (1) "plaća" se određuje po `access_extensions`, ne samo po `isTrialPeriod`: firma kojoj je datum promenjen ručno je "Ručno produženo" i ne ulazi u prihod; (2) mesečni prihod broji samo firme čiji plaćeni period pokriva danas (aktivne i "ističe"), ne one u roku od 2 dana; cena iz `MONTHLY_PRICE_EUR`; (3) "otkazi" = platili pa su sada samo pregled; probni koji su istekli bez uplate su posebno i ulaze u stopu prelaska; (4) čita se jedan red po firmi (tri datuma) da stanje računa ista `accessStatus`, sve ostalo je `groupBy`; (5) demo nalozi se izuzimaju preko novog env-a `PLATFORM_DEMO_PROFILE_IDS`; (6) `billing_notices` se u O2 uopšte ne čita. **Najniži prioritet u fazi O; pre "merge" ispravke iz tabele "Metrike".** |
| O3 | 🟡 (#144, draft, naslonjen na #143) **Nalozi** (samo čitanje) | Ništa | Ne | Tabela: firma, mejl za prijavu (Clerk `users.getUserList` po `clerkUserId`, keš po zahtevu), PIB, otvoren, probni/pretplata, **dana ostalo** (`daysLeft`, crveno ≤ 7), stanje, poslednja uplata (`access_extensions`), poslednji automatski predračun i njegov status (`billing_notices`), broj proizvoda/faktura, poslednja aktivnost. Filteri: "ističe za 10 dana" (isto kao `billing:due`), "u roku", "samo pregled", "probni", pretraga po nazivu/PIB-u/mejlu. Detalj naloga `/owner/accounts/[id]`: istorija produženja i predračuna. Pre produkcije: rečenica u `/privatnost`. **Urađeno 2026-10-10** (`src/lib/owner-accounts.ts`, `owner-accounts-query.ts`, `clerk-emails.ts`). Kako je izvedeno: mejlovi idu sa Clerk Backend API-ja u grupama od 100, jednom po otvaranju stranice; ako Clerk ne odgovori, lista se otvara bez mejlova i to piše; nema `/api/owner/accounts` (stranice čitaju bazu na serveru, pa nijedna ruta ne vraća mejlove korisnika); nema straničenja; firme vlasnika i demo nalozi su u listi sa oznakom; "Probni" = još u besplatnom periodu; prozor od 10 dana je ponovljen kao `DUE_WITHIN_DAYS` dok O5 ne spoji sa skriptom; "poslednja aktivnost" je ista funkcija kao u O2; detalj pokazuje i ID naloga (za env liste i skripte) i probne predračune sa oznakom "test". Rečenica u `/privatnost` je dodata ("Šta operater vidi"), čeka da je vlasnik pročita. **Pre "merge":** "Poslednja aktivnost" postaje "Poslednja izmena" (vidi "Metrike"). |
| O4 | **Produženje iz panela** | Ništa (korisnik vidi novi datum kao i posle skripte) | Da: `owner_audit_log` | Isti tok kao `access:extend`: forma (broj predračuna, datum sa izvoda) → **pregled** (`previewAccessExtension`: stari datum, period, "na vreme / posle zaključavanja") → potvrda sa Clerk reverification → `applyAccessExtension`. Jedinstveni `reference` već sprečava dvostruko produženje. Tabela `owner_audit_log` (ko, kada, akcija, profileId, pre/posle, razlog) za svaku izmenu iz panela. Dodatno: "poklon dana" sa obaveznim razlogom (osnivačka ponuda, kompenzacija), isto kroz audit. Skripte ostaju kao rezerva. Bez brisanja naloga iz panela. **Prioritet 4, rok 20. nov.** Poklonjeni dani menjaju datum i upisuju se samo u `owner_audit_log`, ne u `access_extensions`, da se ne broje kao uplata. |
| O5 | **Naplata u panelu** | Ništa | Ne | Ekran "Danas": `billing:due` logika prebačena u `src/lib/billing-due.ts` (skripta i panel je dele), stanje `billing_notices` (poslato / neuspelo, greška, broj pokušaja), dugme "Pošalji ponovo" za neuspeo predračun kroz postojeći `billing-run`; dokumenti pretplate iz T&G Nest-a (`src/lib/subscription-documents.ts`): "Pretvori u fakturu" i "Plaćeno" iz panela, kroz iste funkcije kao u Fakturama, pa odmah "Produži pristup" (O4). Posle ovoga dnevni rad sa laptopa nije potreban; skripte ostaju za hitne slučajeve. **Prioritet 3 (pre O4 i O2), rok 20. nov.** Ekran grešaka: neprihvaćena i odbijena slanja, firme sa nepotpunim podacima, poslednje pokretanje (B9.6, B9.7). |
| O6 | Kasnije, po potrebi | Ništa | Možda | `lastSeenAt` na profilu (jedan upis dnevno iz `GET /api/profile`) ako aktivnost iz O2 nije dovoljna; obaveštenje vlasniku za firme koje padaju u "samo pregled" (upozorenje o neuspelom predračunu je prešlo u B9.7, uz automatiku); privremeno blokiranje naloga (Clerk ban) samo uz audit. |

**Redosled po prioritetu (dopuna 2026-10-10): operativa pre statistike.** 1. O1 kapija → 2. O3 nalozi → 3. O5 naplata i greške → 4. O4 potvrda produženja → 5. O2 statistika. O2 je već napisan (#143), ali je najmanje hitan: spaja se tek posle ispravki iz tabele "Metrike" i ne sme da odloži O5 i O4. PR-ovi su naslonjeni redom #142 ← #143 ← #144, pa je najmanji zahvat da se nazivi isprave u #143 i #144 pre "merge"; druga mogućnost je preslaganje, da Nalozi ne zavise od Statistike (odluka vlasnika).

**Rokovi.** O1-O3 samo čitaju. O5 i O4 se vežu za najraniji stvarni istek probe (4. decembar), ne za korisnike registrovane 1. novembra: predračuni kreću 27. novembra i prve uplate se potvrđuju od tog dana, pa O5 i O4 treba da budu 🧪 do **20. novembra**. Ako ne budu, radi se skriptama (B9.10), koje ostaju proverena rezerva i posle toga. Nijedan O korak koji upisuje podatke ne počinje pre A0.8; posle prelaska `PLATFORM_OWNER_USER_IDS` nosi novi id (A0.9).

**Metrike: šta broj sme da tvrdi (ispravke pre "merge" #143 i #144)**

| Danas u kodu | Problem | Ispravka |
|---|---|---|
| "Mesečni prihod" = firme sa plaćenim periodom × 20 € | To nije naplaćen novac: ne zna za kurs, kašnjenje ni izostalu uplatu | Naziv "Procenjena mesečna vrednost pretplata". Stvarno naplaćeno je poseban broj, samo iz evidentiranih uplata (`access_extensions`) po mesecu uplate |
| "Otkazi" = platili, pa su sada samo pregled | Istekao pristup nije otkaz: firma može da kasni, da čeka izvod ili da plati sutra | Naziv "Istekle pretplate bez nove uplate", uz broj dana od isteka. "Otkaz" se ne prikazuje dok ne postoji izričit otkaz korisnika |
| "Aktivne u 7/30 dana" i "Poslednja aktivnost" = poslednji upis u proizvode, dokumente ili kretanja | Poslednja izmena nije poslednja poseta: firma koja samo gleda lager ili otvara PDF izgleda neaktivno | Nazivi "Imale izmenu u 7/30 dana" i "Poslednja izmena". Poseta se ne tvrdi dok ne postoji `lastSeenAt` (O6, migracija) |
| "Plaća" = ima bar jednu uplatu | Tačno samo ako se u `access_extensions` nikad ne upiše poklon ili test | Poklonjeni period (O4) i svaki test idu u `owner_audit_log`, **ne** u `access_extensions`. Testni, demo i vlasnički nalozi se izuzimaju po klasi iz A0.1; test predračuni (`isTest`) se ne broje nigde |
| "Probni → plaćen" kao procenat | Imenilac su samo probe završene u "samo pregled"; mali brojevi daju lažno precizan procenat | Uz procenat uvek oba broja; ispod 10 odlučenih proba prikazati samo brojeve |

**Stanje 2026-10-10: O1, O2 i O3 su napisani, kao tri draft PR-a naslonjena jedan na drugi (#142 ← #143 ← #144); spajaju se tim redom, svaki na "merge".** Bez migracija i bez izmene korisničkih API ruta; od korisničkih stranica menjaju se samo `(dashboard)/layout.tsx` (preusmerenje vlasnika) i `/privatnost`. Lokalno prolaze typecheck, lint (5 poznatih upozorenja), 129 fajlova / 865 unit testova, 8 fajlova / 79 DB testova na Docker test bazi i `npm run build`; izgled Statistike i Naloga je proveren sa probnim podacima na širini računara i telefona. **Još nije provereno:** prave stranice sa Clerk prijavom i čitanje mejlova sa pravog Clerk-a (traže env iz A1.16 na Preview-u). Sledeće, posle A0: ispravke naziva metrika u #143 i #144, zatim O5 i O4.

### Faza T: tim u firmi (Admin + Magacioner), zamenjuje B2

**Ponuda (predlog, čeka potvrdu vlasnika A1.6):** pretplata uključuje 1 Admin nalog (sve stranice, kao danas) i 1 Magacioner nalog. Dodatni članovi kasnije, uz doplatu.

**Šta vidi Magacioner (odluka vlasnika 2026-10-10):**

| Deo | Admin | Magacioner |
|---|---|---|
| Početna | sve | brze akcije i lager upozorenja, bez novca (naplaćeno, profit, "Kasni naplata") |
| Asortiman | sve | vidi i dodaje/menja artikle i Brzi sken; **ne vidi i ne menja nabavnu cenu** (`costPrice`), novi artikal bez nabavne kao Brzi sken, Admin je dopunjava |
| Magacin | sve | Ulaz/Izlaz, lager lista **bez** nabavne vrednosti |
| Predračuni | sve | pravi, menja, deli i štampa predračun; bira kupca kroz ograničenu pretragu (pravilo 5 ispod) ili upisuje novog na dokumentu |
| Fakture (izdate), "Pretvori u fakturu", otpremnica, SEF, izvoz | sve | ne |
| Katalozi | sve | ne (prvi korak; lako se doda kasnije) |
| Kupci, Finansije, Podešavanja, Tim | sve | ne |

Pravilo uz to: što magacioner ne sme da vidi, **server ne šalje** (npr. `costPrice`, `unitCost`, vrednost lagera po nabavnoj se brišu iz JSON-a za tu ulogu), ne samo da UI ne prikazuje.

**Zašto sopstvena tabela članstva, a ne Clerk Organizations:** svi podaci i svi upiti su već po `profileId`, izolacija je testirana u našoj bazi (`tenant-isolation.db.test.ts`), a dve uloge ne traže Clerk organizacije, njihove role i biranje aktivne organizacije u UI-ju. Clerk ostaje samo za identitet i pozivnice. Ako jednog dana zatreba više firmi po korisniku ili SSO, prelazak na Clerk Organizations ide preko iste funkcije iz T0.

**Bezbednosna pravila za tim (dopuna 2026-10-10; važe za T2-T5; tim ostaje posle lansiranja):**

1. **Uklonjen ili neaktivan član nema pristup ni zaobilazno.** Rezervna provera preko `Profile.clerkUserId` (T2) važi samo za korisnika koji **nema nijedan red članstva** ni u jednoj firmi. Red sa statusom `REMOVED`, `INVITED` ili isteklom pozivnicom nikad ne pada na rezervu. Status se čita iz baze pri svakom zahtevu, ne iz sesije; uklanjanje opoziva i Clerk sesije.
2. **Gašenje prekidača zatvara, ne otvara.** Kad se `TEAM_ROLES` isključi ili firma izađe iz `TEAM_ROLES_PROFILES`, Admin radi kao danas, a Magacioner dobija "Pristup timu je privremeno isključen" (403): nikad Admin prava i nikad novu firmu. Test za oba smera prekidača.
3. **Pozivnica.** Vezana je za jedan mejl i jedan `inviteId`. Prihvata je samo prijavljen korisnik čiji je **verifikovani** mejl jednak pozvanom; sam link nije dovoljan. Važi 7 dana (naš `expiresAt`, proverava server). Jednokratna je: prihvatanje i promena statusa su jedna transakcija, drugi pokušaj je odbijen. Admin može da je opozove; nova pozivnica za isti mejl poništava staru.
4. **Korisnik koji već ima firmu.** U ovoj fazi jedan korisnik pripada jednoj firmi. Ako pozvani mejl već ima firmu sa podacima, pozivnica se tim nalogom ne može prihvatiti (poruka: koristite drugi mejl); firme se ne spajaju. Ako ima samo praznu, automatski napravljenu firmu, ona se uz potvrdu korisnika odvaja, ne briše. `GET /api/profile` ne pravi firmu korisniku sa važećom pozivnicom ili članstvom (T5).
5. **Izbor kupca za magacionera.** Posebna pretraga: najmanje 2 znaka, najviše 10 rezultata, vraća samo `id` i naziv (i mesto, ako treba za razlikovanje). Bez PIB-a, mejla, telefona, adrese i duga, bez izlistavanja svih kupaca, sa ograničenjem broja zahteva. Kupac upisan na predračunu ostaje samo na tom dokumentu dok ga Admin ne sačuva u Kupce. Test: JSON za tu ulogu nema nijedno drugo polje.

| # | Šta | Menja za korisnike | Migracija | Detalj |
|---|---|---|---|---|
| T0 | **Jedna funkcija "trenutna firma"** | Ništa | Ne | `src/lib/company-context.ts`: `getCompanyContext()` vraća `{ userId, profile, role: 'ADMIN' }` ili gotov 401/404 odgovor. Zamenjuje 28 kopija traženja profila, ruta po ruta, u 2-3 PR-a (proizvodi + magacin, fakture, ostalo). Odgovori i statusi ostaju bajt-za-bajt isti; `tenant-isolation.db.test.ts` i `access-expired.test.ts` prolaze bez izmene. Zaštitni test: nijedna ruta u `src/app/api` (osim `profile`, `public`, `shared`, `cron`, `owner`) ne zove `profile.findUnique({ where: { clerkUserId` direktno. |
| T1 | **Matrica dozvola u kodu** | Ništa | Ne | `src/lib/permissions.ts`: uloge `ADMIN`, `WAREHOUSE`; akcije (`product:write`, `product:cost:read`, `stock:write`, `proforma:write`, `invoice:issue`, `invoice:read`, `finance:read`, `clients:manage`, `catalog:manage`, `settings:manage`, `team:manage`); `can(role, action)`. Test za svaku ćeliju tabele iznad. Još se nigde ne koristi osim `ADMIN` = sve. |
| T2 | **Tabela članstva** | Ništa | Da: `company_members` | `company_members(id, profileId, clerkUserId UNIQUE, role, status, invitedEmail, createdAt)`. Backfill: jedan `ADMIN` red po postojećem profilu iz `profiles.clerkUserId` (to je postojeći podatak, ne izmišljen). `getCompanyContext()` traži član → profil, sa rezervom na `Profile.clerkUserId` samo po pravilu 1. `Profile.clerkUserId` ostaje i dalje jedinstven i upisan (ne briše se). DB test: svaki postojeći profil ima tačno jednog Admina; nova registracija pravi profil + Admin člana u istoj transakciji. |
| T3 | **Server proverava ulogu** | Ništa za Admina | Ne | Svaka ruta zove `requirePermission(ctx, akcija)` → 403 "Nemate dozvolu". Fakture: magacioner sme samo `documentType = PROFORMA` (kreiranje, izmena, PDF, deljenje), nikad `convert`, `PATCH` statusa na fakturi, SEF, export. Uklanjanje `costPrice`/`unitCost` iz odgovora za ulogu bez `product:cost:read`, i ignorisanje tih polja u upisu (PUT proizvoda ne briše postojeću nabavnu). Novi DB test "magacioner": 403 na finansije, izvoz, kupce, podešavanja, SEF, izdavanje; nijedan JSON ne sadrži `costPrice`/`unitCost`; i dalje ne vidi drugu firmu. Iza `TEAM_ROLES` prekidača. Ponašanje kad se prekidač ugasi: pravilo 2. |
| T4 | **UI po ulozi** | Ništa za Admina | Ne | `GET /api/profile` vraća i `role` (dodato polje, ništa uklonjeno). `navigation.ts` filtrira stavke kroz `can()`; stranice van uloge u server komponenti preusmeravaju na `/dashboard`; Početna bez novčanih kartica; forma proizvoda bez polja nabavne; Fakture za magacionera prikazuje samo predračune. E2E: postojeći testovi nepromenjeni + novi `@writes` test sa magacionerom. |
| T5 | **Pozivanje člana** | Admin vidi novu karticu Podešavanja → Tim (samo kad je `TEAM_ROLES` uključen za firmu) | Ne | Admin upiše mejl → Clerk invitation (`clerkClient.invitations.createInvitation` sa `publicMetadata.inviteId`) → `company_members` red `INVITED`. Prihvatanje: **`GET /api/profile` ne sme da napravi novu firmu** za korisnika koji ima pozivnicu ili članstvo (najveći rizik ovog koraka, poseban test). Uklanjanje člana: status `REMOVED` + Clerk revoke sesija. Limit: 1 Admin + 1 Magacioner po firmi. Admin ne može da ukloni sebe ako je jedini Admin. `accessExpiredResponse` važi za celu firmu (članovi nasleđuju pristup). Prihvatanje, rok i jednokratnost: pravila 3 i 4. |
| T6 | **Ko je šta uradio** | Novi podatak na dokumentima | Da: kolone `createdByUserId` | Na `invoices` i `stock_movements` (nullable, stari redovi ostaju NULL, ne izmišlja se). "Izdao: ime" na predračunu u aplikaciji, ne na PDF-u. Pun dnevnik izmena ostaje C4. |
| T7 | Landing i uslovi | Tekst | Ne | Tek kad T5 radi u produkciji kod bar jedne pilot firme: "Admin + Magacioner u ceni", FAQ, `/uslovi` (ko je odgovoran za članove). |

Redosled: T0 i T1 posle lansiranja (novembar), čist refaktor bez promene ponašanja, i tek kad su A0, B9 (do prvog slanja) i O4/O5 završeni. T2-T5 kad prve firme to traže ili kad vlasnik potvrdi ponudu sa magacionerom. Svaki korak se pusti prvo na test nalogu (`TEAM_ROLES_PROFILES`), pa T&G Nest, pa svi.

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
| C3 | **E-otpremnice**: B2B obaveza od 1. oktobra 2027 (akcizni proizvodi i javni sektor od 1. januara 2026) | Visoka | L | Početi u proleće 2027; dobar prodajni razlog za veleprodaju pića. Datume obaveze proveriti u zvaničnom izvoru pre nego što se koriste u prodaji. |
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
- Stanje stavke se podiže samo uz dokaz ("Kako čitati stanje"). Test sa simuliranim servisom je 🔧, ne više.
- Produkcijski ključevi, nalozi, baza, domen i slanje mejlova kupcima menjaju se samo uz izričito odobrenje vlasnika za taj korak.
