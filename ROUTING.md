# Zasebne stranice i oporavak


Svaka destinacija ima pravi HTML dokument: /ko-smo/, /sajtovi/, /aplikacije/, /podrska/, /nacin-rada/, /projekti/, /3d-studio/ i /kontakt/. Linkovi rade i u novom tabu. Izbor u galaksiji otvara dokument odredišta i prenosi samo trenutni položaj kamere kroz jednokratni sessionStorage zapis, najviše 15 sekundi. Odredište nastavlja teleport iz tog pogleda. Direktan link i osvežavanje ulaze u pregled celog sistema. Nazad/Napred koriste istoriju dokumenata.

Posle izmene osnovnog HTML-a ili metapodataka iz public/pages.js, pokrenuti python scripts/build_pages.py. Validator odbija zastarele generisane stranice. Novi testovi: node scripts/check_pages.cjs i node scripts/check_recovery.cjs. Canvas teretana ima poseban lakši model; puna WebGL geometrija ostaje ista. Skok i štit obnavljaju GPU resurse posle gubitka konteksta, a zakasnele slike prethodnog renderera se zanemaruju.
