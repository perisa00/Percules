# Percules Digital Studio

Sadržaj je raspoređen kroz Mlečni put. Sedam destinacija ima sopstvene koordinate u 3D galaksiji: ko smo, sajtovi, aplikacije, podrška, način rada, projekti i kontakt. Klik prvo usmerava kameru ka izabranoj tački, zatim skok vodi do pregleda celog lokalnog sistema (drugi nivo). Dolazak ne bira planetu i ne otvara panel. Prelazak mišem ili prvi dodir objekta pokazuje naziv i kratak opis. Klik, drugi dodir ili „Otvori detalje” otvaraju treći nivo. Zatvaranje detalja vraća ceo sistem. Meni pruža direktan pristup istim destinacijama.

Projekti vode direktno u Miličinu roze teretanu u svemiru. Milica prolazi kroz devet vežbi, uz kontrolu prethodne/sledeće stanice i pauzu. Zone ostaju ispod scene. Telefon sa blagim roze krilima doleti u prvi plan i pušta reklamu na svom ekranu. Zatvaranje vraća isti telefon pored teretane. Priča o Milici, našem radu i posvećenosti ostaje na zasebnom dugmetu. Ostale celine imaju svoje sisteme sa suncem i planetama koje predstavljaju pojedine teme. Centralna priča studija zadržava originalni metalni 3D amblem.

Zumiranje iz galaksije bira destinaciju najbližu sredini ekrana u trenutku približavanja, uključujući posle povratka iz drugog sveta. Izabrana tačka ostaje ista do povratka na udaljeni pogled.

Statički HTML, CSS i JavaScript na srpskoj latinici. Bez frameworka, backenda, analitike ili dodatnih runtime biblioteka. Sve destinacije dele isti WebGL renderer, geometriju i GPU resurse. Površine se generišu bez preuzimanja tekstura. Geometrija teretane se priprema tek pri njenom prvom otvaranju. Zvuk je isključen dok ga posetilac ne uključi; čuju se samo kratki, tihi tonovi navigacije. Smanjeno kretanje i pauza obuhvataju i telefon.

Osnovni prikaz se učitava nezavisno od ukrasnih efekata. Tokom sporog učitavanja ostaje galaksija i dugme za čitanje sadržaja. Posebna Canvas platna preuzimaju prikaz kada WebGL nije dostupan, shader ne može da se kompajlira ili se izgubi grafički kontekst; povratak konteksta obnavlja prikaz uz očuvanje izabranog sveta. Na mobilnim uređajima ukrasni GPU efekti se ne inicijalizuju. Amblem u zaglavlju koristi postojeću sliku bez dodatnog grafičkog konteksta.

Reklama `public/assets/milica/promo-web-720.mp4` je web kopija snimka koji je korisnik prethodno dostavio kroz Google Drive (fajl `1_JW-s-viJwh6ieV9lukKfBy8S6fvwVu7`). Postojeća pripremljena kopija ima 13.05 MB, umesto originalnih 175.12 MB. Plejer koristi `preload="none"` i pušta se tek kada posetilac približi telefon. Zatvaranje ili skrivanje taba odmah pauzira reklamu. Povratak može da prekine dolazak bez skoka u položaju; smanjeno kretanje preskače let. Fokus i pozadinske kontrole se vraćaju posle zatvaranja. Video ima poseban limit od 15 MB; ostatak sajta zadržava limit od 3 MB. CSP dozvoljava medije samo sa sopstvenog domena.

Cloudflare Pages objavljuje `public` iz `perisa00/Percules`, sa produkcione grane `main`; build komanda ostaje `exit 0`. Izmene idu kroz pull request. Domen je https://percules.rs/.

Lokalni prikaz: `python -m http.server 8000 --directory public`.
Provere: `python scripts/validate_site.py`, `node scripts/check_studio.cjs`, `node scripts/check_workout.cjs`, `node scripts/check_phone.cjs` i provera sintakse svih JavaScript fajlova. Provere obuhvataju izbor centra pri zumiranju, sporo i prekinuto učitavanje, nedostupne efekte, gubitak/povratak WebGL-a, rezervno crtanje i položaj ruku/nogu na valjku. CI dodatno kompajlira i povezuje WebGL shadere alatkom glslangValidator. To ne zamenjuje proveru konkretnog uređaja na kome je korisnik video prazan prikaz.

Koordinate, nazivi i odredišta: `public/destinations.js`.
Sadržaj i kontakt: `public/index.html`.
Površine i pojedinačni svetovi: `public/solar.js`.
Oznake izvan galaksije i njihove linije: `public/map-labels.js`.
Pregledi objekata, meni i priprema e-maila: `public/studio.js`.
Galaksija, prilazak i teleport: `public/galaxy.js`.

Kontakt: `aleksa.perisic2000@gmail.com`, `+381695312480`. Forma samo priprema mailto poruku; korisnik je šalje u svojoj e-mail aplikaciji. Ne čuva niti šalje podatke na server.

Ranije teksture i atribucije ostaju u `public/assets/solar/credits.json` i panelu „O prikazu“. Stari sajt ostaje u Git istoriji na commitu `c645fa8e1efb29075522e02b1548df85700c42d2`. Vraćanje ide kroz pull request.
