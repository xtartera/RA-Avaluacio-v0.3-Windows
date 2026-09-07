# Prompt mestre --- Pantalla «Anàlisi del grup» de Tarty

## 1. Rol i objectiu

Actua com a **dissenyador UX/UI i desenvolupador frontend sènior**
especialitzat en aplicacions educatives de gestió i anàlisi de
l'avaluació.

Has de construir una pantalla anomenada **«Anàlisi del grup»** dins de
l'aplicació de gestió de notes. La pantalla ha de convertir les notes
d'alumnes, activitats, Resultats d'Aprenentatge (RA) i Criteris
d'Avaluació (CA) en un **quadre de comandament docent clar, atractiu i
accionable**.

L'objectiu NO és mostrar moltes estadístiques sense jerarquia. El
professor ha de poder respondre ràpidament:

1.  Quin nivell té actualment el grup?
2.  Quin percentatge d'alumnes està assolint els aprenentatges?
3.  El grup millora, es manté o empitjora?
4.  El grup és homogeni o hi ha molta dispersió?
5.  Quins RA i CA presenten més dificultats?
6.  Quines activitats han funcionat millor o pitjor?
7.  Quins alumnes o segments estan en risc?
8.  Quines diferències reals hi ha entre dos grups?
9.  Quina part de l'avaluació ja disposa d'evidències?
10. Quines decisions docents poden ser prioritàries?

------------------------------------------------------------------------

# 2. Referència visual obligatòria

La interfície ha de reproduir **molt fidelment l'esperit visual del
mockup de referència proporcionat**.

No cal copiar-lo píxel a píxel, però sí conservar-ne:

-   estructura;
-   densitat d'informació;
-   jerarquia;
-   proporcions;
-   tipus de targetes;
-   distribució dels gràfics;
-   aparença professional;
-   paleta clara;
-   sensació general de dashboard modern.

## Estètica general

Dissenyar una interfície:

-   clara i lluminosa;
-   professional però visualment amable;
-   moderna;
-   de baixa saturació;
-   amb fons general gris/blau molt clar;
-   targetes blanques o amb tons pastel molt suaus;
-   cantonades arrodonides;
-   ombres molt subtils;
-   separacions generoses però sense desaprofitar espai;
-   tipografia sans-serif moderna;
-   icones simples i consistents;
-   excel·lent llegibilitat.

Evitar:

-   fons foscos a la zona principal;
-   gradients agressius;
-   efectes 3D;
-   ombres fortes;
-   targetes excessivament grans;
-   colors saturats;
-   gràfics decoratius sense valor;
-   interfícies tipus videojoc;
-   excés d'animacions.

La sensació buscada és:

**aplicació professional de gestió educativa + dashboard analític
modern + lectura immediata.**

------------------------------------------------------------------------

# 3. Estructura general

La pantalla ha de conservar l'estructura visual següent.

## 3.1 Barra lateral esquerra

Barra vertical fosca, estreta i fixa.

Opcions:

-   Inici
-   Alumnes
-   Activitats
-   Notes
-   Projecció
-   **Anàlisi del grup** --- opció activa
-   Informes
-   Configuració

Cada opció ha de tenir una icona.

L'opció activa ha de destacar-se amb un rectangle blau intens,
cantonades arrodonides i text blanc.

La barra lateral és pràcticament l'única zona fosca important de la
pantalla.

------------------------------------------------------------------------

## 3.2 Capçalera superior

Mostrar:

**MP04 · Sistemes Operatius en Xarxa**

Subtítol: **Gestió d'avaluació i seguiment**

A la dreta:

-   selector de curs;
-   selector de grup;
-   selector opcional «Comparar amb»;
-   professor/a;
-   configuració.

Exemple:

`Curs: 2026/27 | Grup: 2SMX A | Comparar amb: 2SMX B`

------------------------------------------------------------------------

# 4. Capçalera de la pantalla

Títol gran:

## Anàlisi del grup

Subtítol:

**Una visió global per entendre, comparar i millorar**

Incloure:

-   data/hora de l'última actualització;
-   botó **Exportar informe**.

------------------------------------------------------------------------

# 5. Navegació interna

Crear pestanyes horitzontals:

-   **Resum**
-   Evolució
-   RA / CA
-   Activitats
-   Comparació A-B

La pestanya activa ha de tenir fons blau i text blanc.

Aquest sistema és important: NO carregar tota la profunditat analítica
en una única pantalla interminable.

La vista **Resum** és el dashboard principal.

------------------------------------------------------------------------

# 6. Primera fila --- KPI principals

Mostrar sis targetes compactes.

## KPI 1 --- Nota projectada

Exemple:

**6,42 / 10**

Sota:

`↑ +0,56 respecte a l'avaluació anterior`

To visual blau.

------------------------------------------------------------------------

## KPI 2 --- Aprovats

Exemple:

**78 %** `21 de 27`

Variació:

`↑ +8 pp`

To visual verd.

------------------------------------------------------------------------

## KPI 3 --- En risc

Definició configurable, inicialment nota projectada \<4.

Exemple:

**11 %** `3 de 27`

Variació:

`↓ −5 pp`

To vermell suau.

------------------------------------------------------------------------

## KPI 4 --- Zona límit

Alumnat entre 4 i 5.

Exemple:

**11 %** `3 de 27`

To ambre/groc suau.

------------------------------------------------------------------------

## KPI 5 --- Excel·lència

Alumnat amb nota ≥8.

Exemple:

**19 %** `5 de 27`

To violeta suau.

------------------------------------------------------------------------

## KPI 6 --- Cobertura avaluada

Percentatge del pes total del mòdul del qual ja existeixen evidències.

Exemple:

**46 %**

Text auxiliar:

`del pes total del mòdul`

To gris/blau.

Aquesta dada és molt important: les notes provisionals han de poder
interpretar-se segons la quantitat d'evidència disponible.

------------------------------------------------------------------------

# 7. Segona fila --- evolució i distribució

Crear tres panells.

## 7.1 Evolució de la nota projectada

Gràfic de línies.

Eix X: - inici; - UT1; - UT2; - UT3; - actual.

Eix Y: 0--10.

Mostrar:

-   Grup A;
-   Grup B quan existeixi comparació.

Exemple fictici:

Grup A: 4,8 → 5,5 → 5,9 → 6,3 → 6,42

Grup B: 4,6 → 5,1 → 5,6 → 5,8 → 6,10

No utilitzar gràfics 3D.

------------------------------------------------------------------------

## 7.2 Distribució de l'alumnat

Gràfic donut.

Franges:

-   0--2
-   2--4
-   4--5
-   5--6
-   6--8
-   8--10

Mostrar al centre:

**27 alumnes**

Utilitzar colors semàntics suaus des de vermell fins a verd/blau.

------------------------------------------------------------------------

## 7.3 Evolució individual agregada

Barres horitzontals:

-   Milloren
-   Es mantenen
-   Empitjoren

Exemple:

-   Milloren: 67 % (18)
-   Es mantenen: 22 % (6)
-   Empitjoren: 11 % (3)

Indicar contra quin punt temporal es compara.

------------------------------------------------------------------------

# 8. Tercera fila --- anàlisi pedagògica

## 8.1 Assoliment per Resultat d'Aprenentatge

Taula compacta:

  RA   Descripció     Mitjana   \% assoliment Tendència
  ---- ------------ --------- --------------- -----------

Exemple:

-   RA1 --- Administrar dominis Windows --- 7,1 --- 88 % --- ↑
-   RA2 --- Serveis de directori Linux --- 6,4 --- 76 % --- →
-   RA3 --- Gestió d'usuaris i permisos --- 5,3 --- 58 % --- ↓
-   RA4 --- Recursos i serveis compartits --- 6,8 --- 81 % --- ↑
-   RA5 --- Seguretat i alta disponibilitat --- 5,7 --- 69 % --- →
-   RA6 --- Entorns heterogenis i integració --- pendent

