# Full de ruta — Persistència robusta i suport multi-cicle/mòdul/grup

## 0. Context

L'aplicació "RA · Avaluació" gestiona actualment **un mòdul** (RA, CA,
activitats, UT) amb **exactament dos grups fixos ("A" i "B")**, per
curs acadèmic, desat a **IndexedDB** del navegador.

La realitat del professor és més àmplia:

- imparteix **més d'un mòdul** (per exemple SOX a 2n SMX, un mòdul de
  DAW a un grup d'alumnes de grau superior);
- alguns d'aquests mòduls pertanyen a **cicles formatius diferents**
  (SMX grau mitjà, DAW grau superior);
- el nombre de grups **no sempre és dos**: 1r de SMX té tres grups.
- el motor de càlcul ([`src/model/calculation.ts`](src/model/calculation.ts))
  ja és independent del mòdul concret — opera només a partir de
  `ModuleConfiguration` + `Group` — així que **no cal tocar-lo**.
- avui les dades depenen només d'IndexedDB, lligada a un navegador i
  un origen concrets, sense còpia automàtica.

Aquest document és un **full de ruta en fases**, pensat per treballar
amb Claude Code fase a fase: es tanca i es valida cada fase (executant
l'app, mirant que res es trenqui) abans de començar la següent.

------------------------------------------------------------------------

## Principis de treball per a totes les fases

1. Abans de tocar codi, **analitza l'estat actual** dels fitxers
   afectats (no assumir res d'aquest document sense verificar-ho al
   codi, que pot haver canviat).
2. **No trenquis res que ja funciona.** Els 27 tests existents
   (`npm test`) han de seguir passant en acabar cada fase; amplia'ls
   quan calgui, no els redueixis.
3. **Migració sempre retrocompatible**: qualsevol base de dades
   existent (amb un sol mòdul i grups "A"/"B") ha de continuar
   obrint-se sense pèrdua de dades després d'actualitzar l'app.
4. Cap fase ha de dependre de fer les següents: en acabar cada fase
   l'aplicació ha de quedar **totalment funcional i usable**.
5. Fes servir `npx tsc --noEmit` i `npm test` com a xarxa de seguretat
   abans de donar per tancada una fase.
6. No inventis abstraccions extra "per si de cas" — implementa només
   el que calgui per al requisit de la fase.

------------------------------------------------------------------------

## FASE 1 — Persistència robusta en fitxer real · ✅ FETA (2026-09-07)

### Objectiu

Deixar de dependre només d'IndexedDB. Guardar `AppDatabase` (tots els
cicles, mòduls i grups junts, és un únic document JSON) en un
**fitxer real al disc** que l'usuari triï una vegada (per exemple dins
una carpeta sincronitzada amb OneDrive), fent servir la **File System
Access API**.

### Per què aquesta i no una base de dades SQL

Tot el contingut de l'app (tots els mòduls, cicles i grups d'un
professor) cap en un sol JSON de mida petita. No hi ha cap guany de
rendiment ni d'organització introduint SQLite/un servidor — només
complexitat afegida (procés de servidor, esquema, migracions). El
fitxer JSON al disc, sincronitzat via OneDrive/Drive, ja dona
portabilitat i còpia de seguretat real.

### Requisits funcionals

- L'usuari pot **triar un fitxer** (`showSaveFilePicker` /
  `showOpenFilePicker`) on es desarà tota la base de dades.
- Cada canvi es desa automàticament a aquest fitxer (mateix
  comportament de desat automàtic que ara, però escrivint al fitxer
  real en lloc de només IndexedDB).
- Si el navegador **no suporta** la File System Access API (només
  Chromium ho suporta bé), l'app ha de continuar funcionant amb
  IndexedDB com a **fallback**, sense trencar-se.
- En obrir l'app, si ja hi ha un fitxer triat prèviament, cal
  demanar permís de nou (limitació del navegador: el permís no
  persisteix entre sessions) amb una interfície clara ("Reconnecta el
  fitxer de dades" / "Continua amb la còpia local del navegador").
- Mantenir la funció actual d'exportar/restaurar JSON manualment
  ([`app/screens/Data.tsx`](app/screens/Data.tsx)) com a via addicional
  de còpia de seguretat puntual (no la substitueix, la complementa).
- Indicador d'estat visible (a la capçalera, on ara diu "Desat" /
  "IndexedDB · fora de línia" a [`app/page.tsx`](app/page.tsx)) que
  distingeixi clarament: **"Desat al fitxer X"** vs **"Desat només al
  navegador (sense fitxer connectat)"**.

### Fitxers previsiblement afectats

- `src/model/repository.ts` — nova implementació (o estratègia
  alternativa) que escrigui al fitxer via File System Access API,
  mantenint `IndexedDbRepository` com a fallback/mecanisme intern de
  còpia local.
- `app/page.tsx` — estat de connexió al fitxer, indicador de desament,
  acció per triar/reconnectar fitxer.
- `app/screens/Data.tsx` — possiblement afegir l'opció de
  "Connecta un fitxer de dades" al costat de l'exportació manual
  existent.

### Criteris d'acceptació

- [x] Amb un navegador compatible (Edge/Chrome), es pot triar un
      fitxer i els canvis es reflecteixen en aquest fitxer al disc.
      **Confirmat per l'usuari (2026-09-07).**
- [x] Tancant i reobrint l'app, es pot reconnectar al mateix fitxer i
      recuperar les dades tal com estaven. **Confirmat per l'usuari
      (2026-09-07).**
- [ ] Amb un navegador no compatible, l'app funciona igual que ara
      (IndexedDB), sense errors ni pantalles trencades. *(No provat
      explícitament amb Firefox/Safari; el codi ho gestiona via
      `isSupported()`, però queda pendent de comprovació real si mai
      cal.)*
