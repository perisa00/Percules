# Zasebne stranice i oporavak


Svaka destinacija ima pravi HTML dokument: /ko-smo/, /sajtovi/, /aplikacije/, /podrska/, /nacin-rada/, /projekti/, /3d-studio/ i /kontakt/. Linkovi rade i u novom tabu. Izbor u galaksiji otvara dokument odredišta i prenosi samo trenutni položaj kamere kroz jednokratni sessionStorage zapis, najviše 15 sekundi. Odredište nastavlja teleport iz tog pogleda. Direktan link i osvežavanje ulaze u pregled celog sistema. Nazad/Napred koriste istoriju dokumenata.

Posle izmene osnovnog HTML-a ili metapodataka iz public/pages.js, pokrenuti python scripts/build_pages.py. Validator odbija zastarele generisane stranice. Novi testovi: node scripts/check_pages.cjs i node scripts/check_recovery.cjs. Canvas teretana ima poseban lakši model; puna WebGL geometrija ostaje ista. Skok i štit obnavljaju GPU resurse posle gubitka konteksta, a zakasnele slike prethodnog renderera se zanemaruju.

Logo i povratne veze prvo izvode povratni let u postojećem prikazu. Tek po završetku otvara se početni dokument uz jednokratni prenos završnog položaja kamere. Početni dokument se unapred priprema preko prefetch nagoveštaja; navigacija ne zavisi od podrške za prefetch ili sessionStorage. Reduced motion preskače let.

Točkić, dugmad za zum i razmicanje prstiju istražuju mapu bez automatskog izbora odredišta. Klik na zvezdu ili naziv pokreće ulazak u odredište. Zumiranje zadržava tačku ispod kursora, odnosno sredinu između prstiju; lokalni sistemi i fokusirani objekti koriste isti princip uz postepeno približavanje. Odredišni dokumenti unapred preuzimaju modul sistema, a slika galaksije počinje da se učitava iz zaglavlja dokumenta. Brza ciljana provera: node scripts/check_studio.cjs --camera.

