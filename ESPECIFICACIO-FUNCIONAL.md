# Especificació funcional i prompt del projecte RA · Avaluació

## 1. Finalitat del document

Aquest document consolida les decisions funcionals i tècniques preses per desenvolupar l’aplicació local **RA · Avaluació** del mòdul **Sistemes Operatius en Xarxa (SOX) de 2n SMX**.

Ha de servir com a font de veritat, document de requisits i prompt de referència per a les fases futures d’implementació. En cas de contradicció amb el prototip actual, prevalen les decisions d’aquest document.

## 2. Objectiu del projecte

Construir una aplicació local per gestionar l’avaluació contínua per resultats d’aprenentatge (RA) i criteris d’avaluació (CA), amb configuració comuna per als grups A i B i dades acadèmiques independents per grup.

L’aplicació ha de permetre:

- importar les dades inicials d’una plantilla Excel;
- transformar-les a una estructura interna pròpia;
- deixar de dependre de les fórmules de l’Excel després de la importació;
- gestionar cursos, grups, alumnes, RA, CA, activitats, ponderacions i qualificacions;
- calcular notes de CA, RA i mòdul amb un motor intern;
- conservar les dades completament en local;
- generar informes individuals imprimibles;
- funcionar sense connexió a Internet.

## 3. Jerarquia funcional

```text
Curs acadèmic
├── Configuració comuna del mòdul
│   ├── RA
│   │   └── CA
│   ├── tipus d’activitat
│   ├── activitats
│   ├── relacions activitat–CA–RA
│   └── ponderacions
├── Grup A
│   ├── alumnes
│   └── notes
└── Grup B
    ├── alumnes
    └── notes
```

La configuració de RA, CA, activitats, tipus i ponderacions és comuna als grups A i B. Cada grup manté separadament la seva llista d’alumnes, qualificacions, bonificacions i estat d’avaluació de cada activitat.

## 4. Dades generals confirmades

- Mòdul: **Sistemes Operatius en Xarxa**.
- Abreviatura: **SOX**.
- Nivell: **2n SMX**.
- Curs inicial: **2026–2027**.
- Grup importat inicialment des de l’Excel: **grup A**.
- Grup B: es crea inicialment buit i s’emplena manualment o mitjançant CSV.
- Capacitat màxima: **25 alumnes per grup**.
- Es poden conservar diversos cursos acadèmics alhora.
- Només un curs queda marcat com a actiu.
- S’ha de poder canviar de curs mitjançant un selector.
- S’han de poder crear cursos de prova.

## 5. Arquitectura requerida

### 5.1 Model

El model ha de contenir:

- entitats i estructures de dades;
- interfícies de repositori;
- motor de càlcul;
- polítiques d’avaluació;
- persistència i migracions de l’esquema local;
- representació de l’historial i la procedència de les importacions.

### 5.2 Controladors o casos d’ús

Han de gestionar:

- importació d’Excel i CSV;
- validacions;
- previsualització de canvis;
- operacions d’alta, baixa i modificació;
- arxivament i restauració;
- substitució de llistes d’alumnes;
- gestió de qualificacions i bonificacions;
- exportació i restauració de còpies de seguretat;
- coordinació entre la vista, el motor i els repositoris.

### 5.3 Vista

Ha de contenir exclusivament la presentació i interacció:

- dashboard;
- formularis;
- taules;
- diàlegs;
- previsualitzacions d’importació;
- pantalles d’historial;
- informes imprimibles.

La vista no ha d’accedir directament al sistema d’emmagatzematge.

### 5.4 Persistència

- Persistència principal: **IndexedDB**.
- Accés mitjançant interfícies de repositori i un adaptador IndexedDB.
- Desament automàtic de totes les modificacions.
- Esquema versionat i preparat per a migracions.
- Exportació d’una còpia completa en JSON.
- Restauració completa des de JSON.
- Una restauració substitueix totes les dades locals després de mostrar un resum i demanar confirmació.
- No cal oferir una exportació automàtica abans d’una eliminació definitiva.

## 6. Model de dades proposat

Entitats mínimes:

### `AcademicCourse`

- Identificador intern estable.
- Curs acadèmic.
- Mòdul, abreviatura, nivell i estat.
- Indicador de curs actiu o arxivat.

### `ModuleConfiguration`

- Pertany a un curs.
- Agrupa RA, CA, tipus, activitats, relacions i polítiques de càlcul.

### `Group`

- Pertany a un curs.
- Codi A o B.
- Capacitat màxima de 25.

### `Student`

- Identificador intern estable.
- Nom.

### `Enrollment`

- Relació entre alumne, grup i curs.
- Estat actiu o baixa.
- Conserva l’historial encara que l’alumne sigui baixa.

### `LearningResult`

- Codi RA.
- Descripció.
- Ordre.
- Pes global calculat.
- Estat actiu o arxivat.
- Preparació per a regles obligatòries futures.

### `AssessmentCriterion`

- RA pare.
- Codi oficial.
- Descripció.
- Ordre.
- Estat actiu o arxivat.

### `ActivityType`

- Nom.
- Ponderació global del tipus.

### `Activity`

- Nom.
- Tipus.
- Període o trimestre.
- Data opcional.
- Ordre.
- Estat actiu o arxivat.

### `ActivityCriterionLink`

- Activitat.
- CA.
- Percentatge de l’activitat assignat al CA.

### `GroupActivityState`

- Grup i activitat.
- Estat automàtic pendent o avaluada.
- Data i hora en què arriba per primera vegada al llindar.
- Anul·lació manual opcional de l’estat automàtic.

### `Grade`

- Matrícula i activitat.
- Nota base entre 0 i 10.
- Estat: pendent, qualificada o no presentat.
- Nota total derivada de la base i les bonificacions.

### `GradeBonus`

- Qualificació relacionada.
- Valor `+0,5` o `+1`.
- Motiu obligatori.
- Procedència manual o importada.
- Estat actiu o eliminat.

### `GradeHistoryEntry`

- Valor anterior i nou.
- Data i hora del canvi.
- Tipus d’operació.
- També registra restauracions i eliminacions de bonificacions.

### `StudentReportComment`

- Alumne i curs.
- Comentari actual editable.
- Data de tall o avaluació relacionada.
- Només es conserva el comentari actual, no un historial de comentaris.

### `ImportBatch`

- Fitxer d’origen.
- Data d’importació.
- Versió de l’importador.
- Decisions aplicades.
- Errors i advertiments rellevants.

## 7. Excel inicial

Fitxer analitzat:

```text
imports/2-SMX-Generic-Avaluacio per RA.xlsx
```

### 7.1 Fulls reconeguts

- `TRAZABILIDAD`: RA, CA, unitats, instruments, tipus i relacions.
- `PONDERACIÓN`: matriu CA–instrument i ponderacions.
- `INSTRUMENTOS`: alumnes, notes per instrument i projeccions.
- `CRITERIOS`: notes calculades dels CA.
- `APRENDIZAJE`: notes calculades dels RA i nota global.
- `AUXILIAR 1`: pesos bruts CA–instrument.
- `AUXILIAR 2`: pesos normalitzats CA–instrument.
- `Full8`: full de prova que s’ha d’ignorar.

### 7.2 Contingut real detectat

- 6 RA actius.
- 48 CA reals.
- RA7–RA10 són blocs de plantilla i no s’importen.
- 28 instruments actius.
- 17 activitats de tipus `Speedrun`.
- 3 activitats de tipus `PR-Obert`.
- 4 exàmens teòrics.
- 4 exàmens pràctics.
- 22 alumnes reals al grup A.
- Files genèriques fins a 40, però només s’admeten 25 places.
- Les files genèriques només representen places disponibles; no són alumnes actius.
- Les files 26–40 no s’importen.
- No hi ha grup B.
- No hi ha curs acadèmic explícit.
- No hi ha dates d’activitats.
- El tercer trimestre està reservat però buit.

### 7.3 Normalització de noms

Durant la importació es normalitzaran casos evidents, mantenint relacions i notes:

- `ExTeoric40` → `ExTeòric 40`.
- `ExPractic40` → `ExPràctic 40`.

## 8. Compatibilitat i seguretat de la importació

- Formats compatibles: `.xlsx`, `.xls` i `.xlsm`.
- Només s’admet aquesta plantilla i variants amb la mateixa estructura reconeixible.
- Els llibres amb una estructura diferent s’han de rebutjar amb un missatge explicatiu.
- Les macros de `.xlsm` no s’han d’executar mai.
- Només s’han de llegir dades, fórmules i resultats calculats guardats.
- Després d’importar, l’aplicació no ha de dependre de l’Excel.
- Les fórmules de negoci s’han de reproduir al motor intern.

## 9. Procés d’importació Excel

1. Seleccionar el fitxer.
2. Validar extensió, fulls i capçaleres.
3. Llegir fórmules i valors calculats guardats sense executar macros.
4. Construir una estructura provisional.
5. Identificar RA reals, CA reals, instruments, tipus i relacions.
6. Excloure blocs plantilla, columnes buides, `Full8` i files 26–40.
7. Assignar les dades al grup A.
8. Assignar el curs acadèmic `2026–2027` en la importació inicial.
9. Crear el grup B buit si encara no existeix.
10. Mostrar una previsualització completa.
11. Validar pesos, codis, relacions, alumnes i notes.
12. Recalcular amb el motor intern.
13. Comparar, quan sigui possible, els resultats interns amb els valors guardats a l’Excel.
14. Demanar confirmació.
15. Desar-ho tot en una única operació transaccional.

### Importació sobre un curs existent

S’ha de poder importar sobre un curs ja existent. La previsualització ha de permetre seleccionar independentment:

- configuració comuna;
- alumnes del grup A;
- notes del grup A.

L’Excel no modifica directament el grup B. Si canvia la configuració comuna, cal mostrar abans l’impacte calculat sobre les notes dels grups A i B.

## 10. Importació CSV d’alumnes

- Format mínim: una única columna `nom`.
- Les files buides s’ignoren.
- Els noms duplicats bloquegen la importació.
- Més de 25 noms bloquegen i rebutgen tota la importació.
- Menys de 25 noms no generen alumnes genèrics; simplement queden places disponibles.
- La llista es pot ordenar alfabèticament durant la previsualització.
- La importació substitueix tota la llista del grup.
- S’han d’intentar conservar les notes dels alumnes existents.
- Les coincidències exactes es poden associar automàticament.
- Davant accents, ordre diferent, espais o errors menors, s’han de proposar coincidències perquè l’usuari les confirmi.
- Els casos sense correspondència s’han de mostrar abans de confirmar.

## 11. Alumnes, places i baixes

- Cada grup té una capacitat màxima estricta de 25 alumnes.
- Les places buides no són registres d’alumne.
- Les places buides no intervenen en mitjanes, informes ni zeros automàtics.
- Un alumne de baixa conserva matrícula, notes i historial.
- Un alumne de baixa queda exclòs de:
  - zeros automàtics;
  - mitjanes vigents;
  - informes actuals.
- El seu historial ha de continuar disponible per consulta.

## 12. Motor de càlcul compatible amb l’Excel

### 12.1 Pes de cada instrument

```text
pesInstrument = pesTipus / nombreInstrumentsDelTipus
```

### 12.2 Pes brut CA–instrument

```text
pesBrut(CA, instrument)
    = percentatgeAssignatAlCAEnLInstrument × pesInstrument
```

### 12.3 Pes global del CA

```text
pesGlobalCA = Σ pesBrut(CA, instrument)
```

### 12.4 Normalització dins del CA

```text
pesNormalitzat(CA, instrument)
    = pesBrut(CA, instrument) / pesGlobalCA
```

### 12.5 Nota del CA

```text
notaCA(alumne)
    = Σ [notaTotalActivitat × pesNormalitzat(CA, activitat)]
```

### 12.6 Nota del RA

S’ha de conservar el comportament actual de l’Excel:

```text
notaRA = mitjana aritmètica simple dels CA reals del RA
```