- [x] L'exportació/restauració manual de còpia JSON continua
      funcionant igual que abans.
- [x] `npm test` i `npx tsc --noEmit` sense errors nous.

### Què s'ha implementat

- [`src/model/repository.ts`](src/model/repository.ts): nova classe
  `FileBackedRepository` (substitueix `IndexedDbRepository` com a
  repositori actiu a `app/page.tsx`, però la manté internament com a
  còpia local sempre activa). Cada `save()` escriu primer a IndexedDB
  (mai falla, no requereix permisos) i, si hi ha un fitxer connectat
  amb permís concedit, també hi escriu. `load()` llegeix del fitxer
  quan és possible i, si no, cau a la còpia d'IndexedDB.
- El `FileSystemFileHandle` es desa dins la mateixa base IndexedDB
  `ra-avaluacio` (s'ha afegit un segon "object store" `handles`,
  versió 2 de la BD) perquè es pugui intentar reconnectar
  automàticament a la propera sessió sense haver de tornar a triar el
  fitxer (encara caldrà reconcedir permís, veure decisions).
- [`src/types/file-system-access.d.ts`](src/types/file-system-access.d.ts):
  declaracions de tipus mínimes per a `showOpenFilePicker`,
  `showSaveFilePicker` i `queryPermission`/`requestPermission`, que no
  formen part de la llibreria `dom` estàndard de TypeScript.
- [`app/page.tsx`](app/page.tsx): la capsa fosca de la barra lateral
  ("Desament local") ara és un botó que mostra l'estat real de la
  connexió (connectat / cal reconnectar / només navegador / no
  suportat) i porta directament a la pestanya "Dades i còpies".
- [`app/screens/Data.tsx`](app/screens/Data.tsx): nou panell "Fitxer
  de dades" amb accions **Connecta un fitxer nou**, **Obre un fitxer
  existent**, **Reconnecta** i **Desconnecta**, segons l'estat. Es
  manté intacta l'exportació/restauració manual en JSON que ja hi
  havia.

### Decisions preses (no s'ha aturat el treball a preguntar-les; es documenten aquí per si cal revisar-les)

1. **On viu el control de connexió**: s'ha posat a la pestanya "Dades
   i còpies" (no s'ha creat cap pantalla nova), amb un indicador
   d'estat clicable a la barra lateral que hi porta directament.
2. **Nom suggerit del fitxer nou**: `ra-avaluacio.json` (fix, sense
   data), perquè és un fitxer viu que es va sobreescrivint — a
   diferència de les còpies manuals exportades (`Còpia JSON`), que sí
   porten data al nom.
3. **"Connecta un fitxer nou" vs "Obre un fitxer existent"**: connectar
   un fitxer nou hi escriu immediatament les dades actuals (perquè no
   quedi buit); obrir un fitxer existent **substitueix** les dades
   mostrades per les del fitxer, amb una confirmació prèvia (mateix
   patró que "Restaura" la còpia JSON manual).
4. **Permís no persistent entre sessions**: és una limitació del propi
   navegador (Chromium no recorda el permís d'escriptura d'un fitxer
   entre recàrregues de pàgina per motius de seguretat), no de l'app.
   Per això l'estat "needs-permission" i el botó "Reconnecta" — cal un
   clic per sessió, no és evitable.
5. **Navegadors sense suport** (Firefox, Safari): l'app detecta
   `showSaveFilePicker` i, si no existeix, amaga tota l'opció de
   fitxer i funciona exactament igual que abans (només IndexedDB),
   sense cap missatge d'error ni funcionalitat trencada.

### Verificació manual — ✅ feta per l'usuari (2026-09-07)

Els diàlegs natius de "Desa com" / "Obre fitxer" del sistema operatiu
no es podien validar sense una persona interactuant-hi de veritat.
L'usuari ha confirmat que tots els passos han funcionat correctament:

- [x] A "Dades i còpies", prémer **Connecta un fitxer nou**, triar una
      ubicació i comprovar que es crea el fitxer `ra-avaluacio.json`
      amb el contingut actual.
- [x] Fer un canvi qualsevol i comprovar que el fitxer al disc
      s'actualitza.
- [x] Recarregar la pàgina i comprovar que apareix l'estat "Cal
      reconnectar" amb el botó **Reconnecta**, i que en prémer'l torna
      a l'estat "Connectat".
- [x] Provar **Obre un fitxer existent** apuntant al mateix fitxer i
      comprovar que demana confirmació i carrega les dades.
- [x] Provar **Desconnecta** i comprovar que l'app segueix funcionant
      (desant només a IndexedDB) sense errors.

`npx tsc --noEmit` i `npm test` (27/27) s'han executat sense errors
després d'aquests canvis. També s'ha reforçat la informació a la
pantalla (panell ampliat "Fitxer de dades — còpia de seguretat" i
avisos explícits que "Restaura"/"Obre un fitxer existent" **substitueixen** les dades, no les fusionen) arran de comentaris de
l'usuari durant la validació.

**Fase 1 tancada i validada.**

------------------------------------------------------------------------

## FASE 2 — Nombre de grups variable (no fixos a "A"/"B") · ✅ implementada (2026-09-07), pendent de verificació manual

### Objectiu

Que un curs pugui tenir **1, 2, 3 o més grups**, amb noms lliures, en
comptes dels dos grups fixos "A"/"B" actuals.

### Punts del codi que ho assumeixen avui (verificar de nou abans de tocar-los, poden haver canviat)

- [`src/model/domain.ts`](src/model/domain.ts): `GroupCode = "A" | "B"`,
  `emptyGroup(code)`, i `createCourse(...)` que sempre crea
  `[emptyGroup("A"), emptyGroup("B")]`.
