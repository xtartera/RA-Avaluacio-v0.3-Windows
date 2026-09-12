# Convocatòria extraordinària

Aquest document explica com l'aplicació gestiona la **convocatòria extraordinària** (la recuperació de juny): quines regles decideixen si un alumne hi ha d'anar, com es calcula la nota final un cop se'n té en compte el resultat, i com es porta el compte de les convocatòries consumides (màxim 4).

No cal memoritzar-lo: és una referència per consultar quan un resultat final no surti el que s'esperava. Per a com es calcula la nota de l'**ordinària** (pesos, CA, RA, cobertura), consulta "Com es calcula".

## 1. Ordinària i extraordinària, en un cop d'ull

- La **convocatòria ordinària** és tot el que ja calcula l'aplicació durant el curs: RA, CA, activitats i la nota projectada de sempre.
- La **convocatòria extraordinària** és la recuperació de juny: exàmens o treballs nous que permeten recuperar, amb una nota igual o superior a 5, els RA que a l'ordinària han quedat **no assolits**.
- La **convocatòria ordinària sempre es consuma**, es presenti l'alumne o no. L'**extraordinària només es consumeix si l'alumne s'hi presenta**.

## 2. Pendent, assolit o no assolit: la distinció que ho canvia tot

Un RA no és mai només "aprovat o suspès": pot estar en tres estats, i confondre'ls és l'error més fàcil de cometre (i el que més distorsiona els resultats):

| Estat | Què vol dir | Compta per anar a l'extraordinària? |
|---|---|---|
| **Pendent** | Cap activitat d'aquest RA s'ha avaluat encara (cobertura 0%). Encara no se sap si l'alumne l'assolirà. | No |
| **Assolit** | Cobertura > 0%, nota ≥ 5 i cap activitat obligatòria suspesa. | No |
| **No assolit** | Cobertura > 0% (hi ha evidència real) i, tot i així, nota < 5 o alguna activitat obligatòria suspesa. | Sí |

<svg viewBox="0 0 640 300" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:560px;height:auto;font-family:Inter,system-ui,sans-serif;display:block;margin:0 auto">
<defs><marker id="ahE1" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#8390a3"/></marker></defs>
<rect x="190" y="10" width="260" height="46" rx="10" fill="#101c35"/>
<text x="320" y="38" text-anchor="middle" fill="#fff" font-size="13" font-weight="700">Estat d'un RA per un alumne</text>
<line x1="320" y1="56" x2="320" y2="86" stroke="#8390a3" stroke-width="2" marker-end="url(#ahE1)"/>
<rect x="150" y="88" width="340" height="50" rx="10" fill="#fff" stroke="#e4eaf2"/>
<text x="320" y="118" text-anchor="middle" font-size="12.5" fill="#17233c">Cobertura del RA = 0%?</text>
<line x1="220" y1="138" x2="160" y2="178" stroke="#7d899d" stroke-width="2" marker-end="url(#ahE1)"/>
<text x="168" y="162" font-size="11.5" fill="#7d899d" font-weight="700">Sí</text>
<line x1="420" y1="138" x2="420" y2="178" stroke="#8390a3" stroke-width="2" marker-end="url(#ahE1)"/>
<text x="432" y="162" font-size="11.5" fill="#7d899d" font-weight="700">No</text>
<rect x="40" y="180" width="220" height="55" rx="10" fill="#f1f4f8" stroke="#8290a2"/>
<text x="150" y="203" text-anchor="middle" font-size="12.5" fill="#5b6b7f" font-weight="800">Pendent</text>
<text x="150" y="221" text-anchor="middle" font-size="11" fill="#5b6b7f">Encara no s'ha avaluat</text>
<rect x="310" y="180" width="220" height="55" rx="10" fill="#fff" stroke="#e4eaf2"/>
<text x="420" y="205" text-anchor="middle" font-size="12.5" fill="#17233c">Nota ≥ 5 i cap</text>
<text x="420" y="222" text-anchor="middle" font-size="12.5" fill="#17233c">obligatòria suspesa?</text>
<line x1="370" y1="235" x2="330" y2="255" stroke="#c54c5c" stroke-width="2" marker-end="url(#ahE1)"/>
<text x="322" y="252" font-size="11" fill="#c54c5c" font-weight="700">No</text>
<line x1="470" y1="235" x2="510" y2="255" stroke="#15825f" stroke-width="2" marker-end="url(#ahE1)"/>
<text x="500" y="252" font-size="11" fill="#15825f" font-weight="700">Sí</text>
<rect x="220" y="257" width="220" height="40" rx="10" fill="#fff0f1" stroke="#c54c5c"/>
<text x="330" y="282" text-anchor="middle" font-size="12.5" fill="#c54c5c" font-weight="800">No assolit → extraordinària</text>
<rect x="450" y="257" width="170" height="40" rx="10" fill="#e9f8f2" stroke="#15825f"/>
<text x="535" y="282" text-anchor="middle" font-size="12.5" fill="#15825f" font-weight="800">Assolit</text>
</svg>

