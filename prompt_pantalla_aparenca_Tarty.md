# Prompt mestre --- Pantalla «Aparença» (paleta de colors) de Tarty

> **Nota de revisió (12/09/2026):** aquest prompt es va escriure abans
> d'implementar tota la funcionalitat de convocatòria extraordinària (nous
> grups de pantalles, taules d'encreuament, selector de perspectiva a
> l'anàlisi, informe imprimible amb acta, secció d'ajuda...). S'ha revisat
> secció per secció contra el codi real (`app/globals.css`, 213 línies) per
> confirmar que el pla original **encara és vàlid i suficient** — no calia
> refer-lo — però calia ampliar-lo en alguns punts concrets perquè el
> sistema de colors ha crescut molt més del que es descrivia. Els canvis
> respecte a la versió anterior estan marcats amb **🆕** al llarg del
> document. La feina descrita en aquest prompt **encara no s'ha
> implementat**: continua sent un full de ruta pendent d'executar.

> **Implementat (12/09/2026):** tota la feina d'aquest prompt s'ha dut a
> terme. Es van ampliar les variables CSS a `app/globals.css` (uns 55
> tokens nous, incloent-hi tots els casos trobats a la revisió — famílies
> `tint-*`/`accent-text-*` per a matisos i textos derivats de marca que no
> constaven a la primera anàlisi), es van definir els blocs
> `[data-palette="verd-pissarra"]` i `[data-palette="porpra-modern"]`, es
> va crear `app/lib/theme.ts` (`useColorPalette`, `applyPalette`,
> `readStoredPalette`, aplicat abans del primer render des de
> `src/main.tsx`) i la pantalla `app/screens/Aparenca.tsx` — amb la
> previsualització en miniatura viva proposada a la secció 5, no els
> quadrats plans. Es va afegir un bloc `@media print{:root{...}}` al final
> de `globals.css` que reforça els valors de "Blau clàssic" a totes les
> variables perquè els informes impresos mai segueixin la paleta activa a
> pantalla (comprovat amb Playwright: `--dark-btn` computat sota
> `page.emulateMedia({media:"print"})` és `#1d2d4b` encara que la paleta
> activa sigui "Porpra modern"). Verificat amb `tsc --noEmit`, `npm test`
> (57/57), `npm run build` i Playwright (canvi de paleta, persistència a
> `localStorage` després de recarregar, recoloració de la barra lateral i
> la navegació, botó de "Torna a la paleta per defecte").

## 1. Rol i objectiu

Actua com a **desenvolupador frontend sènior** especialitzat en aplicacions
React/TypeScript i en sistemes de disseny basats en variables CSS.

Has d'afegir una nova pantalla anomenada **«Aparença»** dins del grup de
navegació **«Configuració»** de l'aplicació RA · Avaluació. La pantalla ha de
permetre triar entre **3 paletes de colors predefinides** que canviïn
realment l'aspecte visual de tota l'aplicació (barra lateral, accents,
botons, insígnies, targetes...), sense tocar cap dada acadèmica ni cap
càlcul de notes.

Aquesta funcionalitat és purament visual/de preferència. **No ha de
modificar `AppDatabase`, `schemaVersion` ni `migrateDatabase`.**

------------------------------------------------------------------------

# 2. Context tècnic obligatori (llegeix abans de tocar res)

Aquesta secció resumeix com està construïda l'aplicació **avui**, a partir
d'una anàlisi prèvia del codi. Verifica-ho tu mateix contra el codi real
abans de programar, perquè pot haver canviat.

- Stack: **React 19 + TypeScript + Vite 6**, SPA local sense servidor.
- Navegació: array `NAV_GROUPS` dins `app/page.tsx`. El grup amb
  `id:"configuracio"` (label "Configuració") ja conté 3 pestanyes: RA/CA i
  pesos (`configuracio`), Dades i còpies (`dades`) i Arxivats (`arxivats`).
  Cada pestanya és un component senzill dins `app/screens/` (mira
  `Data.tsx` o `Archived.tsx` com a exemples mínims).
