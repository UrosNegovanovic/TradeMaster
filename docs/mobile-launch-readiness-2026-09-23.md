# TradeMaster — mobilna završnica i spremnost za prodaju

Datum: 23.09.2026. Predmet: lokalni kod i lokalna aplikacija, ne potvrda stanja produkcije.

## Nastavak — P0 pouzdanost unosa, 23.09.2026.

- Mobilni shell objavljen u `40e0177`; GitHub Vercel check: success.
- Izolovan PostgreSQL 16 u Docker-u, bez upisa poslovnih podataka: reprodukovano 5 grešaka među 6 početnih testova (dupli prvi dnevni red, izgubljen increment, nebezbedan retry).
- Intake sada koristi transakciju, zaključavanje po firmi/SKU-u i atomski increment. Dnevni batch model ostaje server-lokalni dan. Bez promene decoder-a, validacije frejmova ili cooldown-a.
- `Idempotency-Key` je vezan za profil; receipt i roba upisuju se u istoj transakciji. Isti ključ/payload vraća originalni odgovor; drugi payload daje 409. Stari klijenti bez ključa imaju zaštitu paralelnih increment-a, ali nemaju retry garanciju.
- QuickScan pamti nedovršen zahtev u sessionStorage po Clerk korisniku/SKU-u, pre slanja. Ponovni sken u istoj kartici koristi isti ključ i originalni payload, uključujući posle reload-a. Posle potvrđenog uspeha novi sken dobija novi ključ. Zatvaranje kartice/brisanje browser podataka prekida ovu klijentsku retry garanciju; ovo nije offline red niti oporavak između uređaja. Ako sessionStorage nije dostupan, automatski upis se ne šalje.
- Nova tabela `product_intakes`: migracija `supabase/migrations/20260923095239_product_intake_receipts.sql`, RLS uključen, bez javnih politika; anon/authenticated nemaju privilegije. Receipts se za sada ne brišu automatski: proizvoljno brisanje bi oslabilo garanciju za stare zahteve.
- Provere: 67 unit/API mock testova; 11 real-DB intake testova (uključuju rollback create/increment, jučerašnji receipt, legacy upise, tenant izolaciju); postojećih 6 invoice DB testova. Typecheck, lint i kompletan production build prošli. Browser shell/scanner-open matrica na 7 veličina prošla. Snyk ponovo blokiran neprijavljenim nalogom.
- Migracija proverena lokalno pa primenjena na povezani TradeMaster Supabase projekat. Fizička kamera/zvuk i brzina na mobilnoj mreži još nisu potvrđeni; nema tvrdnje da je celokupan launch završen.

Preostale P0 stavke ispod (pristup katalogu i debug ingest) ostaju otvorene. Istorijski rezultati u ostatku izveštaja odnose se na prvo UI testiranje.

## Izvedeno

- Mobilno zaglavlje sa TradeMaster tekstualnim nazivom, odvojeno od identiteta firme. Odobren grafički znak nije pronađen; nije izmišljen novi logo.
- Jedan `QuickScanProvider` u dashboard layout-u drži skener, stanje obrade i cooldown za Početnu i donju navigaciju. Dugmad su okidači istog toka. Skener se montira samo dok je otvoren, zatvara se pri promeni rute i vraća fokus na vidljivo dugme. Zatvaranje ne oslobađa zaključavanje dok traje prethodni upis.
- Centralno dugme i natpis Sken više se ne preklapaju. Sačuvan lg prag (1024 px), donji safe area i prostor iza navigacije. Desktop sidebar ostaje.
- Više ima zasebnu ikonicu za katalog, veće dugme za zatvaranje, skrol u niskom viewport-u, vraćanje fokusa i zatvaranje pri navigaciji/prelasku na desktop. Uklonjeno treće, redundantno dugme skenera.
- Logo firme proporcionalno prikazan; greška slike daje inicijale, a dug naziv se prelama. Provereno simuliranim odgovorom samo u browseru, bez menjanja profila u bazi.
- Početna ima kompaktnije kartice, iznose koji se ne odsecaju i objašnjenja metrika dostupna dodirom/tastaturom. Upiti, zbir količina × cena i postojeća semantika DRAFT + UNPAID nisu promenjeni.
- Zatvaranje običnih dijaloga ima dodirnu površinu 44 px. Postojeća ograničenja visine/skrol forme su očuvana.
- Ispravljen metadata link na stvarnu Next rutu `/manifest.webmanifest`, teal boja manifesta i nazivi prečica. Prečica ka Asortimanu više ne tvrdi da direktno otvara kameru.
- Dodat `scripts/check-mobile-shell.cjs`: ponovljiva provera preko postojeće Playwright stranice, bez novog test framework-a i bez sačuvanih kredencijala. Blokira API POST/PUT/PATCH/DELETE tokom provere.