No s’ha d’aplicar una mitjana ponderada dels CA dins del RA en aquesta primera versió.

### 12.7 Pes del RA i nota global

```text
pesRA = Σ pesos globals dels CA del RA

notaGlobal = Σ [notaRA × pesRA]
```

## 13. Avaluació contínua i projecció

- El mòdul té com a màxim dos trimestres.
- El tercer trimestre es dedica al mòdul intermodular.
- Les avaluacions són punts de tall d’una avaluació contínua.
- No s’han d’utilitzar els factors fixos 50 % i 100 % de l’Excel.
- La projecció s’ha de calcular segons el pes real de les activitats considerades avaluades en cada grup.

### Activitat considerada avaluada

- El llindar és el 20 % de les 25 places.
- El valor operatiu és fix: **5 qualificacions**.
- Compten per al llindar:
  - notes numèriques;
  - estats `No presentat`.
- Una bonificació sense nota base no compta.
- Quan l’activitat arriba per primera vegada a 5 qualificacions, se’n registra la data i hora.
- A partir d’aquell moment, els buits dels alumnes actius compten com a zero.
- Els alumnes de baixa i les places buides no reben zeros automàtics.
- L’estat es calcula independentment per grup.
- L’usuari pot marcar manualment l’activitat com a avaluada o pendent.
- L’anul·lació manual té prioritat fins que es retira.
- La projecció arriba fins a l’activitat més recent que es considera avaluada.

### Percentatge avaluat

- Percentatge d’un RA: pes dels instruments ja avaluats que contribueixen al RA dividit pel pes total dels instruments vinculats al RA.
- Percentatge global: pes conjunt de les activitats ja avaluades respecte del pes total del mòdul.

## 14. Qualificacions

- Nota base manual: entre 0 i 10.
- Es poden mostrar i editar fins a dos decimals.
- Internament es conserva la precisió necessària per al càlcul.
- `Pendent` és diferent de zero.
- `No presentat` és un estat explícit amb valor de càlcul zero.
- `No presentat` compta per assolir el llindar de 5 qualificacions.
- Una nota buida només passa a computar com a zero quan l’activitat es considera avaluada.
- L’estat d’aprovat es calcula amb la nota decimal real abans d’arrodonir.
- Inicialment, el mòdul està aprovat amb nota global decimal igual o superior a 5.
- En aquesta primera versió no s’exigeix aprovar tots els RA.

## 15. Bonificacions

- Una bonificació és independent de la nota base.
- Valors permesos en noves bonificacions: `+0,5` o `+1`.
- El motiu és obligatori.
- El total pot superar 10.
- Màxim de tres alumnes bonificats per cada combinació de grup i activitat.
- Un mateix alumne pot tenir més d’una entrada de bonificació quan calgui representar imports compostos.
- Una bonificació sense nota base no produeix nota total ni compta com a qualificació.
- Les bonificacions importades de l’Excel han de ser fàcils d’eliminar.
- L’eliminació queda registrada a l’historial.

### Fórmules de notes de l’Excel

- Fórmules com `=9,83+1,5` s’importen com:
  - nota base `9,83`;
  - bonificació `+1`;
  - bonificació `+0,5`;
  - motiu `Importat de l’Excel`.
- Una fórmula amb `+1,5` es divideix en dues bonificacions.
- Les sis bonificacions ja existents a `ExPràctic 30` s’importen excepcionalment encara que superin el límit de tres alumnes.
- Aquestes excepcions queden marcades com a històriques.
- El límit de tres s’aplica a noves bonificacions i a modificacions posteriors.
- Un valor directe superior a 10, sense fórmula de bonificació, s’importa com a nota base 10.
- No cal conservar ni informar del valor directe original superior a 10.

## 16. Historial de qualificacions

- S’ha de conservar cada canvi de qualificació.
- Cal registrar el valor anterior, el valor nou i la data i hora.
- L’historial ha d’incloure canvis de nota base, estat i bonificacions.
- S’ha de poder restaurar un valor anterior.
- La restauració s’ha de registrar com una operació nova; no s’ha de reescriure l’historial.

