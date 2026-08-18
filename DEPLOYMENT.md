# Cloudflare Pages deployment

Ovaj projekat je statički i ne koristi build alat, backend, bazu podataka niti tajne promenljive okruženja.

## Prvo objavljivanje

1. Pregledajte i odobrite Pull Request, a zatim ga mergeujte u granu `main`.
2. U Cloudflare kontrolnoj tabli otvorite **Workers & Pages**.
3. Kreirajte Pages projekat kroz Git integraciju.
4. Povežite GitHub i izaberite repozitorijum `perisa00/Percules`.
5. Postavite **Production branch** na `main`.
6. Postavite **Framework preset** na `None`.
7. Za **Build command** unesite `exit 0`.
8. Za **Build output directory** unesite `public`.
9. Pokrenite prvi deployment.
10. Otvorite dodeljeni `pages.dev` domen i proverite stranicu pre povezivanja produkcionog domena.

Nije potrebno dodavati `CNAME` fajl u repozitorijum. Custom domen se povezuje kroz Pages kontrolnu tablu.

## Produkcioni domen

1. U Pages projektu otvorite **Custom domains** i dodajte `percules.rs`.
2. Sačekajte da Pages deployment i verifikacija domena budu uspešni.
3. Tek nakon toga uklonite ili zamenite postojeći DNS zapis koji `percules.rs` usmerava na stari Cloudflare Tunnel.
4. Proverite da `https://percules.rs` više ne prikazuje Cloudflare Error 1033.
5. Po želji dodajte `www.percules.rs` kao dodatni custom domen.
6. Podesite Cloudflare Redirect Rule koji trajno preusmerava `www.percules.rs` na `https://percules.rs` uz očuvanje putanje i query parametara.
7. Proverite da HTTPS sertifikat važi i da se HTTP zahtevi preusmeravaju na HTTPS.

Ne unosite account ID, zone ID, tunnel ID ili API tokene u repozitorijum.

## Provera posle objavljivanja

Otvorite i proverite:

- `/`
- `/privatnost.html`
- `/uslovi-servisa.html`
- `/sitemap.xml`
- `/robots.txt`
- jednu nepostojeću adresu radi provere `404.html`

Zatim proverite mobilni prikaz, navigaciju, `tel:` linkove, validaciju kontakt forme, pripremljeni naslov i telo email poruke, fokus tastature i prikaz bez horizontalnog skrolovanja.

## Buduće objave

Kada je Git integracija aktivna, svaki sledeći merge u `main` automatski pokreće produkcioni Pages deployment. Pull Request grane mogu dobiti zasebne preview deploymente, u zavisnosti od podešavanja projekta. Pre mergea uvek pokrenite `python scripts/validate_site.py` i pregledajte preview.