- Estils: **un únic fitxer `app/globals.css`**, sense Tailwind ni CSS
  modules. Al `:root` només hi ha **5 variables** definides:
  `--ink`, `--muted`, `--line`, `--blue`, `--bg`. La resta de colors de la
  interfície (accent blau `#3975e8`, verd d'"assolit" `#15825f`, vermell
  de "risc" `#c54c5c`, blau marí de la barra lateral `#101c35`, degradats
  de les insígnies `#3975e8 → #795fd7`, i unes 130 tonalitats més de fons,
  vores i hovers) són **valors fixos escampats pel full**, no lligats a cap
  variable. 🆕 Matís important comprovat contra el codi: `--blue` **ja
  s'utilitza** com a variable en ~15 punts (`.course svg`, `.subTabs
  button.active`, `.emptyState svg`, icones d'accent...), però conviu amb
  desenes de repeticions literals del mateix blau i del seu parell de
  degradat (`#795fd7`) que caldrà unificar sota els tokens nous.
- 🆕 **El full d'estils ha crescut força des que es va escriure aquest
  prompt** (ara 213 línies denses, una per bloc temàtic) arran d'implementar
  la convocatòria extraordinària. Hi ha aparegut tot un vocabulari de
  "tons" semàntics reutilitzats en molts llocs, que cal tenir en compte en
  planificar les variables (secció 3 i 4):
  - **Famílies `tone-*` (badges, targetes KPI, sub-blocs d'anàlisi, píndoles
    de RA)**: `.kpiCard.tone-{blue,green,red,amber,violet,slate}`,
    `.actSub.tone-{green,red,amber}`, `.raPill.tone-{green,red,amber,slate}`,
    `.barTrack>i.tone-{green,red,slate,amber}`, `.diagItem.d{Green,Amber,Blue,Red}`,
    `.sevHigh/.sevMid/.sevLow`. `green`/`red`/`amber` són sempre els colors
    semàntics fixos (èxit/risc/atenció); `slate` i `violet` són tons neutres
    "informatius" que tampoc haurien de variar amb la marca. **`tone-blue`
    (i `dBlue`) és diferent: visualment es percep com a color de marca, no
    com a semàntic** — caldrà decidir explícitament si segueix `--primary`
    (recomanat, vegeu secció 3bis) o es manté fix com els altres tons.
  - **Badges de RA**: `.raBadge-assolit` (verd), `.raBadge-risc` (vermell),
    `.raBadge-pendent` (gris neutre) — mateix criteri semàntic que amunt.
  - **Graella visual d'assoliment i acta d'extraordinària** (Graelles,
    l'informe imprimible de convocatòria extraordinària): `.activityScore`,
    `.cellPassed` (verd), `.cellFailed` (vermell), `.cellPending` (gris) —
    reutilitzen el mateix criteri semàntic verd/vermell/gris que la resta
    de l'app; cal incloure-les explícitament a la comprovació de la secció 7.
  - **Estats "seleccionat/actiu" amb tint de marca**: `.gridViewTabs
    button[aria-pressed=true]`, `.raOverviewCard[aria-pressed=true]`, el
    focus ring general (`outline:3px solid #3975e850`) i diversos tints
    (`#3975e81a`, `#edf4ff`, `#99b9ef`, `#245bbb`) — tots deriven del blau
    de marca actual i haurien de generar-se amb `color-mix()` a partir de
    `--primary`, no quedar fixos.
  - **Botons `.dark`** (capçalera, exportar/imprimir informes) usen un
    navy fix (`#1d2d4b`, hover `#152040`) independent de `--sidebar-bg`.
    Cal decidir si aquest botó ha de seguir la paleta (derivat de
    `--sidebar-bg` amb `color-mix()`) o mantenir-se neutre; es recomana
    que la segueixi, per coherència visual amb la barra lateral (vegeu
    secció 3bis).
  - **Hover/actiu del menú lateral**: `nav button:hover,nav
    button.active{background:linear-gradient(90deg,#253b64,#1c2e50)}` és
    un degradat propi, no derivat de `--sidebar-bg` — necessitarà el seu
    propi token derivat (secció 6.1).
  - 🆕 **Noves pantalles/components d'aquesta sessió que ja reutilitzen el
    sistema de colors existent** (no requereixen feina extra de disseny,
    només que la migració a variables els cobreixi): `Activitats
    extraordinàries` (mateix patró `.activities`), `Convocatòria
    extraordinària` (`.managementPanel`/`.managementTable` + modal
    `.report` imprimible amb la taula d'encreuament nova), pestanya
    "Extraordinària" a `Graelles` (`.visualGrid`/`.activityScore`), el
    selector de perspectiva Ordinària/Extraordinària/Total a `Anàlisi de
    l'alumne` i `Anàlisi del grup` (`.subTabs`, `.kpiCard.tone-*`), i la
    nova pàgina d'ajuda "Com funciona l'extraordinària" (`.helpContent`,
    amb un diagrama SVG inline que usa colors fixos `#101c35`/`#c54c5c`/
    `#15825f` — revisar-lo també al punt 3.4).
- Persistència de dades: `AppRepository` / `FileBackedRepository`
  (`src/model/repository.ts`) desa `AppDatabase` a IndexedDB i, opcionalment,
  a un fitxer JSON local. **La paleta triada NO ha d'anar aquí**: és una
  preferència de l'ordinador/usuari, no una dada acadèmica.

------------------------------------------------------------------------

# 3. Abast del canvi visual

L'objectiu és que triar una paleta reacoloreixi de veritat l'aplicació, no
només la pantalla de configuració. Per aconseguir-ho amb un cost raonable:

1. **Amplia el sistema de variables CSS** a `:root` amb tokens semàntics
   nous, per exemple: `--primary`, `--primary-2` (color final del degradat
   d'accents/insígnies), `--sidebar-bg`, `--sidebar-bg-2` (si la barra fa
   servir algun degradat o variant), `--sidebar-active` (ressaltat de
   l'opció activa del menú). Mantén `--ink`, `--muted`, `--line`, `--bg`
   com a neutres compartits per les 3 paletes (no depenen de la marca).
2. **No dupliquis manualment cada matís pàl·lid** (fons de targetes actives,
   hovers, badges...). Fes-los servir `color-mix(in srgb, var(--primary) X%,
   white)` (o `black`, segons calgui) perquè es calculin automàticament a
   partir dels 4-6 colors base de cada paleta. Això evita haver de definir
   150 valors × 3 paletes.
3. **Reescriu els colors fixos existents a `globals.css`** perquè apuntin a
   aquestes variables, agrupant per zona: barra lateral, accent
   principal/degradats, i els colors semàntics d'estat (verd "assolit"/èxit,
   vermell "risc"/error, ambre "atenció"). **Els colors semàntics d'estat
   (verd, vermell, ambre) es mantenen fixos entre paletes** —no són de
   marca, i canviar-los perjudicaria la llegibilitat consistent de
   "aprovat/risc" arreu de l'app.
4. **Comprova especialment els blocs `@media print`** de `globals.css`
   (els informes imprimibles reutilitzen alguns d'aquests colors): decidiu
   explícitament si l'informe imprès ha de seguir la paleta triada o
   mantenir-se sempre amb la paleta per defecte per coherència en paper.
   Si no hi ha un motiu fort per canviar-ho, **mantén els informes impresos
   sempre amb la paleta "Blau clàssic"**, independentment de la paleta
   activa a pantalla. 🆕 Això inclou explícitament els informes afegits
   aquesta sessió: `StudentReport`, `GroupReport` (ja citats) i també
   `ActaExtraordinariaPrintReport` (modal imprimible de "Convocatòria
   extraordinària", amb la taula d'encreuament alumne × RA en verd/vermell).
   Els colors semàntics verd/vermell/gris (`cellPassed`/`cellFailed`/
   `cellPending`) es mantenen igual sempre, en pantalla i en paper — només
   els colors de marca (capçaleres, degradats d'insígnies) queden fixats a
   "Blau clàssic" en imprimir.
5. **Pas 0 obligatori:** un cop reescrits els colors fixos com a variables
   amb els valors de la paleta "Blau clàssic" (la que hi ha avui), l'aspecte
   visual actual **no ha de canviar ni un píxel**. Verifica-ho abans de
   continuar amb la resta de la feina.

------------------------------------------------------------------------

# 3bis. 🆕 Marca vs. informatiu vs. semàntic: tres famílies de color, no dues

L'anàlisi original només distingia "marca" (canvia amb la paleta) de
"semàntic d'estat" (fix). Amb tot el que s'ha afegit per a la convocatòria
extraordinària (KPI amb tons, píndoles de RA, targetes de diagnòstic,
graella d'assoliment...), cal una tercera categoria explícita perquè el
codi real ja la conté implícitament:

| Família | Exemples al codi | Ha de variar amb la paleta? |
|---|---|---|
| **Marca / accent** | Barra lateral i el seu hover, botons `dark`, degradat d'insígnies, estat "seleccionat" (`aria-pressed=true` a `gridViewTabs`/`raOverviewCard`), focus ring, `tone-blue`/`dBlue` | **Sí** — deriva de `--primary`/`--primary-2`/`--sidebar-bg` |
| **Semàntic d'estat** | Verd (assolit/èxit/`cellPassed`/`tone-green`/`raBadge-assolit`), vermell (risc/`cellFailed`/`tone-red`/`raBadge-risc`), ambre (atenció/`tone-amber`) | **No** — fix a totes les paletes (ja ho diu la secció 3, es reforça aquí) |
| **Neutre informatiu** | Gris "pendent" (`cellPending`/`raBadge-pendent`/`tone-slate`), violeta d'anàlisi (`tone-violet`) | **No** — són neutres de contingut, no de marca; mantenir-los fixos evita que "pendent" es confongui mai amb un color de marca |

Aquesta distinció **no canvia l'abast del prompt** (continua sent "3
paletes, sense tocar dades ni càlculs"), però evita l'error d'oblidar
recolorir algun element de marca (perquè sembla "un color d'estat més") o,
al revés, de canviar per error un verd/vermell/gris que ha de quedar
sempre igual. Afegeix-la explícitament a la llista de comprovacions
(secció 7).

------------------------------------------------------------------------

# 4. Les 3 paletes per defecte

| Paleta | `--primary` | `--primary-2` (degradat) | `--sidebar-bg` |
|---|---|---|---|
| **Blau clàssic** (per defecte, l'actual) | `#3975e8` | `#795fd7` | `#101c35` |
| **Verd pissarra** | `#0f8a5f` | `#2f7a6b` | `#0e2a24` |
| **Porpra modern** | `#7c5cd6` | `#b3487a` | `#241a3d` |

Colors semàntics d'estat, **iguals a totes 3 paletes**:

- Èxit / assolit: `#15825f`
- Risc / error: `#c54c5c`
- Atenció / ambre: manté els tons ambre ja existents al full (`#c99a1c` i
  derivats)

Deriva els tons pàl·lids de fons, vores i hovers de cada zona amb
`color-mix()` a partir d'aquests colors base, en lloc de fixar-los a mà.

------------------------------------------------------------------------

# 5. Contingut de la pantalla «Aparença»

Segueix el mateix llenguatge visual que la resta de "Configuració"
(`.panel`, `.panelHeader`, `.configRow`, `muted`) tal com es veu a
`Config.tsx` i `Data.tsx`. No inventis un estil nou.

Estructura suggerida:

- Un `<article className="panel">` amb capçalera "Paleta de colors" i un
  paràgraf `muted` explicant que és una preferència d'aquest ordinador i
  no afecta les dades del curs ni els informes imprimibles.
- **3 targetes seleccionables**, una per paleta, cadascuna amb:
  - un nom ("Blau clàssic", "Verd pissarra", "Porpra modern");
  - 🆕 **proposta més innovadora que la mostra de quadrats plana**: en lloc
    de 3-4 quadrats de color solts, renderitza dins de cada targeta una
    **miniatura viva de la interfície real** amb aquella paleta aplicada
    (per exemple, escalada amb `transform:scale()` dins un contenidor amb
    `overflow:hidden`): una franja fosca de barra lateral amb un botó de
    nav "actiu", una insígnia de RA amb el degradat `--primary → --primary-2`,
    i un badge verd d'"assolit". Tècnicament és senzill perquè només cal
    embolicar aquest mini-fragment amb `data-palette="..."` propi (el
    mateix atribut de la secció 6.1 ja fa que les variables es recalculin
    per aquell subarbre, sense tocar la paleta activa de la resta de la
    pàgina) — no cal cap component ni lògica nova, només reutilitzar
    classes ja existents (`nav button.active`, `.ra>b`, `.raBadge-assolit`)
    en miniatura. Això li dona al professor/a una previsualització fidel
    en comptes d'una abstracció de colors, sense augmentar l'abast del
    projecte (segueix sent 3 paletes fixes, sense editor de color).
    Si es prefereix mantenir-ho més senzill, els quadrats/barra de colors
    originalment proposats també són vàlids i queden com a alternativa
    de baix cost;
  - un estat clarament marcat com a "seleccionada" (vora o fons ressaltat,
    icona de check) quan és la paleta activa.
- Clic a una targeta aplica la paleta **a l'instant** (sense botó "Desa"),
  seguint el mateix patró d'auto-desat que ja fan servir altres pantalles
  de configuració (per exemple els camps `onBlur` de `Config.tsx`).
- Un enllaç/botó petit "Torna a la paleta per defecte" que selecciona
  "Blau clàssic".

------------------------------------------------------------------------

# 6. Arquitectura tècnica

## 6.1 Aplicació de la paleta

Crea un mecanisme centralitzat (per exemple un hook `useColorPalette` o un
petit `ThemeProvider`) que:

- mantingui l'estat de la paleta activa;
- l'apliqui posant un atribut, per exemple `data-palette="verd-pissarra"`
  a l'element arrel (`<html>` o `.app`), amb els 3 jocs de variables
  definits al CSS sota `[data-palette="..."] { --primary: ...; }`
  — **no via estils inline generats en JS**, per mantenir-ho declaratiu i
  fàcil de llegir/mantenir en `globals.css`;
- s'apliqui **abans del primer render** (per exemple llegint
  `localStorage` de forma síncrona a l'arrencada) per evitar un flaix
  visual amb la paleta per defecte abans de canviar a la triada.

🆕 En ampliar les variables (secció 3, punt 1), inclou també aquests dos
tokens derivats que el codi actual té fixos i que, segons la taxonomia de
la secció 3bis, haurien de seguir la marca:
- `--sidebar-hover-1`/`--sidebar-hover-2` per al degradat de
  `nav button:hover`/`.active` (avui fix a `#253b64`/`#1c2e50`), derivable
  amb `color-mix(in srgb, var(--sidebar-bg) X%, white)`.
- `--dark-btn` per als botons `.dark` (avui fix a `#1d2d4b`, hover
  `#152040`), derivable del mateix `--sidebar-bg`.

## 6.2 Persistència

- Guarda la preferència amb una clau pròpia a `localStorage`, per exemple
  `ra-avaluacio:palette`, amb un dels 3 identificadors de paleta.
- **No la fiquis dins `AppDatabase`** ni la passis per `FileBackedRepository`:
  és una preferència d'aquest navegador/ordinador, no una dada de curs que
  s'hagi de sincronitzar amb el fitxer JSON compartit.
- Si `localStorage` no és accessible (mode privat, etc.), l'aplicació ha de
  seguir funcionant amb la paleta per defecte sense trencar-se.

## 6.3 Integració a la navegació

- Afegeix un `NavItem` nou al grup `configuracio` de `NAV_GROUPS`
  (`app/page.tsx`), amb una icona de `lucide-react` coherent (per exemple
  `Palette`).
- Afegeix el `tab` corresponent (per exemple `"aparenca"`) al tipus `Tab`
  (`app/lib/helpers.ts` o allà on estigui definit), al mapa `titles` i a la
  branca de render de `page.tsx`, seguint exactament el mateix patró que
  `tab==="dades"` o `tab==="arxivats"`.
- Crea `app/screens/Aparenca.tsx` amb el component de la pantalla.
- Aquesta pantalla **no depèn de cap curs actiu**: ha de mostrar-se igual
  hi hagi o no un curs seleccionat (a diferència de pestanyes com "Notes"
  que requereixen `group`).

------------------------------------------------------------------------

# 7. Comprovacions obligatòries abans de donar-ho per acabat

- [ ] Amb la paleta "Blau clàssic" seleccionada, l'aplicació té exactament
      el mateix aspecte que abans del canvi (comprovació del Pas 0).
- [ ] Les 3 paletes es poden triar i es veuen aplicades a: barra lateral,
      botó actiu de navegació, capçaleres, badges/insígnies de RA i CA,
      botons `dark`, pestanyes (`.switch`, `.subTabs`).
- [ ] 🆕 Les 3 paletes també es veuen aplicades a les pantalles i
      components afegits amb la convocatòria extraordinària: pestanya
      "Extraordinària" de Graelles, targetes de "Activitats
      extraordinàries", capçaleres i estat "seleccionat" de
      `gridViewTabs`/`raOverviewCard`, i el selector de perspectiva
      Ordinària/Extraordinària/Total (`kpiCard.tone-blue`) a Anàlisi de
      l'alumne i del grup.
- [ ] Els colors semàntics (verd d'assolit, vermell de risc, ambre
      d'atenció) es mantenen idèntics a les 3 paletes.
- [ ] 🆕 Els tons neutres informatius (`tone-slate`, `tone-violet`,
      `cellPending`/`raBadge-pendent`) també es mantenen idèntics a les 3
      paletes (secció 3bis) — no s'han de confondre amb color de marca.
- [ ] Els informes imprimibles (`StudentReport`, `GroupReport`) es
      comporten segons el que es decideixi al punt 3.4 (per defecte:
      sempre en "Blau clàssic", independentment de la paleta activa a
      pantalla). 🆕 Inclou també l'acta imprimible de
      `ActaExtraordinariaPrintReport` amb la mateixa regla.
- [ ] La preferència de paleta persisteix en recarregar la pàgina
      (`localStorage`), i no es perd cap dada de `AppDatabase`.
- [ ] Cap altra funcionalitat (notes, RA/CA, importació, arxivat...) queda
      afectada: aquest és un canvi purament d'aparença.
- [ ] Contrast de text suficient a les 3 paletes, especialment el text
      blanc sobre `--sidebar-bg` i el text sobre botons `dark`.
- [ ] Responsive: la pantalla "Aparença" i les targetes de paleta es
      veuen correctament també en finestres estretes (portàtil 1366×768).

------------------------------------------------------------------------

# 8. Forma de treball requerida

Segueix aquest ordre, sense saltar-te'l:

1. Analitza `app/globals.css`, `app/page.tsx` i `app/lib/helpers.ts` per
   confirmar l'estructura real actual (pot haver variat respecte al punt 2
   d'aquest prompt).
2. Llista els fitxers concrets que caldrà crear o modificar abans de
   començar a escriure codi.
3. Amplia les variables CSS i reescriu els colors fixos de
   `globals.css` **mantenint els valors de "Blau clàssic"** (Pas 0):
   verifica visualment que res ha canviat.
4. Defineix els blocs `[data-palette="..."]` per a "Verd pissarra" i
   "Porpra modern".
5. Implementa el mecanisme d'aplicació/persistència de paleta
   (`useColorPalette` + `localStorage` + atribut a l'arrel).
6. Crea la pantalla `Aparenca.tsx` i integra-la a la navegació.
7. Prova les 3 paletes recorrent com a mínim: Resum, Notes, Activitats,
   Anàlisi del grup, un informe individual imprès. 🆕 Recorre també:
   Activitats extraordinàries, Convocatòria extraordinària (pantalla i
   acta imprimible), pestanya Extraordinària de Graelles, i el selector
   de perspectiva a Anàlisi de l'alumne/del grup.
8. Revisa la llista de comprovacions de la secció 7 una per una.

## Resultat esperat

Un professor pot obrir Configuració → Aparença, triar entre 3 paletes amb
un sol clic, i veure tota l'aplicació re-acolorida a l'instant i de forma
coherent, sense que això afecti cap dada, càlcul ni informe imprès, i sense
haver tocat l'esquema de `AppDatabase`.
