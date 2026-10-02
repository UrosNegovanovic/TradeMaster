# Plan do lansiranja (mesec dana)

Cilj: javno lansiranje na sopstvenom domenu za 30 dana, sa aplikacijom koju je lako izabrati i lako prodati malom i srednjem preduzeću u Srbiji. Stanje koda je proveravano 2026-10-02; blokeri su u `docs/STATUS.md`.

Ocena: **vrednost** = koliko pomaže prodaji/zadržavanju, **trud** = S (do 1 dan), M (2-3 dana), L (nedelja+).

## Gde smo stali (2026-10-02)

Urađeno i spojeno u `main`:

| # | Šta | PR | Napomena |
|---|---|---|---|
| 1 | PDV na fakturi | #53 | Migracija `invoice_vat` primenjena u produkciji. |
| 2 | Onboarding i prazna stanja | #54 | Čeklista "Prvi koraci" na Početnoj; bez demo podataka. |
| 3 | Deljenje fakture i kataloga (link, WhatsApp/Viber, mejl) | #55 | Opozivi link za fakturu; migracija `invoice_sharing` primenjena. |
| K | **Napredni katalog** (raspored Mreža 4/12 ili Lista, grupisanje po kategoriji, redosled ručno/naziv/cena, izbor polja, pretraga i kategorije na javnom linku, "Cena na upit", PDF font sa č/ć/đ) | #56 | Migracija `catalog_display_settings` primenjena u produkciji 2026-10-02. |

**Sledeće: #9 probni period; ručna provera na telefonu (`docs/device-checklist.md`) i Upstash ključevi za #11.** Urađeni su #4 Lista kupaca (#57), #5 izvoz (#58), #6 IPS QR (#59), #7 upozorenja (#60) i #8 analitika i greške.

Predlozi za katalog koji nisu urađeni (za kasnije, po vrednosti): cene sa/bez PDV-a i popust po stavci ili kategoriji; upit sa javnog linka (kupac upiše količine i pošalje poruku, bez korpe i plaćanja, traži odobrenje vlasnika jer je blizu korpe); naslovna strana i boja firme, datum važenja; dugme "osveži cene" i dupliranje kataloga; broj otvaranja linka; QR kod ka linku na PDF-u.

## Šta aplikacija već ima

Skener barkodova, asortiman sa nabavnom cenom, magacin (ulaz/izlaz, uvoz, istorija), katalog (PDF i javni link sa izborom rasporeda, grupisanjem po kategoriji, redosledom i pretragom), interne fakture sa snimkom cena i PDV-om, deljenje fakture i kataloga, onboarding, finansije/profit, PWA.

## Rangirana lista (vrednost / trud)

