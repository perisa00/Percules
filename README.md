# Percules Digital Studio

Interaktivna galaksija sa prelaskom u Sunčev sistem, štitom, ambijentalnim zvukom i 3D amblemom. Srpski, latinica. Statički HTML, CSS i JavaScript, bez frameworka, backenda, analitike i dodatnih biblioteka.

Cloudflare Pages objavljuje `public` iz GitHub projekta `perisa00/Percules`, sa produkcione grane `main`; build komanda ostaje `exit 0`. Izmene idu kroz pull request. Produkcioni domen je https://percules.rs/.

Za lokalni prikaz: `python -m http.server 8000 --directory public`.
Za proveru: `python scripts/validate_site.py` i `node --check` za svaki JavaScript fajl.

Zvuk se uključuje korisnikovim izborom. Smanjeno kretanje i pauza animacija su podržani. Teksture i atribucije nalaze se u `public/assets/solar/credits.json` i panelu „O prikazu“.

Stare putanje laptop servisa vode na početnu stranicu. Sadržaj starog sajta ostaje u Git istoriji, na commitu `c645fa8e1efb29075522e02b1548df85700c42d2`.
Za vraćanje prethodne verzije napraviti pull request koji vraća `public` i odgovarajuću dokumentaciju iz tog commita. Ne slati direktno na `main`.
