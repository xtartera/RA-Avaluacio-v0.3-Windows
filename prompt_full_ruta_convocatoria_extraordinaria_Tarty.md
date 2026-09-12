# Full de ruta — Convocatòria extraordinària (pilot SOX 2025-2026)

## 0. Context

Aquest full de ruta implementa el model descrit a
[`prompt_analisi_convocatoria_extraordinaria_Tarty.md`](prompt_analisi_convocatoria_extraordinaria_Tarty.md):
afegir convocatòria ordinària/extraordinària, recuperació de RA
mitjançant activitats d'extraordinària (relació N a N amb els RA, nota
idèntica sense repartir) i un comptador manual de convocatòria (màxim
4) per matrícula.

Document pensat per treballar-lo fase a fase amb Claude Code: es tanca
i es valida cada fase (executant l'app, comprovant que res es trenca)
abans de començar la següent. Cap fase s'ha començat encara.

------------------------------------------------------------------------

## Principis de treball per a totes les fases

1. Abans de tocar codi, **analitza l'estat actual** dels fitxers
   afectats (no assumir res d'aquest document sense verificar-ho al
   codi, que pot haver canviat des que es va escriure).
2. **No trenquis res que ja funciona.** Tots els tests existents
   (`npm test`) han de seguir passant en acabar cada fase; amplia'ls
   quan calgui, no els redueixis.
3. **Migració sempre retrocompatible**: qualsevol base de dades
   existent ha de continuar obrint-se sense pèrdua de dades després
   d'actualitzar l'app (activitats sense `session` → `"ordinaria"`,
   matrícules sense `convocatoria` → `{isRepeater: false, baseline: 0,
   extraordinariaPresented: null}`).
4. Cap fase ha de dependre de fer-ne una de posterior: en acabar cada
   fase l'aplicació ha de quedar **totalment funcional i usable**.
5. Fes servir `npx tsc --noEmit` i `npm test` com a xarxa de seguretat
   abans de donar per tancada una fase.
6. No inventis abstraccions extra "per si de cas" — implementa només
   el que calgui per al requisit de la fase. En particular, **no
   reaprofitis el mecanisme de `ActivityCriterionLink`/`allocation`**
   per a les activitats d'extraordinària: la relació és directa
   activitat→RA (`recoversRaIds`), sense percentatges.

------------------------------------------------------------------------

## FASE 1 — Model de dades i motor de càlcul · ✅ FETA (2026-09-11)

### Objectiu

Afegir els camps nous al model i la lògica de resolució final,
**sense tocar cap pantalla**. En acabar aquesta fase l'aplicació es
comporta exactament igual que ara (les activitats existents es migren
totes a `session: "ordinaria"`, així que cap càlcul actual varia).

### Fitxers previsiblement afectats

- [`src/model/domain.ts`](src/model/domain.ts): `Activity.session`,
  `Activity.recoversRaIds`, `Enrollment.convocatoria`,
  `migrateDatabase` (valors per defecte).
- [`src/model/calculation.ts`](src/model/calculation.ts):
  `activityWeights`/`theoreticalActivityWeights`/`criterionWeights`/
  `raWeights`/`calculateStudent` filtrats a `session === "ordinaria"`;
  noves funcions `calculateFinalStudent`, `convocatoriaConsumida` i
  `convocatoriaExhaurida`.

### Requisits funcionals

- `Activity.session: "ordinaria" | "extraordinaria"` (per defecte
  `"ordinaria"` en crear-ne una de nova i en migrar les existents).
- `Activity.recoversRaIds: Id[]` (només rellevant quan `session ===
  "extraordinaria"`).
- `Enrollment.convocatoria: {isRepeater: boolean; baseline: number;
  extraordinariaPresented: boolean | null}`, amb valor per defecte
  `{isRepeater: false, baseline: 0, extraordinariaPresented: null}` en
  migrar matrícules existents i en crear-ne de noves.
- Tot el càlcul actual (`calculateStudent` i les funcions de pesos)
  passa a operar únicament sobre activitats `session === "ordinaria"`.
- Nova funció `calculateFinalStudent(course, group, enrollmentId)` que
  implementa la resolució descrita a l'anàlisi (apartat 6): per cada
  RA no assolit a l'ordinària, cerca l'activitat activa d'extraordinària
  amb aquell RA a `recoversRaIds` i, si té nota, la fa servir tal qual
  (sense capar, sense comprovar obligatòries); recalcula la nota global
  amb els mateixos `raWeights` de l'ordinària.
- Noves funcions derivades `convocatoriaConsumida(enrollment)` (=
  `baseline + 1 + (extraordinariaPresented === true ? 1 : 0)`) i
  `convocatoriaExhaurida(enrollment)` (= `convocatoriaConsumida(...) >=
  4`). No requereixen cap acció de "tancar l'ordinària": l'ordinària
  d'enguany es compta com a consumida des que la matrícula existeix,
  perquè per normativa sempre es consumeix.
- Validació de domini: cap RA pot aparèixer a `recoversRaIds` de dues
  activitats d'extraordinària **actives** alhora (a implementar com a
  funció de validació reutilitzable per la Fase 2, no cal UI encara).

### Criteris d'acceptació

- [x] Amb una base de dades migrada (activitats sense `session`,
      matrícules sense `convocatoria`), l'app arrenca i tots els
      càlculs existents (notes, informes) donen exactament els mateixos
      resultats que abans del canvi (`activityWeights` i
      `theoreticalActivityWeights` només exclouen activitats amb
      `session === "extraordinaria"`, inexistents en dades migrades).
- [x] Test nou: un alumne amb un RA no assolit a l'ordinària que té una
      activitat de recuperació vinculada amb nota `>= 5` queda "assolit"
      a `calculateFinalStudent`, amb la nota exacta de la recuperació
      (sense capar a 5).
- [x] Test nou: la mateixa activitat de recuperació vinculada a dos RA
      alhora (`recoversRaIds` amb dos elements) aplica la mateixa nota
      als dos, sense repartir-la.
- [x] Test nou: un RA no assolit per activitat obligatòria suspesa
      (encara que `score >= 5`) queda "assolit" si la seva recuperació
      té nota `>= 5`, sense mirar l'obligatòria original.
- [x] Test nou: si no hi ha activitat de recuperació per a un RA, o
      encara no té nota, `calculateFinalStudent` manté el resultat
      d'ordinària per a aquell RA.
- [x] Test nou de migració: `migrateDatabase` afegeix `session:
      "ordinaria"` a activitats antigues i `convocatoria: {isRepeater:
      false, baseline: 0, extraordinariaPresented: null}` a matrícules
      antigues.