Nisu menjani BarcodeScanner algoritam, audio, API rute, schema, stock batching, statusi faktura ili PDF. Nema commita, push-a, PR-a ni deployment-a. Postojeći untracked rad je sačuvan.

## Provere i granice dokaza

| Provera | Rezultat |
| --- | --- |
| Postojeći Vitest suite | 64/64, 11 fajlova; prošao pre i posle izmena. Uključuje mock-based API testove; nije test žive baze. |
| TypeScript | `tsc --noEmit --incremental false` prolazi. |
| Lint | Prolazi sa postojećim upozorenjima u katalog/PDF/scanner/ImageUpload fajlovima; nema novih upozorenja u izmenjenom kodu. |
| Produkcijski build | Kompletan `npm run build` prošao u izdvojenoj kopiji istih izvora, da ne prekida dev server. Prvi pokušaj bio je blokiran Google Fonts mrežnim pristupom; odobren ponovni pokušaj prošao. |
| Dashboard raspored | 360×800, 390×844, 768×1024, 1023×768, 1024×768, 1440×900, 844×390: bez horizontalnog preliva; ispravan prag navigacije; Sken tekst nije prekriven. |
| Zajednički skener | Početna → otvori → promeni na desktop → zatvori → otvori iz mobilne navigacije: po jedan dijalog/region, nula regiona nakon zatvaranja, vraćen fokus. |
| Više | Navigacija do Kataloga, zatvaranje na desktopu, skrol i dohvatljiv close u landscape prikazu. |
| Ostale rute | Asortiman, Magacin, Fakture, Katalozi, Finansije, Podešavanja otvorene na 390 px bez horizontalnog preliva. Detalj postojećeg kataloga takođe. |
| Forma proizvoda | Otvorena i zatvorena bez upisa; granice dijaloga unutar viewport-a. Posle promene na 390×450 i završetka browser relayout-a dijalog je visok 405 px, submit dugme dostupno. Trenutno merenje odmah nakon resize-a bilo je zastarelo; potvrđeno ponovnim merenjem. Ovo nije fizička tastatura niti provera čuvanja. |
| Uvećan tekst | Simulirano 200% root font u browseru: Početna bez horizontalnog preliva, Više i close ostaju dohvatljivi. Ovo nije zamena za sve sistemske accessibility postavke telefona. |
| Neispravan logo/dug naziv | Browser fixture: fallback na inicijale, naziv čitljiv, nema horizontalnog preliva. Profil u bazi nije menjan. |
| Gost i katalog | Odvojena neprijavljena browser sesija: postojeći share URL daje „Catalog Not Found”; vlasnički detalj se otvara. Potvrđen funkcionalni blocker. |
| Snyk | Pozvan; nije izvršio analizu jer korisnik nije prijavljen. Nema tvrdnje da je security scan prošao. |

Nije izvršeno: fizičko očitavanje barkoda, slušanje zvuka, realna Android/iPhone kamera, virtuelna tastatura na fizičkom telefonu, PWA instalacija, offline rad, paralelni upisi i poslovni end-to-end sa izmenom baze. Nije potvrđena odvojena testna baza, pa nije bilo create/save/delete/pay/stock-out operacija. Dev nalog ima postojeće podatke; nije tretiran kao dozvola za njihovu izmenu.

Browser konzola nije potpuno čista: nedostaje icon-192.png, postoje Clerk development/deprecated redirect i mobile-web-app metadata upozorenja. Originalni scanner kod ima postojeća lifecycle/audio upozorenja. Nije prećutano kao „sve bez greške”.

