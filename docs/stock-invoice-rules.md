# Magacin i fakture

## Pravilo

- **Ulaz** (skener ili ručni unos proizvoda) u istoj transakciji povećava količinu i upisuje kretanje `IN` sa razlogom `Ulaz robe`.
- **Izlaz po fakturi** se dešava kada faktura prestane da bude nacrt (`DRAFT`) — dakle na izdavanju (`UNPAID`) ili plaćanju (`PAID`). Tada se za svaki povezani proizvod upisuje jedno `OUT` kretanje sa razlogom `Faktura {broj}` i skida se lager.
- Nacrt ne dira lager. Prebacivanje `PAID` ↔ `UNPAID` ne skida ponovo. Izmena stavki na izdatoj fakturi samo usklađuje razliku. Povratak u nacrt, otkazivanje ili brisanje vraća količinu.
- Lager ne sme da ode u minus. Ako nema dovoljno robe, čuvanje se odbija porukom: `Nema dovoljno na stanju za „{naziv}“. Traženo: N kom, na stanju: M kom.`
- Isti zahtev, toggle ili retry nikad ne duplira kretanje: ulaz koristi `intake:{ključ}`, izlaz `invoice:{faktura}:{proizvod}`.

Asortiman i Magacin prikazuju istu trenutnu količinu (`products.quantity`). Istorija kretanja čita `stock_movements`.