- [x] Test nou: `convocatoriaConsumida` d'una matrícula no repetidora
      sense presentar-se a l'extraordinària dona `1`; una repetidora
      amb `baseline: 2` sense presentar-se dona `3`; la mateixa amb
      `extraordinariaPresented: true` dona `4`, i
      `convocatoriaExhaurida` hi retorna `true`.
- [x] `npm test` (55/55) i `npx tsc --noEmit` sense errors.

### Què s'ha implementat

- [`src/model/domain.ts`](src/model/domain.ts): nou tipus `Session`,
  `Activity.session`/`Activity.recoversRaIds`, nova interfície
  `Convocatoria` i `Enrollment.convocatoria`, helpers
  `emptyConvocatoria()`, `newEnrollment(studentId, groupId)` (centralitza
  la construcció d'una matrícula amb la convocatòria per defecte) i
  `conflictingRecoveryActivity(activities, raId, excludeActivityId?)`
  (validació de domini per a la Fase 2). `migrateDatabase` completa
  `session`/`recoversRaIds` a activitats antigues i `convocatoria` a
  matrícules antigues.
- [`src/model/calculation.ts`](src/model/calculation.ts):
  `activityWeights`/`theoreticalActivityWeights` filtren ara per
  `session === "ordinaria"`; `deliveryRate`/`activityInsights` també
  (perquè els informes existents no es contaminin amb activitats
  d'extraordinària un cop n'hi hagi, a la Fase 2). Noves funcions
  `calculateFinalStudent`, `convocatoriaConsumida` i
  `convocatoriaExhaurida`, tal com descrites a l'anàlisi.
- Substituïda la construcció manual de matrícules per `newEnrollment(...)`
  a [`app/screens/Students.tsx`](app/screens/Students.tsx),
  [`src/controllers/studentRoster.ts`](src/controllers/studentRoster.ts) i
  [`src/controllers/importers.ts`](src/controllers/importers.ts); afegits
  `session:"ordinaria", recoversRaIds:[]` a les tres activitats
  construïdes manualment ([`app/screens/Activities.tsx`](app/screens/Activities.tsx)
  i dues a `importers.ts`).
- Tests nous a [`tests/calculation.test.ts`](tests/calculation.test.ts)
  (recuperació simple, sense recuperació encara, dos RA amb la mateixa
  activitat, desbloqueig d'obligatòria, `convocatoriaConsumida`/
  `convocatoriaExhaurida`) i a
  [`tests/database.test.ts`](tests/database.test.ts) (migració).

### Decisions preses durant la implementació

- `newEnrollment`/`emptyConvocatoria`/`conflictingRecoveryActivity`
  s'han situat després de `newId`/`nowIso` a `domain.ts` (no just
  després de la interfície `Enrollment`), per no dependre d'un ús
  "abans de declarar-se" dins del mateix mòdul.
- No s'ha tocat `groupAsOfTerm` (filtre per trimestre): les activitats
  d'extraordinària tindran el seu propi flux a la Fase 2/3, no
  s'integren a la projecció d'evolució per trimestres de l'ordinària.

------------------------------------------------------------------------

## FASE 2 — Entrada de dades (interfície) · ✅ FETA (2026-09-11)

### Objectiu

Permetre crear activitats d'extraordinària i gestionar convocatòria/
presentat per alumne, sense necessitat encara de nous informes.

### Fitxers previsiblement afectats

- [`app/screens/Activities.tsx`](app/screens/Activities.tsx) (o l'editor
  d'activitat, a localitzar en analitzar el codi actual): selector de
  sessió i selecció múltiple de RA quan `session === "extraordinaria"`.
- [`app/screens/Grades.tsx`](app/screens/Grades.tsx): revisar que el
  desplegable d'activitats distingeix visualment les d'extraordinària
  (per exemple, agrupant-les o etiquetant-les); la resta del flux de
  qualificació no hauria de necessitar canvis estructurals.
- [`app/screens/Students.tsx`](app/screens/Students.tsx): el menú "⋯"
  de cada alumne ja té accions administratives per matrícula
  ("Arxivar alumne", "Registrar baixa formal"...). Afegir-hi **"Marca
  com a repetidor"** (i "Treu la marca de repetidor"), que en activar-se
  demana `convocatoria.baseline` (0-3).
- Pantalla nova (a decidir on encaixa millor: secció dins `Reports.tsx`,
  pestanya pròpia, o dins `Grades.tsx` amb un mode "Extraordinària") amb
  la llista d'alumnes amb mòdul no superat a l'ordinària, els seus RA
  pendents, i el camp editable `extraordinariaPresented`.

### Requisits funcionals

- En crear/editar una activitat, es pot triar la sessió
  (ordinària/extraordinària). Si és extraordinària, apareix un selector
  múltiple de RA actius ("Aquesta activitat recuperarà els RA: ...") en
  lloc de l'editor de vincles a CA amb percentatges.
- Validació a la UI: en desar una activitat d'extraordinària, avisar si
  algun dels RA triats ja té una altra activitat d'extraordinària activa
  vinculada (reutilitzant la validació de domini de la Fase 1).
- Pantalla/secció de gestió de convocatòria per grup: llista d'alumnes
  amb el mòdul no superat a l'ordinària (`moduleBlocked`), amb:
  - Els seus RA no assolits i l'estat de recuperació (pendent / recuperat
    amb nota X / no presentat).
  - Indicador de repetidor (si `isRepeater`) i el seu `baseline`.
  - Camp `extraordinariaPresented` (Sí/No/Pendent).
  - Total de convocatòria consumida (`convocatoriaConsumida`, calculat
    en viu) i resultat final del mòdul (`calculateFinalStudent`).
- Avís visual (insígnia o alerta) quan `convocatoriaExhaurida` és
  `true` (ha arribat a 4), visible tant en aquesta pantalla com al
  llistat d'alumnat de `Students.tsx`. És només informatiu: no bloqueja
  cap acció de l'aplicació (les conseqüències administratives les
  gestiona el centre, no l'app).

### Criteris d'acceptació

- [x] Es pot crear una activitat d'extraordinària vinculada a un o més
      RA i qualificar-la des de `Grades.tsx` amb normalitat. **Verificat
      de cap a cap amb Playwright** (curs de prova sembrat directament a
      IndexedDB): creada «Recuperació RA1» com a extraordinària
      vinculada a RA1, qualificada amb un 9 a `Grades.tsx`, i la
      pantalla «Extraordinària» mostra «RA1 recuperat» i «Mòdul
      superat» immediatament.
- [x] Es pot marcar un alumne com a repetidor (acció «Gestiona
      convocatòria» a `Students.tsx`) i introduir-hi el `baseline`; es
      pot desmarcar sense perdre altres dades de la matrícula.