Komanda `npm` u ovom shell-u prvo je pogodila neispravan roaming shim. Provere su izvršene preko instaliranog Node/NPM CLI-ja, bez promene sistema ili zavisnosti.

### Vizuelni artefakti

Čuvaju se lokalno, nisu objavljeni niti dodati u repozitorijum:

- `C:/Users/urosn/.codex/visualizations/2026/09/20/01a0c0be-7757-75b0-850c-be7a6f7e9568/dashboard-390-final.png`
- `C:/Users/urosn/.codex/visualizations/2026/09/20/01a0c0be-7757-75b0-850c-be7a6f7e9568/dashboard-1440-final.png`
- `C:/Users/urosn/.codex/visualizations/2026/09/20/01a0c0be-7757-75b0-850c-be7a6f7e9568/mobile-more-after.png`
- `C:/Users/urosn/.codex/visualizations/2026/09/20/01a0c0be-7757-75b0-850c-be7a6f7e9568/mobile-product-form.png`
- `mobile-dashboard-before-density.png` u istom folderu: stanje pre sabijanja kartica, ali posle prve izmene zaglavlja. Nije predstavljeno kao netaknuto početno stanje. Originalne korisničke slike su početna vizuelna referenca.

Slike sadrže lokalne poslovne podatke. Za javni marketing snimiti zasebnu demonstracionu firmu.

## Scanner/audio: nalazi i sledeći zahvat

Dokaz: `src/components/inventory/BarcodeScanner.tsx`, `src/components/dashboard/QuickScanButton.tsx`, `docs/scanner-ux-rules.md`.

- Pravila zahtevaju tihi decoder i jedan zvuk iz roditeljskog toka; trenutni decoder kreira AudioContext i poziva `playBeep` pre `onScanSuccess`. To potvrđuje neslaganje sa dokumentacijom, ne uzrok prijavljenog pucanja zvuka.
- `playBeep` proverava `soundEnabled`, pokušava resume suspendovanog konteksta i pravi oscillator. `initializeAudio` je deo startovanja skenera nakon enumeracije kamere, pa vezu sa prvobitnim korisničkim gestom treba proveriti na Safari/Chrome uređajima.
- Callback skeniranja potom radi lookup i POST. Zato zvuk na detekciji ne dokazuje uspešan upis i može se čuti i kad roditelj kasnije odbaci događaj ili upis zakaže.
- QuickScan poslovni tok ne čeka beep promise; ne treba dodavati retry upisa zbog zvuka.
- Zatvaranje zaustavlja skener, ali asinhroni početak kamere, timer-i i AudioContext cleanup zahtevaju zasebnu real-device proveru. Broj DOM regiona ne dokazuje oslobađanje fizičke kamere.
- Postoji zaseban skener unutar ProductForm za popunjavanje forme. To nije isto što i automatski upis u QuickScan-u. Proveriti oba toka i ugnežđene dijaloge u zasebnom zahvatu.

Prihvat sledećeg zahvata: jedan uspešan upis daje jedan uspešni zvuk; odbijen duplikat i neuspešan upis ne daju zvuk uspeha; nepoznat proizvod dobija jasnu drugačiju povratnu informaciju. Mute radi tokom sesije. Audio greška ne menja količinu ni broj POST zahteva. Testirati 30 ponavljanja, background/resume, zatvori/otvori, odbijenu dozvolu i izgubljenu mrežu na Android Chrome i iPhone Safari. Decoder, checksum, potvrda frejmova i cooldown ostaju isti osim ako zasebni dokazi zahtevaju promenu.

## Barkod podaci: aktivni tok i benchmark

QuickScan poziva `/api/products/fetch-by-barcode`, zatim `/api/products` pri pronađenom proizvodu. Lookup prvo traži poslednji proizvod tog `profileId` i SKU-a. Zatim redom pokušava OpenFoodFacts, OpenBeautyFacts, OpenPetFoodFacts, OpenProductsFacts i UPCitemdb trial. Svaki ima timeout 5 s. U najgorem slučaju samo provider čekanja mogu sabrati približno 25 s, plus mrežni/serverski rad; ovo je procena iz koda, ne izmeren p95.

