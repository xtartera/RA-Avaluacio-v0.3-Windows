# Prompt mestre — Pantalla «Anàlisi de l'alumne» de Tarty

## 1. Rol

Actua com a **dissenyador UX/UI i desenvolupador frontend sènior** especialitzat en aplicacions educatives d'avaluació, seguiment per Resultats d'Aprenentatge (RA) i Criteris d'Avaluació (CA), analítica educativa i informes individuals.

Has d'integrar dins de l'aplicació existent una nova pantalla anomenada:

# «Anàlisi de l'alumne»

Aquesta pantalla ha de ser la versió individual de la pantalla «Anàlisi del grup» i ha de conservar **el mateix llenguatge visual, navegació, estil de targetes, colors, densitat informativa i criteris UX/UI**.

L'objectiu és que el professor pugui entendre en pocs segons:

- quin és l'estat acadèmic actual de l'alumne;
- com està evolucionant;
- quins RA té consolidats;
- quins RA estan en risc;
- quins CA concrets expliquen les dificultats;
- com rendeix segons el tipus d'activitat;
- si existeixen diferències rellevants entre el treball de projecte i la validació individual;
- quina cobertura real d'evidències existeix;
- quines accions docents poden ser prioritàries;
- i generar, a partir de les mateixes dades, un informe individual imprimible.

---

# 2. Referència visual obligatòria

Utilitza com a referència visual principal la imatge adjunta:

`mockup_analisi_alumne_Tarty.png`

Si el fitxer `.md` i la imatge estan a la mateixa carpeta, la referència és:

![Mockup de referència — Anàlisi de l'alumne](mockup_analisi_alumne_Tarty.png)

La implementació ha d'aproximar-se molt al mockup quant a:

- barra lateral;
- capçalera;
- selectors;
- pestanyes;
- targetes KPI;
- distribució dels panells;
- colors pastel;
- tipus de gràfics;
- taules;
- jerarquia;
- marges;
- cantonades;
- estil dels avisos;
- targetes de diagnosi;
- fortaleses;
- aspectes a reforçar;
- accions suggerides.

No cal una còpia píxel a píxel, però sí una reproducció molt fidel de la **sensació visual global**.

## Estil visual

La pantalla ha de ser:

- clara;
- moderna;
- professional;
- compacta;
- visualment amable;
- orientada a professorat;
- fàcil d'interpretar ràpidament.

Preferències:

- fons principal gris/blau molt clar;
- targetes blanques o pastel molt suau;
- sidebar blau marí/fosc;
- blau com a color principal d'interacció;
- verd per assoliment o evolució favorable;
- vermell suau per risc;
- ambre per advertiments;
- tipografia sans-serif moderna;
- cantonades arrodonides;
- ombres molt subtils;
- icones simples i coherents;
- bona densitat d'informació sense sensació de saturació.

Evitar:

- gradients agressius;
- efectes 3D;
- ombres fortes;
- fons foscos a la zona principal;
- gràfics decoratius;
- targetes excessivament grans;
- animacions que distreguin;
- interfícies amb aspecte de videojoc;
- excés de colors.

---

# 3. Integració amb el projecte existent

ABANS DE PROGRAMAR:

1. Analitza l'estructura actual del projecte.
2. Identifica:
   - framework;
   - routing;
   - components existents;
   - sistema d'estils;
   - models de dades;
   - serveis;
   - motor de càlcul;
   - importació Excel;
   - estructura RA/CA;
   - model d'alumnes, activitats, grups i notes;
   - pantalles ja existents.
3. Reutilitza components i patrons quan sigui possible.
4. No dupliquis càlculs.
5. Mantén separats:
   - dades;
   - serveis/càlculs;
   - presentació.
6. No modifiquis funcionalitats existents sense necessitat.

---

# 4. Norma de treball: fer preguntes durant el desplegament

Aquesta instrucció és IMPORTANT.

No assumeixis silenciosament decisions funcionals quan existeixin diverses opcions plausibles.

Durant el desenvolupament, **atura't en punts de decisió rellevants i formula preguntes concretes al professor/desenvolupador** abans de continuar.

No facis vint preguntes al principi. Treballa per fases.

## Checkpoints obligatoris

### Checkpoint 1 — després d'analitzar el projecte
Pregunta, si no es pot deduir amb seguretat:

- d'on surt la nota projectada actual;
- com es representen els no lliurats;
- com es diferencia «no presentat» de «0»;
- quins llindars defineixen risc, zona límit i excel·lència;
- si els RA no avaluats s'han de mostrar com a «pendent» o «sense evidències».

Espera resposta abans de codificar regles que afectin aquests conceptes.

### Checkpoint 2 — abans d'implementar els càlculs analítics
Presenta una llista curta dels càlculs que proposes i pregunta si les fórmules són conformes.

### Checkpoint 3 — quan la maqueta visual amb dades mock estigui operativa
Mostra o descriu la distribució implementada i pregunta:

- si la densitat visual és correcta;
- si les targetes prioritàries són les adequades;
- si alguna informació s'ha de moure, simplificar o ampliar.

### Checkpoint 4 — abans d'afegir diagnosi automàtica
Pregunta quins avisos han de ser només informatius i quins han d'aparèixer com a alertes.

### Checkpoint 5 — abans de generar l'informe individual
Pregunta quins blocs del dashboard han de formar part de l'informe imprimible i si el professor podrà editar el comentari final.

### Checkpoint 6 — abans de donar la funcionalitat per acabada
Fes una revisió funcional i pregunta si es vol:
- afegir;
- eliminar;
- moure;
- renombrar;
- o recalcular
algun indicador.

---

# 5. Navegació principal

La barra lateral esquerra ha de conservar l'estètica del mockup.

Opcions:

- Inici
- Alumnes
- Activitats
- Notes
- Projecció
- Anàlisi del grup
- **Anàlisi de l'alumne**
- Informes
- Configuració

L'opció activa:

**Anàlisi de l'alumne**

ha de destacar amb fons blau, icona clara i text blanc.

---

# 6. Capçalera superior

Mostrar:

**MP04 · Sistemes Operatius en Xarxa**

Subtítol:

**Gestió d'avaluació i seguiment**

Selectors:

- Curs
- Grup
- Alumne

Exemple:

`Curs: 2026/27 | Grup: 2SMX A | Alumne: Pérez García, Alex (A14)`

A la dreta:

- professor/a;
- configuració.

---

# 7. Capçalera individual

Mostrar:

- avatar neutre;
- nom complet;
- identificador intern si existeix;
- grup;
- mòdul;
- última actualització;
- botó **Exportar informe**.

Exemple:

## Pérez García, Alex (A14)

`2SMX A · MP04: Sistemes Operatius en Xarxa`

---

# 8. Pestanyes internes

Crear:

- **Resum**
- Evolució
- RA / CA
- Activitats
- Informe

La vista principal és **Resum**.

La pestanya activa ha de tenir fons blau.

---

# 9. Primera fila — KPI individuals

Crear sis targetes compactes.

## KPI 1 — Nota projectada

Exemple:

**6,72 / 10**

Variació:

`↑ +0,84`

Text auxiliar:

`respecte a l'avaluació anterior`

---

## KPI 2 — Evolució

Exemple:

**+0,84 punts**

Indicador:

`↑ Tendència positiva`

Aquest indicador ha de basar-se en snapshots històrics, no només en la nota actual.

---

## KPI 3 — RA assolits

Exemple:

**3 de 5**

Text:

`RA avaluats`

i:

`60 % dels RA avaluats`

IMPORTANT: no comptar RA sense evidències com a suspesos.

---

## KPI 4 — RA en risc

Exemple:

**1**

Subtext:

`RA3`

Indicació:

`Requereix atenció`

Llindar configurable; inicialment un RA en risc és un RA amb nota projectada <5, sempre que tingui prou cobertura per ser interpretat.

---

## KPI 5 — Lliuraments

Exemple:

**94 %**

`47 de 50 activitats`

Variació:

`↑ +4 pp`

Separar sempre:

- activitat lliurada;
- no lliurada;
- no presentada;
- no avaluable, si existeix.

---

## KPI 6 — Cobertura avaluada

Exemple:

**46 %**

Text:

`del pes total del mòdul`

Aquesta dada ha de matisar totes les projeccions.

---

# 10. Segona fila — evolució, situació i tipologia

## 10.1 Evolució de la nota projectada

Gràfic de línies.

Eix X:

- inici;
- UT1;
- UT2;
- UT3;
- actual;

o punts temporals reals segons snapshots.

Mostrar dues línies:

- alumne;
- mitjana del grup.

Exemple:

Alumne:
5,1 → 5,6 → 6,0 → 6,5 → 6,72

Grup:
4,8 → 5,5 → 5,9 → 6,3 → 6,4

La línia de l'alumne ha de ser visualment principal.

La del grup és context, no classificació.

No mostrar rànquings de l'alumne dins del grup per defecte.

---

## 10.2 Situació actual per trams

Crear una barra visual de 0 a 10:

- 0–2
- 2–4
- 4–5
- 5–6
- 6–8
- 8–10

Mostrar un marcador a la nota actual.

Exemple:

**6,72**

Sota:

**Situació: assoliment satisfactori**

**Tendència: positiva ↑**

Els noms dels trams han de poder configurar-se.

---

## 10.3 Rendiment per tipologia d'activitat

Mostrar barres horitzontals.

Tipologies suggerides:

- Speedruns
- Projectes guiats
- Projectes integradors
- Síntesis teòriques
- Síntesis pràctiques

Per cada tipus:

- mitjana;
- nombre d'activitats disponibles.

Exemple:

- Speedruns — 7,6
- Projectes guiats — 7,3
- Projecte integrador — 6,8
- Síntesis teòriques — 5,4
- Síntesis pràctiques — 5,6

---

# 11. Càlculs de la pantalla

## 11.1 Nota projectada individual

Ha de reutilitzar EXACTAMENT el motor de projecció existent de l'aplicació.

No crear una segona fórmula.

Concepte:

**nota calculada amb les evidències que ja haurien d'estar disponibles fins al punt de tall seleccionat.**

Si el motor treballa per RA i CA, respectar la seva jerarquia.

---

## 11.2 Evolució de la nota

Fórmula base:

`Evolució = nota projectada actual − nota projectada al punt de comparació`

El punt de comparació pot ser:

- activitat anterior;
- snapshot anterior;
- inici UT;
- inici curs.

Per defecte: snapshot anterior significatiu.

---

## 11.3 Taxa de lliurament

`Taxa de lliurament = activitats lliurades / activitats exigibles × 100`

No incloure activitats que encara no tocava lliurar.

---

## 11.4 RA assolits

Un RA compta com a assolit provisionalment si:

- disposa d'evidències suficients per calcular-se;
- nota projectada RA ≥5.

Si el model estableix requisits addicionals de validació individual, reflectir-los.

Per exemple:

- `Assolit`
- `Nota ≥5 però pendent de validació`
- `En risc`
- `Pendent / sense evidències`

---

## 11.5 RA en risc

Regla inicial:

`nota RA <5`

però només si existeix una cobertura mínima interpretable.

Fer la cobertura mínima configurable.

No etiquetar com a «en risc» un RA que pràcticament encara no s'ha començat a avaluar.

---

# 12. Tercera fila — RA, CA i activitats

## 12.1 Taula de Resultats d'Aprenentatge

Columnes:

| RA | Descripció | Nota alumne | Nota grup | Cobertura | Tendència |

Exemple:

| RA1 | Administrar dominis Windows | 7,8 | 7,1 | 100 % | ↑ |
| RA2 | Serveis de directori Linux | 6,9 | 6,4 | 85 % | ↑ |
| RA3 | Gestió d'usuaris i permisos | 4,6 | 5,3 | 70 % | ↓ |
| RA4 | Recursos i serveis compartits | 6,4 | 6,8 | 40 % | → |
| RA5 | Seguretat i alta disponibilitat | 5,8 | 5,7 | 35 % | ↑ |
| RA6 | Entorns heterogenis | — | — | 0 % | Pendent |

La nota del grup és contextual.

Ressaltar:

- verd: consolidat;
- ambre: franja límit;
- vermell suau: risc;
- gris: pendent.

---

## 12.2 Detall dels CA del RA seleccionat

Quan es selecciona un RA, mostrar els CA.

Columnes:

| CA | Descripció | Nota alumne | Nota grup | Tendència |

Exemple RA3:

- CA3.1 — 6,2
- CA3.2 — 4,8
- CA3.4 — 3,7
- CA3.5 — 5,1
- CA3.8 — 4,5

Ordenació inicial:
del CA amb menor assoliment al major.

Permetre clicar el CA per veure:

- activitats que aporten evidència;
- pes;
- nota;
- data;
- evolució;
- observacions si existeixen.

---

## 12.3 Últimes activitats

Taula:

| Activitat | Data | Nota | Nota grup |

Mostrar només activitats realitzades o qualificades.

Incloure accés a:

**Veure totes les activitats**

---

# 13. Indicador especial — diferència entre projectes i validació individual

Aquest indicador és pedagògicament important.

Cal calcular, quan hi hagi dades suficients:

`Bretxa de transferència = mitjana activitats de projecte − mitjana activitats individuals de síntesi`

Exemple:

Projectes:
**7,4**

Síntesis:
**5,6**

Bretxa:
**1,8 punts**

IMPORTANT:

Aquesta diferència NO s'ha d'interpretar automàticament com:

- frau;
- ús d'IA;
- còpia;
- falta d'autoria.

La pantalla només pot indicar:

> «El rendiment en síntesis individuals és 1,8 punts inferior al rendiment en activitats de projecte.»

I, si supera un llindar configurable:

> «Es recomana revisar la consolidació individual dels aprenentatges.»

El professor decideix la interpretació.

---

# 14. Diagnosi automàtica

Crear una targeta blau clar.

La diagnosi ha de basar-se en regles transparents.

Exemples:

- «La nota projectada ha augmentat +0,84 punts.»
- «RA1 i RA2 estan consolidats.»
- «RA3 presenta una nota provisional de 4,6.»
- «CA3.4 és el criteri amb menor assoliment (3,7).»
- «El rendiment en síntesis individuals és 1,8 punts inferior al dels projectes.»
- «S'ha avaluat el 46 % del pes del mòdul; la projecció encara és provisional.»
- «El percentatge de lliuraments és del 94 %.»

No generar diagnòstics psicològics, personals o motivacionals a partir de les notes.

Descriure **conductes acadèmiques observables i resultats d'avaluació**.

---

# 15. Fortaleses

Targeta verda suau.

Generar màxim 5 punts prioritaris.

Exemple:

- RA1 consolidat (7,8).
- Bona evolució global (+0,84).
- Alt percentatge de lliuraments (94 %).
- Bon rendiment en projectes.
- CA2.1 i CA2.3 especialment consolidats.

Només mostrar fortaleses justificades per dades.

---

# 16. Aspectes a reforçar

Targeta ambre suau.

Exemple:

- RA3 en risc (4,6).
- CA3.4 (3,7) i CA3.2 (4,8) per sota del llindar.
- Síntesis individuals per sota dels projectes.
- Cobertura encara parcial (46 %).
- Últimes evidències de RA3 amb tendència negativa.

Evitar llenguatge etiquetador sobre l'alumne.

No dir:

- «és desmotivat»;
- «és poc responsable»;
- «no s'esforça»;

si només disposem de notes i lliuraments.

---

# 17. Accions docents suggerides

Targeta verda clara.

Les accions han de ser concretes i basades en dades.

Exemple:

1. Revisar amb l'alumne CA3.4 i CA3.2.
2. Proposar activitats específiques de reforç.
3. Prioritzar pràctica individual abans de la propera síntesi.
4. Fer seguiment de la següent evidència de RA3.
5. Mantenir el bon nivell de lliuraments.

Incloure sempre:

> «Les dades orienten la presa de decisions, però no substitueixen el criteri docent.»

---

# 18. Comparació alumne-grup

La comparació amb el grup té una funció contextual.

Mostrar:

- nota alumne vs mitjana grup;
- RA alumne vs RA grup;
- CA alumne vs CA grup;
- tipologies d'activitat.

No generar per defecte:

- rànquing;
- percentil;
- posició;
- classificació «millor/pitjor alumne».

Si posteriorment es volen percentils, preguntar abans d'implementar-los.

---

# 19. Cobertura de les dades

Cada RA ha de disposar, si és possible, de:

`Cobertura RA = pes d'evidències ja qualificades / pes total previst del RA × 100`

I globalment:

`Cobertura mòdul = pes ja avaluat / pes total previst × 100`

Això és essencial per diferenciar:

- una nota provisional sòlida;
- una nota provisional basada en poques evidències.

Mostrar avisos quan la cobertura sigui baixa.

---

# 20. Històric i snapshots

Requisit IMPORTANT.

Guardar snapshots de:

- nota projectada global;
- nota projectada per RA;
- cobertura;
- lliuraments;
- situació dels RA;
- resultats CA si és viable.

Cada snapshot ha de tenir:

- data/hora;
- punt temporal;
- curs;
- grup;
- alumne;
- dades calculades.

No dependre exclusivament de recalcular retrospectivament amb l'estat actual.

---

# 21. Filtres

Permetre filtrar:

- curs;
- grup;
- alumne;
- UT;
- RA;
- període;
- punt de tall.

Els filtres han d'afectar coherentment:

- KPI;
- gràfics;
- RA;
- CA;
- activitats;
- diagnosi.

---

# 22. Pestanya «Evolució»

Ha de permetre analitzar:

- evolució global;
- evolució per RA;
- evolució dels RA en risc;
- canvi en lliuraments;
- canvi en cobertura.

Evitar gràfics redundants.

---

# 23. Pestanya «RA / CA»

Pantalla de detall curricular.

Flux:

**RA → CA → Activitats → Evidències**

El professor ha de poder entendre exactament d'on surt una nota.

Mostrar:

- pes;
- notes;
- activitat;
- data;
- instrument;
- contribució.

Aquesta pantalla ha de reforçar la traçabilitat.

---

# 24. Pestanya «Activitats»

Permetre:

- llista cronològica;
- filtre per tipologia;
- filtre UT;
- nota;
- mitjana grup;
- estat de lliurament;
- RA vinculats;
- CA vinculats.

Tipologies:

- speedrun;
- quadern pràctic;
- projecte guiat;
- projecte integrador;
- síntesi teòrica;
- síntesi pràctica;
- altres.

---

# 25. Pestanya «Informe»

La pantalla ha de poder alimentar el futur informe imprimible individual.

Incloure com a mínim:

- alumne;
- grup;
- data;
- nota projectada o final;
- cobertura;
- evolució;
- RA;
- fortaleses;
- aspectes a reforçar;
- comentari docent;
- missatge final segons tram, si el projecte ja contempla aquesta funcionalitat.

Abans d'implementar l'informe, fer el **Checkpoint 5** i preguntar quins elements s'hi volen incloure.

---

# 26. Escenaris de projecció

Afegir només si encaixa amb el motor existent.

Permetre calcular:

### Escenari manteniment
Si l'alumne manté el rendiment actual.

### Objectiu de nota
Exemple:

> «Per arribar a 7,0 necessita aproximadament una mitjana de 7,24 en el pes pendent.»

Fórmula conceptual:

Si:

- `Qactual_acumulada` = contribució ja consolidada;
- `Ppendent` = pes pendent;
- `Qobjectiu` = nota final desitjada;

aleshores:

`Nota necessària pendent = (Qobjectiu − contribució acumulada) / Ppendent`

Adaptar-la a la fórmula real del motor per RA.

No mostrar probabilitats d'aprovar si no existeix un model estadístic validat.

---

# 27. Dades mock inicials

Per construir la UI, utilitzar:

Alumne:
**Pérez García, Alex (A14)**

Grup:
**2SMX A**

Nota projectada:
**6,72**

Evolució:
**+0,84**

RA assolits:
**3 de 5 avaluats**

RA en risc:
**RA3**

Lliuraments:
**94 %**

Cobertura:
**46 %**

RA:

- RA1: alumne 7,8 / grup 7,1 / cobertura 100 %
- RA2: alumne 6,9 / grup 6,4 / cobertura 85 %
- RA3: alumne 4,6 / grup 5,3 / cobertura 70 %
- RA4: alumne 6,4 / grup 6,8 / cobertura 40 %
- RA5: alumne 5,8 / grup 5,7 / cobertura 35 %
- RA6: pendent / cobertura 0 %

CA de RA3:

- CA3.1: 6,2
- CA3.2: 4,8
- CA3.4: 3,7
- CA3.5: 5,1
- CA3.8: 4,5

Rendiment per tipologia:

- Speedruns: 7,6
- Projectes guiats: 7,3
- Projectes integradors: 6,8
- Síntesis teòriques: 5,4
- Síntesis pràctiques: 5,6

Aquestes dades són només per maquetació.

---

# 28. Arquitectura de càlcul

Crear o reutilitzar serveis específics.

Exemples conceptuals:

- `StudentAnalyticsService`
- `ProjectionService`
- `RaCalculationService`
- `CaCalculationService`
- `TrendService`
- `CoverageService`
- `DeliveryStatsService`
- `StudentDiagnosisService`

Els noms són orientatius.

No posar fórmules dins dels components visuals.

---

# 29. Components visuals suggerits

Components reutilitzables:

- `StudentHeader`
- `KpiCard`
- `ProjectedGradeCard`
- `TrendCard`
- `RaStatusCard`
- `CoverageCard`
- `StudentTrendChart`
- `GradeBand`
- `ActivityTypePerformance`
- `RaAchievementTable`
- `CaDetailTable`
- `RecentActivitiesTable`
- `AutomaticDiagnosis`
- `StrengthsCard`
- `AreasToImproveCard`
- `SuggestedActionsCard`

Reutilitzar components de la pantalla «Anàlisi del grup» quan sigui possible.

---

# 30. Responsive

Prioritat: desktop.

A 1920×1080:

- mostrar el dashboard en estructura compacta similar al mockup.

A 1366×768:

- mantenir KPI visibles;
- permetre scroll vertical;
- evitar text microscòpic.

En pantalles petites:

- apilar targetes;
- sidebar col·lapsable;
- taules amb scroll;
- gràfics a amplada completa.

---

# 31. Accessibilitat

- contrast suficient;
- focus visible;
- navegació amb teclat;
- etiquetes accessibles;
- no dependre només del color;
- acompanyar verd/vermell amb icones i text;
- tooltips per explicar fórmules;
- evitar fonts massa petites.

---

# 32. Tooltips

Cada indicador ha de poder explicar-se.

Exemple Nota projectada:

> «Estimació de la qualificació amb les evidències disponibles fins al punt de tall seleccionat.»

Cobertura:

> «Percentatge del pes total d'avaluació del qual ja existeixen evidències qualificades.»

RA en risc:

> «RA amb evidències suficients i qualificació projectada inferior al llindar d'assoliment.»

---

# 33. Casos especials

Gestionar explícitament:

### Alumne sense notes
Mostrar:

**Encara no hi ha evidències suficients.**

No mostrar 0.

### RA no iniciat
Mostrar:

**Pendent**

### Activitat no lliurada
No confondre automàticament amb 0, excepte si aquesta és la regla configurada pel sistema.

### Alumne amb baixa cobertura
Mostrar avís:

**Projecció provisional — cobertura insuficient per extreure conclusions sòlides.**

### Activitats futures
No incloure-les en la taxa de lliurament.

---

# 34. Criteri de qualitat del dashboard

La pantalla està correctament implementada si en menys de 10 segons el professor pot respondre:

1. Quina nota projectada té l'alumne?
2. Millora o empitjora?
3. Quins RA té consolidats?
4. Quin RA necessita més atenció?
5. Quin CA explica la dificultat?
6. Té problemes de lliurament?
7. Els projectes i les síntesis mostren un rendiment semblant?
8. Quanta evidència tenim?
9. Què convé revisar a continuació?

---

# 35. Ordre de desplegament

Treballa per fases.

## Fase 1
Analitza projecte + Checkpoint 1.

## Fase 2
Defineix model analític + Checkpoint 2.

## Fase 3
Implementa pantalla Resum amb dades mock.

Ha d'aproximar-se visualment al mockup.

## Fase 4
Checkpoint 3: revisió visual.

## Fase 5
Connecta dades reals.

## Fase 6
Implementa RA/CA i traçabilitat.

## Fase 7
Implementa evolució i snapshots.

## Fase 8
Implementa diagnosi + Checkpoint 4.

## Fase 9
Implementa pestanya Informe + Checkpoint 5.

## Fase 10
QA final + Checkpoint 6.

---

# 36. Resultat esperat

El resultat ha de semblar una pantalla madura d'una aplicació real de seguiment docent.

No ha de ser una simple fitxa de notes.

Ha de convertir:

**notes → evidències → RA/CA → evolució → diagnosi → decisió docent**

La interfície ha de conservar una coherència visual molt alta amb la pantalla «Anàlisi del grup» i amb el mockup adjunt.

La prioritat final és:

**claredat + traçabilitat + evolució + utilitat docent.**