- [x] La nova pantalla «Extraordinària» mostra correctament els
      alumnes bloquejats a l'ordinària, el seu `baseline` si són
      repetidors, i permet editar `extraordinariaPresented`.
- [x] Un alumne repetidor amb `baseline: 2` que es presenta a
      l'extraordinària apareix marcat amb l'avís d'exhauriment
      (`convocatoriaConsumida = 4`) — cobert pel test unitari de
      `convocatoriaExhaurida` de la Fase 1; la insígnia visual
      («Convocatòria exhaurida») s'ha comprovat pel codi a
      `Students.tsx` i `Extraordinaria.tsx`.
- [x] El resultat final mostrat coincideix amb el que calcula
      `calculateFinalStudent` (validat amb el cas de prova de cap a cap
      esmentat més amunt).
- [x] `npm test` (55/55), `npx tsc --noEmit` i `npm run build` sense
      errors.

### Què s'ha implementat

- [`app/screens/Students.tsx`](app/screens/Students.tsx): nova acció
  **«Gestiona convocatòria»** al menú «⋯» de cada alumne, amb un diàleg
  (casella «Alumne repetidor» + camp `baseline` 0-3 quan està marcada).
  Insígnies noves a la fila de l'alumne: «Repetidor» i, si
  `convocatoriaExhaurida`, «Convocatòria exhaurida».
- [`app/screens/Extraordinaria.tsx`](app/screens/Extraordinaria.tsx)
  (nou): pantalla de seguiment per grup, amb els alumnes actius amb el
  mòdul no superat a l'ordinària, els seus RA pendents amb estat
  (pendent/recuperat i nota), el selector `extraordinariaPresented`
  (Pendent/Sí/No), el total `convocatoriaConsumida` (amb avís si
  `convocatoriaExhaurida`) i el resultat final (`modulePassed`).
- [`app/lib/helpers.ts`](app/lib/helpers.ts): `Tab` inclou
  `"extraordinaria"`.
