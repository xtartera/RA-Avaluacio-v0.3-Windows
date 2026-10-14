# Com es calculen les notes

Aquest document explica, pas a pas i amb diagrames, com l'aplicació calcula la nota de cada criteri d'avaluació (CA), de cada resultat d'aprenentatge (RA) i la nota global del mòdul. També explica què vol dir "cobertura", quan una activitat es considera avaluada, i com funcionen les unitats de treball (UT) i l'estat "No assolit".

No cal memoritzar-lo: és una referència per consultar quan una nota no surti el que s'esperava.

## 1. La jerarquia de dades

Tot parteix d'un curs acadèmic, que té una **configuració comuna** (compartida pels grups A i B) i, per cada grup, els seus propis **alumnes i notes**.

<svg viewBox="0 0 900 300" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:Inter,system-ui,sans-serif">
<defs><marker id="ahA" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#7d899d"/></marker></defs>
<rect x="330" y="10" width="240" height="46" rx="10" fill="#101c35"/>
<text x="450" y="38" text-anchor="middle" fill="#fff" font-size="15" font-weight="700">Curs acadèmic 2026–2027</text>
<line x1="450" y1="56" x2="450" y2="80" stroke="#7d899d" stroke-width="2"/>
<line x1="220" y1="80" x2="680" y2="80" stroke="#7d899d" stroke-width="2"/>
<line x1="220" y1="80" x2="220" y2="100" stroke="#7d899d" stroke-width="2" marker-end="url(#ahA)"/>
<line x1="680" y1="80" x2="680" y2="100" stroke="#7d899d" stroke-width="2" marker-end="url(#ahA)"/>
<rect x="90" y="100" width="260" height="46" rx="10" fill="#3975e8"/>
<text x="220" y="128" text-anchor="middle" fill="#fff" font-size="14" font-weight="700">Configuració comuna</text>
<rect x="550" y="100" width="260" height="46" rx="10" fill="#795fd7"/>
<text x="680" y="128" text-anchor="middle" fill="#fff" font-size="14" font-weight="700">Grup A · Grup B</text>
<line x1="150" y1="146" x2="150" y2="170" stroke="#c8d3e6" stroke-width="2" marker-end="url(#ahA)"/>
<line x1="290" y1="146" x2="290" y2="170" stroke="#c8d3e6" stroke-width="2" marker-end="url(#ahA)"/>
<line x1="610" y1="146" x2="610" y2="170" stroke="#c8d3e6" stroke-width="2" marker-end="url(#ahA)"/>
<line x1="750" y1="146" x2="750" y2="170" stroke="#c8d3e6" stroke-width="2" marker-end="url(#ahA)"/>
<rect x="40" y="170" width="220" height="40" rx="9" fill="#fff" stroke="#e4eaf2"/>
<text x="150" y="194" text-anchor="middle" fill="#17233c" font-size="12.5">RA → CA</text>
<rect x="180" y="222" width="220" height="40" rx="9" fill="#fff" stroke="#e4eaf2"/>
<text x="290" y="246" text-anchor="middle" fill="#17233c" font-size="12.5">Tipus → Activitats → CA (%)</text>
<rect x="500" y="170" width="220" height="40" rx="9" fill="#fff" stroke="#e4eaf2"/>
<text x="610" y="194" text-anchor="middle" fill="#17233c" font-size="12.5">Alumnes i matrícules</text>
<rect x="640" y="222" width="220" height="40" rx="9" fill="#fff" stroke="#e4eaf2"/>
<text x="750" y="246" text-anchor="middle" fill="#17233c" font-size="12.5">Notes per activitat</text>
</svg>

