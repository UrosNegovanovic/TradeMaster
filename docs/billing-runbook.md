# Naplata TradeMaster pretplate (ručno, do naplate u aplikaciji)

Uputstvo za vlasnika. Važi do faze B9 (plaćanje u aplikaciji). Pravila su u kodu (`src/lib/access-period.ts`) i u
uslovima korišćenja (`/uslovi`, „Cena, plaćanje i pristup”).

## Pravila

| | |
|---|---|
| Probni period | 60 dana od otvaranja naloga, besplatno |
| Cena | 20 € za 30 dana, u dinarima po kursu NBS na dan predračuna |
| Obaveštenje | 7 dana pre isteka: vi šaljete predračun, aplikacija prikazuje žutu traku |
| Rok posle isteka | 2 dana sve radi, crvena traka „Uplatite do …” |
| Posle roka | samo pregled i izvoz (podaci i linkovi kupcima ostaju) |
| Uplata | +30 dana: od starog datuma isteka ako je stigla pre zaključavanja, od danas ako je stigla kasnije |

## Jednom, pre prve naplate

1. U **svom** TradeMaster nalogu (T&G Nest) proverite Podešavanja: naziv, PIB, matični broj, adresa, **žiro-račun**
   (ide na predračun i u IPS QR). Podesite „Napomena na fakturi”, npr. „Pretplata za TradeMaster. Pristup se produžava
   po prijemu uplate.”
2. Knjigovođa da potvrdi koji dokument izdajete posle uplate (račun za avans ili račun za izvršenu uslugu) i da li ste u
   sistemu PDV-a. TradeMaster faktura iz predračuna je interni dokument; ako vam treba SEF, ide kroz SEF.
3. Dodajte proizvod ili koristite slobodnu stavku „TradeMaster pretplata, 30 dana”.

## Svake nedelje (ili svaki dan pred lansiranje)

```bash
npm run billing:due
```

Pokazuje firme kojima pristup ističe u narednih 7 dana, koje su u roku od 2 dana i koje su već na „samo pregled”,
sa mejlom firme. Ništa ne menja.

## Za svaku firmu sa spiska

1. **Kupci:** dodajte firmu korisnika (naziv, PIB, MB, adresa, mejl), ako je već nemate.
2. **Novi predračun** za tu firmu:
   - stavka: „TradeMaster pretplata, 30 dana (od DD.MM. do DD.MM.)”, cena u dinarima (20 € po kursu NBS danas);
   - napomena: period i „Poziv na broj: broj predračuna”.
3. Na predračunu: **Uključi deljenje → Mejl**, pošaljite na mejl firme. Predračun ima IPS QR sa iznosom i pozivom na broj.
4. **Kada uplata stigne na izvod:** otvorite predračun → **Pretvori u fakturu** → fakturu označite **plaćeno**.
   Plaćena faktura u vašem nalogu je evidencija: broj dokumenta, iznos, datum uplate i period (u napomeni).
5. **Produžite pristup:**

   ```bash
   npm run access:extend -- <PIB firme>          # pokaže sadašnji i novi datum
   npm run access:extend -- <PIB firme> --yes    # primeni
   ```

6. Javite firmi da je pristup produžen (do kog datuma).

## Kada neko ne plati

- Do isteka: ništa, traka u aplikaciji ih podseća.
- U 2 dana roka: kratka poruka ili poziv („Predračun broj … čeka uplatu, rok je …”).
- Posle roka: aplikacija je sama na „samo pregled”. Kad uplate, uradite korake 4-6; sve ponovo radi odmah.
- Podatke ne brišemo i ne zaključavamo pregled.

## Korisne komande

```bash
npm run access:extend -- --list    # sve firme, do kada im važi pristup i u kom su stanju
npm run billing:due -- --all       # isto, sa mejlom firme
```

Obe koriste `DATABASE_URL` iz `.env` (produkcija). `access:extend` bez `--yes` nikad ništa ne menja.