- [`app/page.tsx`](app/page.tsx): nova entrada «Extraordinària» al grup
  de navegació «Avaluació» (amb l'icona `Repeat`), afegida a
  `GROUP_SCOPED_TABS`, connectada i amb títol de pestanya.

**Aquesta primera versió va quedar substituïda de seguida per la
correcció de disseny descrita més avall** (la pantalla
«Extraordinària» inicialment també servia per crear i qualificar
activitats de recuperació; ara només fa seguiment). Es documenta aquí
per mantenir l'historial de decisions, no com a estat final.

### Decisions preses durant la implementació

- **Una sola acció «Gestiona convocatòria»** a `Students.tsx`, en lloc
  de dues accions separades («Marca com a repetidor» / «Treu la
  marca») previstes inicialment al full de ruta: un únic diàleg amb
  una casella de verificació és més senzill i evita un menú «⋯» encara
  més llarg. Funcionalment equivalent.
- **Verificació manual real amb Playwright** (no prevista inicialment
  als requisits, però necessària per confiar en el flux complet): com
  que la base de dades comença buida i `Welcome.tsx` només permet
  crear el primer curs important un Excel, s'ha sembrat un curs de
  prova mínim directament a IndexedDB (mateix esquema que
  `AppDatabase`) per poder navegar l'aplicació real. Aquest mètode és
  reutilitzable per a futures verificacions manuals sense necessitat
  d'un Excel real.

### Correcció de disseny arran del feedback de l'usuari (2026-09-11, dues rondes)

**Primera ronda**: l'usuari va assenyalar que la pantalla
«Extraordinària» només permetia marcar «presentat/no presentat», sense
manera de crear ni qualificar activitats de recuperació sense sortir-ne.
Es va provar una primera solució (afegir un panell de creació dins de
la mateixa pantalla «Extraordinària», i un selector «Convocatòria»
dins l'editor d'activitats compartit amb `Activities.tsx`).

**Segona ronda (la que es manté)**: l'usuari va assenyalar dos
problemes reals amb aquella primera solució:

1. Barrejar activitats ordinàries i extraordinàries al mateix editor
   (amb un desplegable «Convocatòria») no separava prou clarament les
   dues convocatòries — volia una **pantalla rèplica d'«Activitats»**,
   però només per a l'extraordinària.
2. Un examen de recuperació d'un RA sol ser **el mateix per a tots els
   alumnes que l'han de recuperar**; calia el "lligam" entre alumnes i
   activitat (qui l'ha de fer i qui no), que encara no existia — a
   `Grades.tsx`, qualificar una activitat de recuperació mostrava
   sempre **tot** l'alumnat del grup, no només qui necessitava
   recuperar aquell RA.

Solució final aplicada:

- **Nova pantalla independent**
  [`app/screens/ActivitatsExtraordinaries.tsx`](app/screens/ActivitatsExtraordinaries.tsx),
  amb entrada pròpia al menú «Avaluació» («Activitats extraordinàries»,
  no és una pestanya de grup: les activitats són del curs, no d'un
  grup concret). Rèplica visual d'`Activities.tsx` (mateixes targetes),
  amb un `RecoveryActivityEditor` propi i més simple: Nom, Tipus
  d'activitat (es manté el selector, decisió explícita de l'usuari),
  Data opcional, i RA que recupera (selecció múltiple, amb la mateixa
  validació de conflictes `conflictingRecoveryActivity`). Sense camp
  «Trimestre» (no aplica; es desa un valor intern) ni selector de
  convocatòria (el context ja ho decideix: tot el que es crea aquí és
  sempre `session: "extraordinaria"`).
- [`app/screens/Activities.tsx`](app/screens/Activities.tsx) **revertit
  a ordinària pura**: `ActivityEditor` torna a no tenir cap noció de
  convocatòria (sempre crea `session: "ordinaria"`); la targeta i
  `RelationsOverview` filtren `session === "ordinaria"`, així que una
  activitat d'extraordinària mai hi apareix.
- [`src/controllers/importers.ts`](src/controllers/importers.ts)
  (`buildActivitiesCsv`) i
  [`app/screens/Grids.tsx`](app/screens/Grids.tsx) (graella
  d'activitats) filtren també `session === "ordinaria"`, pel mateix
  motiu de separació neta que ja s'havia aplicat a `calculation.ts` a
  la Fase 1.
- **El "lligam" alumne↔activitat, a
  [`app/screens/Grades.tsx`](app/screens/Grades.tsx)**: en qualificar
  una activitat `session === "extraordinaria"`, la llista d'alumnes es
  filtra **per defecte** a qui té algun dels `recoversRaIds` d'aquella
  activitat no assolit a l'ordinària (`calculateStudent` per candidat),
  amb un enllaç **«Mostra tot l'alumnat»** que revela la resta. El
  filtre es reinicia en canviar d'activitat.
- [`app/screens/Extraordinaria.tsx`](app/screens/Extraordinaria.tsx)
  torna a ser només seguiment (RA pendents, presentat, convocatòria,
  resultat final): la creació d'activitats se'n va sencera a la
  pantalla nova. Cada RA pendent mostra un accés «Qualifica» (si ja hi
  ha recuperació creada) o un avís «sense activitat →» que porta a
  «Activitats extraordinàries» (rep `goToActivitatsExtra`).
- [`app/page.tsx`](app/page.tsx): nova pestanya `"activitatsextra"`
  (no group-scoped, ja que les activitats són del curs), `Extraordinaria`
  rep `goToGrades` i `goToActivitatsExtra`.

Verificat de cap a cap amb Playwright, amb 3 alumnes de prova (2 amb
RA1 suspès, 1 amb RA1 assolit): l'editor d'«Activitats» (ordinària) ja
no mostra cap camp de convocatòria; la recuperació es crea a
«Activitats extraordinàries»; en qualificar-la des de «Notes» només hi
surten els 2 alumnes que la necessiten («Mostra tot l'alumnat» revela
el tercer). `npm test` (55/55), `tsc` i `build` sense errors.

------------------------------------------------------------------------

## FASE 3 — Informes i acta · ✅ FETA (2026-09-11)

### Objectiu

Fer visible la resolució final (amb extraordinària) als informes que
ja existeixen, i preparar una exportació apta per a ús administratiu
(acta amb número de convocatòria i resultat final).

### Fitxers previsiblement afectats

- [`app/screens/StudentReport.tsx`](app/screens/StudentReport.tsx):
  afegir la vista de resolució final (RA recuperats, nota final,
  superat/no superat) en paral·lel a la vista d'ordinària actual.
- [`app/screens/GroupReport.tsx`](app/screens/GroupReport.tsx) /
  [`app/lib/groupAnalytics.ts`](app/lib/groupAnalytics.ts): estadístiques
  amb/sense extraordinària (aprovats ordinària vs. finals), llista
  d'alumnes que passen a extraordinària, llista d'alumnes amb
  `convocatoriaExhaurida`.
- [`src/controllers/database.ts`](src/controllers/database.ts) o un nou
  controlador d'exportació: acta amb el total de convocatòria consumida
  i resultat final per alumne.

### Requisits funcionals

- L'informe individual distingeix clarament "Resultat a l'ordinària" de
  "Resultat final" quan hi ha hagut recuperació, i mostra el total de
  convocatòria consumida (amb avís si `convocatoriaExhaurida`).
- L'informe de grup mostra quants alumnes superen el mòdul només amb
  l'ordinària i quants ho fan gràcies a l'extraordinària, i quants han
  exhaurit convocatòries.
- Exportació/acta amb, com a mínim: alumne, si és repetidor, total de
  convocatòria consumida, resultat final (superat/no superat), i
  detall per RA.

### Criteris d'acceptació

- [x] Els informes existents no es trenquen ni canvien de comportament
      quan no hi ha cap activitat d'extraordinària (les seccions noves
      només es mostren si `moduleBlocked`/`blockedOrdinariaCount > 0`;
      la taula «Assoliment per RA» existent es manté intacta, reflectint
      només l'ordinària com sempre).
- [x] Amb un cas de prova amb recuperació (verificat de cap a cap amb
      Playwright, no amb dades reals de SOX): l'informe individual, la
      pantalla «Anàlisi del grup» i l'informe de grup exportable
      reflecteixen correctament el resultat final (RA recuperat,
      convocatòria consumida i exhaurida, mòdul superat/no superat).
- [x] `npm test` (55/55), `npx tsc --noEmit` i `npm run build` sense
      errors.

### Què s'ha implementat

- [`app/screens/StudentReport.tsx`](app/screens/StudentReport.tsx): nou
  bloc **«Convocatòria extraordinària»** (només visible si
  `moduleBlocked`), amb el total `convocatoriaConsumida`/`isRepeater`,
  el detall per RA no assolit a l'ordinària (recuperat/pendent, amb la
  nota de recuperació) i el resultat final del mòdul
  (`calculateFinalStudent`).
- [`app/lib/groupAnalytics.ts`](app/lib/groupAnalytics.ts): nova funció
  `summarizeConvocatoria(course, group)` (alumnes bloquejats a
  l'ordinària, aprovats finals, recuperats, encara bloquejats,
  convocatòries exhaurides, nombre de repetidors), afegida a
  `GroupAnalytics.convocatoria`.
- [`app/screens/GroupReport.tsx`](app/screens/GroupReport.tsx) i
  [`app/screens/GroupAnalysis.tsx`](app/screens/GroupAnalysis.tsx):
  nova secció **«Convocatòria extraordinària»** (només si hi ha algun
  alumne bloquejat) amb aprovats ordinària vs. finals, alumnat
  repetidor, convocatòries exhaurides i les llistes de noms
  corresponents. No es mostra res quan el mòdul no fa servir
  l'extraordinària (cap canvi visible per a cursos existents).
- [`src/controllers/database.ts`](src/controllers/database.ts): nova
  funció `buildConvocatoriaActaCsv(course, group)` /
  `downloadConvocatoriaActaCsv(course, group)` — CSV amb l'alumnat
  actiu del grup (repetidor, convocatòria consumida i exhaurida, nota
  final per RA, resultat final). Botó **«Exporta acta CSV»** a
  [`app/screens/Extraordinaria.tsx`](app/screens/Extraordinaria.tsx).

### Decisions preses durant la implementació

- **L'acta és un CSV, no un informe imprimible nou**: reutilitza el
  patró ja existent d'exportació CSV (`exportActivitiesCsv` a
  `Activities.tsx`) en lloc de crear un tercer tipus d'informe
  imprimible; n'hi havia prou per a l'ús administratiu descrit
  (alumne, convocatòria, resultat per RA i final).
- **La taula «Assoliment per RA» existent no es toca**: continua
  mostrant només l'ordinària (tal com ha fet sempre); la informació de
  l'extraordinària s'afegeix en un bloc nou i diferenciat, per no
  confondre "assoliment a l'ordinària" amb "resultat final".