Afegir una barra visual horitzontal a `% assoliment`.

No inventar nota per un RA sense prou evidències: mostrar **Pendent** o
**Evidència insuficient**.

------------------------------------------------------------------------

## 8.2 CA més crítics

Taula:

  Codi   Descripció     Mitjana
  ------ ------------ ---------

Ordenar inicialment de pitjor a millor.

Exemple:

-   CA3.4 --- 4,6
-   CA3.2 --- 5,1
-   CA5.1 --- 5,3
-   CA2.3 --- 5,8
-   CA4.2 --- 6,1

Utilitzar un petit indicador visual de severitat.

Permetre clicar un CA per veure:

-   activitats que l'avaluen;
-   alumnes afectats;
-   evolució;
-   diferències entre grups.

------------------------------------------------------------------------

## 8.3 Activitats destacades

Crear pestanyes internes:

-   Major èxit
-   **Més dificultat**
-   Més no lliuraments

Taula:

  Activitat     Mitjana   \% suspesos
  ----------- --------- -------------

No confondre **suspès** amb **no lliurat**.

------------------------------------------------------------------------

# 9. Quarta fila --- comparació, diagnosi i accions

## 9.1 Comparació entre grups

Taula:

  Indicador     2SMX A   2SMX B   Diferència
  ----------- -------- -------- ------------

Incloure:

-   nota projectada;
-   aprovats;
-   alumnat en risc;
-   excel·lència;
-   desviació estàndard;
-   evolució;
-   lliuraments;
-   RA més feble.

Mostrar diferències percentuals en **punts percentuals (pp)** quan
correspongui.

No concloure automàticament que un grup és «millor» només perquè té una
mitjana superior.

------------------------------------------------------------------------

## 9.2 Diagnosi automàtica

Targeta amb fons blau molt clar.

Generar frases breus basades en regles i dades reals.

Exemples:

-   «El grup mostra una evolució positiva (+0,56).»
-   «Augmenta el percentatge d'aprovats (+8 pp).»
-   «Es redueix l'alumnat en risc (−5 pp).»
-   «RA3 és el resultat amb menor assoliment.»
-   «CA3.4 presenta una mitjana baixa (4,6).»
-   «La síntesi teòrica de la UT2 presenta un 37 % de suspesos.»
-   «La cobertura avaluada és del 46 %; les dades encara són
    provisionals.»

Utilitzar:

-   verd = evolució favorable;
-   ambre = atenció;
-   blau = informació;
-   vermell = situació crítica.

**Important:** la diagnosi ha de descriure dades, no substituir el
criteri docent.

------------------------------------------------------------------------

## 9.3 Conclusions i accions suggerides

Targeta verda molt clara.

Exemples:

1.  Reforçar CA3.4 amb una activitat de consolidació.
2.  Analitzar la dificultat de la síntesi teòrica de la UT2.
3.  Fer seguiment específic de l'alumnat en risc.
4.  Mantenir la tendència positiva dels lliuraments.
5.  Revisar l'evolució després de la propera activitat.

Les recomanacions han de ser justificables a partir de les dades.

Incloure al peu:

> «Les dades no substitueixen el criteri docent, però ens ajuden a
> prendre millors decisions.»

------------------------------------------------------------------------

# 10. Indicadors i fórmules mínimes

Implementar, com a mínim:

-   mitjana;
-   mediana;
-   màxim;
-   mínim;
-   desviació estàndard;
-   rang;
-   \% aprovats;
-   \% suspesos;
-   \% alumnat \<4;
-   \% alumnat 4--5;
-   \% alumnat ≥8;
-   taxa de lliurament;
-   taxa de no presentats/no lliurats;
-   mitjana per activitat;
-   mitjana per UT;
-   mitjana per RA;
-   mitjana per CA;
-   nota projectada;
-   cobertura d'evidències;
-   evolució de la nota;
-   percentatge d'alumnes que milloren;
-   percentatge estable;
-   percentatge que empitjora;
-   alumnes que passen de \<5 a ≥5;
-   alumnes que passen de ≥5 a \<5;
-   diferència entre grups;
-   activitat amb major èxit;
-   activitat amb major dificultat;
-   activitat amb més no lliuraments;
-   RA amb menor assoliment;
-   CA amb menor assoliment.

------------------------------------------------------------------------

# 11. Comparació entre grups

La comparació ha de ser justa.

Comparar preferentment:

-   mateix període temporal;
-   mateixes UT;
-   mateixes activitats o activitats equivalents;
-   mateix nivell de cobertura d'evidències.

Si la cobertura és molt diferent, advertir-ho.

Exemple:

> «La comparació s'ha d'interpretar amb precaució: el Grup A té un 62 %
> de cobertura avaluada i el Grup B un 44 %.»

Permetre:

**Grup A / Grup B / Comparar A-B**

No crear un únic índex opac que decideixi quin grup «funciona millor».

Separar:

-   rendiment;
-   assoliment;
-   evolució;
-   homogeneïtat;
-   participació/lliuraments;
-   cobertura.

------------------------------------------------------------------------

# 12. Evolució històrica --- requisit funcional important

El sistema ha de conservar **snapshots històrics** de l'estat de
l'avaluació.

Cal poder reconstruir:

-   nota projectada després de cada activitat;
-   \% aprovats;
-   \% en risc;
-   resultats per RA;
-   resultats per CA;
-   cobertura;
-   dispersió.

No calcular l'evolució únicament a partir de l'estat actual.

Dissenyar el model de dades perquè aquesta informació històrica pugui
consultar-se posteriorment.

------------------------------------------------------------------------

# 13. Interaccions

Permetre:

-   seleccionar curs;
-   seleccionar grup;
-   comparar grups;
-   filtrar per UT;
-   filtrar per RA;
-   filtrar per període;
-   clicar un RA i veure CA;
-   clicar un CA i veure activitats;
-   clicar una activitat i veure distribució;
-   exportar informe;
-   mostrar tooltips explicant cada indicador.

Els filtres han d'afectar coherentment totes les visualitzacions.

------------------------------------------------------------------------

# 14. Responsive

Prioritzar **desktop**, perquè és una aplicació docent de gestió.

Resolució de referència: 1920×1080 i portàtils de 1366×768.

En pantalles petites:

-   les targetes poden passar a dues columnes;
-   els gràfics poden apilar-se;
-   les taules poden tenir scroll horitzontal;
-   la barra lateral pot col·lapsar-se.

No sacrificar llegibilitat per mantenir artificialment la mateixa
disposició.

------------------------------------------------------------------------

# 15. Accessibilitat

-   contrast suficient;
-   no transmetre informació exclusivament amb colors;
-   icona/text/tendència acompanyant els colors;
-   navegació amb teclat;
-   focus visible;
-   etiquetes accessibles;
-   tooltips accessibles;
-   textos i números llegibles;
-   evitar tipografies massa petites.

------------------------------------------------------------------------

# 16. Dades fictícies per al prototip

Utilitzar inicialment dades mock per construir la pantalla.

Exemple Grup A:

-   27 alumnes
-   nota projectada 6,42
-   aprovats 78 %
-   en risc 11 %
-   zona límit 11 %
-   excel·lència 19 %
-   cobertura 46 %
-   evolució +0,56
-   67 % milloren
-   22 % estables
-   11 % empitjoren
-   desviació estàndard 1,24
-   lliuraments 94 %

Exemple Grup B:

-   nota projectada 6,10
-   aprovats 70 %
-   en risc 19 %
-   excel·lència 15 %
-   evolució +0,40
-   desviació estàndard 1,78
-   lliuraments 89 %