- [`app/page.tsx`](app/page.tsx): estat `groupCode` tipat `"A"|"B"` i el
  switcher visual amb dos botons fixos "Grup A" / "Grup B".
- [`app/screens/Courses.tsx`](app/screens/Courses.tsx): taula amb
  columnes fixes "Grup A" / "Grup B".
- [`app/screens/Data.tsx`](app/screens/Data.tsx): la previsualització
  d'importació (`ImportPreviewModal`) treballa explícitament només amb
  `g.code==="A"`.

### Requisits

- `GroupCode` passa a ser `string` (identificador lliure, no limitat a
  una lletra).
- `createCourse` accepta la llista de grups a crear (nombre i noms),
  amb un valor per defecte raonable (per exemple, 2 grups "A"/"B") per
  no trencar l'ús actual ni els tests existents.
- El switcher de grup a `page.tsx` es genera dinàmicament a partir de
  `course.groups` (un `.map`), no de dos botons fixos.
- `Courses.tsx` mostra una columna per grup existent (dinàmica), no
  dues columnes fixes.
- `Data.tsx` / `ImportPreviewModal` generalitza la lògica per operar
  sobre **el grup que correspongui** de la importació, no només "A"
  (revisar amb calma aquesta part: cal decidir com es mapeja un grup
  de l'Excel importat a un grup existent del curs).
- Migració: els cursos existents (amb grups "A"/"B") s'han de poder
  obrir sense canvis de comportament.

### Criteris d'acceptació

- [x] Es pot crear un curs amb 3 grups (per exemple per a 1r SMX) i
      funcionar amb notes, activitats i informes amb normalitat.
      *(Confirmat per codi/tests; pendent de prova visual per part de
      l'usuari, veure més avall.)*
- [x] Un curs antic amb 2 grups "A"/"B" es continua obrint i
      funcionant igual que abans (per defecte `createCourse` sense
      indicar grups en segueix creant exactament dos, "A" i "B").
- [x] `Courses.tsx` i el switcher de `page.tsx` mostren tants grups
      com n'hi hagi al curs, amb el seu nom real.
- [x] `npm test` (29/29, 2 de noves) i `npx tsc --noEmit` sense errors.

### Què s'ha implementat

- [`src/model/domain.ts`](src/model/domain.ts): `GroupCode` ara és
  `string` (abans `"A" | "B"`). `createCourse(academicYear,
  configuration?, isTest?, groupCodes = ["A","B"])` accepta una llista
  de codis de grup; per defecte en segueix creant dos ("A"/"B") per no
  canviar cap comportament existent.
- [`app/page.tsx`](app/page.tsx): el switcher de grup ja no és dos
  botons fixos — es genera amb un `.map` sobre `course.groups`,
  mostrant el nom real de cada grup. El grup actiu es calcula com
  `course.groups.find(g=>g.code===groupCode) ?? course.groups[0]`,
  així que si mai el codi recordat no existeix en aquell curs (per
  exemple en canviar de curs), cau automàticament al primer grup en
  lloc de deixar la pantalla sense grup seleccionat.
- [`app/screens/Courses.tsx`](app/screens/Courses.tsx): el formulari
  "Nou curs" té un camp nou **"Grups (separats per comes)"**
  (per defecte `A, B`) que accepta qualsevol nombre de codis/noms
  (p. ex. `1DAW1, 1DAW2, 1DAW3`). La taula ja no té columnes fixes
  "Grup A"/"Grup B": ara hi ha una sola columna **"Grups"** que llista
  el nom i l'ocupació de cadascun (p. ex. `Grup A: 12/25 · Grup B:
  14/25`), vàlida per a qualsevol quantitat de grups.
- [`app/screens/Data.tsx`](app/screens/Data.tsx) (`ImportPreviewModal`):
  la importació d'Excel sempre llegeix les dades de "Grup A" del propi
  fitxer importat (un Excel = una classe física, això no canvia), però
  ara **el grup de destinació dins el curs real es tria explícitament**
  amb un desplegable ("Alumnes"/"Notes" ... "al grup ▾"), en lloc
  d'assumir que el curs real també té un grup "A". Per defecte es
  proposa el grup "A" del curs si existeix, o el primer grup si no.
- Dos tests nous a [`tests/database.test.ts`](tests/database.test.ts)
  que fixen aquest comportament: `createCourse` sense arguments de
  grup en crea dos ("A"/"B"), i amb una llista explícita (`["1DAW1",
  "1DAW2", "1DAW3"]`) en crea els que toquin, amb el nom `Grup <codi>`.

### Decisions preses

1. **Nom del grup**: es manté `Grup <codi>` (igual que abans), també
   per a codis llargs (p. ex. `Grup 1DAW1`). No s'ha afegit un camp de
   nom separat del codi — mantenir-ho simple; es pot revisar més
   endavant si algun cop cal un nom diferent del codi.
2. **Columna "Grups" única a la taula de Cursos**, en lloc d'una
   columna per grup: com que el nombre de grups ja no és fix, una
   columna per grup faria que la taula tingués una amplada diferent
   per fila. Es mostra tot en una sola cel·la, separat per "·".
3. **Selecció del grup de destinació a la importació Excel**: només
   calia decidir-ho quan el curs real té més d'un grup candidat; per
   defecte es proposa "A" (el cas d'ús habitual, un Excel per grup),
   però ara l'usuari el pot canviar explícitament abans d'aplicar.
4. **No s'ha tocat la comparació "Grup A vs Grup B"** de les pantalles
   d'anàlisi ([`GroupAnalysis.tsx`](app/screens/GroupAnalysis.tsx),
   [`GroupReport.tsx`](app/screens/GroupReport.tsx),
   [`groupAnalytics.ts`](app/lib/groupAnalytics.ts)): amb més de dos
   grups, `otherGroup` continua triant automàticament "un altre grup
   qualsevol" (el primer que no sigui el propi) en lloc de deixar
   triar quin — no peta ni dona resultats incorrectes, però no és
   ideal amb 3+ grups. Queda anotat per revisar-ho a la **Fase 4**
   (deixar triar amb quin grup comparar quan n'hi hagi més de dos).

### Pendent de verificació manual

No hi ha diàlegs natius aquesta vegada, així que ho pots comprovar
directament a l'aplicació ja oberta:

- [ ] A "Cursos", crear un curs de prova amb "Grups" = `A, B, C` i
      comprovar que apareixen els tres botons al canviador de grup, i
      que es pot donar d'alta alumnes i notes a cadascun amb
      normalitat.
- [ ] Comprovar que el curs de SOX existent (2 grups) es continua
      veient i funcionant exactament igual que abans.
- [ ] Fer una importació d'Excel i comprovar que el nou desplegable
      "al grup" apareix a la previsualització i aplica les dades al
      grup triat.
- [ ] Esborrar el curs de prova un cop comprovat, per no deixar-lo
      brut a la llista de cursos.

------------------------------------------------------------------------

## FASE 3 — Classificació per Cicle formatiu / Curs / Mòdul · ✅ implementada (2026-09-07), pendent de verificació manual

### Objectiu

Poder tenir oberts dins la mateixa base de dades mòduls de **cicles i
cursos diferents** (SMX 1r, SMX 2n, DAW...) i distingir-los amb
claredat al selector, en comptes de distingir-los només per
`academicYear` (que avui és l'únic camp visible al desplegable de
capçalera).

### Requisits

- Afegir a `ModuleConfiguration` (o a `AcademicCourse`, a decidir en
  analitzar el codi) camps de classificació, per exemple:
  - `cicle` (p. ex. "SMX", "DAW");
  - `nivellCicle` ("Grau mitjà" / "Grau superior");
  - `curs` ("1r" / "2n").
  (`moduleName` i `abbreviation` ja existeixen i es mantenen.)
- Migració: assignar valors per defecte raonables als cursos existents
  (per exemple, els valors actuals "Sistemes Operatius en Xarxa" / "2n
  SMX" ja presents a `emptyConfiguration`).
- El selector de capçalera ([`app/page.tsx`](app/page.tsx), línia amb
  `<select value={course?.id}>`) passa de llistar només l'any a
  agrupar/etiquetar per **Cicle · Curs · Mòdul · Any**, de manera que
  amb diversos mòduls oberts el mateix any es puguin distingir a cop
  d'ull.
- El rètol fix de marca "SOX · 2n SMX" ([`app/page.tsx`](app/page.tsx),
  capçalera lateral) es converteix en dinàmic, a partir del curs
  actiu.
- Revisar si `Courses.tsx` (creació de curs nou) ha d'incloure aquests
  camps al formulari de "Nou curs".

### Criteris d'acceptació

- [x] Es poden tenir simultàniament a la base de dades, per exemple,
      un curs "SOX · 2n SMX" i un curs d'un mòdul de DAW, i distingir-los
      clarament al selector (agrupats per Cicle · Nivell · Curs).
- [x] El rètol de capçalera reflecteix el curs actiu real, no un text
      fix.
- [x] Un curs antic sense aquests camps s'obre correctament després de
      la migració, amb valors per defecte sensats (SMX / Grau mitjà /
      2n, els mateixos que ja tenia implícits SOX).
- [x] `npm test` (30/30, 1 de nova) i `npx tsc --noEmit` sense errors.

### Què s'ha implementat

- [`src/model/domain.ts`](src/model/domain.ts): `ModuleConfiguration`
  té tres camps nous — `cicle` (text lliure, p. ex. "SMX"/"DAW"),
  `cicleNivell` (`"Grau mitjà" | "Grau superior"`) i `curs` (text
  lliure, p. ex. "1r"/"2n"). `emptyConfiguration()` els inicialitza amb
  els valors que SOX ja tenia implícits (SMX / Grau mitjà / 2n).
  `migrateDatabase()` els completa amb els mateixos valors per defecte
  a qualsevol curs desat abans d'aquest canvi, seguint la mateixa
  pràctica que ja es va fer servir per a `workUnits`/`raAveraging`
  (documentada a `ESPECIFICACIO-FUNCIONAL.md`).
- [`app/screens/Config.tsx`](app/screens/Config.tsx): nou panell
  **"Identificació del mòdul"**, a dalt de tot de la pestanya "RA, CA i
  pesos", amb camps editables per a Nom del mòdul, Abreviatura, Cicle,
  Nivell del cicle (desplegable), Curs i el "Nivell" de text lliure
  (el que ja es feia servir als informes). **Fins ara cap d'aquests
  camps es podia editar enlloc un cop creat el curs** — en crear un
  curs buit (no clonat), quedava per sempre amb "Sistemes Operatius en
  Xarxa"/SOX per defecte; ara es pot corregir en qualsevol moment.
- [`app/page.tsx`](app/page.tsx): el rètol de la barra lateral ja no diu
  sempre "SOX · 2n SMX" — mostra `{abreviatura} · {nivell}` del curs
  actiu (o "Cap curs actiu" si no n'hi ha cap). El desplegable de
  "Curs acadèmic" de la capçalera ara agrupa els cursos amb
  `<optgroup>` per **Cicle · Nivell del cicle · Curs**, i cada opció
  mostra `Abreviatura · Any` en lloc de només l'any — així diversos
  mòduls oberts el mateix any (p. ex. dos cursos "2026–2027", un de
  SOX i un de DAW) es distingeixen a cop d'ull.
- Nova funció [`groupCoursesByCicle`](app/lib/helpers.ts) a
  `helpers.ts` que agrupa i ordena els cursos per aquesta classificació
  (grups ordenats alfabèticament, i dins de cada grup els cursos per
  any acadèmic descendent).
- Test nou a `tests/database.test.ts` que confirma que
  `migrateDatabase` completa `cicle`/`cicleNivell`/`curs` en dades
  antigues.

### Decisions preses

1. **On viuen els camps nous**: dins `ModuleConfiguration` (no a
   `AcademicCourse`), perquè conceptualment identifiquen el mòdul, no
   el curs acadèmic concret — coherent amb `moduleName`/`abbreviation`
   que ja hi vivien.
2. **Es manté el camp `level` de text lliure** (no se substitueix pels
   nous `cicle`/`cicleNivell`/`curs`): `level` continua fent-se servir
   tal qual als informes existents; els camps nous serveixen per
   **classificar i agrupar** al selector, no per generar el text dels
   informes. Es poden acabar dient coses semblants ("2n SMX" vs.
   "SMX"/"2n" per separat) sense cap conflicte.
3. **"Nou curs" (`Courses.tsx`) no s'ha tocat**: en lloc d'afegir-hi
   més camps al formulari de creació, aquests camps ja es poden editar
   just després a "Identificació del mòdul" — es manté el formulari de
   creació curt, i clonar un curs existent ja n'hereta els valors.
4. **La comparació "Grup A vs Grup B" de les pantalles d'anàlisi
   segueix intacta** (no formava part d'aquesta fase); l'anotació de la
   Fase 2 sobre triar amb quin grup comparar quan n'hi ha més de dos es
   manté pendent per la Fase 4.

### Pendent de verificació manual

- [ ] A "Configuració", comprovar que el nou panell "Identificació del
      mòdul" mostra els valors actuals de SOX i que es poden editar
      (per exemple, canviar temporalment el Cicle i veure que el
      rètol de la barra lateral i el selector de capçalera ho
      reflecteixen).
- [ ] Crear un segon curs de prova (per exemple clonant-lo) i canviar-li
      el Cicle/Curs/Mòdul des de "Identificació del mòdul" perquè
      simuli un mòdul de DAW; comprovar que apareix en un grup
      diferent al desplegable de capçalera.
- [ ] Comprovar que seleccionar cada curs des del desplegable agrupat
      funciona amb normalitat (canvia el curs actiu, es veuen les
      seves pròpies activitats/notes).
- [ ] Esborrar el curs de prova un cop comprovat.

### Correccions arran de la primera prova de l'usuari (2026-09-07)

En provar la Fase 3, l'usuari va crear un curs de prova amb el botó
ràpid **"Nou curs"** de la capçalera (no des de la pestanya "Cursos"),
que feia servir dos diàlegs natius del navegador poc clars: un
`prompt()` per l'any i un `confirm()` amb un text genèric ("Vols
copiar la configuració comuna del curs actual?") que no deixava triar
d'on clonar ni configurar els grups. Això va portar a crear
accidentalment un curs "DAW" amb dades de SMX, i després **no vaig
trobar com esborrar-lo**: el botó "Elimina" de la pestanya "Cursos" hi
és, però exigia retornar a escriure l'any acadèmic exacte en un
`prompt()` per confirmar — fràgil davant errors de picatge o del
guionet especial ("–" en lloc de "-").

Correccions aplicades:

- El botó **"Nou curs"** de la capçalera ([`app/page.tsx`](app/page.tsx))
  ja no obre cap diàleg natiu: ara porta directament a la pestanya
  **"Cursos"**, on ja existia un formulari complet i clar (any, "Clona
  la configuració de" amb desplegable explícit incloent "Curs buit",
  grups, curs de prova). S'ha eliminat la funció `addCourse` i els
  `prompt()`/`confirm()` que feia servir.
- El botó **"Elimina"** de "Cursos" ([`Courses.tsx`](app/screens/Courses.tsx))
  ja no demana retornar a escriure l'any: ara mostra un `confirm()`
  clar amb el nom del curs, el mòdul, i quants grups/alumnes
  actius/notes s'esborrarien, deixant clar que no es pot desfer.

`npx tsc --noEmit` i `npm test` (30/30) tornats a passar després
d'aquest ajust. **Amb això ja pots esborrar el curs de prova que et va
quedar penjat**: vés a "Cursos" i prem "Elimina" al seu costat — ara
n'hi ha prou amb confirmar el missatge, sense retornar cap text.

### Segona millora: identitat del mòdul integrada a "Nou curs" (2026-09-07)

L'usuari va assenyalar dos problemes més després de provar-ho:

1. Calia crear el curs i després anar a una altra pantalla ("RA, CA i
   pesos") només per corregir-ne la identitat (nom del mòdul, cicle,
   curs) — en triar "Curs buit" el curs neixia amb els valors fixos de
   SOX per defecte, encara que fos per a un mòdul totalment diferent.
2. A la taula de "Cursos", les files només mostraven l'any acadèmic:
   amb diversos cursos amb el mateix any (p. ex. un de SOX i un de
   prova de DAW, tots dos "2026–2027"), no hi havia manera de saber
   quin era quin sense entrar-hi.

Solució aplicada a [`Courses.tsx`](app/screens/Courses.tsx):

- El formulari "Nou curs" ara inclou també **Nom del mòdul,
  Abreviatura, Cicle, Nivell del cicle i Curs**. En triar "Clona la
  configuració de" un curs existent, aquests camps es pre-omplen amb
  els valors d'aquell curs (i el desplegable ara mostra `Nom del mòdul
  (Abreviatura) · Any`, no només l'any, pel mateix motiu que el punt
  2). Per defecte comencen amb els valors del curs actualment obert,
  editables abans de crear. Així el curs neix sempre amb la identitat
  correcta, sense pas addicional a "RA, CA i pesos" (que continua sent
  necessari només per al contingut curricular en si: RA, CA, activitats
  i pesos, que és feina progressiva i no té sentit intentar omplir-la
  en un formulari de creació).
- La taula de cursos ja no mostra només l'any: la primera columna ara
  es diu **"Mòdul"** i mostra el nom del mòdul en negreta amb una línia
  petita a sota amb `Abreviatura · Cicle · Nivell · Curs · Any`,
  suficient per distingir a cop d'ull dos cursos amb el mateix any.

`npx tsc --noEmit` i `npm test` (30/30) sense errors després d'aquest
canvi.

### Tercera millora, fora de l'abast estricte de la Fase 3 però trobada provant-la: edició de CA i neteja de diàlegs natius

Provant la pantalla "RA, CA i pesos", l'usuari va detectar que **no hi
havia cap manera d'afegir un CA a un RA** (només es podien arxivar/
restaurar els que ja venien d'una importació Excel), i de passada va
assenyalar que "+RA" i "+Tipus" feien servir `prompt()` natius del
navegador, sense cap estil, inconsistents amb la resta de l'aplicació.

Solució a [`app/screens/Config.tsx`](app/screens/Config.tsx):

- Nou component intern `FieldsModal` (formulari petit i estilitzat,
  amb el mateix aspecte que `WorkUnitEditor`) que substitueix els tres
  `prompt()` natius: crear un RA, crear un CA, i crear un tipus
  d'activitat.
- **Nou: botó "+ CA" dins de cada RA desplegat**, per afegir-hi
  criteris d'avaluació un a un.
- **Nou: importació CSV de CA per RA** (`parseCriteriaCsv` a
  [`importers.ts`](src/controllers/importers.ts)): format `codi,descripció`
  (capçalera opcional, descripció entre cometes si conté comes); els
  codis que ja existeixin en aquell RA s'ometen amb avís. El botó
  "Importa CSV" mostra el format al `title` (tooltip natiu en passar
  el ratolí), seguint exactament el mateix patró que ja existia per a
  la importació CSV d'alumnes ([`Students.tsx`](app/screens/Students.tsx)).
- `Config` ara rep la prop `msg` (com la majoria de pantalles) per
  poder mostrar avisos de la importació.
- 4 tests nous a `tests/importer.test.ts` per a `parseCriteriaCsv`
  (lectura bàsica, comes entre cometes, files incompletes/codis
  duplicats amb avís sense rebutjar el fitxer, i rebuig quan no hi ha
  cap fila vàlida).

**Revisió posterior**: la primera versió afegia "+RA"/"+CA" com a
petits formularis independents un a un. L'usuari va aclarir que
preferia **un únic modal amb tots els RA i CA junts** (a l'estil de
l'editor d'Unitats de Treball), on afegir/editar/arxivar-ho tot des
d'un mateix lloc — es va verificar per historial de git que mai havia
existit cap editor de percentatges per a RA/CA (el que hi ha, sense
tocar, és "Tipus i ponderacions", que és una cosa diferent). Substituït
per un nou component `RaCaEditor`: modal únic amb tots els RA
(editables inline) i, dins de cada un, els seus CA (editables inline),
amb "+ RA" i "+ CA" que afegeixen una fila buida ja enfocada per
escriure-hi directament — sense diàleg separat. La importació CSV de
CA es manté, ara dins d'aquest modal. El botó del panell principal ara
diu **"Gestiona RA i CA"** i obre aquest modal; la llista desplegable
de la pantalla principal es manté només per consulta ràpida i
arxivar/restaurar.

`npx tsc --noEmit` i `npm test` (33/33) sense errors després d'aquesta
revisió.

**Segona revisió** (la importació CSV canvia d'àmbit: de "CA d'un RA"
a "tots els RA i CA del mòdul"): l'usuari va demanar treure el botó
d'importació CSV de dins de cada RA al `RaCaEditor`, i posar-lo al
panell principal, al costat de "Gestiona RA i CA", deixant clar
(tooltip + confirmació en clicar) que importa **tots** els RA i CA del
mòdul d'un sol cop.

- [`importers.ts`](src/controllers/importers.ts): `parseCriteriaCsv`
  (2 columnes, per un sol RA) substituït per `parseModuleRaCaCsv` (4
  columnes: RA, Descripció RA, CA, Descripció CA — amb un separador
  CSV real amb cometes, no només "primera coma") i una nova funció
  `applyModuleRaCaCsv(config, rows)` que crea els RA que no existeixin
  (pel seu codi) i n'hi afegeix els CA, ometent els codis de CA que ja
  existissin dins el RA corresponent.
- Nou botó **"Importa CSV (tots els RA i CA)"** al panell principal
  "RA i CA", al costat de "Gestiona RA i CA". El `title` (tooltip)
  explica el format sencer amb exemple; en clicar i triar un fitxer,
  abans d'aplicar res es mostra un `confirm()` amb el nombre de RA i CA
  detectats, deixant clar que és una importació de tot el mòdul.
- Eliminat el botó de CSV per RA dins de `RaCaEditor` (ara només hi
  queden "+ RA" / "+ CA" per a edició manual fila a fila).
- Tests de l'anterior format substituïts per als de `parseModuleRaCaCsv`
  i un test nou per a `applyModuleRaCaCsv` (crea RA nous, omet CA
  duplicats, no duplica un RA ja existent en una segona importació).

`npx tsc --noEmit` i `npm test` (34/34) sense errors després d'aquesta
segona revisió.

**Tercera revisió**: l'usuari va assenyalar que al `RaCaEditor` no hi
havia manera d'**eliminar definitivament** un RA o un CA creat per
error (només "Arxiva", que el manté per sempre a la pantalla
Arxivats). Afegit un botó **"Elimina"** al costat de cada
"Arxiva"/"Restaura":

- Eliminar un **CA**: confirmació amb el seu codi/descripció (i quants
  vincles amb activitats es perdrien), i neteja també els
  `ActivityCriterionLink` que l'referenciaven.
- Eliminar un **RA**: confirmació amb el detall complet del que se'n
  va (nombre de CA, vincles amb activitats, unitats de treball que
  l'inclouen), i en aplicar-ho: esborra el RA, tots els seus CA, els
  vincles associats a aquells CA, i treu la referència del RA de
  qualsevol Unitat de Treball que el tingués vinculat.

Segueix el mateix patró que "Elimina" a Cursos: confirmació clara amb
detall de l'impacte, no un retip del nom. `npx tsc --noEmit` i
`npm test` (34/34) sense errors.

### Correcció addicional, fora d'abast: el canviador de grup sortia a pestanyes on no fa res

L'usuari va detectar que els botons de grup (p. ex. "Grup A"/"Grup B")
apareixien també a "Cursos" sense tenir-hi cap efecte visible. Es va
confirmar per codi: la capçalera compartida (`.head` a
[`app/page.tsx`](app/page.tsx)) renderitzava el `.switch` per a
**totes** les pestanyes, però només l'utilitzen realment les que reben
el grup seleccionat com a dada (Resum, Alumnes, Notes, Activitats,
Graelles, Anàlisi del grup, Anàlisi de l'alumne). A la resta (Cursos,
Informes, RA·CA i pesos, Dades i còpies, Arxivats, Ajuda, Presentació)
els botons no feien res visible, tot i seguir canviant l'estat intern.

Corregit amb un nou conjunt `GROUP_SCOPED_TABS` a `app/page.tsx`: el
`.switch` només es renderitza quan la pestanya activa hi és inclosa.
`npx tsc --noEmit` i `npm test` (34/34) sense errors.

------------------------------------------------------------------------

## FASE 4 — Revisió i neteja final · ✅ FETA (2026-09-07)

### Auditoria feta

S'ha revisat tot `app/` i `src/` a la recerca de referències residuals
a "exactament 2 grups" o "un sol mòdul implícit". Resultat:

- **Corregit**: [`app/lib/groupAnalytics.ts`](app/lib/groupAnalytics.ts)
  triava sempre "un altre grup" arbitràriament per a la comparació
  (`otherGroup = course.groups.find(g => g.id !== group.id)`), i la
  pestanya d'[`app/screens/GroupAnalysis.tsx`](app/screens/GroupAnalysis.tsx)
  deia sempre "Comparació A-B". Ara `analyzeGroup()` accepta un
  `compareGroupId` opcional, i quan un curs té 3+ grups apareix un
  desplegable "Compara amb" per triar-lo explícitament (es manté el
  primer altre grup per defecte si no se'n tria cap, igual que abans
  amb 2 grups). L'informe exportable (`GroupReport.tsx`) rep el mateix
  grup de comparació seleccionat, perquè coincideixi amb el que es veu
  en pantalla. La pestanya ara diu "Comparació de grups".
- **Detectat i deixat tal qual, per decisió explícita de l'usuari**:
  [`public/PRESENTACIO-MODUL.md`](public/PRESENTACIO-MODUL.md) i
  [`public/CALCUL-NOTES.md`](public/CALCUL-NOTES.md) (renderitzats per
  `Presentacio.tsx` i `Help.tsx`) són documents fixos redactats a mà,
  específics de SOX (nom del mòdul, els 6 RA, fins i tot un diagrama
  SVG amb "Grup A · Grup B"). No llegeixen res de `course.configuration`.
  Si s'obre un curs de DAW o 1r SMX, seguirien mostrant contingut de
  SOX. **Decisió: es mantenen tal qual**, són documents de referència
  redactats a mà, no una vista de dades en viu; reescriure'ls perquè es
  generessin dinàmicament per a qualsevol mòdul seria una feina de
  contingut molt gran per al valor que aporta ara mateix.
- **Sense problemes**: `Reports.tsx`, `Grids.tsx` (fora del filtre de
  trimestres, veure Fase 5), `GroupReport.tsx`, `StudentReport.tsx`,
  `Archived.tsx`, `Activities.tsx`, `StudentAnalysis.tsx`,
  `Students.tsx`, `Data.tsx`, `page.tsx`, `calculation.ts` i
  `domain.ts` ja llegeixen dinàmicament `group.code`/`group.name` i
  `course.configuration.*`, sense assumir cap nombre fix de grups ni
  un mòdul concret.
- **Detectat, fora d'abast d'aquesta fase, i capturat com a Fase 5**:
  `Activity.term` només admetia `1 | 2` arreu — vegeu més avall.

### Tests ampliats

Nou fitxer [`tests/multiModule.test.ts`](tests/multiModule.test.ts)
amb dos tests: (1) tres cursos de cicles/cursos/mòduls diferents (SMX
2n amb 2 grups, SMX 1r amb 3 grups, DAW 2n) conviuen a la mateixa
`AppDatabase` sense compartir RA/CA ni grups entre ells; (2) clonar la
configuració d'un curs en crea una còpia independent (editar el clon
no toca l'origen). De pas, `groupCoursesByCicle` s'ha mogut de
`app/lib/helpers.ts` a `src/model/domain.ts` (era l'única manera de
poder-la provar directament: els fitxers d'`app/` fan servir imports
sense extensió, vàlids per a Vite però no per al resolver natiu de
Node que fan servir els tests).

`npx tsc --noEmit` i `npm test` (36/36 en aquell moment) sense errors.

------------------------------------------------------------------------

## FASE 5 — Trimestres configurables · ✅ FETA (2026-09-07)

### Objectiu

Detectat arran d'una pregunta de l'usuari durant la revisió de la Fase
4: `Activity.term` només admetia `1 | 2` a tot arreu, assumint
implícitament que tots els cursos tenen exactament dos trimestres. Això
encaixa amb 2n SMX (acaba amb el mòdul intermodular, 2 trimestres),
però **no** amb 1r SMX, que en fa tres. Amb el model antic, les
activitats del 3r trimestre real s'haurien d'etiquetar com a "2n" per
falta d'opció, barrejant-se amb les del 2n trimestre real als filtres
de Graelles, i perdent un punt de control intermedi a "Evolució"
(només hi havia "final del 1r trimestre" com a única referència).

### Què s'ha implementat

- [`src/model/domain.ts`](src/model/domain.ts): `Activity.term` passa
  de `1 | 2` a `number`; `ModuleConfiguration` té un nou camp
  `termCount` (per defecte `2`, migrat automàticament als cursos
  existents via `migrateDatabase`).
- [`src/model/calculation.ts`](src/model/calculation.ts):
  `groupAsOfTerm(course, group, maxTerm)` accepta ara qualsevol
  `number`, no només `1 | 2` (la lògica ja era genèrica).
- [`app/screens/Config.tsx`](app/screens/Config.tsx): nou quadre
  **"Nombre de trimestres"** (al costat de "Nota mínima obligatòria"),
  amb un camp numèric d'1 a 4.
- [`app/screens/Activities.tsx`](app/screens/Activities.tsx): el
  desplegable "Trimestre" de l'editor d'activitat mostra tantes
  opcions com `termCount` indiqui, no només 1 i 2.
- [`app/screens/Grids.tsx`](app/screens/Grids.tsx): els filtres de
  trimestre a la Graella d'activitats es generen dinàmicament (abans
  només hi havia "1r"/"2n" fixos); `ActivityGrid` ara rep `course` com
  a prop per poder-hi accedir.
- Nova funció [`termOrdinal`](app/lib/helpers.ts) ("1r", "2n", "3r",
  "4t", "5è"...) que substitueix els `===1?"1r":"2n"` hardcoded trobats
  a `Grids.tsx`, `Grades.tsx` i `Students.tsx`.
- [`app/lib/groupAnalytics.ts`](app/lib/groupAnalytics.ts): el gràfic
  "Evolució de la nota projectada" (Anàlisi del grup i el seu informe)
  ara mostra un punt de control per cada trimestre intermedi (1..N-1),
  no només "1r trimestre" — amb `termCount=2` es veu exactament igual
  que abans; amb `termCount=3` afegeix el punt "2n trimestre" abans
  d'"Actual". L'indicador d'evolució (KPI de tendència) es manté
  ancorat al final del 1r trimestre com a referència, sense canvis de
  significat.
- Tests nous: `groupAsOfTerm admet més de dos trimestres` a
  `calculation.test.ts`, i `migrateDatabase afegeix termCount` a
  `database.test.ts`.

### Decisions preses

1. **La comparació d'evolució de l'alumne individual (`studentAnalytics.ts`)
   es manté ancorada només al 1r trimestre** (un únic KPI de tendència,
   no un gràfic de diversos punts): no calia generalitzar-la perquè no
   mostra una sèrie temporal, només un delta respecte a un punt de
   referència, i aquest continua sent el 1r trimestre igual que abans.
2. **No s'ha tocat `public/CALCUL-NOTES.md`/`PRESENTACIO-MODUL.md`**
   (mateixa decisió que a la Fase 4).

`npx tsc --noEmit` i `npm test` (38/38) sense errors.

------------------------------------------------------------------------

## Com treballarem cada fase

1. Es demana explícitament començar una fase concreta (no totes de
   cop).
2. S'analitza l'estat real del codi abans de proposar canvis.
3. S'implementa la fase, mantenint l'app executable en tot moment.
4. Es valida: `npx tsc --noEmit`, `npm test`, i una prova manual a
   `npm run dev` al navegador.
5. Es revisen junts els resultats abans de decidir si es passa a la
   fase següent o cal ajustar alguna cosa de l'actual.

Ordre recomanat: **Fase 1 → Fase 2 → Fase 3 → Fase 4 → Fase 5**. La
Fase 1 és independent de la resta i protegeix les dades abans de tocar
el model; les fases 2 i 3 es podrien intercanviar d'ordre si convé,
però es recomana aquest ordre perquè la Fase 3 (classificació de
cicles/mòduls) té més sentit visual un cop el selector ja sap mostrar
un nombre variable de grups. La Fase 5 (trimestres) va sortir de la
revisió de la Fase 4 i no s'havia previst a l'inici del full de ruta.

------------------------------------------------------------------------

## Estat del full de ruta

**Totes les fases (1 a 5) estan fetes i validades** (2026-09-07):
persistència en fitxer real, grups de mida variable, classificació per
cicle/curs/mòdul, revisió i neteja general, i trimestres configurables.
L'aplicació ja permet portar diversos cicles formatius, cursos, mòduls,
grups i trimestres dins la mateixa base de dades, cadascun amb la seva
pròpia configuració totalment independent.

Coses conegudes, deixades deliberadament fora d'abast (documentades
més amunt, no pendents de fer "per error"):

- `public/PRESENTACIO-MODUL.md` i `public/CALCUL-NOTES.md` continuen
  sent documents fixos de referència per a SOX (decisió explícita de
  l'usuari a la Fase 4).
- L'evolució de l'alumne individual es manté ancorada al 1r trimestre
  com a únic punt de referència (decisió de la Fase 5).
