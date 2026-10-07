# Percules Digital Studio

Galaksija je ulaz u Percules sistem: centralni 3D amblem i šest planeta za sajtove, aplikacije, podršku, način rada, projekte i kontakt. Meni omogućava direktno otvaranje sadržaja. Miličin projekat ima zaseban svet sa roze suncem i roze-belom planetom.

Statički HTML, CSS i JavaScript na srpskoj latinici. Bez frameworka, backenda, analitike ili dodatnih runtime biblioteka. Površine novih planeta generišu se u WebGL prikazu bez preuzimanja planetarnih tekstura. Dva sistema dele isti renderer, geometriju i GPU resurse. Podržani su pauza animacija, smanjeno kretanje i rad bez WebGL-a. Zvuk se uključuje korisnikovim izborom.

Cloudflare Pages objavljuje `public` iz `perisa00/Percules`, sa produkcione grane `main`; build komanda ostaje `exit 0`. Izmene idu kroz pull request. Domen je https://percules.rs/.

Lokalni prikaz: `python -m http.server 8000 --directory public`.
Provere: `python scripts/validate_site.py`, `node scripts/check_studio.cjs` i provera sintakse svih JavaScript fajlova. CI dodatno kompajlira i povezuje WebGL shadere alatkom glslangValidator.

Sadržaj i kontakt uređuju se u `public/index.html`. Destinacije, boje i površine nalaze se u `public/solar.js`. Navigacija i priprema e-maila su u `public/studio.js`; zajedničko kretanje i teleport u `public/galaxy.js`.

Kontakt: `aleksa.perisic2000@gmail.com`, `+381695312480`. Forma samo priprema mailto poruku; korisnik je šalje u svojoj e-mail aplikaciji. Ne čuva niti šalje podatke na server.

Ranije teksture i atribucije ostaju u `public/assets/solar/credits.json` i panelu „O prikazu“. Stari sajt je sačuvan u Git istoriji na commitu `c645fa8e1efb29075522e02b1548df85700c42d2`. Vraćanje prethodne verzije ide kroz pull request.
