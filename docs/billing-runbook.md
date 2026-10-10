# Naplata TradeMaster pretplate (ručno, do naplate u aplikaciji)

Uputstvo za vlasnika. Važi do faze B9 (plaćanje u aplikaciji). Pravila su u kodu (`src/lib/access-period.ts`,
`planAccessExtension`) i u uslovima korišćenja (`/uslovi`, „Cena, plaćanje i pristup”). Kartičnog plaćanja nema.

## Pravila

| | |
|---|---|
| Probni period | 60 dana od otvaranja naloga, besplatno |
| Cena | 20 € mesečno, u dinarima po kursu NBS na dan predračuna |
| Period | jedna uplata = jedan kalendarski mesec, do istog dana u sledećem mesecu; pristup važi i ceo poslednji dan |
| Kraći meseci | ako tog dana nema, važi do poslednjeg dana meseca, a sledeći mesec se vraća na isti dan: 31.01. → 28.02. (29.02. u prestupnoj) → 31.03. |
| Predračun | najkasnije 7 dana pre isteka (žuta traka u aplikaciji se tada pali) |
| Rok posle isteka | 2 dana sve radi, crvena traka „Uplatite do …” |
| Posle roka | samo pregled i izvoz (podaci i linkovi kupcima ostaju) |
| Uplata na vreme | uplata pre isteka ili u ta 2 dana (po **datumu uplate na izvodu**) nastavlja se na stari datum isteka: nijedan dan se ne gubi, a dani roka nisu besplatni |
| Uplata kasnije | posle prelaska na „samo pregled”: mesec počinje dana kada uključite pristup (10.03. → 09.04.; 01.03. → 31.03.) |
| Rok aktivacije | pristup produžavate posle provere izvoda, **najkasnije narednog radnog dana** od dana kada uplata stigne. Kupcima ne obećavajte „čim uplatite” |
| Promena cene | najava najmanje 30 dana unapred; već plaćeni period se ne menja |

## Jednom, pre prve naplate

1. U **svom** TradeMaster nalogu (T&G Nest) proverite Podešavanja: naziv, PIB, matični broj, adresa, **žiro-račun**
   (ide na predračun i u IPS QR). Podesite „Napomena na fakturi”, npr. „Pretplata za TradeMaster. Pristup se produžava
   posle provere uplate, najkasnije narednog radnog dana.”
2. Knjigovođa da potvrdi koji dokument izdajete posle uplate (račun za avans ili račun za izvršenu uslugu) i da li ste u
   sistemu PDV-a. TradeMaster faktura iz predračuna je interni dokument; ako vam treba SEF, ide kroz SEF.
3. Koristite slobodnu stavku „TradeMaster pretplata, 1 mesec (od DD.MM.GGGG. do DD.MM.GGGG.)”.
4. Migracija `supabase/migrations/20261010150000_access_extensions.sql` mora biti primenjena u produkciji (evidencija
   produženja). Bez nje `access:extend` javlja grešku i ništa ne menja.

## Svakog radnog dana (2 minuta)

```bash
npm run billing:due
```

Ništa ne menja. Pokazuje:

- firme kojima pristup ističe u narednih **10 dana**, sa rokom „pošaljite predračun najkasnije DD.MM.” (7 dana pre
  isteka) i **periodom koji upisujete na predračun**. 10 dana pokriva vikend i praznik, pa predračun uvek ode na vreme;
- firme u roku od 2 dana (podsetite ih);
- firme na „samo pregled” (čekaju uplatu);
- mejl firme za predračun.

Isti dan pogledajte i izvod banke (ili e-banking) za nove uplate.

## 1. Predračun (za svaku firmu sa spiska)

1. **Kupci:** dodajte firmu korisnika (naziv, PIB, MB, adresa, mejl), ako je već nemate.
2. **Novi predračun** za tu firmu:
   - stavka: „TradeMaster pretplata, 1 mesec (od … do …)” sa periodom iz `billing:due`, cena u dinarima (20 € po kursu NBS danas);
   - napomena: „Poziv na broj: broj predračuna”.
3. Na predračunu: **Uključi deljenje → Mejl**. Dugme **Mejl samo priprema poruku** u vašem mejl programu (naslov, tekst i
   link ka predračunu). TradeMaster ništa ne šalje sam: proverite primaoca (mejl firme iz `billing:due`) i **vi pritisnite
   Pošalji**. Ako se mejl program ne otvori, kopirajte link i pošaljite ga ručno. Predračun ima IPS QR sa iznosom i pozivom na broj.

## 2. Kada uplata stigne: dva odvojena koraka

Evidentiranje uplate i produženje pristupa su **dva posebna koraka**. Označavanje fakture kao plaćene **ne produžava
pristup**, a `access:extend` **ne menja vašu fakturu**. Uradite oba, istog dana.

**Datumi:** datum uplate je datum sa **izvoda banke**. „Plaćeno” u TradeMaster-u upisuje dan kada ste kliknuli, ne dan
uplate. Za odluku da li je uplata stigla na vreme i za knjigovođu važi datum sa izvoda; zato ga upisujete u komandu (`--paid`).

**Korak A: evidencija uplate (u vašem TradeMaster nalogu)**

1. Otvorite predračun → **Pretvori u fakturu** → fakturu označite **Plaćeno**.
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
