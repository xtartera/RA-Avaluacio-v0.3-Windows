# Prompt mestre --- Revisió i millores del motor de càlcul de Tarty

## 1. Rol i objectiu

Actua com a **desenvolupador TypeScript sènior**, especialitzat en lògica de
negoci i en refactoritzacions segures amb tests.

Aquest prompt **no és per construir cap pantalla nova**. És per revisar i
corregir el **motor de càlcul de notes** (`src/model/calculation.ts` i els
fitxers que en depenen) d'acord amb una llista de troballes concretes
detectades en una revisió prèvia del codi. Cada troballa inclou on està el
codi, per què és un problema (real o potencial) i què cal decidir o fer.

**Principi general, no negociable:** cap canvi d'aquest prompt pot alterar
silenciosament una nota ja calculada sense que quedi clar per què. Quan una
troballa impliqui triar entre diversos comportaments possibles, **para't i
demana confirmació explícita al professor abans d'aplicar-la**, en lloc de
decidir-ho tu mateix. Aquest projecte ja té una suite de tests
(`tests/*.test.ts`, executable amb `npm test`) que cobreix `calculation.ts`,
`importers.ts`, `database.ts`, `studentRoster.ts` i `tableWorkflow.ts`:
**cap canvi es dona per bo si `npm test` no passa abans i després.**

------------------------------------------------------------------------

# 2. Context tècnic (verifica-ho contra el codi real abans de tocar res)