Per què importa: si un RA encara no té cap activitat avaluada (per exemple, un RA del 3r trimestre que encara no s'ha treballat), la seva nota per defecte és 0 — però això **no vol dir que estigui suspès**. L'aplicació distingeix sempre aquest cas per no marcar com a "pendents de recuperar" alumnes que en realitat encara no han arribat a aquell RA.

## 3. Com es defineixen les activitats de recuperació

Les activitats de recuperació es creen a la pantalla **"Activitats extraordinàries"** (dins d'Avaluació), no a "Activitats" — es mantenen separades a propòsit perquè mai es puguin confondre les dues convocatòries.

A diferència d'una activitat ordinària (que reparteix el seu pes entre diversos CA amb percentatges), una activitat de recuperació es vincula **directament a un o més RA**, sense passar pels CA:

- Es tria el **RA (o RA) que recupera**.
- La nota que s'hi posa s'aplica **idèntica i sencera** a cada RA que recupera — no es reparteix ni es pondera. Un mateix examen que recupera RA2 i RA3 amb un 7 deixa tots dos RA a 7.
- Un mateix RA no pot tenir dues activitats de recuperació actives alhora (l'aplicació ho avisa en crear-la).
- Les activitats de recuperació **no compten mai** en el pes ni en la nota de l'ordinària: no apareixen a "Activitats", a la Graella d'activitats ni als seus informes.

## 4. Qui ha de fer cada activitat de recuperació

No cal apuntar manualment qui ha de presentar-se a cada recuperació: a la pantalla **Notes**, en triar una activitat d'extraordinària, la llista d'alumnes es filtra **automàticament** a qui encara té algun dels RA d'aquella activitat no assolit — amb un enllaç "Mostra tot l'alumnat" per si mai cal veure algú més.

## 5. Com es calcula la nota final

Un cop hi ha alguna activitat de recuperació qualificada, cada RA es resol així:

```text
Si el RA ja estava ASSOLIT a l'ordinària        → es manté la nota d'ordinària
Si el RA és NO ASSOLIT i té recuperació qualificada → la nota de la recuperació el substitueix
                                                        (sense límit superior, encara que sigui >5)
Si el RA és NO ASSOLIT i encara no té recuperació   → es manté el resultat d'ordinària (no assolit)
Si el RA és PENDENT (sense evidència)              → es manté pendent; mai es busca cap recuperació
```

Punts importants d'aquesta resolució:

- **La nota de recuperació no es capa a 5**: si un alumne treu un 8 a la recuperació, el RA queda a 8.
- **La recuperació substitueix també el bloqueig per activitat obligatòria**: si un RA estava "no assolit" únicament perquè una activitat obligatòria d'una UT estava suspesa (encara que la mitjana fos ≥5), superar la recuperació el desbloqueja igualment, sense haver de repetir cap activitat obligatòria concreta.
- **La ponderació global no canvia**: la nota final es calcula amb els mateixos pesos de RA que ja calcula l'ordinària (secció 2 de "Com es calcula"). L'extraordinària només substitueix el valor d'alguns RA, mai els pesos.

```text
notaFinal = Σ [ notaFinalRA × pesRA ] / Σ [ pesRA ]
```

## 6. Quan es considera que el mòdul està superat

El mòdul queda **superat** quan **tots** els RA actius acaben "assolits" en la resolució final (secció 5) — amb l'ordinària, amb la recuperació, o amb una combinació de tots dos. N'hi ha prou amb un sol RA no assolit (i sense recuperar) perquè el mòdul continuï "no superat", encara que la nota mitjana final superi el 5.

Això és precisament el que reflecteixen ara totes les pantalles: la nota mitjana **mai** es mostra com a garantia d'aprovat pel seu compte — sempre es comprova RA per RA.

## 7. Número de convocatòria (màxim 4)

Per normativa, un alumne es pot presentar com a màxim a 4 convocatòries d'un mateix mòdul. L'aplicació en porta el compte com un valor **derivat**, no com un número que cal anar sumant a mà:

```text
convocatòriaConsumida = baseline + 1 (l'ordinària d'enguany, sempre)
                                 + 1 (si es presenta a l'extraordinària)
```

- **Alumne de primera matrícula**: `baseline = 0`, així que comença sempre a `1/4`, i puja a `2/4` si es presenta a l'extraordinària.
- **Alumne repetidor**: el o la docent, que reconeix l'alumne, marca la matrícula com a "repetidor" i hi introdueix el `baseline` — les convocatòries que ja portava consumides d'altres cursos (gestiona-ho a "Alumnes" → menú "⋯" → "Gestiona convocatòria"). No cal cap identificador especial entre cursos: n'hi ha prou que el o la docent ho recordi i ho apunti.
- Quan el total arriba a **4/4**, l'aplicació ho marca com **"Exhaurida"** — és només informatiu, no bloqueja cap acció de l'aplicació; la gestió administrativa la fa el centre.

## 8. On es gestiona tot això a l'aplicació

| Pantalla | Per a què serveix |
|---|---|
| **Activitats extraordinàries** | Crear, editar i arxivar les activitats de recuperació (Secció 3). |
| **Notes** | Qualificar-les — l'alumnat es filtra automàticament a qui les necessita (Secció 4). |
| **Convocatòria extraordinària** | Seguiment per alumne: RA pendents, si s'ha presentat, convocatòria consumida i resultat final; i l'acta imprimible. |
| **Alumnes i matrícules** | Columna "Convocatòria" sempre visible; marcar un alumne com a repetidor i el seu `baseline` (Secció 7). La nota final només es mostra si el mòdul ja queda superat; si no, cal clicar "Mostra nota". |
| **Anàlisi de l'alumne / del grup** | Selector "Ordinària · Extraordinària · Total" per veure les mateixes estadístiques (RA assolits, nota) des de cada perspectiva. |
| **Informe individual** | Un cop hi ha extraordinària, la nota de capçalera i "RA assolits" ja reflecteixen la resolució final; un bloc apart en detalla el desglossament. |
| **Graelles** | Pestanya "Extraordinària": taula alumne × RA amb la nota de cada recuperació, en verd si queda assolida i en vermell si no. |

## 9. Resum d'un cop d'ull

| Concepte | Es calcula a partir de |
|---|---|
| RA pendent | Cobertura del RA = 0% |
| RA assolit | Cobertura > 0%, nota ≥ 5, cap obligatòria suspesa |
| RA no assolit | Cobertura > 0%, i (nota < 5 o alguna obligatòria suspesa) |
| RA final | Nota de la recuperació si n'hi ha i el RA era no assolit; si no, es manté el resultat d'ordinària |
| Nota final del mòdul | Mitjana dels RA finals, ponderada amb els mateixos pesos de l'ordinària |
| Mòdul superat | Tots els RA actius "assolits" en la resolució final |
| Convocatòria consumida | baseline + 1 (ordinària) + 1 (si es presenta a l'extraordinària) |
| Convocatòria exhaurida | Convocatòria consumida ≥ 4 |

---

*Aquest document forma part de l'aplicació RA · Avaluació i es pot consultar des de la pantalla "Com funciona l'extraordinària" del menú d'Ajuda.*
