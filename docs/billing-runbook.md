# Naplata TradeMaster pretplate (predračun automatski, uplata ručno)

Uputstvo za vlasnika. Važi do faze B9 (plaćanje u aplikaciji). Pravila su u kodu (`src/lib/access-period.ts`,
`src/lib/billing-*.ts`) i u uslovima korišćenja (`/uslovi`, „Cena, plaćanje i pristup”). Kartičnog plaćanja nema.

## Dve vrste faktura, odvojene

| | A. Fakture korisnika | B. Vaša naplata pretplate |
|---|---|---|
| Ko izdaje | firma u TradeMaster-u, svojim kupcima | T&G Nest (`BILLING_ISSUER_PROFILE_ID`), firmama za korišćenje TradeMaster-a |
| PDV | podešavanje te firme | samo vaše podešavanje (izdavalac); sada van PDV-a |
| Numeracija | serija te firme | vaša serija `PR-NN/GGGG` |
| Gde se vidi | njene Fakture, Finansije, izvoz | vaše Fakture (dugme „Pretplate TradeMaster”); korisnik ih vidi samo u Podešavanja → Pristup i uplata |

Kod za naplatu (B) upisuje samo u vaš nalog i u `billing_notices`. Nikad ne čita ni ne menja fakture, kupce, magacin ni
numeraciju korisnika (proverava ga test `src/lib/billing-run.db.test.ts`).

## Pravila

| | |
|---|---|
| Probni period | 60 dana od otvaranja naloga, besplatno |
| Cena | 20 € mesečno, u dinarima po **srednjem kursu NBS** na dan predračuna (kurs se preuzima automatski). Izdavalac nije u sistemu PDV-a: bez PDV-a, uz napomenu „Obveznik nije u sistemu PDV-a” |
| Period | jedna uplata = jedan kalendarski mesec, do istog dana u sledećem mesecu; pristup važi i ceo poslednji dan |
| Kraći meseci | ako tog dana nema, važi do poslednjeg dana meseca, a sledeći mesec se vraća na isti dan: 31.01. → 28.02. (29.02. u prestupnoj) → 31.03. |
| Predračun | **automatski**, 7 dana pre isteka, svako jutro u 7-8h (žuta traka u aplikaciji se tada pali) |
| Rok posle isteka | 2 dana sve radi, crvena traka „Uplatite do …” |
| Posle roka | samo pregled i izvoz (podaci i linkovi kupcima ostaju) |
| Uplata na vreme | uplata pre isteka ili u ta 2 dana (po **datumu uplate na izvodu**) nastavlja se na stari datum isteka: nijedan dan se ne gubi, a dani roka nisu besplatni |
| Uplata kasnije | posle prelaska na „samo pregled”: mesec počinje dana kada uključite pristup (10.03. → 09.04.; 01.03. → 31.03.) |
| Rok aktivacije | pristup produžavate posle provere izvoda, **najkasnije narednog radnog dana** od dana kada uplata stigne. Kupcima ne obećavajte „čim uplatite” |
| Promena cene | najava najmanje 30 dana unapred; već plaćeni period se ne menja |
| SEF | kao paušalac van sistema PDV-a niste obavezni da fakture firmama izdajete kroz SEF (možete, ako želite). Ako uđete u PDV, faktura firmama ide kroz SEF; potvrdite sa knjigovođom |

## Kako radi automatski predračun

Svako jutro (Vercel Cron, 06:00 UTC = 7h zimi / 8h leti) aplikacija:

1. pronađe firme kojima pristup ističe za 7 dana ili manje (i one u 2 dana roka, ako im predračun još nije otišao).
   Vašu firmu i njene duplikate (isti PIB, isti naziv ili `BILLING_EXCLUDE_PROFILE_IDS`) nikad ne naplaćuje;
2. preuzme srednji kurs NBS za taj dan. Ako kurs nije dostupan, **ne pravi ništa** i pokušava sutra;
3. u **vašem T&G Nest nalogu** napravi predračun (`PR-NN/GGGG`): kupac je ta firma, stavka
   „TradeMaster pretplata, 1 mesec (od … do …)”, 20 € u dinarima, rok = dan isteka. Napomena: kurs, datum i broj
   kursne liste, „Obveznik nije u sistemu PDV-a” i „Predračun za korišćenje aplikacije TradeMaster, izdavalac T&G Nest.
   Nije dokument iz vašeg poslovanja.”;
4. uključi javni link predračuna (IPS QR i PDF) i pošalje mejl (vidi prekidač ispod);
5. upiše u `billing_notices`: firmu, mesec, broj predračuna, primaoca, kurs, id mejla i grešku ako je bilo.

**Zaštita:** jedna firma i jedan mesec = najviše jedan predračun i jedan mejl, i kada se posao pokrene dvaput. Ako slanje
ne uspe, sutradan se ponovo šalje **isti** predračun (ne pravi se novi).

### Prekidač `BILLING_AUTO_SEND`