## 17. Ponderacions i recalculat

- Les ponderacions formen part de la configuració comuna.
- Un canvi afecta els grups A i B.
- Abans de confirmar-lo, s’ha de mostrar una previsualització de l’impacte.
- Després de confirmar-lo, s’han de recalcular totes les notes derivades del curs.
- Les notes derivades de CA, RA i global no són dades mestres editables.

## 18. Altes, baixes, modificacions i arxivament

S’han de poder crear i modificar:

- cursos;
- grups;
- alumnes i matrícules;
- RA;
- CA;
- tipus d’activitat;
- activitats;
- relacions activitat–CA;
- ponderacions;
- qualificacions;
- bonificacions.

Quan un RA, CA o activitat tingui dades associades, la baixa normal ha de ser un arxivament que conservi l’historial.

Els cursos també es poden arxivar. Addicionalment, es poden eliminar definitivament:

- cal advertir que s’eliminaran configuració, grups, notes i historial;
- cal escriure el curs acadèmic per confirmar;
- no cal oferir una còpia JSON automàtica abans d’eliminar.

## 19. Creació d’un curs nou

S’ha de poder clonar la configuració comuna d’un curs anterior.

Es copien:

- RA;
- CA;
- tipus;
- activitats;
- relacions;
- ponderacions.

No es copien:

- alumnes;
- notes;
- bonificacions;
- estats d’avaluació;
- comentaris individuals.

## 20. Informe individual

L’informe imprimible ha de mostrar:

- alumne;
- grup;
- curs acadèmic;
- mòdul;
- nota projectada o final;
- percentatge global del mòdul avaluat;
- nota de cada RA;
- percentatge avaluat de cada RA;
- bonificacions separades, amb activitat, valor i motiu;
- comentari individual editable;
- data de tall o avaluació a què correspon el comentari.

No cal desplegar tots els CA a l’informe principal.

### Comentari

- Només es conserva el comentari actual.
- El comentari s’actualitza i es desa localment.
- Ha d’identificar el tall o avaluació corresponent.
- Canviar la data de tall no pot sobreescriure’l.
- Només es substitueix quan l’usuari prem explícitament `Regenera comentari` i confirma l’acció.

### Arrodoniment de l’informe final

Dashboards, taules i projeccions mostren dos decimals.

A l’informe final, la nota de cada RA i la nota global es mostren com a enters:

```text
part decimal >= 0,75 → enter superior
part decimal < 0,75  → enter inferior
```

Exemples:

- `6,74` → `6`.
- `6,75` → `7`.

L’estat d’aprovat sempre utilitza la nota decimal anterior a aquest arrodoniment.

## 21. Regles obligatòries de RA: ampliació preparada

El model s’ha de deixar preparat perquè, en una versió futura, una activitat o examen obligatori pugui tenir una nota mínima associada a un RA.

Comportament futur previst:

- si no se supera l’activitat obligatòria, el RA consta com a `No assolit` independentment de la nota calculada;
- la nota numèrica del RA queda oculta per defecte;
- un botó `Mostra nota` permet consultar-la.

Aquesta primera implementació només ha de preparar el model. No ha de crear encara la pantalla ni aplicar bloquejos.

## 22. Interfície i entorn d’ús

- Idioma complet de la interfície: català.
- Informes i validacions: català.
- Usuari únic local, sense autenticació ni contrasenyes.
- Funcionament complet fora de línia.
- Plataforma principal: Windows.
- Navegadors compatibles: versions actuals de Microsoft Edge i Google Chrome.
- Ús exclusiu en ordinador.
- Resolució mínima objectiu: `1366 × 768`.
- Cal conservar l’estètica actual:
  - menú lateral;
  - targetes;
  - colors;
  - dashboard;
  - llenguatge visual general.

No cal dedicar desenvolupament específic a mòbil o tauleta.

## 23. Pantalles mínimes previstes

