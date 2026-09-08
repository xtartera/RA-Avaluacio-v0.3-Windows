# Prompt mestre --- Pantalla «Aparença» (paleta de colors) de Tarty

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
  variable.
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
   activa a pantalla.
5. **Pas 0 obligatori:** un cop reescrits els colors fixos com a variables
   amb els valors de la paleta "Blau clàssic" (la que hi ha avui), l'aspecte
   visual actual **no ha de canviar ni un píxel**. Verifica-ho abans de
   continuar amb la resta de la feina.

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
  - una petita mostra visual dels colors (per exemple 3-4 quadrats o una
    barra amb `--primary`, `--primary-2` i `--sidebar-bg`);
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
- [ ] Els colors semàntics (verd d'assolit, vermell de risc, ambre
      d'atenció) es mantenen idèntics a les 3 paletes.
- [ ] Els informes imprimibles (`StudentReport`, `GroupReport`) es
      comporten segons el que es decideixi al punt 3.4 (per defecte:
      sempre en "Blau clàssic", independentment de la paleta activa a
      pantalla).
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
   Anàlisi del grup, un informe individual imprès.
8. Revisa la llista de comprovacions de la secció 7 una per una.

## Resultat esperat

Un professor pot obrir Configuració → Aparença, triar entre 3 paletes amb
un sol clic, i veure tota l'aplicació re-acolorida a l'instant i de forma
coherent, sense que això afecti cap dada, càlcul ni informe imprès, i sense
haver tocat l'esquema de `AppDatabase`.