- **Verificació de cap a cap amb un curs de prova sembrat via
  Playwright** (dos RA, un recuperat i l'altre no, alumne repetidor
  amb `baseline: 2` i presentat a l'extraordinària): s'ha comprovat
  visualment que els tres informes i la pantalla d'anàlisi mostren les
  xifres consistents entre ells (RA1 recuperat, RA2 pendent,
  convocatòria 4/4 exhaurida, mòdul no superat).

### Correcció arran de dades reals de SOX: la "NOTA PROJECTADA" no es recalculava amb l'extraordinària (2026-09-11)

Provant l'informe amb un alumne real (RA no assolits recuperats),
l'usuari va detectar dos problemes a
[`app/screens/StudentReport.tsx`](app/screens/StudentReport.tsx):

1. La capçalera de dalt (evolució, RA assolits/no assolits,
   lliuraments, gràfic d'evolució, "Situació actual" i la taula
   "Resultats d'aprenentatge") reflectia només l'ordinària, sense
   indicar-ho enlloc — confús un cop l'alumne ja ha passat per
   l'extraordinària.
2. Un cop **tots** els RA quedaven assolits (gràcies a la recuperació),
   la caixa **"NOTA PROJECTADA"** de dalt de tot seguia mostrant (un
   cop revelada) la nota de l'ordinària, no la nota final recalculada
   — nombres diferents sense explicació.

**Per què els dos números difereixen** (calia explicar-ho, no només
corregir-ho): `calculateStudent` (ordinària) pondera cada RA pel seu
pes global **multiplicat pel seu percentatge de cobertura** i
**renormalitza dividint només per la suma d'aquests pesos ja
avaluats** — és el disseny correcte per a una *projecció provisional*
en curs, on els RA encara no completament avaluats no han de pesar
igual que els acabats. En canvi `calculateFinalStudent` (Fase 1)
pondera cada RA pel seu **pes global sencer**, assumint que a hores
d'ara (convocatòria extraordinària) tota l'avaluació ja està tancada.
Si algun RA no arriba al 100% de cobertura segons l'aplicació (per
exemple, un grup amb menys de 5 alumnes actius mai activa el llindar
automàtic "avaluada" d'una activitat sense forçar-ho manualment a
Notes → "Mode d'avaluació"), les dues fórmules donen resultats
lleugerament diferents encara que les notes base siguin les mateixes.
Reproduït i confirmat amb un cas de prova (RA1 amb un examen no marcat
"avaluat": ordinària dona 6,33; final, amb el mateix RA1 recuperat a
un 6, dona 7,00) — la direcció exacta de la diferència depèn de cada
cas, però el mecanisme és sempre aquest.

Solució aplicada:

- `moduleBlockedOrdinaria` (l'antic `moduleBlocked`, calculat només amb
  `calc`) es manté per decidir si cal mostrar la secció
  d'extraordinària i per etiquetar les seccions només-ordinària.
  `moduleBlocked` ara es calcula com `moduleBlockedOrdinaria &&
  !final.modulePassed` — és a dir, un cop tots els RA queden resolts
  (amb o sense recuperació), el mòdul deixa d'estar "bloquejat" i la
  nota es mostra directament, sense haver de clicar "Mostra nota".
- La caixa "NOTA PROJECTADA" i el seu "Final: X" ara mostren
  `displayScore` (= `final.globalScore` quan `moduleBlockedOrdinaria`,
  si no `calc.globalScore` com sempre) — cap canvi per als alumnes que
  mai han necessitat l'extraordinària. S'hi afegeix "· amb
  extraordinària" quan aplica.
