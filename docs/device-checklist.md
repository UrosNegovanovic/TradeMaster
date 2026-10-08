# Provera na pravom telefonu (pre lansiranja)

Ovo se ne može automatizovati: radi se ručno na **Android telefonu (Chrome)** i **iPhone-u (Safari)**, na produkcijskom linku. Štikliraj za oba uređaja i upiši problem ako nešto ne radi. Datum probe: ______  Uređaji: ______

## 1. Instalacija (PWA)
- [ ] Android: dugme **Instaliraj aplikaciju** (početna strana, a u aplikaciji kartica na Početnoj) otvara Chrome-ov dijalog; posle potvrde piše „Instalacija je počela“, pa „TradeMaster je instaliran“. Ako dijalog ne izađe, uputstvo kaže: meni ⋮ → **Instaliraj aplikaciju**.
- [ ] Pazi: **„Dodaj na početni ekran“ iz Chrome menija može da napravi samo prečicu** (ikonica sa malim Chrome znakom, otvara se u browseru, bez instalacije). Prava instalacija: ikonica bez Chrome znaka, aplikacija je i u listi aplikacija, otvara se bez trake browsera.
- [ ] iPhone: Safari → Podeli → „Dodaj na početni ekran“; otvara se preko celog ekrana.
- [ ] Posle instalacije ostaješ prijavljen/a i posle zatvaranja i ponovnog otvaranja.

## 2. Skener (kamera i zvuk)
- [ ] Prvo pokretanje traži dozvolu za kameru; posle odobravanja video je prikazan.
- [ ] Barkod se očitava na prvu u normalnom svetlu (EAN-13 sa kutije).
- [ ] Posle uspešnog skena čuje se zvuk (iPhone: tihi režim isključen; zvuk samo posle dodira ekrana je očekivan).
- [ ] Zvuk se čuje tek kad se pojavi potvrda da je proizvod sačuvan, ne u trenutku kad kamera pročita barkod.
- [ ] Odbijena dozvola za kameru prikazuje jasnu poruku, ne belu stranu.
- [ ] Ponovni sken istog barkoda povećava količinu, ne pravi duplikat.
- [ ] Brzo čuvanje (Quick Scan) bez nabavne cene radi; nabavna cena se dopuni kasnije u formi proizvoda.

## 3. Katalog
- [ ] Novi katalog: izbor više kategorija, „Izaberi sve prikazane“, „Grupiši po kategorijama“.
- [ ] PDF se skida/otvara; č, ć, đ, š, ž su ispravni; svaka kategorija počinje na novoj strani.
- [ ] Link za deljenje se otvara na drugom telefonu **bez prijave**; opozvan link prikazuje „nedostupno“.
- [ ] Deljenje preko WhatsApp-a i Viber-a otvara aplikaciju sa tekstom i linkom.
- [ ] Javni link ne prikazuje nabavnu cenu ni zalihu.
- [ ] Sa uključenim linkom PDF kataloga ima **QR kod** u zaglavlju (pored kontakta); skeniran kamerom drugog telefona otvara isti katalog. Raspored proizvoda na strani se nije pomerio.
- [ ] Sa isključenim ili opozvanim linkom PDF nema QR kod; posle „Napravi novi link“ novi PDF vodi na novi link.
- [ ] Na stranici kataloga piše „Link je otvoren N puta, poslednji put …“: posle otvaranja linka na drugom telefonu i osvežavanja stranice broj je veći za 1. Samo slanje linka u WhatsApp/Viber (pregled poruke) ne povećava broj.

## 4. Faktura
- [ ] Nova faktura sa sačuvanim kupcem popunjava naziv, PIB i adresu.
- [ ] PDV (ako je firma u sistemu): osnovica, PDV po stopi i ukupno su tačni.
- [ ] PDF fakture se otvara; **QR kod za uplatu** se skenira u mobilnom bankarstvu (bar jedna banka) i popunjava primaoca, račun, iznos i poziv na broj.
- [ ] Izvoz za knjigovođu (XLSX i CSV) se otvara u Excel-u, č/ć/đ su ispravni.
- [ ] Javni link fakture se otvara bez prijave.
- [ ] **Skeniraj u fakturi**: dugme „Skeniraj“ u stavkama otvara kameru; prvi barkod popunjava praznu stavku (naziv, cena), drugi proizvod dodaje novu stavku, isti barkod ponovo povećava količinu (+1). Zvuk posle svake dodate stavke.
- [ ] Barkod koji nije u Asortimanu prikazuje „Proizvod nije u asortimanu“, bez zvuka i bez nove stavke.
- [ ] Isto u predračunu; tamo manjak robe na stanju samo upozorava, a faktura sa manjkom ne može da se sačuva.
- [ ] **Kopiraj**: na fakturi i na predračunu otvara novi dokument istog tipa sa istim kupcem i stavkama; ispod naslova piše da je kopija sa današnjim cenama. Posle čuvanja dobija novi broj, a stara faktura je nepromenjena.
- [ ] **Otpremnica**: dugme otvara prozor za adresu isporuke i broj paketa (oba opciona). PDF ima „Mesto isporuke“ (samo ako se razlikuje od adrese kupca), „Broj paketa“ i za „Robu izdao“ / „Robu primio“ redove Ime i prezime, Potpis, Datum. Slova č/ć/đ su ispravna. Broj paketa „0“ ili „1,5“ prikazuje grešku.
- [ ] **Podsetnik za naplatu** (Početna, kartica „Kasni naplata“, treba faktura sa rokom u prošlosti): „Podsetnik za naplatu“ napravi link, pa WhatsApp i Viber otvaraju aplikaciju sa porukom (broj fakture, iznos, rok, link). Link iz poruke se otvara bez prijave i PDF ima QR kod za uplatu.

## 5. Navigacija i forme
- [ ] „Nazad“ i „Otkaži“ postoje na novom/izmeni kataloga i fakture.
- [ ] Nesačuvane izmene: klik na „Nazad“ ili donju traku pita „Odbaciti nesačuvane izmene?“; posle „Sačuvaj“ se ne pita.
- [ ] Sistemsko „nazad“ (Android dugme/gest, iPhone prevlačenje sa ivice) ne ruši aplikaciju.

## 6. Opšte
- [ ] Brzina: Početna se učitava za par sekundi na mobilnom internetu.
- [ ] Rotacija i tamni režim ne kvare raspored.
- [ ] Odjava i ponovna prijava rade.