- Selector i gestió de cursos.
- Dashboard del curs i del grup.
- Gestió de grups i places.
- Taula d’alumnes.
- Importació CSV amb conciliació de noms.
- Gestió de qualificacions per activitat.
- Historial de qualificacions.
- Gestió de bonificacions.
- Gestió de RA i CA.
- Gestió d’activitats i tipus.
- Editor de relacions activitat–CA.
- Editor de ponderacions amb validació i previsualització.
- Importació Excel amb selecció de seccions.
- Còpies JSON.
- Informe individual imprimible.
- Consulta d’elements arxivats.

## 24. Validacions mínimes

- Màxim de 25 alumnes per grup.
- Rebuig de CSV amb més de 25 noms.
- Rebuig de noms duplicats al CSV.
- Codis de RA i CA únics dins del curs.
- Activitats identificables sense ambigüitat.
- Suma de pesos coherent.
- Repartiment CA d’una activitat igual al 100 %.
- Nota base entre 0 i 10.
- Bonificació només `+0,5` o `+1`.
- Motiu obligatori de bonificació.
- Màxim de tres alumnes bonificats per grup i activitat, excepte dades històriques importades.
- Cap bonificació efectiva sense nota base.
- Confirmació reforçada per a eliminacions definitives.
- Previsualització abans de substituir alumnes, importar sobre un curs o canviar ponderacions.

## 25. Ampliacions i millores futures

### Regles obligatòries per assolir RA

- Associar exàmens o activitats imprescindibles a un RA.
- Definir nota mínima.
- Mostrar `No assolit` encara que la mitjana sigui suficient.
- Ocultar la nota calculada fins que l’usuari la sol·liciti.

### Motor de càlcul configurable

- Permetre escollir entre mitjana simple i ponderada dels CA.
- Configurar polítiques diferents per curs.
- Crear simulacions sense aplicar-les immediatament.
- Versionar configuracions i ponderacions.

### Informes avançats

- Historial de comentaris per tall.
- Informe detallat de CA opcional.
- Informes de grup.
- Exportació directa a PDF.
- Plantilles institucionals configurables.
- Comparatives entre talls i cursos.

### Importació i interoperabilitat

- Assistents de mapatge per a altres plantilles Excel.
- Importació de dates i calendaris.
- CSV amb identificadors estables i estat de matrícula.
- Exportació de notes a CSV o Excel.
- Detecció més avançada de duplicats.

### Persistència i desplegament

- Aplicació d’escriptori empaquetada.
- Adaptador SQLite mantenint les mateixes interfícies de repositori.
- Còpies de seguretat programades.
- Xifratge opcional de les dades locals.

### Experiència d’usuari

- Accions massives de qualificació.
- Navegació completa amb teclat.
- Desfer operacions recents.
- Filtres avançats i vistes personalitzades.
- Alertes de RA amb poca cobertura.
- Indicadors de dades pendents o incoherents.

### Qualitat tècnica

- Proves unitàries exhaustives del motor de càlcul.
- Proves de regressió comparant resultats amb l’Excel original.
- Proves d’importació amb fitxers vàlids i corruptes.
- Proves d’integració dels repositoris.
- Proves d’impressió.
- Registre de migracions i compatibilitat de còpies JSON.

## 26. Criteri general d’implementació

Abans de cada fase:

1. Revisar aquest document.
2. Identificar les entitats i casos d’ús afectats.
3. Implementar primer el model i les regles.
4. Afegir després els controladors i repositoris.
5. Connectar finalment la vista.
6. Validar els càlculs amb casos coneguts de l’Excel.
7. Evitar dependències directes entre components visuals i IndexedDB.
8. No reintroduir fórmules d’Excel com a motor permanent.

## 27. Prompt reutilitzable

> Desenvolupa l’aplicació local RA · Avaluació seguint íntegrament `ESPECIFICACIO-FUNCIONAL.md`. Mantén una separació estricta entre model, controladors/casos d’ús, vista i adaptadors de persistència. Utilitza un model intern independent de l’Excel, IndexedDB darrere de repositoris i un motor de càlcul provat que reprodueixi les regles confirmades. Conserva l’estètica actual d’escriptori, treballa en català i no modifiquis cap decisió funcional sense assenyalar explícitament el conflicte i demanar validació. Implementa els canvis per fases petites, verificables i amb proves proporcionals al risc.

