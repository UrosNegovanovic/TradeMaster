# Naplata TradeMaster pretplate (predračun automatski, uplata ručno)

Uputstvo za vlasnika. Važi do faze B9 (plaćanje u aplikaciji). Pravila su u kodu (`src/lib/access-period.ts`,
`planAccessExtension`) i u uslovima korišćenja (`/uslovi`, „Cena, plaćanje i pristup”). Kartičnog plaćanja nema.

## Pravila

| | |
|---|---|
| Probni period | 60 dana od otvaranja naloga, besplatno |
| Cena | 20 € + PDV mesečno, u dinarima po **srednjem kursu NBS** na dan predračuna (kurs se preuzima automatski) |
| Period | jedna uplata = jedan kalendarski mesec, do istog dana u sledećem mesecu; pristup važi i ceo poslednji dan |
| Kraći meseci | ako tog dana nema, važi do poslednjeg dana meseca, a sledeći mesec se vraća na isti dan: 31.01. → 28.02. (29.02. u prestupnoj) → 31.03. |
| Predračun | **automatski**, 7 dana pre isteka, svako jutro u 7-8h (žuta traka u aplikaciji se tada pali) |
| Rok posle isteka | 2 dana sve radi, crvena traka „Uplatite do …” |
| Posle roka | samo pregled i izvoz (podaci i linkovi kupcima ostaju) |
| Uplata na vreme | uplata pre isteka ili u ta 2 dana (po **datumu uplate na izvodu**) nastavlja se na stari datum isteka: nijedan dan se ne gubi, a dani roka nisu besplatni |
| Uplata kasnije | posle prelaska na „samo pregled”: mesec počinje dana kada uključite pristup (10.03. → 09.04.; 01.03. → 31.03.) |
| Rok aktivacije | pristup produžavate posle provere izvoda, **najkasnije narednog radnog dana** od dana kada uplata stigne. Kupcima ne obećavajte „čim uplatite” |
| Promena cene | najava najmanje 30 dana unapred; već plaćeni period se ne menja |

## Kako radi automatski predračun

Svako jutro (Vercel Cron, 06:00 UTC = 7h zimi / 8h leti) aplikacija:

1. pronađe firme kojima pristup ističe za 7 dana ili manje (i one u 2 dana roka, ako im predračun još nije otišao);
2. preuzme srednji kurs NBS za taj dan (ako kurs nije dostupan, ne šalje ništa i pokušava sutra);
3. u **vašem T&G Nest nalogu** napravi predračun (`PR-NN/GGGG`): kupac je ta firma, stavka
   „TradeMaster pretplata, 1 mesec (od … do …)”, 20 € u dinarima + 20% PDV, rok = dan isteka, napomena sa kursom;
4. uključi javni link predračuna (IPS QR i PDF) i pošalje mejl na mejl firme iz Podešavanja, a ako ga nema, na mejl kojim
   je nalog otvoren. Test adrese (`@example.com`, `+clerk_test`) se preskaču;
5. upiše u tabelu `billing_notices`: firmu, mesec, broj predračuna, primaoca, kurs, id mejla i eventualnu grešku.

**Zaštita:** jedna firma i jedan mesec = najviše jedan predračun i jedan mejl, i kada se posao pokrene dvaput. Ako slanje
ne uspe, sutradan se ponovo šalje **isti** predračun (ne pravi se novi).

## Gde pratite šta je poslato

1. **Vaš TradeMaster (T&G Nest) → Fakture:** svaki automatski predračun je tu, kao da ste ga sami napravili.
2. **Vaš mejl:** kopija (BCC) svakog mejla, tačno ono što je kupac dobio (`BILLING_EMAIL_BCC`). Odgovori kupaca stižu na
   `BILLING_EMAIL_REPLY_TO`.
3. **Resend → Emails** (resend.com): svaki mejl sa statusom *Delivered / Bounced / Opened*, sadržajem i vremenom.
4. **`npm run billing:due`:** uz svaku firmu „predračun PR-… poslat DD.MM. na …” ili „SLANJE NIJE USPELO: razlog”.
5. **Vercel → Logs** (filter `billing cron`): koliko je poslato tog jutra, bez imena i mejlova.

## Jednom, pre prve naplate

1. U **svom** TradeMaster nalogu (T&G Nest, profil sa žiro-računom) proverite Podešavanja: naziv, PIB, matični broj,
   adresa, **žiro-račun** (ide na predračun i u IPS QR) i **PDV obveznik: da**.
2. Knjigovođa da potvrdi koji dokument izdajete posle uplate. T&G Nest je u PDV-u, pa **faktura firmi ide kroz SEF**;
   predračun ne mora.
3. Resend nalog (besplatno do 3.000 mejlova mesečno): resend.com → Sign up → API Keys → Create (Sending access).
   Ključ ide u Vercel → Settings → Environment Variables kao `RESEND_API_KEY`.
4. Vercel → Environment Variables (Production): `CRON_SECRET` (nasumičnih 32+ znakova), `BILLING_ISSUER_PROFILE_ID`
   (id profila T&G Nest), `BILLING_EMAIL_BCC` i `BILLING_EMAIL_REPLY_TO` (vaš mejl), pa tek na kraju `BILLING_AUTO_SEND=on`.
   Bez `on` posao samo proverava i ništa ne šalje.
