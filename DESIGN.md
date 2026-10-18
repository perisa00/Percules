# Realističniji svemir

Galaksija zadržava lagan fotografski i volumetrijski prikaz. Prašina apsorbuje deo svetlosti u zapremini, tamne trake ostaju čitljivije, sjaj jezgra je suzdržaniji i zvezde manje trepere. Prikaz služi navigaciji kroz studio; sistemi nisu predstavljeni kao astronomski precizan model Mlečnog puta.

U lokalnim sistemima koristi se stvarni model Lunar_Crag, ranije generisan kroz Percules/TRELLIS.2. Original od 23.398.348 bajtova i 462.566 trouglova sačuvan je u postojećoj kolekciji. Web geometrija ima 816 trouglova i 397 temena; modul ima manje od 40 KB. Hladne, plavičaste nijanse iz materijala prigušene su u neutralniju kamenu površinu. Model nije ponovo generisan i nije pokrenut naplativi GPU posao. Provera izvora, SHA-256 i izmena nalaze se u `public/assets/debris/provenance.json`.

Pojas ima pet instanci na uređajima sa grubim pokazivačem i devet na računaru. Geometrija se jednom priprema u jedan bafer i iscrtava jednim dodatnim pozivom; brodski i serverski 3D pregledači nisu dodati sajtu. Skriva se pri fokusiranju planeta, a Miličin svet i 3D radionica zadržavaju svoj izgled. Rezervni Canvas prikaz i dalje radi bez ovih dekorativnih modela.

Planete postepeno dobijaju postojeće Solar System Scope površine. Mali prikazi preuzimaju se tek pri ulasku u odgovarajući sistem; velika mapa tek pri izboru objekta. Prenos tekstura na GPU i dalje čeka završetak leta i kretanja kamere. Prva površina se pojavljuje kroz kratak prelaz, a mobilni GPU dobija najviše 1024 piksela širine. Postojeća atribucija i licenca mapa ostaju u `public/assets/solar/credits.json`.

Reprodukcija geometrije koristi već instalirane lokalne alate, bez novih zavisnosti u sajtu: `node scripts/prepare_rock.mjs <Lunar_Crag.glb> <postojeći_node_modules_sa_meshoptimizer_i_sharp> public`. Izvorni GLB nikada se ne menja. Skripta radi samo van pregledača; nije deo pokretanja sajta ili CI provere.