## 28. Full de ruta d’implementació

Aquesta secció registra l’estat real del desenvolupament i les properes fases previstes, per poder continuar el treball en sessions diferents sense perdre el fil. Cada fase s’ha de completar íntegrament (implementació + verificació) abans de passar a la següent, seguint el criteri general de la secció 26.

### Fase 0 — Neteja del prototip anterior · **Feta**

- Eliminats `src/model/course.ts` i `src/controllers/evaluation.ts`: un prototip amb dades fictícies (`Math.sin` per generar notes) que no estava connectat a l’aplicació real.
- Verificat que `tsc --noEmit`, `npm test` i `npm run build` seguien passant després de l’eliminació.
- Commit: `e935f2a`.

### Fase 1 — Validar l’importador amb el fitxer Excel real · **Feta**

- Afegit `tests/importer.test.ts`, que carrega `imports/2-SMX-Generic-Avaluacio per RA.xlsx` real amb `importEvaluationWorkbook` i verifica:
  - les xifres confirmades a la secció 7.2 (6 RA, 48 CA, 28 activitats, 22 alumnes, 407 notes, cap advertiment);
  - els pesos globals de cada RA contra els valors guardats a la fulla `APRENDIZAJE` (tolerància 1e-4);
  - les notes projectades d’alumnes completament avaluats contra la columna de nota global de `APRENDIZAJE` (tolerància 0,005) per a alumnes sense notes brutes superiors a 10;
  - el truncament a 10 d’una nota directa superior a 10 sense fórmula (secció 15), amb el cas real de `BENET BACH, ERIC` a `Projecte 2` (valor brut 11,36 → nota base 10);
  - la separació de fórmules `=base+bonificació` de l’Excel en nota base i bonificacions;
  - el rebuig de fitxers amb extensió no admesa;
  - la validació del CSV d’alumnes (duplicats, límit de 25, files buides, ordenació en català).
- **Descoberta durant la verificació**: alguns alumnes (p. ex. `BENET BACH, ERIC`, `CORTES ROVIRA, EDURNE`, `CSONKA, GIULIA ANDREEA`, `PUIGVÍ SANGLAS, GIL`) tenen notes projectades que divergeixen de l’Excel original fins a ~0,04 punts sobre 10. S’ha confirmat que la causa és sempre una nota bruta superior a 10 sense fórmula de bonificació a l’Excel (p. ex. l’11,36 de `BENET BACH` a `Projecte 2`): el motor intern l’importa correctament truncada a 10 (secció 15), mentre que l’Excel original la fa servir sense truncar en els seus propis càlculs guardats. La divergència és, doncs, intencionada i correcta, no un error de l’importador ni del motor de càlcul. Els pesos (`pesGlobalCA`, `pesRA`) i les notes de tots els alumnes sense aquest cas coincideixen exactament amb l’Excel.
- Fitxers afectats per la neteja associada: `src/controllers/database.ts`, `src/controllers/importers.ts` i `src/model/repository.ts` ara importen `../model/domain.ts` amb l’extensió explícita (com ja feia `calculation.ts`), necessari perquè `node --experimental-strip-types --test` pugui resoldre els mòduls sense passar per Vite.

### Fase 2 — Editor de relacions activitat–CA i ponderacions amb previsualització real · **Feta**