U ovom aktivnom handler-u nije pronađen eksplicitan trajni cache rezultata providera. Lokalni sačuvani proizvodi jesu ponovna upotreba metapodataka. Next/fetch infrastrukturni cache nije ovim potvrđen kao poslovni cache. Provider timeout/error vraća null pa se konačno može pretvoriti u found:false: nema pouzdanog razlikovanja „ne postoji” i „izvor ne radi”.

`src/lib/openfoodfacts.ts` i `/api/products/barcode` takođe sadrže lookup implementacije. ProductForm koristi lookup i metadata helper; ne treba unapred menjati sve varijante kao da su isti tok.

Benchmark plan:

1. Vlasnik/dva pilot korisnika biraju 100 fizičkih proizvoda: npr. 40 hrana/piće, 20 kućna hemija/lična nega, 20 lokalni brendovi, 20 stvarni teški/nepoznati slučajevi. Prilagoditi stvarnom asortimanu; ne koristiti samo popularne globalne proizvode.
2. Ručno potvrditi barkod kao string (sa vodećim nulama), tačan naziv, brend i pakovanje. Sačuvati kategoriju i poreklo referentnih podataka.
3. Na po jednom Android i iPhone uređaju meriti dekodiranje odvojeno od identifikacije. Za lookup odvojiti lokalni pogodak i spoljne izvore.
4. Evidencija: šifra testa, uređaj/browser, osvetljenje, barcode format, tačnost dekodiranja, izvor, tačnost proizvoda/pakovanja, naziv/slika, vreme, timeout/429/error/not-found. Ne beležiti tokene niti privatne cene/zalihe.
5. Izračunati procenat tačnih dekodiranja, tačnih identifikacija, pogrešnih pogodaka, pokrivenost slike/naziva i p50/p95 po kategoriji. Pogrešan proizvod je ozbiljniji problem od jasnog „nije pronađen”.
6. Tek potom porediti dodatni provider na istom uzorku i proveriti komercijalne uslove, cenu, kvote, atribuciju i prava slika. U ovom zadatku nije odabran niti kupljen novi provider.

Sačuvati tenant izolaciju: eventualni budući cache javnih metapodataka ne sme sadržati privatne nazive/ispravke, cene ili količine firmi bez izričitog odobrenog dizajna.

## Katalog: konkretan plan

Postoji vlasnički detalj, izmena, PDF sa 4/12 stavki po strani i `/shared/catalog/[id]` preview sa kontaktom firme, slikama i paginacijom. Checkout/naručivanje nisu potvrđene funkcije.

Najpre popraviti ugovor javnog pristupa: middleware dozvoljava share stranicu, ali štiti `/api/catalogs/[id]`. Handler istovremeno ima logiku javnog čitanja i proverava vlasništvo samo kada je profil pronađen. Ne rešavati samo otvaranjem celog API-ja! Definisati eksplicitno deljenje, javni ograničeni DTO, opoziv/rok ako je potrebno, i fail-closed privatni pristup. Proveriti vlasnika, drugu firmu, gosta, prijavljenog bez profila i opozvan link.

Posle pristupa: mobilna pretraga i kategorije prema veličini kataloga; 12/24 stavke, optimizovane slike/fallback, duži nazivi i jasne RSD cene/popusti. Razdvojiti snimljenu cenu ponude od trenutnog lagera; ne oglašavati live dostupnost ako nije definisana. Potom zasebno proveriti PDF izvoz i deljenje na fizičkim telefonima. Ne menjati istorijske cene tiho.

## Prioriteti sa kriterijumima prihvata