- El motor de càlcul viu a `src/model/calculation.ts` i treballa sobre els
  tipus de `src/model/domain.ts`. El consumeixen, entre d'altres:
  `app/lib/studentAnalytics.ts` (pantalla «Anàlisi de l'alumne» i informe
  individual), `app/lib/groupAnalytics.ts` (pantalla «Anàlisi del grup»),
  `app/screens/StudentReport.tsx`, `app/screens/Config.tsx` (previsualització
  d'impacte de canvis de pesos).
- No hi ha backend: tot es calcula al client, en cada render, a partir de
  `AppDatabase`. No hi ha problemes de sincronització entre servidor i
  client a tenir en compte, però sí de **coherència entre pantalles** que
  calculen coses semblants per camins de codi diferents (és el gruix de les
  troballes d'aquest prompt).

------------------------------------------------------------------------

# 3. Troballes detectades (per ordre de prioritat)

## 3.1 🔴 El «Llindar de risc» configurable NO afecta qui es considera «en risc» a Anàlisi del grup

**On:** `app/screens/Config.tsx` (camp "Llindar de risc") diu literalment:
*"Nota global projectada per sota de la qual un alumne es considera 'en
risc' a la pantalla d'Anàlisi del grup."* Aquest valor es guarda a
`course.configuration.riskThreshold`.

**Problema:** `riskThreshold` només s'utilitza a `GradeBand`
(`app/components/analysis.tsx`), que es fa servir a «Anàlisi de l'alumne» i
a l'informe individual per triar el text "Situació crítica". **La pantalla
«Anàlisi del grup» no el consumeix mai.** El seu KPI "En risc"
(`app/lib/groupAnalytics.ts`, funció `summarizeGroup`) fa servir una regla
totalment diferent i no configurable: alumnes amb **2 o més RA marcats com
a "no assolit"**, sense mirar la nota global ni `riskThreshold` per a res.
(Aquesta regla, curiosament, sí que és fidel al que diu el `hint` del KPI
a `GroupAnalysis.tsx`: "No mira la mitjana global, sinó el nombre de RA
suspesos" --- és a dir, el codi i el `hint` d'aquell KPI són coherents
entre ells, però **el text de Configuració promet una cosa que no passa**.)

**Cal decidir (pregunta al professor abans de tocar codi):**
- Opció A: corregir el text de Configuració perquè descrigui la regla real
  ("2 o més RA no assolits"), sense tocar cap lògica.
- Opció B: fer que el KPI "En risc" d'Anàlisi del grup faci servir realment
  `riskThreshold` (per exemple, combinant-lo amb la regla de RA, o
  substituint-la).
- Opció C: mantenir totes dues definicions de "risc" però renombrar-les de
  manera inequívoca a la interfície (per exemple "En risc (per RA)" vs.
  "Situació crítica (per nota global)") perquè no semblin el mateix
  concepte.

No apliquis cap opció sense triar-ne una explícitament amb el professor.

------------------------------------------------------------------------

## 3.2 🟠 La regla "RA no assolit" es reimplementa, a mà, en almenys 5 llocs

**On:**
- `src/model/calculation.ts` --- `calculateStudent` calcula `score` i
  `failingActivities` per cada RA, però no un booleà/estat final.
- `app/lib/studentAnalytics.ts` línia ~69: `status = !hasEvidence ?
  "pendent" : score! >= 5 && failing === 0 ? "assolit" : "risc"`.
- `app/lib/groupAnalytics.ts` línia ~39: `if (!(entry.score >= 5 &&
  entry.failingActivities === 0)) failed++;`
- `app/lib/groupAnalytics.ts` línia ~142 (una altra vegada, dins
  `raRows`): `passed = ... scores.filter((s, i) => s >= 5 && failing[i]
  === 0)`.
- `app/screens/StudentReport.tsx`: `blocked = x.failingActivities>0 ||
  x.score<5` (la mateixa condició, negada, escrita per quarta/cinquena
  vegada).

**Problema:** és la mateixa regla de negoci escrita cinc vegades de
maneres lleugerament diferents. Si mai cal ajustar-la (per exemple, si el
llindar `<5` s'hagués de vincular a `requiredActivityMinGrade` en lloc
d'estar fix), caldria trobar i actualitzar les cinc còpies, i és fàcil
deixar-se'n una.

**Acció proposada:** fes que `calculateStudent` (a `calculation.ts`)
retorni, per cada RA dins `learningResults`, un camp explícit calculat una
única vegada, per exemple:

```ts
achieved: boolean // score >= 5 && failingActivities === 0, quan hasEvidence
status: "assolit" | "risc" | "pendent"
```

I substitueix les cinc reimplementacions perquè llegeixin aquest camp en
lloc de recalcular la condició. Cap d'aquests punts hauria de canviar de
comportament amb aquest refactor --- és una consolidació, no un canvi de
regla. Confirma-ho amb els tests existents i, si cal, afegeix-ne un de nou
a `tests/calculation.test.ts` que fixi explícitament aquest contracte.

------------------------------------------------------------------------

## 3.3 🟠 La nota global del mòdul no reflecteix un RA bloquejat ("no assolit")

**On:** `calculateStudent` (`calculation.ts`). `globalScore` és una
mitjana ponderada per cobertura (`effectiveWeight = raWeight * coverage /
100`) que **no consulta `failingActivities` de cap RA**.

**Problema:** un alumne pot tenir un RA marcat "No assolit" (per activitat
obligatòria suspesa) i, tot i així, veure una nota global projectada ≥5 a
`StudentAnalysis`, `Dashboard` o l'informe, sense cap avís que la creui amb
aquest bloqueig. `StudentReport.tsx` amaga la nota d'aquell RA concret
("No assolit", amb un botó per revelar-la), però no toca ni avisa sobre la
nota global.

**Cal decidir (pregunta al professor):**
- Vol que la nota global es vegi acompanyada d'un avís explícit quan hi ha
  algun RA bloquejat ("Nota provisional: 1 RA no assolit per activitat
  obligatòria"), sense canviar el número?
- Vol que la nota global es limiti (per exemple, mai per sobre d'un cert
  valor, o marcada com "no aprovable") quan hi ha algun RA bloquejat?
- O és intencionat que la nota global i l'estat "assolit/no assolit" per RA
  siguin coses independents, i només cal deixar-ho més clar visualment?

Documenta la decisió presa als comentaris del codi perquè no es torni a
qüestionar en una futura revisió.

------------------------------------------------------------------------

## 3.4 🟡 El llindar "una activitat compta quan té ≥5 notes" està triplicat i no és configurable

**On:** el número `5` apareix, cada vegada escrit a mà i sense cap
constant compartida, a:
- `src/model/calculation.ts`, `activityIsEvaluated`: `completed >= 5`.
- `app/lib/helpers.ts`, `syncState`: `g.grades.filter(...).length>=5`.
- `src/controllers/importers.ts`, dins `importEvaluationWorkbook`:
  `count >= 5 ? nowIso() : null`.

**Problema:** és el mateix llindar de negoci escrit tres vegades. A més, a
diferència d'altres llindars similars (arrodoniment, nota mínima
obligatòria, llindar de risc), aquest **no té cap camp a Configuració**: un
professor amb un grup petit no pot ajustar-lo si mai calgués.

**Acció proposada:** extreu una única constant (per exemple
`AUTO_EVALUATE_MIN_GRADES = 5`) a `calculation.ts` o `domain.ts`, i
reutilitza-la als tres llocs. Pregunta al professor si vol que, a més,
aquest valor sigui configurable des de «Configuració» (seguint el mateix
patró que `requiredActivityMinGrade` o `riskThreshold`) o si prefereix
mantenir-lo fix però centralitzat en una sola constant.

------------------------------------------------------------------------

## 3.5 🟡 Límit de "màxim 3 alumnes bonificats per activitat" fix al codi

**On:** `app/screens/Grades.tsx`, funció `addBonus`: `if (!recipients.has
(bonus.eid) && recipients.size>=3) return msg("Ja hi ha tres alumnes
bonificats en aquesta activitat i grup.")`.

**Observació:** aquest límit només s'aplica a bonificacions afegides
**manualment** des de la pantalla de Notes. Les bonificacions importades
des de l'Excel (`historicalException: true`, a `importers.ts`) no hi
passen mai, cosa que sembla intencionada (es tracten com a "excepció
històrica" prèvia a l'aplicació d'aquesta regla), però un cop una
activitat ja té 3 o més bonificacions importades, el recompte
`recipients.size>=3` bloqueja qualsevol bonificació manual addicional en
aquella activitat --- que probablement és el comportament volgut, però
val la pena confirmar-ho explícitament amb el professor abans de tocar
res aquí, i **no traguis aquest límit ni el canviïs sense confirmació**,
ja que sembla una norma pedagògica deliberada, no un descuit.

------------------------------------------------------------------------

## 3.6 🟡 Un RA o CA sense cap activitat vinculada queda amb pes 0% de manera silenciosa

**On:** `criterionWeights` i `raWeights` a `calculation.ts`: si un CA no té
cap `ActivityCriterionLink`, el seu pes calculat és `0`, indistingible
d'un CA que sí que té activitats vinculades però encara no avaluades.

**Problema:** si un professor crea un RA i els seus CA però s'oblida de
vincular-los a cap activitat (a `Activities.tsx` / `Grades.tsx`), aquell
RA queda comptant amb pes 0% a la nota global, **sense cap avís** que ho
distingeixi de "encara no hi ha prou evidències". És un error de
configuració silenciós i fàcil de no detectar.

**Acció proposada:** afegeix una detecció (per exemple a `Config.tsx` o a
un nou avís a la pantalla «RA i CA») que assenyali els RA o CA actius amb
zero vincles a activitats, diferenciant-ho clarament de "cobertura 0% però
ben configurat". No cal canviar cap càlcul, només fer visible una
configuració incompleta.

------------------------------------------------------------------------

## 3.7 🟢 "Taxa de lliurament" inclou "No presentat" com a lliurament (probablement correcte, però revisa l'etiqueta)

**On:** `deliveryRate` (`calculation.ts`) i `deliveryPct`
(`studentAnalytics.ts`) compten `grade.status !== "pending"` com a
"lliurat", cosa que inclou `"not_presented"`. Això és coherent amb la
resta de l'app --- el peu de la taula de Notes ja avisa "No presentat
computa com a 0" --- així que **no sembla un error de càlcul**. Revisa
només que els textos de diagnosi ("El percentatge de lliuraments és del
X%...") a `groupAnalytics.ts` i `studentAnalytics.ts` no indueixin a
pensar que "lliurament" vol dir "entregat pel alumne", quan en realitat
també inclou "constatat com a no presentat". Si cal, aclareix la
redacció, sense tocar el càlcul.

------------------------------------------------------------------------

## 3.8 🟢 Importador d'Excel molt lligat a una plantilla concreta

**On:** `src/controllers/importers.ts`, `importEvaluationWorkbook`. Espera
exactament 6 RA i 48 CA (avisa si no hi són), fulls amb noms fixos
("TRAZABILIDAD", "PONDERACION", "INSTRUMENTOS"...) i rangs de cel·la
fixos (per exemple `B${3 + (raNumber-1)*20}`, columnes 5 a 65...).

**Observació, no necessàriament una acció:** és normal que estigui
construït així si només s'utilitza amb una plantilla concreta d'aquest
mòdul. No ho toquis llevat que el professor confirmi que vol reutilitzar
aquest importador amb altres mòduls o plantilles amb un nombre diferent de
RA/CA --- en aquest cas, els rangs fixos i el recompte "6 RA i 48 CA"
haurien de fer-se dinàmics.

També fixa't en `importedBonuses`: reconstrueix la nota base i les
bonificacions a partir d'una anàlisi per expressió regular de tots els
números presents a la fórmula de la cel·la de l'Excel. És una heurística
i pot fallar en fórmules poc habituals. No cal "arreglar-ho" sense un cas
real que ho justifiqui, però sí val la pena afegir un avís (`warnings`)
quan la descomposició sigui ambigua (per exemple, més de 2 números trobats
i que no quadrin com a base + increments de 0,5/1).

------------------------------------------------------------------------

## 3.9 🟢 Detall de codi menor (cosmètic, sense impacte funcional)

`groupCoursesByCicle` (`domain.ts`) fa servir
`groups.get(key) ?? groups.set(key, []).get(key)!`, que funciona (perquè
`Map.prototype.set` retorna el mateix `Map`) però és difícil de llegir i
fràgil davant un refactor descuidat. Simplifica-ho a:

```ts
if (!groups.has(key)) groups.set(key, []);
groups.get(key)!.push(c);
```

------------------------------------------------------------------------

# 4. Ordre de treball recomanat

1. Executa `npm test` abans de tocar res i confirma que tot passa (línia
   de base).
2. Resol primer **3.1** (és una simple correcció de coherència entre text
   i comportament: no toca cap càlcul, només cal decidir amb el professor
   quina de les 3 opcions aplicar).
3. Resol **3.2** (consolidar la regla "RA no assolit" en un sol lloc):
   fes-ho com un refactor pur, sense canviar cap resultat numèric ni
   visual existent. Verifica-ho amb `npm test` i comprovant a ull les
   pantalles que en depenen (Anàlisi del grup, Anàlisi de l'alumne,
   informe individual).
4. Amb la troballa 3.2 ja resolta, planteja **3.3** al professor (depèn de
   3.2 perquè ara hi ha un únic lloc on decidir com "RA no assolit" afecta
   o no la nota global).
5. Resol **3.4** (constant compartida pel llindar de 5 notes).
6. Comenta la troballa **3.5** al professor abans de tocar res: confirma
   la intenció exacta abans de qualsevol canvi.
7. Implementa l'avís de **3.6** (RA/CA sense vincles).
8. Revisa la redacció de **3.7**.
9. Documenta **3.8** com a limitació coneguda si no cal fer-hi res ara.
10. Aplica el detall cosmètic **3.9** si hi ha temps, com a últim pas de
    neteja.
11. Amplia `tests/calculation.test.ts` (i, si escau,
    `tests/multiModule.test.ts`) amb un cas per a cada canvi de
    comportament real (3.1 si tries l'opció B o C, 3.3 segons la decisió
    presa). Els canvis purament de consolidació (3.2, 3.4, 3.9) no haurien
    de necessitar tests nous perquè no canvien cap resultat.
12. Executa `npm test` una última vegada i confirma que tot continua
    passant.

------------------------------------------------------------------------

# 5. Criteri d'acceptació final

- [ ] `npm test` passa abans i després de cada pas.
- [ ] Cap nota ja calculada canvia de valor tret que el professor ho hagi
      decidit explícitament (troballes 3.1 i 3.3).
- [ ] La regla "RA no assolit" viu en un sol lloc de `calculation.ts` i
      totes les pantalles la llegeixen d'allà.
- [ ] El text de Configuració sobre el "Llindar de risc" descriu fidelment
      el que fa realment el codi.
- [ ] El llindar de "5 notes perquè una activitat compti" existeix en una
      sola constant, reutilitzada a `calculation.ts`, `helpers.ts` i
      `importers.ts`.
- [ ] Hi ha un avís visible per a RA/CA actius sense cap activitat
      vinculada.
- [ ] Cap canvi d'aquest prompt ha tocat l'esquema de `AppDatabase` ni la
      migració (`migrateDatabase`) sense necessitat real.
- [ ] S'ha documentat, als comentaris del codi o en un fitxer a part, cada
      decisió presa sobre les troballes 3.1, 3.3 i 3.5, perquè quedi
      constància del perquè.