| # | Funkcija | Vrednost | Trud | Zašto |
|---|---|---|---|---|
| 1 ✅ | **PDV na fakturi** (stope 20% / 10% / bez PDV, iznos bez PDV, PDV, ukupno; podešavanje "u sistemu PDV-a" u firmi) | Visoka | M | Danas faktura ima samo zbir. Firme u PDV sistemu ne mogu da je koriste. Dodati polja u `InvoiceItem`, snimiti stopu na stavci (kao `unitCost`), ne menjati istoriju. |
| 2 ✅ | **Onboarding i prazna stanja** (čekliste: firma, prvi proizvod, prva faktura; demo podaci na jedan klik) | Visoka | S | Prvi utisak odlučuje da li se korisnik vraća. Nema troškova podrške. |
| 3 ✅ | **Slanje fakture i kataloga** (dugme "Podeli": link, WhatsApp/Viber, mejl) | Visoka | S | Katalog već ima token; isto za fakturu (javni PDF link sa tokenom, opozivo). Direktno prodajno: kupci dobijaju dokument sa brendom firme. |
| 4 ✅ | **Lista kupaca** (ime, PIB, adresa, popunjavanje fakture jednim klikom) | Visoka | M | Najmanje ponovnog kucanja; priprema teren za CRM bez pravljenja CRM-a. Samo tenant tabela `Client` i izbor u `InvoiceForm`. |
| 5 ✅ | **Kupcu-prijateljski izvoz** (CSV/XLSX faktura i stanja za knjigovođu) | Visoka | S | Knjigovođa je glavni uticajni faktor u odluci malih firmi. Magacin već ima CSV; dodati fakture. |
| 6 ✅ | **Uplatnica / poziv na broj + QR kod (NBS IPS QR) na fakturi** | Visoka | M | Brže plaćanje, jasna razlika u odnosu na tabele. Zahteva žiro-račun (već u podešavanjima). |
| 7 ✅ | **Pametna upozorenja** (niska zaliha na dashboardu, neplaćene fakture posle roka) | Srednja | S | `low-stock` API već postoji; dodati karticu "Kasni naplata". Daje razlog za dnevno otvaranje. |
| 8 ✅ | **Analitika i praćenje grešaka** (Vercel Analytics + Sentry, bez ličnih podataka u događajima) | Srednja | S | Bez toga ne znate gde korisnici odustaju posle lansiranja. |
| 9 | **Naplata** (ručna: zahtev za fakturu + datum isteka u profilu; Stripe tek kasnije) | Srednja | M | Landing obećava 30 EUR / 60 dana. Potrebni su bar datum isteka probnog perioda i baner. Ne obećavati otkazivanje dok ne postoji. |
| 10 | **Landing i SEO za domen** (kanonski URL, sitemap, 3 stranice po industriji, FAQ, demo video) | Srednja | M | Posle kupovine domena. `SEO_DEVOPS_AUDIT.md` je zastareo. |
| 11 ✅ | **Higijena pred lansiranje** (godina broja fakture po Europe/Belgrade; trajni rate limit, npr. Upstash ili Vercel KV; test na pravom telefonu: kamera, zvuk, instalacija PWA) | Srednja | S | Sitni, ali ozbiljni rizici nađeni u kodu: vidi `docs/STATUS.md`. |
| 12 | **Višekorisnički pristup** (zaposleni sa ulogom magacioner/prodaja) | Visoka | L | Traže ga firme sa 2+ zaposlena, ali menja tenant model. Posle lansiranja. |

Namerno van plana: SEF i fiskalna kasa, nativne aplikacije, javna prodavnica, korpa, AI.

## Nedelja po nedelja

**Nedelja 1 (1-7. okt): temelj i brze pobede**
- Vlasnik: kupovina domena, stvarni podaci firme, odluka o naplati.
- Kod: #2 onboarding ✅, #5 izvoz faktura, #8 analitika/greške, #11 higijena (godina fakture, rate limit).
- Urađeno ranije nego po planu: #1 PDV ✅, #3 deljenje ✅, napredni katalog ✅.

**Nedelja 2 (8-14. okt): faktura kao proizvod**
- Kod: #1 PDV (migracija + PDF + finansije + testovi), #4 kupci.

**Nedelja 3 (15-21. okt): prodaja i naplata**
- Kod: #3 deljenje fakture/kataloga, #6 IPS QR, #7 upozorenja, #9 probni period.
- Vlasnik: Clerk Production na novom domenu, e2e test na pravom telefonu.

**Nedelja 4 (22-31. okt): lansiranje**
- Landing/SEO (#10), pravne strane sa pravim podacima, pregled bezbednosti, smoke test, zamrzavanje koda 28. okt.
- 1. nov: javno lansiranje; prvih 10 korisnika direktno (knjigovođe, veletrgovci iz mreže vlasnika).

## Pravila za izvršavanje

- Jedan PR po tački iz tabele, draft, bez merge-a bez odobrenja vlasnika.
- Migracije kao SQL u `supabase/migrations/`, bez izmišljanja istorijskih vrednosti.
- Svaka tačka ima testove za promenjeno ponašanje; detalji u `docs/CLAUDE_CODE_PROMPT.md`.