| Prioritet / zadatak | Kriterijum prihvata | Zavisnost |
| --- | --- | --- |
| P0 — paralelni upis i retry | Izolovan DB test: dva istovremena skena povećavaju količinu za 2, nema izgubljenog ažuriranja; ponovljen isti zahtev ne duplira robu. Trenutni products POST čita quantity pa upisuje izračunatu vrednost, bez atomskog increment-a u toj grani. Rizik iz koda, nije reprodukovan na živoj bazi. | Testna baza, dogovor o idempotency i dnevnim batch redovima. |
| P0 — katalog access boundary | Privatni katalog nije dostupan drugoj firmi ili nalogu bez profila; javno deljenje ima eksplicitan ugovor i samo dozvoljena polja. | Odluka šta se sme javno deliti; test nalozi A/B/gost. |
| P0 — razvojni ingest u skeniranju | Produkcijski scan nema slanje debug payload-a na hardkodirani localhost/ngrok ingest; kontrolisani logovi bez privatnih podataka. Pozivi postoje u QuickScan kodu; nisu dodati ovim zahvatom. | Zaseban cleanup, potvrda dozvoljene telemetrije. |
| P1 — stvarni scan/save pilot | Poznat/nepoznat kod, ponovljen sken, greška i retry, prekid mreže: tačan lager i povratna informacija na Android/iPhone uređajima. | Testni podaci; P0 upisi. |
| P1 — zvuk | Jedna ispravna potvrda u odgovarajućem trenutku, mute/resume rade, nema promene scanner tačnosti. | Real-device reprodukcija, pravilo zvučnih događaja. |
| P1 — javni katalog radi kupcu | Neprijavljeni kupac otvara odobren link na telefonu; revoke/expired ne otkriva podatke. | P0 pristup. |
| P1 — timski rad | Razjasniti model firma/korisnik: schema trenutno vezuje Profile za jedan clerkUserId; membership/roles nisu pronađeni. Ako se prodaje više magacionera u istoj firmi, dokazati zajednički lager i prava pristupa pre obećanja te funkcije. | Poslovna odluka solo pilot vs timski proizvod. |
| P1 — onboarding i podrška | Novi pilot korisnik uz dogovorenu podršku postavlja firmu, prvi proizvod i katalog; postoji kontakt za pomoć i evidencija problema. | Demo/test okruženje, operativni vlasnik. |
| P1 — brand/install assets | Odobren TradeMaster logo i stvarne 192/512, Apple/favicon/share slike; deklarisani URL-ovi vraćaju validne fajlove; instalacija zasebno proverena. | Dizajn/odobrenje grafike. Trenutno korišćen tekstualni naziv. |
| P1 — backup, nadzor i produkcijske postavke | Dokaz povratka backup-a u test okruženje, prijava greške i kontakt, proverene produkcijske auth postavke. | Operativni pristup; lokalni Clerk koristi development ključeve. |
| P2 — pokrivenost barkodova | Izveštaj na 100 artikala, sa tačnošću i latencijom; izbor izvora potkrepljen rezultatom i uslovima. | Stvaran asortiman pilot firmi. |
| P2 — katalog prezentacija/PDF | Pretraga/paginacija/fallback rade na telefonu; export čitljiv i finansijski tačan; bez menjanja istorijske ponude. | Ispravan pristup; uzorci kataloga. |
| P2 — jezik i završna pristupačnost | Dosledni SR tekstovi u formularima, kameri, kalendaru i PDF kontrolama; realna tastatura, zoom i čitač ekrana provereni. | Stabilni tokovi. |
| P2 — landing i video | Stvaran demo bez privatnih podataka, funkcionalan demo CTA i tačne tvrdnje. | Zatvoreni pilot blokeri, cena/ponuda/kontakt. |

## Spremnost za prodaju

| Oblast | Dokaz | Status | Sledeći korak |
| --- | --- | --- | --- |
| Mobilni shell | Browser matrica, snimci, zajednički dijalog | Verified | Fizički uređaji za konačnu potvrdu. |
| Login postojećeg naloga | Korisnik se prijavio, zaštićene rute dostupne | Verified | Novi signup/onboarding još Needs verification. |
| Prvi unos / scan-save | Postojeći tok pročitan, bez stvarnog upisa u ovoj proveri | Needs verification | Izolovan business E2E. |
| Firma i prava | profileId filteri u ključnim upitima; katalog izuzetak i nema potvrđenih članstava | Needs verification | A/B izolacija, nalog bez profila, timski model. |
| Fakture/finansije | Postojeći testovi prolaze; semantika očuvana | Needs verification | Izolovan create/pay/reopen scenario i usklađenost očekivanja o nacrtima. |
| Ponuda kupcu | Gost dobija Catalog Not Found | Blocked | Eksplicitno javno deljenje. |
| Pouzdanost više uređaja | Rizik read-modify-write u products POST | Needs verification | P0 konkurentni test i popravka. |
| Backup/monitoring/podrška | Nema priloženog operativnog dokaza | Needs verification | Restore drill, nadzor, odgovorna osoba. |
| Demo podaci | Postojeći nalog nije potvrđen kao izolovana test baza | Blocked | Odvojeno okruženje i demonstraciona firma. |
| Cena / ugovor / naplata | Poslovni uslovi nisu dati niti potvrđeni | Needs verification | Vlasnik određuje cenu i demo/prodajni proces. |
| Privacy/terms | Nije potvrđen gotov proces/dokumentacija | Needs verification | Vlasnik i odgovarajući stručni pregled; bez tvrdnje o usklađenosti. |
| Instalacija/store/offline | Nedostaju ikonice; nije testirano | Blocked | Ne reklamirati dok nije isporučeno i provereno. |