- La **configuració comuna** (RA, CA, tipus d'activitat, activitats, relacions i ponderacions) és igual per als dos grups.
- Cada **grup** té la seva pròpia llista d'alumnes i les seves pròpies notes — el mateix RA pot tenir mitjanes diferents al grup A i al grup B.

## 2. La cascada de pesos: d'una activitat a la nota global

Aquest és el nucli del motor de càlcul. Cada activitat "reparteix" el seu pes entre els CA als quals contribueix, i cada CA "reparteix" el seu pes entre els RA. Exemple real amb "Projecte 1" (tipus Speedrun, 17 activitats d'aquest tipus, pes del tipus 20%):

<svg viewBox="0 0 1000 220" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:Inter,system-ui,sans-serif">
<defs><marker id="ahB" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#8390a3"/></marker></defs>
<rect x="10" y="70" width="170" height="70" rx="12" fill="#eef2fb" stroke="#3975e8"/>
<text x="95" y="98" text-anchor="middle" font-size="12.5" fill="#17233c" font-weight="700">Tipus Speedrun</text>
<text x="95" y="116" text-anchor="middle" font-size="12" fill="#3975e8" font-weight="700">pes 20%</text>
<line x1="180" y1="105" x2="222" y2="105" stroke="#8390a3" stroke-width="2" marker-end="url(#ahB)"/>
<text x="201" y="96" text-anchor="middle" font-size="10.5" fill="#7d899d">÷ 17</text>
<rect x="224" y="70" width="170" height="70" rx="12" fill="#eef2fb" stroke="#3975e8"/>
<text x="309" y="94" text-anchor="middle" font-size="12.5" fill="#17233c" font-weight="700">Projecte 1</text>
<text x="309" y="112" text-anchor="middle" font-size="12" fill="#3975e8" font-weight="700">pes activitat 1,18%</text>
<text x="309" y="128" text-anchor="middle" font-size="10" fill="#8390a3">(20% / 17)</text>
<line x1="394" y1="105" x2="436" y2="105" stroke="#8390a3" stroke-width="2" marker-end="url(#ahB)"/>
<text x="415" y="96" text-anchor="middle" font-size="10.5" fill="#7d899d">× 70%</text>
<rect x="438" y="70" width="170" height="70" rx="12" fill="#f3effc" stroke="#795fd7"/>
<text x="523" y="94" text-anchor="middle" font-size="12.5" fill="#17233c" font-weight="700">CA 1.A</text>
<text x="523" y="112" text-anchor="middle" font-size="12" fill="#795fd7" font-weight="700">pes brut 0,82%</text>
<text x="523" y="128" text-anchor="middle" font-size="10" fill="#8390a3">(1,18% × 70%)</text>
<line x1="608" y1="105" x2="650" y2="105" stroke="#8390a3" stroke-width="2" marker-end="url(#ahB)"/>
<text x="629" y="96" text-anchor="middle" font-size="10.5" fill="#7d899d">Σ CA del RA</text>
<rect x="652" y="70" width="160" height="70" rx="12" fill="#f3effc" stroke="#795fd7"/>
<text x="732" y="94" text-anchor="middle" font-size="12.5" fill="#17233c" font-weight="700">RA1</text>
<text x="732" y="112" text-anchor="middle" font-size="12" fill="#795fd7" font-weight="700">pes global 8,0%</text>
<line x1="812" y1="105" x2="854" y2="105" stroke="#8390a3" stroke-width="2" marker-end="url(#ahB)"/>
<text x="833" y="96" text-anchor="middle" font-size="10.5" fill="#7d899d">× cobertura</text>
<rect x="856" y="60" width="134" height="90" rx="12" fill="#101c35"/>
<text x="923" y="96" text-anchor="middle" font-size="12" fill="#fff" font-weight="700">Nota global</text>
<text x="923" y="114" text-anchor="middle" font-size="12" fill="#fff" font-weight="700">del mòdul</text>
</svg>

Els mateixos quatre passos, en fórmules:

```text
pesActivitat        = pesTipus / nombreActivitatsDelTipus
pesBrut(CA,activ.)  = %assignatAlCA × pesActivitat
pesGlobalCA         = Σ pesBrut(CA, cada activitat que hi contribueix)
pesRA               = Σ pesGlobalCA (de tots els CA d'aquell RA)
```

La **nota del CA** és la mitjana ponderada de les activitats **ja avaluades** que hi contribueixen (les que encara no ho estan, simplement no compten — no es tracten com un zero fins que arriben al llindar, vegeu secció 4):

```text
notaCA = Σ [ notaTotalActivitat × pesNormalitzat(CA, activitat) ]
```

La **nota del RA** és la mitjana aritmètica simple dels seus CA (no ponderada — és la decisió presa per mantenir el comportament de l'Excel original):

```text
notaRA = mitjana( notaCA de tots els CA reals del RA )
```

I la **nota global** és la mitjana dels RA, ponderada pel seu pes **i** per quant se n'ha avaluat (vegeu la secció 3):

```text
notaGlobal = Σ [ notaRA × pesRA × (coberturaRA / 100) ] / Σ [ pesRA × (coberturaRA / 100) ]
```

### El mateix càlcul, amb tipus d'activitat molt diferents

L'exemple d'amunt és amb un Speedrun (quadern virtual), que és el cas amb **més activitats repartint-se un pes**: moltes activitats petites, cadascuna amb un pes individual molt baix. Però la fórmula `pesActivitat = pesTipus / nombreActivitatsDelTipus` és exactament la mateixa per a **qualsevol** tipus — el que canvia és **entre quantes activitats es reparteix** el pes del tipus (i, de vegades, també el pes del tipus mateix). Exemple real amb els tipus d'un curs SOX:

| Tipus d'activitat | Pes del tipus | Nre. d'activitats d'aquest tipus | Pes de cada activitat |
|---|---|---|---|
| Speedrun / quadern virtual | 20% | 17 | 20% ÷ 17 ≈ **1,18%** |
| Projecte integrador (PR-Obert) | 20% | 3 | 20% ÷ 3 ≈ **6,67%** |
| Activitat de síntesi / examen (ExTeòric, ExPràctic) | 30% | 4 | 30% ÷ 4 = **7,5%** |

Fixa't que el Speedrun i el Projecte integrador tenen **el mateix pes de tipus (20%)** — la diferència de pes per activitat ve únicament de repartir-lo entre 17 activitats o entre només 3. Els exàmens, a més, tenen un pes de tipus més gran (30%) repartit entre poques activitats (4), de manera que **el pes d'un sol examen (7,5%) és més de 6 vegades el d'un sol speedrun (1,18%)**. Per això:

- **Suspendre una única activitat de síntesi o un projecte integrador té molt més impacte** en la nota del CA/RA que suspendre un sol speedrun — no perquè es tracti diferent al càlcul, sinó perquè arrossega un pes individual molt més gran.
- Si, a més, aquesta activitat de síntesi/examen és **obligatòria** dins d'una UT, també pot bloquejar el RA sencer com a "No assolit" independentment de la mitjana (vegeu la secció 6) — un doble motiu pel qual aquestes activitats solen ser les més determinants del mòdul.
- Cada tipus d'activitat té el seu propi pes i nombre d'activitats configurats a "RA, CA i pesos"; els valors de la taula són només un exemple il·lustratiu, no una regla fixa de l'aplicació.

## 3. Cobertura: per què la nota és "projectada"

La **cobertura** d'un RA és quin percentatge del seu pes ja s'ha avaluat. Un RA amb activitats encara pendents de qualificar té una nota que és només una **projecció**, no la nota final — per això totes les pantalles mostren sempre el `% avaluat` al costat de la nota.

| Cobertura | Què vol dir |
|---|---|
| 0% | Cap activitat d'aquest RA s'ha avaluat encara; la nota mostrada és 0 per defecte. |
| 45% | Només s'ha avaluat una part de les activitats que hi contribueixen; la nota pot canviar molt encara. |
| 100% | Totes les activitats vinculades a aquest RA ja estan avaluades; la nota ja és estable. |

La **cobertura global** del mòdul es calcula igual, però amb el pes de totes les activitats del curs en lloc de només les d'un RA.

### Nota estimada i nota acumulada

A mitjan curs l'aplicació dona dues notes per RA i per al mòdul, que **no són el mateix**:

| | Què és | Com es calcula | Pot pujar i baixar? |
|---|---|---|---|
| **Estimada** (projectada) | Una **projecció**: com acabaria si el que falta anés com el que ja està corregit. | Només compta les activitats ja avaluades; els CA sense cap evidència es deixen fora de la mitjana de l'RA. | Sí, en qualsevol direcció. |
| **Acumulada** | El que l'alumne **ja ha guanyat**. **No és una projecció**: és un **mínim garantit**. | Tot el que no té nota (pendent o no presentat) compta **0**, i tot CA sense evidència compta 0 a la mitjana de l'RA. La nota global és «punts guanyats sobre 10» (cada RA acumulada × el seu pes al mòdul). | Només pot **pujar** a mesura que es corregeix. |

L'acumulada és com ho fa el full d'Excel d'origen (`APRENDIZAJE`): comprovat amb un alumne real, els 6 RA i la nota global coincideixen exactament. Quan tot està corregit (100 %) les dues notes són iguals. L'acumulada mai no supera l'estimada.

On es veuen: al **Mapa d'assoliment dels RA** (Graelles) i al seu informe imprimible, amb el selector **Acumulada / Estimada** (per defecte **Acumulada**, pintada en **verd si és ≥5 i en vermell si és <5**; a mitjan curs, amb poc avaluat, és normal que surti en vermell); a l'informe individual (a cada RA i a la nota global, com «acumulada») i a l'Anàlisi de l'alumne (columna «Acumulada»). Amb la mitjana de RA en mode *ponderat* (Configuració › Motor de càlcul) els CA pesen pel seu pes global; l'Excel d'origen fa la mitjana *simple*.

### RA provisionals: poca evidència no és «no assolit»

La nota d'un RA es calcula **només amb les activitats ja avaluades**. Per això, amb poques activitats avaluades, una sola nota (per exemple, un projecte suspès que pesa un 1,2 % de la nota global) pot decidir gairebé tot el valor de l'RA: un 0 en un projecte pot fer un RA «3,4» amb només un 6 % avaluat.

Per evitar conclusions precipitades, un RA amb menys de la **cobertura mínima** (per defecte un **25 %**, configurable a Configuració) es mostra com a **«Provisional»**:

- no es considera assolit ni no assolit;
- no bloqueja el mòdul ni passa a l'extraordinària, i no compta com a RA en risc;
- l'informe, la graella de RA i l'informe imprimible mostren «Provisional · x % avaluat» i **amaguen la nota estimada per defecte**: clicant «Mostra nota» (informe) o la paraula «Provisional» (graelles) apareix la nota estimada, marcada amb «≈», i es torna a amagar clicant de nou. El que hi hagi visible en aquell moment és el que s'imprimeix; a l'anàlisi de l'alumne la nota ja es veu sempre. Al **Mapa d'assoliment dels RA** (Graelles › Resultats d'aprenentatge) i al seu informe imprimible, el botó **«Mostra totes les notes»** mostra d'un cop la nota estimada de tots els RA amb evidència (provisionals amb «≈», no assolits amb el número i «no assolit»); els RA sense cap evidència continuen sense nota. Quan es mostren les notes (global o RA a RA), els recomptes de dalt (RA assolits / no assolits i el resum per RA) es **recalculen** comptant aquests RA provisionals amb la seva nota estimada i marcant-los com a «estimats»; amagades, es compten a part com a «provisionals». Si s'acabés el curs avui, aquesta és la nota aproximada per RA, calculada només amb el que hi ha corregit;
- la nota global també s'avisa com a provisional quan la cobertura global és inferior a aquest mínim.

Excepció: si l'RA té un **examen obligatori suspès** (vegeu l'apartat 6), es marca com a no assolit encara que tingui poca cobertura. Amb tot avaluat (100 %) la regla no canvia res, i amb el valor 0 es desactiva.

També s'ha corregit el recompte de **lliuraments**: un «No presentat» ja no compta com a lliurat.

## 4. Quan es considera una activitat "avaluada"

Una activitat passa de "Pendent" a "Avaluada" automàticament quan arriba a **5 qualificacions** (comptant notes numèriques i "No presentat" — una bonificació sense nota base no compta). A partir d'aquell moment, els alumnes actius que encara no tinguin nota hi compten com un 0.

Aquest llindar es pot forçar manualment amb l'interruptor "Estat manual" de la pantalla Notes, si cal avançar o retardar el moment en què l'activitat comença a comptar zeros.

## 5. Bonificacions

- Una bonificació (`+0,5` o `+1`) s'afegeix a la nota base i és independent d'ella; el total pot superar 10.
- Cal un motiu, i com a màxim 3 alumnes bonificats per activitat i grup (excepte bonificacions històriques importades de l'Excel original).
- **Una bonificació sense nota base no compta com a qualificació** ni fa pujar cap nota.

## 6. Unitats de treball (UT) i l'estat "No assolit"

Una UT agrupa diverses activitats (projectes, exàmens, speedruns...) i es vincula a un o més RA. D'aquestes activitats, algunes es marquen com **obligatòries**: si l'alumne en suspèn alguna (nota < 5), el RA vinculat queda com **"No assolit"**, independentment de la nota calculada — encara que la mitjana surti per sobre de 5.

Exemple real (curs SOX), amb els RA que cada UT té vinculats i quines de les seves activitats són obligatòries:

| UT | RA vinculats | Activitats obligatòries d'aquesta UT |
|---|---|---|
| UT1 | RA1 | ExTeoric 1, ExPractic 1 |
| UT2 | RA2, RA3 | ExTeoric 20, ExPractic 20 |
| UT3 | RA4, RA5 | ExTeoric 30, ExPractic 30 |
| UT4 | RA6 | ExTeòric 40, ExPràctic 40 |

Fixa't que una mateixa UT pot vincular-se a **més d'un RA alhora** (com UT2 amb RA2 i RA3): si l'examen obligatori d'aquella UT queda suspès, **tots** els RA vinculats queden "No assolit", no només un.

Un RA també queda "No assolit" simplement si la seva mitjana calculada no arriba a 5, encara que no hi hagi cap UT de per mig. L'aplicació distingeix els dos casos amb un motiu curt:

<svg viewBox="0 0 640 400" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:520px;height:auto;font-family:Inter,system-ui,sans-serif;display:block;margin:0 auto">
<defs><marker id="ahC" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#8390a3"/></marker></defs>
<rect x="170" y="10" width="300" height="46" rx="10" fill="#101c35"/>
<text x="320" y="38" text-anchor="middle" fill="#fff" font-size="13" font-weight="700">Nota d'un RA per un alumne</text>
<line x1="320" y1="56" x2="320" y2="86" stroke="#8390a3" stroke-width="2" marker-end="url(#ahC)"/>
<rect x="130" y="88" width="380" height="60" rx="10" fill="#fff" stroke="#e4eaf2"/>
<text x="320" y="112" text-anchor="middle" font-size="12.5" fill="#17233c">Alguna activitat obligatòria</text>
<text x="320" y="130" text-anchor="middle" font-size="12.5" fill="#17233c">d'una UT vinculada, suspesa?</text>
<line x1="200" y1="148" x2="140" y2="188" stroke="#c54c5c" stroke-width="2" marker-end="url(#ahC)"/>
<text x="150" y="172" font-size="11.5" fill="#c54c5c" font-weight="700">Sí</text>
<line x1="440" y1="148" x2="440" y2="188" stroke="#8390a3" stroke-width="2" marker-end="url(#ahC)"/>
<text x="452" y="172" font-size="11.5" fill="#7d899d" font-weight="700">No</text>
<rect x="30" y="190" width="220" height="60" rx="10" fill="#fff0f1" stroke="#c54c5c"/>
<text x="140" y="215" text-anchor="middle" font-size="12.5" fill="#c54c5c" font-weight="800">No assolit</text>
<text x="140" y="234" text-anchor="middle" font-size="11.5" fill="#c54c5c">Examen suspès</text>
<rect x="330" y="190" width="220" height="60" rx="10" fill="#fff" stroke="#e4eaf2"/>
<text x="440" y="214" text-anchor="middle" font-size="12.5" fill="#17233c">Nota calculada</text>
<text x="440" y="232" text-anchor="middle" font-size="12.5" fill="#17233c">≥ 5?</text>
<line x1="380" y1="250" x2="330" y2="290" stroke="#8390a3" stroke-width="2" marker-end="url(#ahC)"/>
<text x="330" y="274" font-size="11.5" fill="#7d899d" font-weight="700">No</text>
<line x1="500" y1="250" x2="500" y2="290" stroke="#15825f" stroke-width="2" marker-end="url(#ahC)"/>
<text x="512" y="274" font-size="11.5" fill="#15825f" font-weight="700">Sí</text>
<rect x="220" y="292" width="220" height="60" rx="10" fill="#fff0f1" stroke="#c54c5c"/>
<text x="330" y="317" text-anchor="middle" font-size="12.5" fill="#c54c5c" font-weight="800">No assolit</text>
<text x="330" y="336" text-anchor="middle" font-size="11.5" fill="#c54c5c">Mitjana &lt;5</text>
<rect x="410" y="292" width="200" height="60" rx="10" fill="#e9f8f2" stroke="#15825f"/>
<text x="510" y="325" text-anchor="middle" font-size="13" fill="#15825f" font-weight="800">Assolit</text>
</svg>

Quan un RA queda "No assolit", la nota numèrica es manté oculta per defecte a l'informe individual — un enllaç "Mostra nota" permet consultar-la igualment, tant si es vol comprovar com si es vol imprimir amb el valor visible.

## 7. Arrodoniment a l'informe final

Els taulers, taules i graelles sempre mostren **dos decimals** (la nota "de treball"). Només l'**informe individual imprimible** arrodoneix la nota de cada RA i la nota global a un **enter**, amb aquesta regla:

```text
part decimal ≥ 0,75  →  enter superior
part decimal < 0,75  →  enter inferior
```

Exemples: `6,74` → `6` · `6,75` → `7` · `8,20` → `8`.

L'estat d'aprovat (≥ 5) es calcula sempre amb la nota decimal, **abans** d'aquest arrodoniment — per això un alumne amb un 4,99 arrodonit a un 5 a la pantalla de l'informe continua comptant com a suspès a les estadístiques.

## 8. Resum d'un cop d'ull

| Concepte | On es veu | Es calcula a partir de |
|---|---|---|
| Pes de cada activitat | Targetes d'Activitats, Graella d'activitats | Pes del tipus ÷ nombre d'activitats actives d'aquell tipus |
| Pes de cada RA | Pantalla Activitats, Graella de RA | Suma dels pesos globals dels seus CA |
| Nota d'un CA | (intern, no es mostra directament) | Mitjana ponderada de les activitats avaluades que hi contribueixen |
| Nota d'un RA | Resum, Graella de RA, Informe | Mitjana simple dels seus CA |
| Cobertura | Al costat de cada nota de RA | % del pes del RA ja avaluat |
| Nota global | Resum, Alumnes, Informe | Mitjana dels RA, ponderada pel seu pes i cobertura |
| No assolit | Graella de RA, Informe | Examen obligatori d'una UT suspès, o mitjana &lt;5 |

---

*Aquest document forma part de l'aplicació RA · Avaluació i es pot consultar des de la pantalla "Com es calcula" del menú lateral.*