| Vrednost | Šta se dešava |
|---|---|
| `on` | mejl ide **kupcu** (mejl firme iz Podešavanja, a ako ga nema, mejl naloga), kopija vama |
| prazno ili bilo šta drugo (podrazumevano) | predračun se pravi, a mejl ide **samo vama** (`BILLING_EMAIL_BCC`). Kupac ne dobija ništa; vi ga prosledite. `billing:due` piše „SAMO VAMA” |
| isključen i bez `BILLING_EMAIL_BCC` | ništa se ne pravi i ne šalje (samo provera) |

## Gde pratite šta je poslato

1. **Vaš TradeMaster → Fakture → „Pretplate TradeMaster”:** svi predračuni za pretplatu i fakture nastale iz njih,
   odvojeno od faktura vašim klijentima (npr. Setvi). Na kartici piše „Pretplata TradeMaster”.
2. **Vaš mejl:** kopija svakog mejla kupcu (BCC), tačno ono što je kupac dobio. Odgovori kupaca stižu na
   `BILLING_EMAIL_REPLY_TO`.
3. **Resend → Emails** (resend.com): svaki mejl sa statusom *Delivered / Bounced / Opened*, sadržajem i vremenom.
4. **`npm run billing:due`:** uz svaku firmu „predračun PR-… poslat DD.MM. na …”, „SAMO VAMA” ili „SLANJE NIJE USPELO: razlog”.
5. **Vercel → Logs** (filter `billing cron`): koliko je poslato tog jutra, bez imena i mejlova.

Korisnik svoje predračune vidi u **Podešavanja → Pristup i uplata → Predračuni za TradeMaster** (link sa IPS QR i
PDF-om). Nikad nisu u njegovim Fakturama, Finansijama ni izvozu za knjigovođu.

## Jednom, pre prve naplate

1. U **svom** TradeMaster nalogu (T&G Nest, profil sa žiro-računom) proverite Podešavanja: naziv, PIB, matični broj,
   adresa, **žiro-račun** (ide na predračun i u IPS QR) i „U sistemu PDV-a” **isključeno**.
2. Resend nalog (besplatno do 3.000 mejlova mesečno): resend.com → API Keys → Create (Sending access).
3. Vercel → Settings → Environment Variables (Production): vidi `.env.example`, odeljak „AUTOMATIC PREDRAČUN” i
   „OPERATOR”. `BILLING_AUTO_SEND=on` stavite tek kada ste zadovoljni probom.
4. **Domen (posle kupovine trademaster.rs):** Resend → Domains → Add `trademaster.rs`, dodajte DNS zapise koje pokaže
   (SPF, DKIM, DMARC), pa `BILLING_EMAIL_FROM="TradeMaster <racuni@trademaster.rs>"`. Do tada Resend dostavlja **samo na
   adresu vašeg Resend naloga**, pa kupci ne mogu dobiti mejl ni sa `on`. Za prijem pošte na domenu (npr.
   `podrska@trademaster.rs`) dovoljno je besplatno prosleđivanje na Gmail (Cloudflare Email Routing).

## Proba (test)

```bash
npm run billing:send -- --test --only <PIB firme> --to <vaš mejl>
```

- Radi **samo** uz `--only` i `--to`; bez oba odbija da se pokrene.
- Ne čeka 7 dana pred istek: pravi predračun za sledeći mesec te firme. Podaci firme se ne menjaju.
- Mejl ide **isključivo** na `--to`, bez obzira na `BILLING_AUTO_SEND`. Naslov počinje sa „[TEST, ne plaćati]”, a
  napomena predračuna sa „TEST, ne plaćati.”.
- Test se upisuje sa `isTest`: ne računa se kao pravi predračun tog meseca i korisnik ga ne vidi.

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
npm run billing:send -- --only <PIB firme> --send   # kao jutarnji posao (poštuje BILLING_AUTO_SEND)
```

Ako firma nema mejl, zatražite ga od njih. Može i bez komande: otvorite predračun u svom nalogu → **Uključi deljenje →
Mejl**. To dugme **samo priprema poruku** u vašem mejl programu; poruku šaljete vi.

## 2. Kada uplata stigne: dva odvojena koraka

Evidentiranje uplate i produženje pristupa su **dva posebna koraka**. Označavanje fakture kao plaćene **ne produžava
pristup**, a `access:extend` **ne menja vašu fakturu**. Uradite oba, istog dana.

**Datumi:** datum uplate je datum sa **izvoda banke**. „Plaćeno” u TradeMaster-u upisuje dan kada ste kliknuli, ne dan
uplate. Za odluku da li je uplata stigla na vreme i za knjigovođu važi datum sa izvoda; zato ga upisujete u komandu (`--paid`).

**Korak A: evidencija uplate (u vašem TradeMaster nalogu)**

1. Otvorite predračun → **Pretvori u fakturu** → označite je **Plaćeno**. Kao paušalac van PDV-a fakturu ne morate slati
   kroz SEF (vidi Pravila).
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
