# Anàlisi — Convocatòria extraordinària

## 0. Context i objectiu

Avui l'aplicació calcula una única nota contínua de mòdul al llarg del
curs (convocatòria ordinària, de fet, encara que no es digui així
enlloc del codi). Quan un alumne no supera algun RA, l'aplicació ho
mostra ("No assolit") però no preveu cap mecanisme perquè aquest
alumne recuperi el RA a la **convocatòria extraordinària** (recuperació
de juny) mitjançant activitats avaluatives noves (exàmens i/o
treballs), ni cap manera de portar el compte del **número de
convocatòria** consumit (màxim 4 per normativa).

Aquest document és l'anàlisi de partida. El full de ruta d'implementació
(fases, ordre de treball, criteris d'acceptació) es porta a part a
[`prompt_full_ruta_convocatoria_extraordinaria_Tarty.md`](prompt_full_ruta_convocatoria_extraordinaria_Tarty.md).

El curs pilot per validar-ho és **SOX 2025-2026** (curs en marxa,
ideal per planificar i implementar abans d'estendre-ho a la resta de
mòduls).

------------------------------------------------------------------------

## 1. Estat actual del càlcul

- [`src/model/domain.ts`](src/model/domain.ts): no hi ha cap noció de
  sessió/convocatòria enlloc del model (`Activity`, `Enrollment`,
  `Grade`...).
- [`src/model/calculation.ts`](src/model/calculation.ts):
  `calculateStudent(course, group, enrollmentId)` calcula, per a totes
  les activitats actives del mòdul, la nota de cada criteri (`CA`), la
  de cada RA (mitjana simple o ponderada dels seus CA, segons
  `raAveraging`) i finalment la nota global ponderada pel pes de cada
  RA (`raWeights`, derivat del pes de cada tipus d'activitat i de
  l'`allocation` de cada `ActivityCriterionLink`).
- Un RA es considera **assolit** si `score >= 5` **i** cap activitat
  obligatòria vinculada (`WorkUnit.requiredActivityIds`) està suspesa
  (`failingRequiredActivities`, [calculation.ts:76](src/model/calculation.ts#L76)).
- El **mòdul es dona per superat** si tots els RA actius estan
  assolits — regla ja implementada implícitament a
  [`StudentReport.tsx:20`](app/screens/StudentReport.tsx#L20)
  (`moduleBlocked = activeRa.some(x => x.failingActivities>0 || x.score<5)`)
  i reutilitzada a `groupAnalytics.ts` per als informes de grup.
- **No hi ha cap concepte de convocatòria** (ni ordinària ni
  extraordinària), ni de número de convocatòria, ni de "presentat/no
  presentat" a una recuperació.

## 2. Buits detectats

1. **Sense mecanisme de recuperació.** Un cop la nota d'un RA queda
   fixada per les activitats ordinàries, no hi ha manera d'introduir
   una activitat de recuperació que la substitueixi.
2. **Sense identitat persistent d'alumne entre cursos acadèmics.**
   [`src/controllers/studentRoster.ts`](src/controllers/studentRoster.ts)
   aparella alumnes per nom, però **només dins del mateix `Group`**
   d'un mateix `AcademicCourse`. Un alumne que repeteix mòdul l'any
   següent es crea com a `Student` totalment nou, sense cap vincle amb
   l'expedient anterior. Això afecta directament el comptador de
   convocatòries acumulat (màxim 4, entre anys si repeteix).
3. **Sense distinció "presentat/no presentat a la recuperació"** a
   nivell administratiu (diferent del `GradeStatus` "not_presented"
   d'una activitat concreta).

## 3. Model conceptual proposat

- **Convocatòria ordinària** = el que ja fa l'app avui (activitats amb
  `session = "ordinaria"`). Sempre consumeix convocatòria.
- **Convocatòria extraordinària** = activitats noves (`session =
  "extraordinaria"`), pensades com a exàmens i/o treballs de
  recuperació, cadascuna vinculada **directament a un o més RA**
  (`recoversRaIds`), no a criteris (`AssessmentCriterion`) amb
  percentatges com les activitats ordinàries. Només consumeix
  convocatòria si l'alumne s'hi presenta.
- **Comptatge de convocatòries consumides**: no es guarda com un
  número que cal anar incrementant manualment amb accions separades,
  sinó com a **valor derivat**, recalculat sempre a partir de dues
  dades de la matrícula:
  `convocatoria.baseline` (convocatòries ja exhaurides en cursos
  anteriors, 0 per defecte) `+ 1` (l'ordinària d'aquest curs, sempre
  consumida, sense necessitat de cap acció de "tancar-la") `+ 1` si
  `convocatoria.extraordinariaPresented === true`. Així no hi ha cap
  estat mutable addicional a mantenir ni risc de comptar-ho dos cops.
- **Alumnes repetidors**: el docent, que reconeix l'alumne pel nom,
  el marca explícitament com a repetidor a la nova matrícula i hi
  introdueix manualment `convocatoria.baseline` (consultant el curs
  anterior — fins i tot dins la mateixa aplicació, si ja hi constava).
  No cal cap identificador estable ni vincle automàtic entre cursos
  acadèmics (vegeu apartat 8, revisat).
- **Relació activitat–RA a l'extraordinària**: es tracta com una
  relació **N a N sense ponderació**. Una mateixa activitat de
  recuperació pot recuperar més d'un RA alhora; la nota obtinguda
  s'aplica **idèntica i sencera** a cadascun dels RA que recupera (no
  es reparteix ni es pondera entre ells). Exemple: un examen que
  recupera RA2 i RA3 amb un 7 deixa tots dos RA a 7.
- **Resolució final per RA**:
  - Si el RA ja estava assolit a l'ordinària → es manté tal qual.
  - Si no ho estava i hi ha una activitat de recuperació activa que
    l'inclou a `recoversRaIds`, amb nota registrada → aquesta nota
    **substitueix** la de l'ordinària per a aquell RA, assolit si
    `>= 5`, **sense comprovar cap activitat obligatòria** (la
    recuperació la substitueix del tot).
  - Si no hi ha recuperació o encara no té nota → es manté el resultat
    (no assolit) de l'ordinària.
- **Nota final del mòdul**: mitjana ponderada dels valors finals per
  RA (ordinària o recuperat, segons el cas) fent servir **els mateixos
  pesos globals (`raWeights`) que ja calcula l'ordinària** — les
  activitats d'extraordinària no entren mai al càlcul de pesos, només
  serveixen per substituir la nota d'un RA concret.
- **Mòdul superat (final)** = tots els RA actius assolits en la
  resolució final. Mateixa regla que ja existeix, aplicada als valors
  finals en lloc dels d'ordinària.

## 4. Decisions de política acadèmica preses

Discutides i acordades explícitament amb el professor:

1. **Nota de RA recuperat = la nota obtinguda a l'extraordinària, sense
   límit superior** (no es capa a 5; és transparent i reflecteix el
   rendiment real).
2. **Una activitat obligatòria suspesa a l'ordinària queda resolta**
   si l'activitat de recuperació d'aquell RA s'aprova (`>= 5`) — no
   cal recuperar-la nominalment ni vincular-la a l'obligatòria
   original.
3. **Comptador de convocatòries = valor derivat**, no un camp que
   s'incrementa manualment: `baseline` (heretat, manual, per a
   repetidors) + 1 (ordinària d'enguany, sempre) + 1 si es presenta a
   l'extraordinària. Suficient per pilotar-ho amb SOX 2025-2026 i
   generalitzable sense canvis a qualsevol altre mòdul.
4. **Una mateixa activitat de recuperació pot associar-se a més d'un
   RA**, aplicant la mateixa nota a cadascun sense ponderar-la ni
   repartir-la (no és una mitjana ni un repartiment per pesos, és una
   assignació idèntica i directa a cada RA inclòs).
5. **Alumnes repetidors gestionats manualment pel docent**: en lloc de
   requerir una identitat persistent d'alumne entre cursos acadèmics
   (NIA/DNI), el docent marca explícitament la matrícula com a
   repetidora i hi introdueix el `baseline` heretat. És una solució
   deliberadament manual, auditable i sense dependències tècniques
   noves.

## 5. Canvis de model de dades proposats

| Entitat | Canvi | Detall |
|---|---|---|
| `Activity` | + `session: "ordinaria" \| "extraordinaria"` | Migració: totes les activitats existents → `"ordinaria"` (comportament actual intacte). |
| `Activity` | + `recoversRaIds: Id[]` | Només amb contingut quan `session === "extraordinaria"`. Llista buida o absent en activitats ordinàries. |
| `Enrollment` | + `convocatoria: {isRepeater: boolean; baseline: number; extraordinariaPresented: boolean \| null}` | `isRepeater`: marca manual quan la matrícula és una repetició del mòdul (per defecte `false`). `baseline`: convocatòries ja exhaurides en cursos anteriors (0-3), només rellevant/editable quan `isRepeater` és `true`; per defecte `0`. `extraordinariaPresented`: `null` = no aplicable/pendent de decidir, `true`/`false` un cop el docent ho registra. |

No calen canvis a `AssessmentCriterion`, `ActivityCriterionLink` ni
`WorkUnit`: es reutilitzen exactament tal com estan, exclusivament per
a activitats ordinàries.

## 6. Canvis al motor de càlcul

- Generalitzar `activityWeights`/`criterionWeights`/`raWeights` i
  `calculateStudent` perquè operin únicament sobre activitats amb
  `session === "ordinaria"` (canvi **no destructiu**: avui totes hi
  compleixen, així que els informes actuals no varien fins que no
  s'exposi res de nou a la interfície).
- Nova funció `calculateFinalStudent(course, group, enrollmentId)`:
  1. `ordinaria = calculateStudent(...)` (sense canvis).
  2. Per a cada RA actiu **no assolit** a `ordinaria`: cerca l'activitat
     activa de `session === "extraordinaria"` on
     `recoversRaIds.includes(ra.id)` i n'agafa la nota
     (`totalGrade(grade)`) directament, sense cap recàlcul per
     criteris.
  3. Si hi ha nota registrada, substitueix el resultat d'aquell RA
     (nota i assoliment, sense comprovar obligatòries). Si no, es manté
     el resultat d'ordinària.
  4. Recalcula la nota global com a mitjana ponderada dels valors
     finals per RA, usant els mateixos `raWeights` d'ordinària.
  5. Mòdul superat (final) = tots els RA finals assolits.
- Validació a afegir en crear/editar una activitat d'extraordinària:
  **cap RA pot aparèixer a `recoversRaIds` de més d'una activitat
  d'extraordinària activa alhora** (evita que dues recuperacions
  competeixin pel mateix RA).
- Noves funcions derivades (sense estat mutable ni accions de
  tancament — es recalculen sempre a partir de dades ja existents a la
  matrícula):
  - `convocatoriaConsumida(enrollment)` =
    `convocatoria.baseline + 1 + (convocatoria.extraordinariaPresented === true ? 1 : 0)`.
  - `convocatoriaExhaurida(enrollment)` =
    `convocatoriaConsumida(enrollment) >= 4`.

## 7. Impacte a la interfície (visió general)

Detall pas a pas al full de ruta (inclosa una correcció de disseny
feta arran de proves reals de l'usuari — veure Fase 2 del full de
ruta), però en resum, l'estat final:

- **Dues pantalles separades i sense ambigüitat entre convocatòries**:
  "Activitats" (ordinària, sense cap noció d'extraordinària) i
  "Activitats extraordinàries" (pantalla nova, rèplica visual de
  l'anterior, amb un editor propi i més simple: Nom, Tipus, Data
  opcional i RA que recupera — sense selector de convocatòria, perquè
  el context de la pantalla ja ho decideix).
- `Grades.tsx`: el desplegable d'activitats agrupa Ordinària/
  Extraordinària; en qualificar una activitat d'extraordinària, la
  llista d'alumnes es filtra **per defecte** a qui necessita recuperar
  algun dels RA d'aquella activitat (amb un enllaç "Mostra tot
  l'alumnat" per veure la resta) — així una mateixa activitat de
  recuperació serveix per a tots els alumnes que la necessiten, sense
  haver-la de crear ni assignar un per un.
- A `Students.tsx` (menú "⋯" de cada alumne): nova acció **"Gestiona
  convocatòria"**, amb la casella "Alumne repetidor" que revela el
  camp `baseline`.
- Pantalla "Extraordinària" per grup (seguiment, no creació): alumnes
  amb mòdul no superat a l'ordinària, RA pendents amb accés directe a
  qualificar-los (o avís si encara no hi ha activitat de recuperació),
  camp `extraordinariaPresented`, resolució final en viu, i el total
  de convocatòria consumida (derivat) amb avís quan arriba a 4.
- `StudentReport`/`GroupReport`: vista de resolució final i
  estadístiques de convocatòria (aprovats ordinària vs. finals,
  alumnes que exhaureixen convocatòries).
- Exportació/acta amb el total de convocatòria consumida i resultat
  final.

## 8. Continuïtat entre cursos acadèmics (repetidors)

El buit #2 (no hi ha identitat persistent d'alumne entre
`AcademicCourse` de diferents anys) **no cal resoldre'l tècnicament**:
en comptes d'un identificador estable (NIA/DNI) i un aparellament
automàtic entre cursos, la solució adoptada és que **el docent fa de
pont manualment**, ja que és qui reconeix l'alumne repetidor pel nom:

1. En una matrícula nova, marca `convocatoria.isRepeater = true`.
2. Introdueix `convocatoria.baseline` amb el nombre de convocatòries
   que l'alumne ja tenia exhaurides (consultant el curs anterior, fins
   i tot dins la mateixa aplicació si ja hi constava).
3. A partir d'aquí, `convocatoriaConsumida`/`convocatoriaExhaurida` ja
   compten automàticament l'ordinària d'enguany i, si escau, la
   presentació a l'extraordinària.

Aquesta solució és deliberadament manual i auditable: no introdueix
cap dependència tècnica nova (identificadors d'alumne, aparellament
entre cursos), i és coherent amb com ja es gestionen altres fets
administratius a l'aplicació (per exemple, "Registrar baixa formal").

Queda com a possible millora **futura i opcional, de baixa prioritat**
(no bloqueja cap fase): detectar automàticament possibles repetidors
suggerint-ho quan un nom coincideix amb un alumne d'un curs anterior
del mateix cicle, sense necessitat que sigui el docent qui ho recordi
sempre. No forma part d'aquest full de ruta.
