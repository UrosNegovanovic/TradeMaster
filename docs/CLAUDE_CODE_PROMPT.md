# Prompt za Claude Code

Nalepi sve ispod linije u novu Claude Code sesiju u korenu repoa.

---

Radiš na TradeMaster-u (B2B SaaS za srpske veletrgovce i male magacine). Prvo pročitaj `CLAUDE.md`, `docs/STATUS.md` i `docs/ROADMAP.md`, pa `docs/stock-invoice-rules.md` i `docs/scanner-ux-rules.md`. Pravila iz `CLAUDE.md` važe bez izuzetka. Cilj je javno lansiranje 1. novembra 2026.

## Način rada

- Implementiraj tačke iz `docs/ROADMAP.md` redom: 2, 5, 8, 1, 4, 3, 6, 7, 9. Jedna tačka = jedna grana (`feat/<kratak-naziv>`) = jedan draft PR. Ne spajaj tačke i ne merguj.
- Pre svake tačke: pročitaj relevantan kod, napiši kratak plan (fajlovi, migracija, testovi), pa implementiraj. Ako nešto zavisi od vlasnika (domen, PIB, naplata), preskoči i navedi u PR opisu.
- UI tekstovi na srpskom (latinica), kod, komentari i commit poruke na engleskom, conventional commits.
- Pre svakog push-a: `npm run typecheck && npm run lint && npm run test:run`. Za promenjeno ponašanje dodaj testove pored postojećih `*.test.ts`.
- Ne diraj `BarcodeScanner.tsx`. Ne uvodi nove nazive cena (`price`, `costPrice`, `unitPrice`, `unitCost` već postoje). Novac validiraj preko `assertMoneyInput` / `MONEY_INPUT_PATTERN`.
- Šema: nova SQL migracija u `supabase/migrations/` (naziv sa vremenskim pečatom) + izmena `prisma/schema.prisma`. Ne pokreći `prisma migrate deploy`, ne popunjavaj istorijske vrednosti izmišljenim podacima.
- Sve novo je po tenantu (`profileId`), svaki API ima autentifikaciju osim eksplicitno javnih ruta u `src/lib/route-access.ts`. Javni DTO nikad ne sadrži `costPrice`, zalihu ni interne ID-jeve vlasnika.

## Tačke

**2. Onboarding.** Na dashboardu čekliste (podaci firme, prvi proizvod, prva faktura), prazna stanja sa jasnim sledećim korakom na Asortimanu, Katalozima i Fakturama. Stanje čekliste izvedi iz podataka (bez nove tabele). Bez demo podataka koji se mešaju sa pravim.

**5. Izvoz za knjigovođu.** CSV/XLSX izvoz faktura (broj, datum, kupac, PIB, status, iznos) za izabrani period, po uzoru na postojeći uvoz/izvoz u magacinu (`xlsx` je već zavisnost). Dan se računa po Europe/Belgrade.

**8. Analitika i greške.** Dodaj Vercel Analytics i Sentry za Next.js, aktivne samo kad su env promenljive postavljene, dokumentuj ih u `.env.example`. Događaji bez ličnih podataka: registracija, prvi proizvod, prva faktura, deljenje kataloga.

**1. PDV.** Podešavanje firme "u sistemu PDV-a". Na stavci fakture snimi stopu PDV-a (0, 10, 20) kao snimak, uz postojeći `unitPrice`/`unitCost`; faktura prikazuje osnovicu, PDV po stopi i ukupno. Istorijske fakture bez stope ostaju neizmenjene (bez PDV). Ažuriraj `InvoicePDF`, `invoice-totals.ts`, `invoice-finance.ts` (profit na osnovici) i testove, uključujući zaokruživanje na 2 decimale.

**4. Kupci.** Tenant tabela `Client` (naziv, PIB, adresa), API sa Zod validacijom, izbor kupca u `InvoiceForm` koji popunjava polja na fakturi. Faktura i dalje čuva snimak imena/adrese/PIB-a (bez veze koja menja istoriju).

**3. Deljenje.** Dugme "Podeli" za katalog (već ima token) i fakturu: opoziv-ljiv javni PDF link sa tokenom, `navigator.share` sa kopiranjem linka kao rezervom. Isti obrazac kao `/api/shared/catalog/[token]`; dodaj rutu u `isPublicRoute` samo za tokenizovani put.

**6. IPS QR.** NBS IPS QR kod na PDF fakturi (žiro-račun primaoca iz podešavanja, iznos, svrha, poziv na broj = broj fakture). Prikazuj samo kad su žiro-račun i iznos validni. Proveri format po NBS specifikaciji i pokrij testovima.

**7. Upozorenja.** Kartica "Kasni naplata" (neplaćene fakture posle roka) i prikaz niske zalihe na dashboardu, koristeći postojeći `low-stock` i `dashboard-activity.ts`.

**9. Probni period.** Polje isteka pristupa na profilu, baner "ističe za N dana" i uputstvo za ručnu uplatu. Ne dodavaj checkout ni obećanje otkazivanja (vidi `src/lib/landing-copy.ts`).

## Završetak svake tačke

U PR opisu: šta se promenilo za korisnika (pre/posle), migracija ako postoji, kako je testirano, i šta vlasnik treba da uradi (npr. primeni SQL u Supabase pre deploy-a). Na kraju ažuriraj `docs/STATUS.md`.
