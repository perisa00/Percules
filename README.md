# Percules Digital Studio

Sadržaj je raspoređen kroz Mlečni put. Sedam destinacija ima sopstvene koordinate u 3D galaksiji: ko smo, sajtovi, aplikacije, podrška, način rada, projekti i kontakt. Klik prvo usmerava kameru ka izabranoj tački, zatim skok vodi do pregleda celog lokalnog sistema (drugi nivo). Dolazak ne bira planetu i ne otvara panel. Prelazak mišem ili prvi dodir objekta pokazuje naziv i kratak opis. Klik, drugi dodir ili „Otvori detalje” otvaraju treći nivo. Zatvaranje detalja vraća ceo sistem. Meni pruža direktan pristup istim destinacijama.

Miličin projekat je zaseban svet sa roze suncem i roze-belom planetom. Ulaz je kroz naše projekte. Ostale celine imaju svoje sisteme sa suncem i planetama koje predstavljaju pojedine teme. U sistemu Projekti postoji planeta koja vodi u Miličin roze svet. Centralna priča studija zadržava originalni metalni 3D amblem.

Statički HTML, CSS i JavaScript na srpskoj latinici. Bez frameworka, backenda, analitike ili dodatnih runtime biblioteka. Sve destinacije dele isti WebGL renderer, geometriju i GPU resurse. Površine se generišu u prikazu bez preuzimanja novih tekstura. Podržani su smanjeno kretanje, pauza, zvuk po izboru i rad bez WebGL-a.

Cloudflare Pages objavljuje `public` iz `perisa00/Percules`, sa produkcione grane `main`; build komanda ostaje `exit 0`. Izmene idu kroz pull request. Domen je https://percules.rs/.

Lokalni prikaz: `python -m http.server 8000 --directory public`.
Provere: `python scripts/validate_site.py`, `node scripts/check_studio.cjs` i provera sintakse svih JavaScript fajlova. CI dodatno kompajlira i povezuje WebGL shadere alatkom glslangValidator.

Koordinate, nazivi i odredišta: `public/destinations.js`.
Sadržaj i kontakt: `public/index.html`.
Površine i pojedinačni svetovi: `public/solar.js`.
Oznake izvan galaksije i njihove linije: `public/map-labels.js`.
Pregledi objekata, meni i priprema e-maila: `public/studio.js`.
Galaksija, prilazak i teleport: `public/galaxy.js`.

Kontakt: `aleksa.perisic2000@gmail.com`, `+381695312480`. Forma samo priprema mailto poruku; korisnik je šalje u svojoj e-mail aplikaciji. Ne čuva niti šalje podatke na server.

Ranije teksture i atribucije ostaju u `public/assets/solar/credits.json` i panelu „O prikazu“. Stari sajt ostaje u Git istoriji na commitu `c645fa8e1efb29075522e02b1548df85700c42d2`. Vraćanje ide kroz pull request.