- Afegit `LinksEditor` (obert amb el botó “CA (n)” de cada targeta a la pantalla Activitats): repartiment de l’activitat entre els CA, agrupats per RA, amb indicador de suma en viu i el botó “Desa” bloquejat fins que el total sigui 100 % (secció 24). Desar substitueix tots els `ActivityCriterionLink` de l’activitat pels valors de l’esborrany (posar un CA a 0 equival a eliminar la relació).
- La pantalla “RA, CA i pesos” ara té un mode d’edició explícit (botó “Edita”) per als pesos dels tipus d’activitat. En comptes del `confirm()` anterior, el botó “Previsualitza impacte” obre `WeightImpactPreview`: una taula real, per als grups A i B, amb la nota projectada de cada alumne actiu abans i després del canvi i la diferència en color. El botó “Aplica els canvis” queda bloquejat si la suma de pesos no és 100 % (secció 17).
- **Verificat manualment amb Playwright** contra el fitxer Excel real importat (28 activitats, 48 CA, 22 alumnes): l’editor de relacions calcula bé el 100 % i el bloqueig en desactivar-lo; la previsualització amb pesos sense canviar mostra diferència 0,00 per als 22 alumnes (validant que `WeightImpactPreview` reprodueix exactament `calculateStudent`); amb un canvi real de pesos (Speedrun 20 %→50 %) mostra l’avís de suma incorrecta, el botó “Aplica” bloquejat i diferències coherents (positives o negatives segons el rendiment de cada alumne en Speedrun). Cap error de consola.
- CSS: nova classe `.linkRow` a `globals.css` (variant de `.caRow` amb una tercera columna per al percentatge), sense tocar les regles existents.

### Fase 3 — Previsualització d’importació sobre un curs existent · **Feta**

- Substituïts els `confirm()` encadenats del component `Data` per `ImportPreviewModal`: en seleccionar un Excel, s’obre una previsualització amb tres caselles independents (“Configuració comuna”, “Alumnes del grup A”, “Notes del grup A”), el resum de xifres detectades i els advertiments de l’importador.
- La modal calcula i mostra, en viu segons les caselles marcades, una taula d’“Impacte” per als grups A i B amb la nota projectada de cada alumne actiu abans i després d’aplicar la importació (aparellant alumnes pel nom normalitzat, perquè funcioni tant si es reemplaça la llista d’alumnes com si no). El botó “Aplica la importació” queda bloquejat si no hi ha cap casella marcada.
- L’Excel no toca mai el grup B directament: el grup B només apareix a la previsualització quan canvia la configuració comuna (les seves notes es recalculen amb els pesos nous), tal com exigeix la secció 9.

### Fase 4 — Pantalles que falten · **Feta**

- **Gestió de cursos**: nova pestanya “Cursos” (`Courses`) amb un formulari per crear un curs nou clonant la configuració comuna de qualsevol curs existent (no només l’actiu) i marcar-lo com “de prova” (nou camp `isTest` a `AcademicCourse`), i una taula amb tots els cursos i accions Selecciona / Marca-Treu de prova / Arxiva-Restaura / Elimina. En arxivar el curs actiu s’activa automàticament un altre curs no arxivat si n’hi ha.
- **Consulta d’elements arxivats**: nova pestanya “Arxivats” (`Archived`) amb quatre panells de només lectura + acció de restauració: RA arxivats, CA arxivats (agrupats amb el seu RA), activitats arxivades i alumnes de baixa dels dos grups.
- Com a efecte derivat necessari, s’ha afegit el commutador d’arxivar/restaurar per a CA individuals a la pantalla “RA, CA i pesos” (abans no existia cap manera d’arxivar un CA sol).
- **Verificat amb Playwright** contra el fitxer Excel real: creació i clonació de curs, marcatge de prova, arxivar/restaurar/seleccionar/eliminar un curs, arxivar un RA i un CA des de Configuració i veure’ls (amb botó “Restaura”) a Arxivats, donar de baixa un alumne i veure’l (amb “Reactiva”) a Arxivats, i la previsualització d’importació amb les tres caselles, l’impacte per alumne i el bloqueig del botó “Aplica” sense cap casella marcada. Cap error de consola.

### Fase 5 — Ampliacions previstes (secció 25) · **Pendent**

- Un cop les fases anteriors estiguin sòlides: regles obligatòries de RA (el model ja té el camp `requiredRule` preparat), exportació a PDF, accions massives de qualificació i altres millores de la secció 25, per ordre de prioritat a decidir.

### Registre de decisions durant la implementació

Si durant una fase cal desviar-se d’una decisió d’aquest document, cal anotar-ho aquí amb la data i el motiu abans de continuar, en lloc de modificar silenciosament les seccions anteriors.