- Avís explícit sota els indicadors superiors («Els indicadors
  d'aquesta secció... corresponen només a la convocatòria ordinària»),
  i les capçaleres "Evolució de la nota projectada", "Situació actual"
  i "Resultats d'aprenentatge" s'etiqueten "(ordinària)" quan
  `moduleBlockedOrdinaria`.
- El bloc "Convocatòria extraordinària" (renombrat "— resolució
  final") ara tanca amb un requadre "NOTA FINAL" més visible, al costat
  del resultat superat/no superat.

Verificat amb un cas de prova que reprodueix exactament el mecanisme
(RA1 amb cobertura del 50% a l'ordinària per un examen no marcat
"avaluat", amb 1 sol alumne al grup): l'informe mostra "Situació actual
(ordinària) 6,33" i, un cop la recuperació (nota 6) fa que tots els RA
quedin assolits, la capçalera "NOTA PROJECTADA" mostra directament
7,00 ("Final: 7 · 75,0% · amb extraordinària"), sense caldre revelar
res. `npm test` (55/55), `tsc` i `build` sense errors.

### Columna "Convocatòria" sempre visible a "Alumnes i matrícules" (2026-09-11)

L'usuari va demanar que el número de convocatòria consumida fos
visible permanentment a la pantalla d'alumnat (no només dins la
pantalla "Extraordinària", que només mostra els alumnes bloquejats), i
va confirmar el criteri de càlcul: un alumne de primera matrícula ha
de mostrar `1` (consumirà l'ordinària d'enguany sí o sí; si a més va a
extraordinària, en consumirà una segona), i un repetidor ha de sumar 1
al valor que el docent li hagi introduït com a `baseline`. Això és
exactament el que ja calculava `convocatoriaConsumida` des de la Fase
1 — no calia tocar cap lògica de càlcul, només fer-lo visible.

Afegit a [`app/screens/Students.tsx`](app/screens/Students.tsx): nova
columna **"Convocatòria"** a la taula d'alumnat, entre "Cobertura" i
"Seguiment", amb el valor `convocatoriaConsumida(enrollment)/4` per a
tots els alumnes (no només repetidors o bloquejats), en vermell amb
"· Exhaurida" quan `convocatoriaExhaurida`. La cel·la és clicable
(obre el mateix diàleg "Gestiona convocatòria" que abans només hi
havia al menú "⋯"), amb un `title` que desglossa el càlcul (baseline +
ordinària + extraordinària). S'ha tret la insígnia redundant
"Convocatòria exhaurida" de la cel·la del nom (ara la comunica la
columna nova); es manté la insígnia "Repetidor" perquè explica *per
què* el baseline és més gran que 0, cosa que la xifra sola no diu.

Verificat visualment amb Playwright: un alumne de primera matrícula
mostra "1/4"; un repetidor amb `baseline: 2` i presentat a
l'extraordinària mostra "4/4 · Exhaurida" en vermell. `npm test`
(55/55), `tsc` i `build` sense errors.

### Perspectiva Ordinària / Extraordinària / Total a les pantalles d'Anàlisi (2026-09-11)

L'usuari va assenyalar que "Anàlisi de l'alumne" i "Anàlisi del grup"
mostraven estadístiques (RA assolits/no assolits, % d'aprovats, nota
mitjana) calculades només amb l'ordinària, sense cap manera de veure-les
també des de la perspectiva de l'extraordinària o del resultat final —
"sempre es tracten les mateixes dades amb diferent perspectiva".

**Abast decidit** (confirmat amb l'usuari abans de programar-ho): no
totes les estadístiques tenen una versió "extraordinària" amb sentit
propi. Es tripliquen només els KPI de capçalera i la taula
d'assoliment per RA; es deixen com a **només ordinària** (etiquetades
"(ordinària)" quan aplica) el gràfic d'evolució per trimestres, el
rendiment per tipologia d'activitat, "últimes activitats" i la
diagnosi/fortaleses/accions — són conceptes de seguiment continu, no
d'un examen puntual de recuperació. A la perspectiva "Extraordinària"
no es fabrica cap "nota projectada" (no té sentit mitjanar només els RA
recuperats); es mostren comptadors (RA a recuperar/recuperats/pendents)
en el seu lloc.

**Disseny escollit** (decisió explícita de l'usuari): un **selector
superior "Ordinària · Extraordinària · Total"** que recalcula els KPI i
la taula de RA, en lloc de mostrar les tres seccions apilades.

Implementat a:

- [`app/lib/studentAnalytics.ts`](app/lib/studentAnalytics.ts): nova
  funció `analyzeStudentConvocatoria(course, group, enrollmentId)` —
  `raRows` (tots els RA amb `ordinariaAchieved`, `recoveryActivity`,
  `recoveryScore`, `finalScore`/`finalAchieved`/`source`),
  `needingRecovery`, `recoveredCount`/`pendingCount`, `finalScore`,
  `modulePassed`, i `consumed`/`exhaurida`/`presented`
  (reutilitzant `convocatoriaConsumida`/`convocatoriaExhaurida`).
- [`app/lib/groupAnalytics.ts`](app/lib/groupAnalytics.ts):
  `GroupConvocatoriaSummary` ampliat amb `finalAverage` (mitjana de
  `final.globalScore` de tots els actius), `raRowsExtra` (per RA que
  algú necessita recuperar: quants ho necessiten/recuperats/pendents i
  mitjana de la recuperació) i `raRowsFinal` (mateixa forma que
  `raRows` ordinària, però amb els valors finals).
- [`app/screens/StudentAnalysis.tsx`](app/screens/StudentAnalysis.tsx)
  i [`app/screens/GroupAnalysis.tsx`](app/screens/GroupAnalysis.tsx):
  selector "Ordinària/Extraordinària/Total" a la pestanya Resum,
  **només visible quan hi ha alguna cosa a recuperar** (cap canvi
  visible per a alumnes/grups que no han necessitat mai
  l'extraordinària). En triar Extraordinària o Total, canvien el KPI
  row i la taula d'assoliment per RA; la resta de blocs es mantenen
  (etiquetats "(ordinària)") amb una nota explicativa a sobre.

Verificat de cap a cap amb Playwright (3 alumnes: una recupera i passa,
un repetidor amb la recuperació encara insuficient i convocatòria
exhaurida, una que ja ho tenia tot aprovat): "Alumnes que recuperen: 2",
"Ja recuperats: 1", "Nota final mitjana: 7,50", "Aprovats finals: 67%"
(2 de 3) — xifres creuades i consistents amb el càlcul manual. El
selector no apareix per a l'alumna sense necessitat de recuperació.
`npm test` (55/55), `tsc` i `build` sense errors.

### Correcció important: "pendent" confós amb "no assolit" a tot el motor de convocatòria (2026-09-11)

L'usuari va detectar que "Alumnes i matrícules" mostrava la nota
projectada sense cap indicació que el mòdul no estava superat, i va
demanar trobar el cas real a les dades de SOX sense dir-ne el nom.
S'ha localitzat analitzant una còpia de seguretat real
(`ra-avaluacio-2026-09-05.json`, l'única disponible) amb un script que
importa directament `calculateStudent` del projecte: **OLMO AGUILAR,
URIEL** (nota 5,43 amb RA4 i RA5 realment no assolits), i tres casos
més amb el mateix patró (**AYADA FANKOUCH OMAR**, **BONICH TORRES
JANA**, **TALLANT YAGÜE IZAN**).

En investigar-ho es va trobar un problema més greu i general: el RA6
tenia **0% de cobertura per a gairebé tota la classe** (encara no
avaluat). Totes les comprovacions de "RA no assolit"/"mòdul bloquejat"
introduïdes en aquesta funcionalitat (`moduleBlockedOrdinaria` a
`StudentReport.tsx`, `blockedRaIds` a `summarizeConvocatoria`, la
llista `blocked` a `Extraordinaria.tsx`, `needingRecovery` a
`analyzeStudentConvocatoria`, i el mateix `calculateFinalStudent`)
tractaven un RA sense evidència (`score` per defecte 0, que és `<5`)
exactament igual que un RA avaluat i suspès. Sense aquesta correcció,
la pantalla "Extraordinària" hauria marcat **9 alumnes més** com a
pendents de recuperar el RA6, quan en realitat encara no hi han
arribat.

Solució: noves funcions `raIsAchieved`/`raIsFailing` a
[`src/model/calculation.ts`](src/model/calculation.ts) — un RA compta
com "no assolit" (i, per tant, bloqueja el mòdul / necessita
recuperació) només si `coverage > 0` **i** (`score < 5` o
`failingActivities > 0`); amb `coverage === 0` és "pendent", ni assolit
ni suspès. Aplicat de manera consistent a `calculateFinalStudent`
(ja no busca recuperació per a un RA pendent, encara que n'hi hagi una
qualificada per error), `StudentReport.tsx`, `Extraordinaria.tsx`,
`groupAnalytics.summarizeConvocatoria` i
`studentAnalytics.analyzeStudentConvocatoria` (aquesta última hi afegeix
un camp `pendent` explícit, usat també per mostrar "Pendent" en lloc de
"No assolit"/"0,00" a la taula "Total" d'Anàlisi de l'alumne).

**A "Alumnes i matrícules"** ([`app/screens/Students.tsx`](app/screens/Students.tsx)),
la petició original de l'usuari: la cel·la "Nota projectada" ara marca
en vermell la nota i hi afegeix un avís "RA no assolit" quan l'alumne
té algun RA genuïnament suspès (amb `raIsFailing`), independentment
que la mitjana superi el 5.

**Límit conegut, deixat deliberadament així**: `modulePassed` (la
resolució final) continua exigint que **tots** els RA actius estiguin
assolits, RA pendents inclosos — un alumne no pot quedar "Mòdul
superat" mentre quedi algun RA sense evidència, encara que hagi
recuperat tots els que sí estaven genuïnament suspesos. És correcte
(el mòdul de veritat no està resolt mentre falti avaluar contingut),
però és rellevant només si s'usa la pantalla d'extraordinària abans
que l'ordinària estigui completa per a tothom — no hauria de passar en
ús normal (l'extraordinària és de juny, quan tot ja està avaluat).

Verificat amb dues noves proves unitàries (`raIsAchieved`/`raIsFailing`
distingeixen pendent de suspès; `calculateFinalStudent` no aplica una
recuperació qualificada a un RA pendent) i reexecutant l'anàlisi contra
les dades reals de SOX: després del fix, només queden els **4** casos
genuïns (Omar, Jana, Uriel, Izan), no els 13 d'abans. Verificat també
visualment amb Playwright (un alumne amb un RA genuïnament suspès surt
marcat; un altre amb un RA merament pendent no). `npm test` (57/57),
`tsc` i `build` sense errors.

### Segona correcció a "Alumnes i matrícules": mostrar la nota final, i amagar-la de veritat quan no se supera (2026-09-11)

L'usuari va assenyalar que la correcció anterior no n'hi havia prou: la
cel·la "Nota projectada" a
[`app/screens/Students.tsx`](app/screens/Students.tsx) cridava sempre
`calculateStudent` (només ordinària), **mai** `calculateFinalStudent`.
Efecte concret amb dades reals: alumnes que ja havien recuperat els
seus RA a l'extraordinària (Uriel Olmo, Jana Bonich) seguien mostrant
la seva nota **antiga** d'ordinària, no l'actualitzada; i un alumne que
encara no supera el mòdul (Dídac Huescar) sortia amb la xifra **visible**
en vermell, cosa que es llegeix igualment com "la meva nota" encara que
el color avisi que no s'ha superat.

Abans de tocar-ho es va demanar autorització explícita a l'usuari amb
un resum del pla, confirmat sense canvis.

Solució aplicada:

- Per a cada alumne amb algun RA genuïnament suspès
  (`moduleBlocked`, amb `raIsFailing`), es calcula
  `calculateFinalStudent` i:
  - Si amb l'extraordinària **ja supera** el mòdul → es mostra
    directament la **nota final actualitzada**, amb l'etiqueta "amb
    extraordinària" (cas Uriel/Jana).
  - Si **encara no el supera** → la xifra queda **amagada** darrere
    "No assolit", amb un botó "Mostra nota" (nou estat `revealed` per
    alumne) que en revela el valor actual — exactament el mateix patró
    que ja fa servir l'Informe individual (cas Dídac).
- Per a qui mai ha tingut cap RA suspès, la cel·la queda exactament
  igual que sempre (la nota d'ordinària, visible, sense cap canvi).
- La "Cobertura" es manté tal qual (concepte d'ordinària, sense versió
  final amb sentit).

Verificat amb Playwright (dos alumnes amb RA1 suspès a l'ordinària: un
que el recupera i supera el mòdul, un altre que el recupera però
encara no l'assoleix): el primer mostra "7,50 · amb extraordinària"
directament; el segon mostra "No assolit · Mostra nota", i en clicar-hi
revela la nota i canvia a "Amaga". `npm test` (57/57), `tsc` i `build`
sense errors.

### Tercera correcció a l'Informe individual: "RA assolits" només comptava l'ordinària, i faltava la situació final (2026-09-12)

Amb el cas real de Dídac Huescar (un RA assolit a l'ordinària i un
altre recuperat a l'extraordinària, els dos ja resolts favorablement),
l'usuari va detectar que a
[`app/screens/StudentReport.tsx`](app/screens/StudentReport.tsx) el
requadre superior "RA assolits" seguia comptant **només** l'ordinària
(`a.achievedCount`), tot i que la capçalera "NOTA PROJECTADA" ja s'havia
corregit per mostrar la nota final. També va suggerir afegir, al
requadre "Situació actual", una segona línia amb l'assoliment final
(ordinària + extraordinària), no només l'ordinària.

Solució:

- "RA assolits"/"RA no assolits" (i els seus subtítols) ara compten,
  quan `moduleBlockedOrdinaria`, els RA **finals** (`final.learningResults`)
  en lloc dels d'ordinària — amb l'etiqueta "(final)" al costat del
  títol. Sense canvis per a qui mai ha tingut cap RA suspès.
- El requadre "Situació actual (ordinària)" ara mostra, quan aplica, una
  segona barra **"Situació final (amb extraordinària)"** amb el mateix
  component `GradeBand`, sota la de l'ordinària, dins el mateix
  requadre — tal com va demanar l'usuari.
- Nota explicativa del requadre superior actualitzada per deixar clar
  que "RA assolits"/"RA no assolits" ja compten la recuperació, mentre
  que el gràfic d'evolució i la taula "Resultats d'aprenentatge" més
  avall continuen sent només ordinària.

Verificat amb Playwright (RA1 assolit a l'ordinària, RA2 suspès a
l'ordinària i recuperat a l'extraordinària): "RA assolits (final)"
mostra "2 de 2" (abans hauria mostrat "1 de 2"), i el requadre
"Situació actual" mostra les dues barres, 5,50 (ordinària) i 7,50
(final). `npm test` (57/57), `tsc` i `build` sense errors.

### Quarta correcció: "Situació actual" també faltava a la pantalla "Anàlisi de l'alumne" (2026-09-12)

L'usuari va assenyalar que el requadre "Situació actual" continuava
mostrant només l'ordinària tant a l'informe com "a la pantalla". El
fix anterior només s'havia aplicat a
[`app/screens/StudentReport.tsx`](app/screens/StudentReport.tsx)
(l'informe); **la pantalla "Anàlisi de l'alumne"**
([`app/screens/StudentAnalysis.tsx`](app/screens/StudentAnalysis.tsx))
no s'havia tocat — s'hi ha afegit ara la mateixa segona barra
"Situació final (amb extraordinària)" sota la d'ordinària, reutilitzant
`conv.finalScore` (ja calculat per `analyzeStudentConvocatoria`, usat
pels KPI de la perspectiva "Total"), mostrada sempre que
`hasConvocatoria`, independentment de quina perspectiva
(Ordinària/Extraordinària/Total) estigui seleccionada.

Es va reverificar també l'informe amb el mateix cas exacte per
descartar que fos un problema de compilació/caché: als dos llocs surt
correctament "Situació final (amb extraordinària)" amb la nota final.
`npm test` (57/57), `tsc` i `build` sense errors.

### Acta imprimible en lloc de l'exportació CSV (2026-09-12)

L'usuari va demanar substituir el botó "Exporta acta CSV" de la
pantalla "Convocatòria extraordinària" per un informe imprimible en
finestra modal, a l'estil visual dels informes d'anàlisi d'alumne i de
grup (`StudentReport.tsx`/`GroupReport.tsx`), en lloc d'un fitxer CSV.

Implementat a
[`app/screens/Extraordinaria.tsx`](app/screens/Extraordinaria.tsx):
nou component `ActaExtraordinariaPrintReport` (mateix patró `.report`
+ `createPortal` que la resta d'informes), amb capçalera
(`reportHead`, icona, títol, % d'aprovats finals com a xifra
destacada), una graella de 6 estadístiques (reutilitzant
`summarizeConvocatoria` de `groupAnalytics.ts`: passen a
extraordinària, recuperats, encara no superen, convocatòries
exhaurides, alumnat repetidor, nota final mitjana) i una taula amb el
detall per alumne (RA pendents amb l'estat de recuperació, presentat,
convocatòria consumida, resultat final). Botó "Imprimeix acta" que
obre la finestra modal; eliminat el botó i les funcions CSV
(`buildConvocatoriaActaCsv`/`downloadConvocatoriaActaCsv` a
[`src/controllers/database.ts`](src/controllers/database.ts), sense
cap altre punt que les fes servir).

Verificat amb Playwright (3 alumnes amb resultats mixtos): l'acta
inclou només els alumnes bloquejats a l'ordinària (no l'alumna que ja
superava el mòdul), amb les xifres consistents amb les de "Anàlisi del
grup", i el botó CSV antic ha desaparegut. `npm test` (57/57), `tsc` i
`build` sense errors.

### Taula creuada Alumne × RA a l'acta, la mateixa a Graelles, i un botó sense estil (2026-09-12)

Tres peticions seguides de l'usuari sobre la mateixa àrea:

1. **A l'acta imprimible**, afegir al final una taula creuada
   alumne × RA amb la nota de la recuperació a cada encreuament on
   l'alumne s'havia de presentar, en verd si acaba assolint el RA i en
   vermell si no.
2. **A "Graelles"**, afegir un tercer apartat "Extraordinària" amb
   bàsicament el mateix contingut que aquesta taula creuada, seguint
   l'estil visual ja existent del "Mapa d'assoliment dels RA".
3. A "Convocatòria extraordinària", el botó d'icona "Qualifica" (al
   costat de cada RA pendent) es veia sense estil (queia al disseny
   per defecte del navegador).

Solució:

- [`app/screens/Extraordinaria.tsx`](app/screens/Extraordinaria.tsx):
  nova secció "Qualificacions de l'extraordinària per RA" al final de
  `ActaExtraordinariaPrintReport`, amb una taula Alumne × RA;
  reutilitza les classes ja existents `activityScore`/`cellPassed`/
  `cellFailed`/`cellPending` (les mateixes de la Graella d'activitats),
  així no calia CSS nou. Cel·les amb «—» quan el RA no calia
  recuperar-lo. El botó "Qualifica" ara té un estil propi (fons blau
  clar, vora, cantonades arrodonides) en lloc del botó per defecte del
  navegador.
- [`app/screens/Grids.tsx`](app/screens/Grids.tsx): tercera pestanya
  "Extraordinària" a "Graelles" (al costat d'"Activitats" i "Resultats
  d'aprenentatge"), amb el component nou `ExtraordinariaGrid` — mateixa
  taula creuada, amb cerca d'alumne i l'estil `visualGrid` ja existent
  a la pantalla. Només hi apareixen els alumnes amb algun RA no assolit
  a l'ordinària.

Verificat amb Playwright: el botó "Qualifica" ja no es veu sense estil;
l'acta mostra la taula creuada amb "7,00" en verd per a un RA recuperat
i "Pendent" en gris per a un encara sense qualificar; la pestanya nova
de Graelles mostra exactament la mateixa informació amb "—" per als RA
no aplicables. `npm test` (57/57), `tsc` i `build` sense errors.

------------------------------------------------------------------------

## FASE 4 — Detecció automàtica de repetidors · Futura i opcional (no planificada)

### Per què no forma part d'aquest full de ruta

La gestió de repetidors (marca manual + `baseline`) ja queda coberta a
les Fases 1-2 i **no depèn** de cap identitat persistent d'alumne entre
cursos acadèmics: el docent, que reconeix l'alumne, fa de pont
manualment. Això és suficient i correcte per a l'ús real amb SOX
2025-2026 i qualsevol altre mòdul.

### Què quedaria per a una millora futura, si mai es volgués

- Introduir un identificador estable d'alumne (per exemple NIA/DNI) a
  `Student`, independent del `Group`/`AcademicCourse` — avui
  [`src/controllers/studentRoster.ts`](src/controllers/studentRoster.ts)
  només aparella per nom **dins del mateix grup**.
- Amb aquest identificador, **suggerir** (mai imposar) la marca de
  repetidor i el `baseline` en detectar un nom coincident amb un
  alumne d'un curs anterior del mateix cicle, deixant sempre l'edició
  manual com a última paraula.

Es documenta aquí perquè no es perdi la idea, no perquè bloquegi ni
condicioni les fases 1-3.

------------------------------------------------------------------------

## Com treballarem cada fase

1. Es demana explícitament començar una fase concreta (no totes de
   cop).
2. S'analitza l'estat real del codi abans de proposar canvis (pot haver
   canviat des que es va escriure aquest document).
3. S'implementa la fase, mantenint l'app executable en tot moment.
4. Es valida: `npx tsc --noEmit`, `npm test`, i una prova manual a
   `npm run dev` amb dades reals de SOX.
5. Es revisen junts els resultats abans de decidir si es passa a la
   fase següent o cal ajustar alguna cosa de l'actual.

Ordre recomanat: **Fase 1 → Fase 2 → Fase 3**. La Fase 4 (detecció
automàtica de repetidors) queda oberta, sense data ni compromís, com a
idea documentada per si mai calgués anar més enllà de la marca manual.

------------------------------------------------------------------------

## Estat del full de ruta

**Fases 1, 2 i 3 fetes i validades (2026-09-11)**: model de dades i
motor de càlcul, entrada de dades (activitats de recuperació, gestió
de repetidors, pantalla «Extraordinària»), i informes/acta amb el
resultat final. `npm test` (55/55), `npx tsc --noEmit` i `npm run
build` sense errors a cada fase; el flux complet (crear recuperació →
qualificar-la → veure el RA recuperat als tres informes) s'ha verificat
de cap a cap amb Playwright contra l'aplicació real (sense dades
reals de SOX encara).

Pendent per quan es vulgui:
- Provar-ho amb dades reals de SOX 2025-2026 (aquest full de ruta s'ha
  validat amb un curs de prova sembrat directament, no amb el curs
  real).
- Fase 4 (detecció automàtica de repetidors): oberta, sense data,
  documentada com a idea futura.
