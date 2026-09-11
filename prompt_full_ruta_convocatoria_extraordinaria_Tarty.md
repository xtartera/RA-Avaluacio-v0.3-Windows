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

## FASE 2 — Entrada de dades (interfície) · Pendent

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

- [ ] Es pot crear una activitat d'extraordinària vinculada a un o més
      RA i qualificar-la des de `Grades.tsx` amb normalitat.
- [ ] Es pot marcar un alumne com a repetidor des de `Students.tsx` i
      introduir-hi el `baseline`; es pot desmarcar sense perdre altres
      dades de la matrícula.
- [ ] La nova pantalla/secció mostra correctament els alumnes bloquejats
      a l'ordinària, el seu `baseline` si són repetidors, i permet
      editar `extraordinariaPresented`.
- [ ] Un alumne repetidor amb `baseline: 2` que es presenta a
      l'extraordinària apareix marcat amb l'avís d'exhauriment
      (`convocatoriaConsumida = 4`).
- [ ] El resultat final mostrat coincideix amb el que calcula
      `calculateFinalStudent` (validar-ho manualment amb un cas de SOX).
- [ ] `npm test` i `npx tsc --noEmit` sense errors.

------------------------------------------------------------------------

## FASE 3 — Informes i acta · Pendent

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

- [ ] Els informes existents no es trenquen ni canvien de comportament
      quan no hi ha cap activitat d'extraordinària (compatibilitat amb
      cursos que no la fan servir).
- [ ] Amb dades reals de SOX amb algun cas de recuperació, l'informe
      individual i el de grup reflecteixen correctament el resultat
      final.
- [ ] `npm test` i `npx tsc --noEmit` sense errors.

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

**Cap fase iniciada.** Aquest document és el punt de partida acordat
amb el professor (curs pilot: SOX 2025-2026) abans de començar la
implementació de la Fase 1.
