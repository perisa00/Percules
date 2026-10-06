# Cloudflare Pages deployment

- Postojeći Pages projekat: `percules` / `percules.pages.dev`.
- GitHub: `perisa00/Percules`; produkciona grana: `main`.
- Framework: None; build komanda: `exit 0`; izlaz: `public`.
- Domen `percules.rs` već je povezan. DNS i domen se ne menjaju prilikom nove objave.

Pre mergea pokrenuti `python scripts/validate_site.py`, proveriti sintaksu svih JavaScript fajlova i pregledati Pages preview iz provere pull requesta. Merge automatski objavljuje sajt. Potvrditi uspešnu Cloudflare Pages proveru za produkcioni commit, zatim proveriti galaksiju, teleport i 3D amblem na domenu.

Pre ove migracije stari sajt je sačuvan u Git istoriji na commitu `c645fa8e1efb29075522e02b1548df85700c42d2` i lokalnoj rezervnoj arhivi. Vraćanje ide kroz novi pull request sa starim `public` sadržajem i dokumentacijom. Sačuvati postojeće bezbednosne zaglavlja.

U repozitorijum ne unositi naloge, API tokene ili tajne.
