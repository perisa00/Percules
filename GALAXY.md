# Galaksija pri približavanju

Novi generisani pogled na galaksiju koristi alfa kanal, zasebnu manju mobilnu sliku i teksturu finih oblaka. To je umetnička astronomska vizualizacija, a ne snimak ili precizna mapa Mlečnog puta. Materijali su napravljeni ugrađenim OpenAI image_gen alatom; nisu predstavljeni kao RunPod rezultat. Postojeći model stene ostaje raniji TRELLIS.2 rezultat.

Dubina se sada uključuje i običnim zumiranjem mape. Pri približavanju ravna površina postepeno ustupa mesto zapreminskom prikazu sa prostorno pomerenim detaljem prašine. Prašina prigušuje pozadinsku svetlost i zvezde; navigacione zvezde ostaju čitljive iznad nje. Broj koraka ostaje 16 na telefonu i 24 na računaru, u postojećem smanjenom render cilju. Nakon učitavanja materijala jedan direktan uzorak detalja zamenjuje dva uzorka finog šuma po koraku.

Telefon prvo preuzima sliku od 768 piksela, oko 223 KB; desktop varijanta je 1280 piksela i oko 574 KB. Detalj od 65 KB preuzima se tek pri približavanju ili pogledu sa strane; Save Data i 2G zadržavaju proceduralnu zamenu. Prenos na GPU čeka završetak kretanja kamere i leta. Na telefonu detalj zauzima teksturu 256×256, na računaru 512×512. Kratko pojavljivanje materijala završava se i kada su animacije pauzirane, posle čega stranica može da miruje.

Izgubljeni grafički kontekst poništava kasne rezultate slika, a Canvas zamena ostaje dostupna. Prelazi između stranica, precizno zumiranje pod pokazivačem i mobilni način putovanja ostaju u istom prikazu.

Izvorni PNG ulazi i njihov kontrolni manifest čuvaju se lokalno u `outputs/galaxy-inputs/`. `face-on.png` je pogled odozgo za raspored materijala; `oblique-runpod.png` je zaseban ulaz sa vidljivom debljinom i alfa kanalom za kontrolisanu image-to-3D rekonstrukciju. Njegov rezultat se mora vizuelno proveriti, naročito transparentnost, pre eventualnog uključivanja u sajt. Novi RunPod posao nije pokrenut ovim izmenama.

`scripts/prepare_galaxy.py` čuva originale i proizvodi verzionisane WebP datoteke. Stara slika ostaje u istoriji repozitorijuma i lokalnoj kopiji; ne preuzima se uz novi sajt. Svi resursi scene ostaju unutar postojećeg budžeta od 3 MB.
