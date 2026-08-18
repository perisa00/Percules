# Percules servis laptopova

Zvanični statički sajt za Percules — servis, dijagnostiku, održavanje i nadogradnju laptopova za privatne korisnike i male firme u Novom Sadu i okolini.

- Produkcioni domen: `https://percules.rs`
- Primarni jezik: srpski, latinica
- Hosting cilj: Cloudflare Pages
- Tehnologije: semantički HTML, CSS i vanilla JavaScript, bez build procesa

## Struktura projekta

```text
public/
  index.html
  privatnost.html
  uslovi-servisa.html
  404.html
  robots.txt
  sitemap.xml
  site.webmanifest
  _headers
  _redirects
  assets/
    brand/
    css/
    illustrations/
    js/
scripts/
  validate_site.py
DEPLOYMENT.md
AGENTS.md
```

Cloudflare Pages objavljuje isključivo sadržaj direktorijuma `public`.

## Lokalno pokretanje

Nije potreban Node, package manager niti build komanda.

```sh
python -m http.server 8000 --directory public
```

Zatim otvorite `http://localhost:8000/`.

## Validacija

Iz korena projekta pokrenite:

```sh
python scripts/validate_site.py
```

Validator koristi samo Python standardnu biblioteku. Proverava obavezne fajlove, HTML metapodatke, lokalne linkove i assete, interne ankere, JSON-LD, manifest, sitemap, robots pravila, kontakt podatke i zabranjene stare reference.

## Promena poslovnih podataka

Vrednosti koje JavaScript koristi nalaze se u `public/assets/js/site-config.js`:

- telefon za prikaz i E.164 broj
- email
- grad i područje usluge
- tekst o prijemu uređaja

Vidljive vrednosti se zbog progresivnog unapređenja nalaze i direktno u HTML dokumentima. Kada se kontakt ili lokacija promene, ažurirajte konfiguraciju, sve HTML stranice, JSON-LD, README po potrebi i ponovo pokrenite validator. Radno vreme se trenutno prikazuje kao „Po dogovoru“ u `public/index.html`.

WhatsApp i Viber nisu prikazani dok vlasnik ne potvrdi da su aktivni. Ako se kasnije doda WhatsApp, koristiti E.164 broj bez razmaka, korisnički tekst kodirati sa `encodeURIComponent` i ne ubacivati unos direktno u HTML.

## Uređivanje sadržaja i usluga

Glavni sadržaj je u `public/index.html`, a zajednički stil u `public/assets/css/styles.css`. Za novu uslugu dodajte semantički `article` u mrežu `.service-grid`, koristite stvarni opis bez izmišljenih cena ili obećanja i proverite prikaz na telefonu i desktopu.

Kontakt forma nema serversko slanje. Ona lokalno validira vrednosti, priprema `mailto:` poruku i otvara korisnikovu email aplikaciju; poruka se šalje tek kada je korisnik sam potvrdi.

## Pravni tekstovi

Tekstovi u `public/privatnost.html` i `public/uslovi-servisa.html` opisuju trenutnu implementaciju i opšti tok servisa. Vlasnik treba da ih pregleda i prilagodi stvarnom načinu poslovanja, uz odgovarajući stručni savet, pre zvanične komercijalne objave.

## Deployment

Potpuno uputstvo za Cloudflare Pages, custom domen i zamenu starog DNS usmerenja nalazi se u [DEPLOYMENT.md](DEPLOYMENT.md).