5. **Domen (posle kupovine trademaster.rs):** Resend → Domains → Add `trademaster.rs`, dodajte DNS zapise koje pokaže
   (SPF, DKIM, DMARC), pa `BILLING_EMAIL_FROM="TradeMaster <racuni@trademaster.rs>"`. Do tada Resend dostavlja **samo na
   adresu vašeg Resend naloga**, pa kupci još ne dobijaju mejl. Za prijem pošte na domenu (npr. `podrska@trademaster.rs`)
   je dovoljno besplatno prosleđivanje na Gmail (Cloudflare Email Routing); plaćeni sanduče (Google Workspace) nije potrebno.

## Svakog radnog dana (2 minuta)

```bash
npm run billing:due
```

Ništa ne menja. Pokazuje firme kojima pristup ističe u narednih 10 dana i da li je predračun poslat, firme u roku od
2 dana (podsetite ih) i firme na „samo pregled”. Isti dan pogledajte izvod banke (ili e-banking) za nove uplate.

## 1. Predračun

Ide sam (gore). Ručno samo kada `billing:due` pokaže „SLANJE NIJE USPELO” ili „NEMA MEJLA”:

```bash
npm run billing:send -- --only <PIB firme>          # pokaže šta bi se poslalo
npm run billing:send -- --only <PIB firme> --send   # napravi i pošalje (isti predračun ako već postoji)
```

Ako firma nema mejl, upišite ga u njihov profil (ili ga zatražite od njih) i pokrenite ponovo. Može i bez komande:
otvorite predračun u svom nalogu → **Uključi deljenje → Mejl**. To dugme **samo priprema poruku** u vašem mejl programu;
poruku šaljete vi.

## 2. Kada uplata stigne: dva odvojena koraka

Evidentiranje uplate i produženje pristupa su **dva posebna koraka**. Označavanje fakture kao plaćene **ne produžava
pristup**, a `access:extend` **ne menja vašu fakturu**. Uradite oba, istog dana.

**Datumi:** datum uplate je datum sa **izvoda banke**. „Plaćeno” u TradeMaster-u upisuje dan kada ste kliknuli, ne dan
uplate. Za odluku da li je uplata stigla na vreme i za knjigovođu važi datum sa izvoda; zato ga upisujete u komandu (`--paid`).

**Korak A: evidencija uplate (u vašem TradeMaster nalogu)**

1. Otvorite predračun → **Pretvori u fakturu** → pošaljite fakturu kroz **SEF** (T&G Nest je u PDV-u) → označite je **Plaćeno**.
2. Plaćena faktura je vaša evidencija: broj dokumenta, iznos, period (u stavci). Izvod čuvajte za knjigovođu.

**Korak B: produženje pristupa (komanda)**

```bash
npm run access:extend -- <PIB firme> --ref <broj predračuna> --paid <datum sa izvoda GGGG-MM-DD>          # pokaže promenu
npm run access:extend -- <PIB firme> --ref <broj predračuna> --paid <datum sa izvoda GGGG-MM-DD> --yes    # primeni
```

Primer: `npm run access:extend -- 112233446 --ref PR-07/2026 --paid 2026-11-08`

- Prvo bez `--yes`: pokaže sadašnji datum, period koji se plaća i da li je uplata „na vreme” ili „posle zaključavanja”.
- Sa `--yes`: produži pristup i u istoj transakciji upiše evidenciju (tabela `access_extensions`: broj dokumenta,
  datum uplate, plaćeni period, datum pre i posle).
- **Ista uplata ne može dvaput.** `--ref` je jedinstven: drugi pokušaj sa istim brojem (i sa drugačije ukucanim
  razmacima ili malim slovima, ili za drugu firmu) se odbija sa porukom „Uplata … je već iskorišćena” i ništa ne menja.
- Jedan predračun = jedan mesec. Ako neko uplati dva meseca odjednom, izdajte dva predračuna (dva broja) i pokrenite
  komandu dvaput.

**Korak C:** javite firmi da je pristup produžen i do kog datuma (komanda ga ispiše).

## Kada neko ne plati

- Do isteka: ništa, traka u aplikaciji ih podseća.
- U 2 dana roka: kratka poruka ili poziv („Predračun broj … čeka uplatu, rok je …”).
- Posle roka: aplikacija je sama na „samo pregled”. Kad uplate, uradite korake A-C; mesec počinje dana kada uključite
  pristup. Ako je uplata po izvodu stigla u roku, a vi je vidite tek kasnije, komanda to prepozna i nastavi na stari datum.
- Podatke ne brišemo i ne zaključavamo pregled.

## Greške

- Pogrešna firma ili pogrešan broj: ne brišite red u `access_extensions`. Javite se programeru; ispravka ide uz zapis zašto.
- „Datum pristupa se upravo promenio”: neko je u međuvremenu menjao datum; pokrenite komandu ponovo.

## Korisne komande

```bash
npm run access:extend -- --list    # sve firme, do kada im važi pristup, stanje i poslednja uplata
npm run billing:due -- --all       # sve firme sa datumom pristupa, sa mejlom
```

Obe koriste `DATABASE_URL` iz `.env` (produkcija). `access:extend` bez `--yes` nikad ništa ne menja.