Aquestes dades són només de demostració. L'arquitectura ha de quedar
preparada per substituir-les posteriorment per dades importades des
d'Excel i pel model intern de l'aplicació.

------------------------------------------------------------------------

# 17. Arquitectura del codi

La pantalla NO ha de contenir càlculs incrustats arbitràriament a la
vista.

Separar:

**Model** - alumnes; - grups; - activitats; - UT; - RA; - CA; - notes; -
ponderacions; - snapshots.

**Serveis/capa de càlcul** - projeccions; - estadístiques; -
indicadors; - comparacions; - detecció d'alertes.

**Vista** - KPI; - gràfics; - taules; - filtres; - diagnosi.

Crear components reutilitzables.

Exemples conceptuals:

-   `KpiCard`
-   `TrendChart`
-   `GradeDistribution`
-   `StudentEvolution`
-   `RaAchievementTable`
-   `CriticalCaTable`
-   `ActivityInsights`
-   `GroupComparison`
-   `AutomaticDiagnosis`
-   `SuggestedActions`

Adaptar els noms a la tecnologia i convencions del projecte existent.

------------------------------------------------------------------------

# 18. Integració amb l'aplicació existent

Abans de programar:

1.  analitza l'estructura actual del projecte;
2.  identifica framework, components, sistema d'estils i navegació;
3.  reutilitza els patrons visuals existents quan siguin compatibles;
4.  no trenquis funcionalitats actuals;
5.  integra la nova pantalla dins de la navegació existent;
6.  evita duplicar lògica de càlcul;
7.  mantén separada la UI del motor de notes.

Si existeix un sistema de disseny, adapta'l perquè el resultat final
s'aproximi al mockup sense crear una aplicació visualment desconnectada.

------------------------------------------------------------------------

# 19. Criteri visual final

Abans de considerar la pantalla acabada, comprovar:

-   [ ] Barra lateral fosca i compacta.
-   [ ] Zona principal molt clara.
-   [ ] Capçalera superior ordenada.
-   [ ] Sis KPI compactes en primera fila.
-   [ ] Colors pastel semàntics.
-   [ ] Gràfic d'evolució com a element principal.
-   [ ] Distribució de notes visible.
-   [ ] Evolució de l'alumnat visible.
-   [ ] RA i CA clarament diferenciats.
-   [ ] Activitats problemàtiques identificables.
-   [ ] Comparació A-B directa.
-   [ ] Diagnosi automàtica visible però no dominant.
-   [ ] Accions suggerides en una targeta diferenciada.
-   [ ] Cantonades arrodonides i ombres subtils.
-   [ ] Densitat elevada però ordenada.
-   [ ] Cap element purament decoratiu que ocupi espai analític.
-   [ ] La pantalla s'assembla visualment al mockup de referència.

------------------------------------------------------------------------

# 20. Forma de treball requerida

No intentis construir tota la funcionalitat en un únic bloc sense
revisar el projecte.

Segueix aquest ordre:

1.  analitza el projecte existent;
2.  proposa l'estructura de components i dades;
3.  identifica fitxers que cal crear/modificar;
4.  implementa primer la vista **Resum** amb dades mock;
5.  comprova que visualment s'aproxima al mockup;
6.  implementa càlculs i dades reals;
7.  incorpora la comparació A-B;
8.  incorpora Evolució, RA/CA i Activitats;
9.  implementa exportació només quan el dashboard sigui estable;
10. revisa responsive, accessibilitat i consistència visual.

Quan hagis d'escollir entre afegir més informació i mantenir una lectura
clara, **prioritza la claredat visual i la utilitat docent**.

## Resultat esperat

El resultat ha de semblar una aplicació real i madura de gestió
educativa, no una demostració genèrica de gràfics.

En menys de 10 segons, el professor ha de poder entendre:

**com està el grup, com evoluciona, on té dificultats i què mereix la
seva atenció.**