Zaključak: UI je spreman za demonstraciju. Kontrolisani pilot sa stvarnim poslovnim podacima još nije bezuslovno odobren: zatvoriti P0 i dokazati fizički scan/save, testnu izolaciju i oporavak. Šira samostalna prodaja nije spremna dok javni katalog, onboarding, operativni i komercijalni uslovi ostaju otvoreni. Manual onboarding i demo prodaja mogu biti dovoljni za prvi mali pilot; automatska naplata nije nužan prvi korak.

## Landing brief — sledeća faza

Publika: vlasnici malih veleprodaja i ljudi koji svakodnevno unose/prate robu. Timski rad oglašavati tek kada model članstva bude potvrđen.

Predlog naslova: **Od skeniranja proizvoda do preglednog lagera.**

Podnaslov: **TradeMaster povezuje unos proizvoda, stanje robe, kataloge i fakture u jednom radnom prostoru.**

Primarni CTA: **Zakaži demo** — tek uz stvaran kontakt ili zakazivanje koje je vlasnik odredio. Sekundarni CTA: **Pogledaj kako radi** — vodi na gotov snimak, ne prazan modal.

Struktura: hero sa stvarnim mobilnim ekranom → tri koraka (skeniraj, proveri lager, pripremi ponudu) → prikaz glavnih funkcija → kratak video → kome je namenjeno → FAQ → demo kontakt.

Poruke: „Manje ponovnog prepisivanja podataka.” „Skeniranje nadohvat palca.” „Pregled robe i ponude na telefonu i računaru.” Ne koristiti brojčane uštede bez merenja.

FAQ: Da li moram da instaliram aplikaciju? Koji proizvodi se prepoznaju? Šta kada kod nije u bazi? Da li je potreban internet? Kako se šalje katalog? Kako počinjemo i dobijamo podršku? Cena/više korisnika/import su pitanja za vlasnika pre objavljivanja.

Potrebni snimci: Početna 390 px, skeniranje stvarnog demo proizvoda, potvrda upisa, Asortiman, kupčev katalog nakon popravke pristupa, desktop pregled. Sakriti privatna imena, cene i kontakte.

## Storyboard 25 sekundi

| Vreme | Stvarni kadar | Poruka |
| --- | --- | --- |
| 0–3 s | TradeMaster Početna na telefonu | „Roba stiže. Unos počinje skeniranjem.” |
| 3–8 s | Dodir Sken i stvaran barkod demo proizvoda | „Skeniraj proizvod.” |
| 8–12 s | Potvrđen uspešan upis / prikazana količina | „Proveri unos i količinu.” |
| 12–17 s | Asortiman ili stanje lagera | „Prati stanje na jednom mestu.” |
| 17–22 s | Postojeći katalog; gost prikaz tek posle popravke | „Pripremi ponudu kupcu.” |
| 22–25 s | TradeMaster naziv i demo CTA | „Pogledaj TradeMaster na svom asortimanu. Zakaži demo.” |

Snimiti stvaran tok, bez lažnih interakcija i obećanja da svaki kod mora biti prepoznat. Titlovi treba da nose poruku i bez zvuka. Nema store bedževa, offline obećanja ili izmišljenih iskustava korisnika.
