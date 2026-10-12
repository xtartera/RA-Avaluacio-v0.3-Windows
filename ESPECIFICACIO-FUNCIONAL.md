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

### Fase 5 — Pantalla de consulta de relacions activitat–RA–CA · **Feta**

- Afegit `RelationsOverview`, accessible amb un commutador “Targetes / Relacions RA · CA” a la pantalla Activitats (al costat del botó “Nova activitat”), que substitueix la graella de targetes per una taula de només lectura: una fila per activitat amb els seus RA i CA agrupats per RA i el percentatge assignat a cada CA, sense haver d’obrir cap modal.
- Cada xip de CA mostra en el `title` (tooltip) el pes final sobre el mòdul (percentatge × pes de l’activitat dins el seu tipus, és a dir `pesBrut(CA, activitat)`), calculat reaprofitant `activityWeights()` del motor de càlcul.
- Detecta i avisa (banner vermell a dalt de la taula) dels CA actius que no tenen cap activitat associada.
- **Verificat amb Playwright** contra el fitxer Excel real: 28 files (una per activitat), 530 xips de relació renderitzats, cap CA orfe detectat (com correspon a un curs ja configurat correctament), el commutador Targetes/Relacions funciona en ambdós sentits. Cap error de consola.
- **Ampliació posterior**: la vista “Targetes” de la mateixa pantalla també mostra ara, a cada targeta d’activitat, un xip per RA amb el percentatge sumat dels CA d’aquell RA amb valor a l’activitat (funció `raShares`), perquè no calgui canviar a la vista “Relacions” per veure de seguida quins RA toca una activitat i amb quin pes. Verificat que els percentatges de cada targeta sumen 100 %.

### Fase 6 — Graelles globals a l’estil dels fulls INSTRUMENTOS i APRENDIZAJE · **Feta**

- Dues pantalles de només lectura inspirades en l’estructura dels fulls `INSTRUMENTOS` i `APRENDIZAJE` de `imports/2-SMX-Generic-Avaluacio per RA.xlsx`, per tenir una visió de conjunt que abans no existia (la pantalla “Notes” només mostra una activitat alhora).
- Afegida una pestanya pròpia “Graelles” al menú lateral (entre “Activitats” i el grup “Configuració”), amb un commutador intern “Graella d’activitats / Graella de RA” (mateix patró visual `switch` que “Targetes / Relacions RA · CA” a Activitats). La pantalla “Notes” es manté sense canvis, dedicada només a qualificar una activitat alhora.
- **Graella d’activitats** (`ActivityGrid`, estil `INSTRUMENTOS`): una taula amb els alumnes actius del grup en files i totes les activitats actives en columnes, mostrant `totalGrade` de cada alumne a cada activitat (o “—” si no té nota). Només lectura; per editar una nota es continua fent des de “Qualificar”. Amb desplaçament horitzontal propi perquè no trenqui el disseny amb moltes activitats.
- **Graella de RA** (`RaGrid`, estil `APRENDIZAJE`): una taula amb els alumnes en files i els RA actius en columnes, amb la nota projectada de cada RA (`calculateStudent(...).learningResults`) més una columna final “Global” amb la nota projectada del mòdul, equivalent a la columna “PROGRES DE CADA ALUMNO” de l’Excel.
- Ambdues graelles reaprofiten `calculateStudent()` i `totalGrade()` del motor de càlcul sense lògica nova, i respecten el selector de grup (A/B) ja existent a la capçalera de la pantalla.
- **Verificat amb Playwright** contra el fitxer Excel real: la pestanya “Graelles” apareix al menú lateral i hi mostra 22 alumnes actius, 28 columnes d’activitat a la graella d’activitats (valors i “—” coherents amb les notes introduïdes) i 6 columnes de RA més la columna “Global” a la graella de RA (valors coincidents amb els de la pantalla Resum); la pantalla “Notes” es manté intacta. `tsc --noEmit`, `npm test` (12/12) i `npm run build` segueixen passant. Cap error de consola.

### Fase 7 — Ampliacions previstes (secció 25) · **Pendent**

- Exportació a PDF, accions massives de qualificació i altres millores de la secció 25, per ordre de prioritat a decidir. (Les regles obligatòries de RA que aquesta fase esmentava han quedat resoltes, més aviat del previst, per les Unitats de treball descrites tot seguit; el motor de càlcul configurable —mitjana simple/ponderada dels CA— també s’ha avançat, vegeu més avall.)

### Motor de càlcul configurable: mitjana simple o ponderada dels CA (fora de fase, part de la secció 25) · **Feta**

- La secció 25 (“Motor de càlcul configurable”) proposava quatre idees de mida molt diferent. Aquest increment cobreix les tres primeres — **commutador simple/ponderada**, **política per curs** i **simulació abans d’aplicar** — i deixa **“versionar configuracions i ponderacions”** (un historial complet de canvis de configuració al llarg del temps, no només de notes) pendent per a una sessió pròpia, per decisió explícita presa abans de començar.
- **Model**: nou camp `raAveraging: "simple" | "weighted"` a `ModuleConfiguration` (per defecte `"simple"`, igual que el comportament que ja hi havia i que reprodueix l’Excel original — cap curs existent canvia de comportament sense que algú ho triï explícitament). Migrat a `migrateDatabase()` igual que `workUnits`, perquè les dades desades abans d’aquest camp no trenquin l’aplicació.
- **Motor de càlcul** (`calculation.ts`): nova funció `raScore()` que calcula la nota d’un RA de dues maneres, segons la política:
  - `simple` (comportament original, secció 12.6): `notaRA = mitjana aritmètica dels CA avaluats`.
  - `weighted` (nova): `notaRA = Σ(notaCA × pesGlobalCA) / Σ(pesGlobalCA)`, reaprofitant el `pesGlobalCA` que ja es calculava per obtenir el `pesRA` — sense inventar cap valor nou al model.
  - Nou test que confirma que amb dos CA de pesos molt diferents (10 % / 90 %) dins un mateix RA, la mitjana simple i la ponderada donen resultats clarament diferents i correctes (6,0 vs. 3,6 amb notes 9 i 3).
- **Simulació abans d’aplicar**: nou panell “Motor de càlcul” a la pantalla “RA, CA i pesos”, amb el mateix flux ja establert per a “Tipus i ponderacions” (Edita → tria l’opció → “Previsualitza impacte” → taula d’abans/després per alumne i grup → “Aplica el canvi”). Per no duplicar aquesta lògica ja existent a `WeightImpactPreview`, se n’ha extret la part comuna (`computeImpactRows()` i `ImpactRows`), i el nou `AveragingImpactPreview` la reaprofiteix.
- **Verificat amb Playwright** contra el fitxer Excel real: la previsualització mostra diferències reals (petites, perquè els pesos dels CA del curs importat ja són força equilibrats) per alumne i grup; en aplicar el canvi, el panell mostra “Mitjana ponderada pel pes de cada CA” i ho manté després de recarregar la pàgina (persistit a IndexedDB). `tsc --noEmit`, `npm test` (17/17, incloent el test nou i la migració de `raAveraging`) i `npm run build` correctes. Cap error de consola.

### Unitats de treball (UT) amb RA obligatori (fora de fase) · **Feta**

Amplia la idea de la secció “Regles obligatòries per assolir RA” (línia 629, captada el 2026-09-04): en comptes d’una sola activitat obligatòria per RA, es defineixen unitats de treball que agrupen diverses activitats, i cada UT es vincula a un o més RA. Decisions preses a l’inici d’aquesta feina (resolen les preguntes obertes que havia deixat la captura anterior):

- **Model**: la UT és una entitat nova (`WorkUnit`, dins `ModuleConfiguration.workUnits`), no una simple etiqueta. Camps: `id`, `name`, `activityIds` (totes les activitats membres), `requiredActivityIds` (el subconjunt marcat com a “obligatòries”, és a dir els exàmens que cal aprovar), `learningResultIds`, `order`, `status`.
- **Disparador**: el RA queda “No assolit” si l’alumne suspèn (nota total < 5) **qualsevol** de les activitats marcades explícitament com a obligatòries dins la UT en crear-la — no cal que sigui d’un tipus d’activitat concret ni que se suspenguin totes.
- **Cardinalitat UT↔RA**: una UT es pot vincular a un o més RA (com les activitats normals amb els CA).
- **Nota numèrica**: es manté oculta per defecte rere un botó “Mostra nota” quan el RA està bloquejat, tal com ja preveia la secció 21.
- El camp `requiredRule` de `LearningResult` (placeholder de la idea original d’una sola activitat obligatòria) ha quedat substituït per aquest disseny i s’ha eliminat del model.

**Model i motor de càlcul** (`src/model/domain.ts`, `src/model/calculation.ts`): nova funció `blockingWorkUnits(course, group, enrollmentId, learningResultId)` que retorna les UT actives que bloquegen aquell RA per aquell alumne (una UT arxivada, o una activitat obligatòria encara no qualificada, no bloquegen). `StudentCalculation.learningResults` incorpora `blockedBy: WorkUnit[]` per cada RA, calculat dins `calculateStudent` sense alterar `globalScore` (el bloqueig és només d’estat/visualització, no canvia el pes intern dels RA en la nota global, seguint estrictament “amb independència de la nota calculada”). Dos tests nous a `tests/calculation.test.ts`: una UT bloqueja el RA encara que la nota calculada surti aprovada (fixture amb un examen de pes petit suspès i projectes de pes gran aprovats), i una UT arxivada o un examen encara no qualificat no bloquegen.

**Gestió de UT**: nou panell “Unitats de treball (UT)” a la pantalla “RA, CA i pesos”, sota els dos panells existents. Llista les UT amb els RA vinculats, el nombre d’activitats i quines són obligatòries, amb “Edita”/“Arxiva”/“Restaura”. El botó “Nova UT” obre `WorkUnitEditor`: nom, checkboxes de RA vinculats, i una llista d’activitats amb dos checkboxes per fila (“Membre” i “Obligatòria”, aquesta última només activable si l’activitat és membre). Bloquejat fins que hi hagi un nom, almenys un RA i almenys una activitat. Les UT arxivades es poden restaurar des de la pantalla “Arxivats” (nou panell “UT arxivades”, mateix patró que RA/CA/activitats).

**Visualització del bloqueig**: a l’informe individual (`StudentReport`), quan un RA està bloquejat es mostra una etiqueta vermella “No assolit” (amb el nom de la UT causant al subtítol) en lloc de la nota, amb un enllaç “Mostra nota” (`noPrint`) que la revela sota demanda; a la “Graella de RA” (pestanya Graelles) es mostra “No assolit” a la cel·la corresponent amb un tooltip amb el nom de la UT. El Resum (mitjanes de grup) no s’ha tocat: continua mostrant la nota calculada tal qual, sense reflectir-hi el bloqueig individual.

- **Verificat amb Playwright** contra el fitxer Excel real: creada una UT vinculada a RA1 amb “Projecte 1” com a única activitat obligatòria; la Graella de RA marca inmediatament “No assolit” a tots els alumnes amb nota suspesa a Projecte 1 (sense necessitat de cap acció addicional, purament derivat de les dades existents); l’informe individual d’un alumne bloquejat mostra l’etiqueta vermella amb el nom de la UT i, en prémer “Mostra nota”, revela el 0 real i canvia l’enllaç a “Amaga”. `tsc --noEmit`, `npm test` (14/14, incloent els 2 tests nous) i `npm run build` correctes. Cap error de consola.

### Percentatge de cada RA a la Graella de RA (fora de fase) · **Feta**

- Sota de cada codi de RA a la capçalera de la “Graella de RA” (pestanya Graelles) hi surt ara el percentatge que aquell RA representa sobre la nota global del mòdul, calculat com `pesRA = Σ pesos globals dels CA del RA` (secció 12.7).
- Extreta la lògica de `pesGlobalCA` i `pesRA` a `criterionWeights()` i `raWeights()` (noves a `src/model/calculation.ts`), reaprofitades tant per la graella com per `calculateStudent`, en comptes de dur-la duplicada. Eliminat de pas un mapa `contribution` que no s’arribava a llegir enlloc.
- **Verificat** amb `npm test` (12/12, inclòs el test que compara els pesos de RA amb els guardats a la fulla `APRENDIZAJE` de l’Excel real) i amb Playwright contra el mateix fitxer: els sis percentatges (8,0 / 17,0 / 24,0 / 17,0 / 10,0 / 24,0 %) sumen exactament 100 %. Cap error de consola.
- **Ampliació posterior**: la mateixa fila de percentatges es mostra també a la pantalla Activitats, entre la barra d’accions (Targetes/Relacions + “Nova activitat”) i les targetes o la taula de relacions, amb un avís (`.risk`) si la suma no arriba al 100 %. Com que `raWeights()` llegeix directament `course.configuration` a cada render, els percentatges es recalculen sols en crear, arxivar o relacionar activitats i CA, sense cap plumbing addicional. **Verificat amb Playwright**: en moure 5 punts d’assignació d’un CA de RA5 a un CA de RA1 dins “Projecte 1” des de `LinksEditor` i desar, la fila passa de `RA1 8,0 %` a `RA1 8,1 %` a l’instant, mentre que redistribuir punts entre CA d’un mateix RA no altera el seu percentatge (comprovat amb RA1 sense canvis en repartir de nou les seves pròpies CA). Cap error de consola.

### Pesos per tipus, pes de cada activitat i color per tipus a la pantalla Activitats (fora de fase) · **Feta**

- El component `RaWeightsRow` s’ha ampliat a `WeightsSummary`: sota la fila de pesos de RA hi ha ara una segona fila, també de només lectura, amb la ponderació de cada tipus d’activitat (la mateixa dada editable a “RA, CA i pesos”), amb el mateix avís si la suma no arriba al 100 %. Visible tant a la vista “Targetes” com a “Relacions”.
- Cada targeta d’activitat mostra ara, a la cantonada superior dreta, el pes real de l’activitat sobre la nota global del mòdul (`activityWeights(course).get(activity.id)`, la mateixa xifra que ja sortia dins l’“Informe” de l’activitat), reaprofitant la classe `mark` de `globals.css` que ja hi era definida però no s’usava enlloc.
- Assignat un color per tipus d’activitat (`typeColor()`, paleta fixa de 6 colors segons la posició del tipus a `activityTypes`): vora esquerra de 4px a la targeta i color del text del tipus, i el mateix color al xip de la fila “Ponderació per tipus d’activitat”, fent-hi de llegenda.
- **Verificat amb Playwright** contra el fitxer Excel real: “Ponderació per tipus d’activitat” mostra Speedrun 20,0 % · PR-Obert 20,0 % · ExPràctic 30,0 % · ExTeòric 30,0 %; les targetes de Speedrun mostren 1,2 % (20 %/17 activitats), les de PR-Obert 6,7 % (20 %/3) i les d’examen 7,5 % (30 %/4), coherent amb el nombre d’activitats actives de cada tipus; cada tipus té un color de vora diferent i coincident amb el seu xip a la fila de ponderacions. `tsc --noEmit`, `npm test` (12/12) i `npm run build` correctes. Cap error de consola.

### Capçalera fixa a la pantalla Activitats (fora de fase) · **Feta**

- A la pestanya Activitats (només aquesta pantalla), el títol amb el canviador de grup (`.head`) i la barra pròpia d’Activitats (commutador Targetes/Relacions, botó “Nova activitat” i les dues files de `WeightsSummary`) queden fixos en fer scroll; per sota, només s’desplacen les targetes o la taula de relacions.
- Implementat amb dues classes noves a `globals.css` (`.headSticky`, aplicada condicionalment a `.head` només quan `tab==="activitats"`, i `.actSticky`, que embolcalla la barra d’accions i `WeightsSummary` dins `Activities`), totes dues `position:sticky` amb fons opac (`var(--bg)`) perquè les targetes no s’hi transparentin. El desplaçament de la segona (`top:179px`) s’ha ajustat mesurant amb Playwright l’alçada real de la primera perquè quedin enganxades sense buit ni encavalcament.
- Les altres pestanyes (Resum, Alumnes, Notes, Graelles, etc.) no reben la classe `.headSticky` i mantenen el comportament de scroll normal.
- **Verificat amb Playwright**: `.headSticky` només apareix al DOM quan la pestanya activa és Activitats; en fer scroll avall (targetes i taula de relacions) el títol, el canviador de grup, el commutador Targetes/Relacions, “Nova activitat” i les dues files de pesos quedaven fixos exactament un sota l’altre (179px de capçalera combinada, sense forat ni solapament) mentre les targetes hi passaven per sota. Cap error de consola. `tsc --noEmit`, `npm test` (12/12) i `npm run build` correctes.

### Millora visual del Resum del grup (fora de fase) · **Feta**

- Corregits dos bugs visuals preexistents a `globals.css`: la insígnia del codi de RA (`.ra>b`, `.configRow>b`, `.reportRa b`) i la barra de cobertura de cada RA (`.ra u`) no tenien cap color de fons definit i eren invisibles.
- Ampliada la targeta “Alumnes aprovats” amb una barra de proporció aprovats/suspesos.
- Nou gràfic “Distribució de notes”: histograma amb 5 franges (Insuficient/Suficient/Bé/Notable/Excel·lent), Insuficient en vermell (color d’estat) i la resta en una rampa seqüencial d’un sol to verd de clar a fosc segons el nivell.
- Nou panell “Aprovats per RA”: una barra de proporció aprovats/suspesos per a cada RA, per detectar de seguida quin RA arrossega més suspesos.
- Colors reaprofitats dels ja existents a l’aplicació (`.ok`/`.risk`: verd `#15825f`, vermell `#c54c5c`) i validats amb l’script `validate_palette.js` de l’skill de visualització de dades: separació CVD 6,3 (banda mínima legal), per això totes les barres porten sempre etiqueta numèrica directa i llegenda, mai només color.
- **Verificat amb Playwright** contra el fitxer Excel real: els dos bugs de color es veuen corregits, els gràfics nous renderitzen amb els comptatges correctes (9+3+5+3+2=22 alumnes actius) i cap error de consola.

### Informe per activitat (fora de fase) · **Feta**

- Cada targeta de la pantalla Activitats té ara un quart botó “Informe” que obre `ActivityReport`, un modal amb tota la informació rellevant d’aquella activitat un cop avaluada: tipus, trimestre, data i estat; mitjana, aprovats/suspesos (amb la mateixa barra de proporció del Resum), bonificacions aplicades i pes de l’activitat sobre la nota del mòdul; l’histograma “Distribució de notes” (les mateixes 5 franges del Resum, però calculades només amb les notes d’aquesta activitat); i el detall de RA i CA treballats amb el percentatge de cadascun (reaprofitant `raShares` de la Fase 5).
- Refactor de suport: `computeBands`, `Histogram` i `PassBar` s’han extret com a funcions reutilitzables perquè el Resum del grup i aquest informe comparteixin exactament la mateixa lògica de franges i el mateix component visual, sense duplicar-los.
- **Verificat amb Playwright** contra el fitxer Excel real: els 28 botons “Informe” obren el modal correcte, i les dades del modal (p. ex. RA1 70% · RA5 30% a “Projecte 1”) coincideixen amb els xips ja mostrats a la targeta. Cap error de consola.

### Accés directe a qualificar des de la targeta d’activitat (fora de fase) · **Feta**

- Cada targeta d’activitat té ara un botó destacat “Qualifica” (el primer del peu, amb estil fosc) que porta directament a la pantalla Notes amb aquella activitat ja preseleccionada al desplegable, sense haver de buscar-la manualment entre totes les activitats del curs.
- Implementat amb un estat `focusActivity` a `Home`, passat a `Grades`, que sincronitza el desplegable d’activitat amb un `useEffect` i després es neteja perquè no torni a forçar la selecció si l’usuari canvia d’activitat manualment.
- Efecte derivat necessari: `.activities footer .dark` s’ha afegit a `globals.css` perquè un botó amb `className="dark"` dins del peu d’una targeta d’activitat es pinti fosc (el reset de botons de `.activities footer button` tenia més especificitat que `.dark` sol i l’anul·lava).
- **Verificat amb Playwright** contra el fitxer Excel real: clicar “Qualifica” a la targeta de “Projecte 3” (la tercera, no la primera) porta a Notes amb “Projecte 3” exactament seleccionat. Cap error de consola.

### Detall d’aprovats/suspesos a cada RA del Resum (fora de fase) · **Feta**

- Cada fila de RA al panell “Resultats d’aprenentatge” del Resum mostra ara, sota la descripció i la barra de cobertura que ja hi havia, una segona línia amb la mateixa anàlisi que ja es feia a nivell de grup (barra verd/vermell + comptador), aquí calculada per aquell RA: `X/Y aprovats · Z suspesos` (nota decimal del RA ≥ 5), amb la mateixa paleta que la targeta “Alumnes aprovats” i el panell “Aprovats per RA”.
- No s’ha mogut ni reestructurat cap fila: `.ra` ara admet `flex-wrap`, i la nova línia (`.raDetail`) és un quart fill amb `flex-basis:100%` que cau a sota per l’ample complet, alineada amb la descripció (mateix indentat de 56 px que `.caRow`/`.linkRow`).
- **Verificat amb Playwright** contra el fitxer Excel real: els 6 RA mostren comptadors que sumen sempre 22 (p. ex. RA1 12/22 aprovats · 10 suspesos), coherents amb els mateixos càlculs del panell “Aprovats per RA”. `tsc --noEmit`, `npm test` (12/12) i `npm run build` correctes. Cap error de consola.

### Interruptor visual per a l’estat manual d’activitat (fora de fase) · **Feta**

- El botó de text “Estat manual” de la pantalla Notes s’ha substituït per un component `Toggle` reutilitzable: un interruptor on/off (gris apagat / verd `#15825f` encès amb el cercle desplaçant-se) amb `role="switch"` i `aria-checked`. El clic continua fent exactament el mateix que abans (alternar `manualOverride` entre `"evaluated"` i `"pending"` a `GroupActivityState`); només ha canviat la representació visual.
- **Verificat amb Playwright**: `aria-checked` passa de `false` a `true` i de nou a `false` en clicar dues vegades, i el cercle es desplaça visualment d’esquerra (gris) a dreta (verd). `tsc --noEmit`, `npm test` (12/12) i `npm run build` correctes. Cap error de consola.

### Valor anterior i nou visibles a l’historial de qualificacions (fora de fase) · **Feta**

- La nota anterior i la nova **ja es guardaven** a cada `GradeHistoryEntry` (`previous`/`next`, còpia completa del `Grade` — secció 16), i és precisament el que feia servir el botó “Restaura”; el que faltava és que el modal `HistoryModal` no ho mostrava, només l’acció i la data/hora.
- Afegida una línia `0,00 → 9,99` (nota base + bonificacions, amb “No presentat”/“pendent”/“—” quan correspon) sota el nom de l’acció a cada fila de l’historial, calculada amb una nova funció `fmtHistoryGrade()`, perquè es pugui decidir si val la pena prémer “Restaura” sense haver-ho de recordar.
- **Verificat amb Playwright**: en canviar la nota d’un alumne de 0 a 9,99 i obrir l’historial d’aquella nota, la fila mostra “Modificació de nota” / “0.00 → 9.99” / data i hora, amb el botó “Restaura” al costat. `tsc --noEmit`, `npm test` (12/12) i `npm run build` correctes. Cap error de consola.

### Capçalera fixa i RA de l’activitat a la pantalla Notes (fora de fase) · **Feta**

- Igual que a Activitats, a la pestanya Notes el títol amb el canviador de grup (`.headSticky`, ara aplicat també quan `tab==="notes"`) i la capçalera del projecte (selector d’activitat, xips de RA, “Avaluada”/“Pendent” i l’interruptor “Estat manual”, dins `.toolsSticky`) queden fixos en fer scroll; per sota, la fila de columnes de la taula (`.stickyThead`) també queda fixa i només s’desplacen les files dels 22 alumnes.
- Calia treure el `overflow:hidden` que `.tablePanel` aplica per defecte (per arrodonir les cantonades quan la taula no té `.tools` al davant, com a `ActivityGrid`/`RaGrid`/`RelationsOverview`/Cursos), perquè aquest overflow converteix el propi panell en el contenidor de referència de l’`sticky` i l’element mai arriba a enganxar-se a la finestra. S’ha afegit una classe `.stickyPanel{overflow:visible}` només a l’`article` de Notes, sense tocar `.tablePanel` per a la resta de taules de l’aplicació (verificat que Alumnes, Cursos i les graelles seguien arrodonint bé les cantonades).
- **Al costat de cada projecte** (dins la mateixa capçalera fixa) ara es mostren els xips dels RA que treballa l’activitat seleccionada i el seu percentatge (reaprofitant `raShares()`, la mateixa dada que ja sortia a cada targeta d’Activitats), i es recalculen en canviar d’activitat al desplegable.
- **Correcció posterior (activitats amb més de dos RA)**: els xips es van provar amb desbordament (saltaven a una fila per sota sense que la capçalera creixés, tapant-se amb la taula) i, en un primer intent de correcció amb desplaçament horitzontal, quedaven amagats rere una barra de scroll — cap de les dues solucions era l’esperada. La capçalera del projecte (`.tools`) ara és una única fila `flex-wrap` plana (selector, tots els xips de RA i el bloc “Avaluada/Estat manual” com a germans, aquest últim empès a la dreta amb `margin-left:auto`) amb `min-height` en lloc d’`height` fixa: quan hi caben tots els xips en una línia es manté compacta (70 px, com sempre), i quan no hi caben creix a una segona línia sencera —mai amb barra de scroll ni xips tallats. Calia també treure el `<thead>` fix que s’havia afegit en la iteració anterior, perquè assumia una alçada constant de la capçalera que aquest canvi ja no garanteix.
- **Verificat amb Playwright** a diverses amplades: a 1500 px (amplada habitual) l’activitat amb 5 RA (“Projecte 7”, RA1 10% · RA2 25% · RA3 35% · RA4 25% · RA5 5%) hi cap en una sola línia de 70 px; a 900 px la mateixa activitat fa créixer la capçalera a 98 px perquè “Avaluada/Estat manual” baixi a la segona línia, sense superposar-se amb la taula ni cap barra de scroll. `tsc --noEmit`, `npm test` (12/12) i `npm run build` correctes. Cap error de consola ni regressió visual a Alumnes/Cursos/Graelles.
- **Ampliació posterior (capçalera de columnes fixa, un altre cop, ara robusta)**: com que la capçalera del projecte ja no té una alçada constant (70 px normalment, més si els xips de RA no hi caben en una línia), tornar a enganxar la fila de columnes (Alumne/Nota base/Extra/Total/Accions) exigia conèixer aquesta alçada en cada moment. S’ha mesurat amb `ResizeObserver` sobre `.toolsSticky` (`Grades` guarda l’alçada a l’estat i l’exposa com a variable CSS `--thead-top` al `<thead>`; `.stickyThead th{top:var(--thead-top)}`), de manera que la capçalera de columnes es recol·loca sola sempre que la capçalera del projecte creix o s’encongeix (canvi d’activitat, canvi de mida de finestra), sense cap valor fixat a mà.
- **Verificat amb Playwright**: amb “Projecte 1” (capçalera de 70 px) la fila de columnes s’enganxa a 249 px; en canviar a “Projecte 7” a 900 px d’amplada (capçalera de 98 px, dues línies) es recol·loca sola a 277 px, sense forat ni solapament en cap dels dos casos. `tsc --noEmit`, `npm test` (12/12) i `npm run build` correctes. Cap error de consola.

### Estat “Avaluada” més visible a les targetes d’Activitats (fora de fase) · **Feta**

- L’estat de cada targeta d’activitat era un simple `<strong>` sense color, poc visible enmig de la resta d’informació. Ara reutilitza les mateixes etiquetes `.ok` (verd, “Avaluada”) / `.pending` (gris, “Pendent”) que ja es feien servir a Notes i al Resum, en lloc de text pla.
- **Ajust posterior**: el verd pàl·lid d’`.ok` (`#e9f8f2` de fons) passava desapercebut en aquest context. Afegida una variant `.okStrong` (només per a aquesta etiqueta) amb fons verd sòlid `#15825f` i text blanc, sense tocar `.ok` a la resta de pantalles (Notes, Resum, RelationsOverview…) on el to discret ja funcionava bé.
- **Correcció posterior (text il·legible)**: el blanc d’`.okStrong` no es veia perquè una regla més antiga i més específica, `.activities article>div span{color:#4f79cc}` (pensada per a un altre disseny de targeta), guanyava per especificitat CSS i pintava el text de blau fosc sobre el fons verd — el mateix passava, sense notar-se, amb el gris de “Pendent”. Solucionat traient l’etiqueta del `<div>` embolcallador (ara és filla directa de l’`article>span`, no `article>div>span`), que ja no encaixa amb aquella regla.
- **Verificat amb Playwright**: `getComputedStyle` confirma `color: rgb(255,255,255)` a l’etiqueta “Avaluada”. `tsc --noEmit`, `npm test` (12/12) i `npm run build` correctes. Cap error de consola.

### “No assolit” general (no només per UT) i accés directe a l’informe des de la Graella de RA (fora de fase) · **Feta**

- Fins ara la “Graella de RA” només marcava “No assolit” quan una UT bloquejava el RA; qualsevol altra nota, per baixa que fos, es mostrava com a número. Ara es tracta com a “No assolit” **qualsevol** RA amb nota calculada inferior a 5, tant si ve d’una UT com si és simplement una nota baixa — la cel·la mostra “No assolit” amb un tooltip que diu el motiu (el nom de la UT quan aplica, o “Nota inferior a 5” en cas contrari).
- El mateix criteri s’aplica ara a l’informe individual (`StudentReport`): abans només amagava la nota rere “Mostra nota” quan hi havia una UT suspesa; ara ho fa amb qualsevol RA per sota de 5, sempre amb la possibilitat de prémer “Mostra nota” per veure-la igualment.
- **Nota per a properes converses**: com que un RA encara no avaluat parteix de nota 0, un curs acabat de començar (sense qualificacions) mostrarà “No assolit” a tots els RA de tots els alumnes. És coherent amb com ja tractava l’aplicació els RA no avaluats (compten com a 0 a les mitjanes, secció ja documentada al Resum), però val la pena revisar-ho si resulta confús a la pràctica — es podria condicionar a que el RA tingui alguna cobertura avaluada.
- Afegit un botó d’impressora al costat del nom de cada alumne a la “Graella de RA” (la pestanya Graelles ara rep el `setReport` de `Home` i el passa a `Grids`/`RaGrid`), que obre el mateix `StudentReport` que el botó “Informe” de la pantalla Alumnes — sense haver de canviar de pantalla per consultar-lo.
- **Verificat amb Playwright**: a la Graella de RA, els alumnes amb nota baixa (amb o sense UT) mostren “No assolit”; el botó d’impressora obre l’informe individual correcte; l’informe mostra “No assolit”/“Mostra nota” per a tots els RA suspesos. `tsc --noEmit`, `npm test` (16/16) i `npm run build` correctes. Cap error de consola.

### Pantalla d’ajuda “Com es calculen les notes” (fora de fase) · **Feta**

- Nova pestanya “Com es calcula” al menú lateral (grup “Ajuda”, sota d’“Arxivats”), que mostra un document explicatiu i visual de tot el motor de càlcul: la jerarquia de dades, la cascada completa de pesos (tipus d’activitat → activitat → CA → RA → nota global) amb un exemple real del curs carregat, què és la cobertura i per què la nota és “projectada”, quan una activitat es considera avaluada, les bonificacions, les UT i l’estat “No assolit” (amb el mateix distingiment “Examen suspès” / “Mitjana &lt;5” de l’apartat anterior), i l’arrodoniment de l’informe final. Tanca amb una taula-resum d’un cop d’ull.
- **El contingut viu en un fitxer Markdown independent**, `public/CALCUL-NOTES.md`, tal com es va demanar explícitament — es pot obrir, llegir i editar amb qualsevol editor de text fora de l’aplicació, i es serveix tal qual (Vite copia `public/` al `dist/` arrel en el build). La pantalla el carrega en temps real amb `fetch("/CALCUL-NOTES.md")` i el converteix a HTML amb la llibreria `marked` (nova dependència, ~35 KB, sense dependències pròpies), en lloc d’incrustar el text directament al codi — així el document es pot actualitzar sense tocar `page.tsx`.
- Els diagrames (jerarquia de dades, cascada de pesos, decisió de l’estat “No assolit”) són SVG dibuixats a mà i incrustats directament com a HTML dins el Markdown (`marked` no filtra l’HTML incrustat), amb els mateixos colors que ja fa servir la resta de l’aplicació (blau `#3975e8`, lila `#795fd7`, verd `#15825f`, vermell `#c54c5c`), perquè es vegin com una part més de l’aplicació i no com un document apegalós.
- Nova classe `.helpContent` a `globals.css` que dona estil (capçaleres, paràgrafs, taules, blocs de codi, cites) al Markdown renderitzat, coherent amb la resta de pantalles.
- **Verificat amb Playwright**: la pestanya carrega sense errors de consola, els tres diagrames SVG es renderitzen nets i llegibles (comprovat retallant-los individualment), les taules i els blocs de fórmula es veuen correctament, i el fitxer `CALCUL-NOTES.md` apareix a `dist/` després de `npm run build`. `tsc --noEmit`, `npm test` (16/16) i `npm run build` correctes.

### Motiu curt del “No assolit”: examen suspès vs. mitjana insuficient (fora de fase) · **Feta**

- Fins ara, tant si el RA quedava “No assolit” per haver suspès un examen obligatori d’una UT com si era simplement perquè la mitjana calculada no arribava a 5, el missatge no ho distingia (o mostrava la llista de noms de UT, poc llegible). Ara es distingeixen amb un motiu curt:
  - **Examen suspès** (o **N exàmens suspesos** si en falla més d’un) quan la causa és una activitat obligatòria d’una UT per sota de 5.
  - **Mitjana &lt;5** quan la mitjana calculada del RA no arriba a 5 sense que hi hagi cap UT implicada.
- Canvi de model necessari: `StudentCalculation.learningResults` ja no exposa `blockedBy: WorkUnit[]` (la llista de UT), sinó `failingActivities: number` — el nombre d’activitats obligatòries úniques suspeses per aquell RA i alumne (nova funció `failingRequiredActivities()` a `calculation.ts`, que substitueix `blockingWorkUnits()`). Nova funció compartida `raStatusReason()` a `page.tsx` construeix el text curt a partir d’aquest número, reaprofitada tant a la Graella de RA (tooltip) com a l’informe individual (subtítol).
- **Verificat amb Playwright**: amb una UT que fa obligatòria “Projecte 1” per a RA1, els alumnes amb Projecte 1 suspès mostren “Examen suspès” a RA1, mentre que altres RA suspesos per mitjana (sense cap UT relacionada) mostren “Mitjana &lt;5” — tant al tooltip de la Graella de RA com al subtítol de l’informe individual. Actualitzats els dos tests de `calculation.test.ts` que usaven l’antiga `blockedBy`. `tsc --noEmit`, `npm test` (16/16) i `npm run build` correctes. Cap error de consola.

### Correcció crítica: migració d’esquema per a `workUnits` (fora de fase) · **Feta**

- En afegir el camp `workUnits` a `ModuleConfiguration` (Fase de les UT), les dades ja desades a IndexedDB en navegadors amb sessions anteriors no el tenien. Com que el motor de càlcul hi accedeix directament (`course.configuration.workUnits.filter(...)` a `blockingWorkUnits`), en tornar a obrir l’aplicació amb dades antigues qualsevol pantalla que calculés notes (començant pel Resum, la pantalla per defecte) llançava una excepció i l’aplicació quedava en blanc — reportat per l’usuari com “refresco pantalla i no carrega aplicació”.
- Corregit amb una migració real, tal com preveu la secció 5.4 (“Esquema versionat i preparat per a migracions”), en lloc d’escampar comprovacions `?? []` pel codi: nova funció `migrateDatabase()` a `src/model/domain.ts` que completa `workUnits: []` a qualsevol curs que no el tingui. S’aplica als dos únics punts on `AppDatabase` entra a l’aplicació: `IndexedDbRepository.load()` (dades locals) i `validateBackup()` (restauració de còpia JSON), perquè una còpia de seguretat antiga tampoc trenqui l’aplicació en restaurar-la.
- **Verificat**: dos tests nous (`tests/database.test.ts`) confirmen que `migrateDatabase()` i `validateBackup()` completen `workUnits` en dades amb la forma antiga. Amb Playwright, sembrada manualment una base de dades amb la forma pre-UT a IndexedDB i recarregada la pàgina: l’aplicació carrega amb normalitat (Resum visible, sense errors de consola). `tsc --noEmit`, `npm test` (16/16) i `npm run build` correctes.
- **Lliçó per a properes fases**: qualsevol camp nou afegit a una entitat ja persistida (`ModuleConfiguration`, `Group`, etc.) ha de passar per `migrateDatabase()` abans de donar-se per completa una fase, no només actualitzar `emptyConfiguration()`/`createCourse()`.

### Activitats amb pes 0% com a porta d’una UT, i alta/baixa de tipus d’activitat (fora de fase) · **Feta**

- **Confirmat sense necessitat de tocar codi**: una activitat d’un tipus amb ponderació 0% (p. ex. una “Presentació” obligatòria que no suma res a la nota) ja es pot marcar com a obligatòria d’una UT i bloquejar el RA vinculat si l’alumne no la fa o la suspèn, sense afectar gens la nota calculada del RA. El mecanisme de `failingRequiredActivities()` mira directament la nota de l’activitat i és totalment independent dels pesos; `activityWeights()` ja dona pes 0 a qualsevol activitat d’un tipus al 0%. Afegit un test (`calculation.test.ts`) que ho demostra amb xifres: la nota del RA es manté exactament igual (8,00) abans i després d’afegir la nota de la presentació, mentre `failingActivities` passa de 0 a 1.
- **Alta i baixa de tipus d’activitat**: el quadre “Tipus i ponderacions” només permetia editar el pes dels tipus ja existents (creats només via importació Excel). Ara té un botó “+ Tipus” (demana el nom, el crea amb pes 0% perquè mai desquadri el total del 100% en crear-lo) i un “Arxiva”/“Restaura” per tipus, seguint el mateix patró de baixa tova que RA, CA, activitats i UT. Els tipus arxivats no compten ni al “Total” ni al motor de càlcul (`activityWeights()` ja filtrava per `status==="active"`), i queden atenuats visualment amb el botó “Restaura”.
- **Verificat amb Playwright** contra el fitxer Excel real: creat un tipus “Presentació” (pes 0%, Total es manté a 100,0%), arxivat (desapareix del càlcul, fila atenuada amb “Restaura”) i restaurat correctament. `tsc --noEmit`, `npm test` (18/18, incloent el test nou) i `npm run build` correctes. Cap error de consola.
- **Ampliació posterior**: afegit un text d’ajuda (`muted`) sota el títol del quadre “Tipus i ponderacions” que explica formalment per a què serveix (el pes de cada tipus sobre la nota global, i que han de sumar 100%) i, a continuació, aquesta particularitat concreta: un tipus amb pes 0% no compta per a cap nota, però les seves activitats es poden marcar com a “Obligatòria” d’una UT — útil per a coses com una presentació que cal fer igualment, sense que sumi res al càlcul.

### Explicació del que fa “Arxiva” a RA i CA (fora de fase) · **Feta**

- Afegit un text d’ajuda (`muted`) sota el títol del quadre “RA i CA” que explica que “Arxiva” no elimina res: el RA o CA deixa de comptar en el càlcul de notes però es conserva tot el seu historial i es pot restaurar en qualsevol moment, i que arxivar un RA deixa de comptar automàticament tots els seus CA encara que ells mateixos segueixin actius.
- Afegit també un `title` (tooltip natiu en passar el ratolí) a cada botó “Arxiva”/“Restaura”, tant de RA com de CA, amb el mateix missatge adaptat a l’acció concreta d’aquell botó.
- **Verificat amb Playwright**: el paràgraf es mostra correctament i els tooltips dels botons contenen el text esperat. `tsc --noEmit`, `npm test` (18/18) i `npm run build` correctes. Cap error de consola.

### RA desplegables al quadre “RA i CA” (fora de fase) · **Feta**

- Cada RA del quadre “RA i CA” és ara un desplegable: es mostra col·lapsat per defecte (només codi, descripció i comptador de CA, amb una fletxa que gira en obrir-lo) i, en clicar-hi, desplega la seva llista de CA. Amb 6 RA i fins a 9 CA cadascun, abans calia fer molt scroll per veure tots els RA d’un cop d’ull; ara hi caben tots a la pantalla sense obrir cap.
- El clic per obrir/tancar és sobre la fila sencera del RA, però el botó “Arxiva”/“Restaura” fa `stopPropagation()` perquè arxivar un RA no en canviï l’estat d’obert/tancat sense voler.
- **Verificat amb Playwright**: els 6 RA es veuen tots collapsats en una sola pantalla; en clicar-ne un s’obre i mostra les seves CA amb la fletxa girada; en clicar “Arxiva” sobre un RA collapsat, aquest es queda collapsat (no s’obre per efecte del clic). `tsc --noEmit`, `npm test` (18/18) i `npm run build` correctes. Cap error de consola.

### Tipus d’activitat arxivats també a la pantalla Arxivats (fora de fase) · **Feta**

- Detectada una inconsistència en respondre una pregunta de l’usuari: RA, CA, activitats i UT arxivats apareixen tots a la pantalla “Arxivats”, però un tipus d’activitat arxivat (des del quadre “Tipus i ponderacions”) només es podia restaurar des d’allà mateix, no des d’“Arxivats”. Afegit el panell “Tipus d’activitat arxivats” que faltava, amb el mateix patró (nom + “Restaura”) que la resta.
- **Verificat amb Playwright**: un tipus arxivat de prova apareix correctament al nou panell i es pot restaurar des d’allà. `tsc --noEmit`, `npm test` (18/18) i `npm run build` correctes. Cap error de consola.

### Explicació d’“Arxiva” també al quadre “Tipus i ponderacions” i a la UT (fora de fase) · **Feta**

- L’usuari va notar que el tooltip d’“Arxiva” que ja hi havia a RA/CA no s’havia afegit al botó del mateix nom a “Tipus i ponderacions”. Afegit (adaptat: “tipus” en lloc de “RA”/“CA”), i de pas també al botó “Arxiva”/“Restaura” d’una UT, que tenia el mateix buit.
- A més, el text explicatiu del quadre “Tipus i ponderacions” ara inclou també, com a segon paràgraf separat (“punt i a part”, perquè no quedés tot en un bloc massa dens), la mateixa explicació d’“Arxiva” que ja hi havia al quadre “RA i CA”, adaptada a tipus d’activitat.
- **Verificat**: `tsc --noEmit`, `npm test` (18/18) i `npm run build` correctes; comprovat visualment amb Playwright que el tooltip nou conté el text esperat i que el quadre mostra els dos paràgrafs clarament separats.

### Llindar d’arrodoniment de l’informe, configurable per curs (fora de fase) · **Feta**

- La secció 20 fixava el llindar d’arrodoniment de l’informe individual (part decimal ≥ 0,75 → enter superior) com un valor fix, decidit en una conversa anterior. Amb la intenció de compartir l’aplicació amb altres professors, ara és un paràmetre (`roundingThreshold`, per defecte 0,75 — cap curs existent canvia de comportament) editable per curs, al costat del quadre “Motor de càlcul” (mateixa mida, mateixa fila) a la pantalla “RA, CA i pesos”.
- **Model i motor**: nou camp a `ModuleConfiguration`, migrat a `migrateDatabase()` igual que `workUnits`/`raAveraging`. `finalInteger(value, threshold = .75)` de `calculation.ts` ara accepta el llindar com a segon paràmetre (per defecte 0,75, així el codi i els tests existents que no en passen cap segueixen funcionant igual). Els dos únics punts on es feia servir (nota de cada RA i nota global a l’informe individual) ara passen `course.configuration.roundingThreshold`.
- **Abast del canvi, deixat clar al mateix quadre**: només afecta com es mostra la nota (RA i global) a l’informe individual imprimible — no toca la nota decimal ni l’estat d’aprovat, que sempre s’ha calculat (i es continua calculant) amb la nota decimal anterior a qualsevol arrodoniment.
- **Interfície**: un input numèric (0–0,99) que es desa en perdre el focus (sense pas de previsualització, a diferència del motor de càlcul o els pesos, perquè aquest paràmetre no altera cap nota calculada, només un format de visualització), amb un exemple en viu sota l’input que es recalcula amb el llindar triat (p. ex. “Amb 0,75: 6,74 → 6 · 6,75 → 7”).
- **Verificat**: nou test unitari que confirma que `finalInteger` arrodoneix diferent segons el llindar donat (0,5 vs. 0,75 amb els mateixos valors). Amb Playwright contra el fitxer Excel real: canviat el llindar a 0,1, l’informe d’un alumne amb nota global decimal 6,21 passa de mostrar “Final: 6” (amb el 0,75 per defecte) a “Final: 7”, confirmant l’efecte de cap a cap. `tsc --noEmit`, `npm test` (19/19) i `npm run build` correctes. Cap error de consola.

### Editor complet d’activitat: tipus, trimestre i data (fora de fase) · **Feta**

- Bug real reportat per l’usuari: crear una activitat nova assignava sempre el primer tipus de la llista (`activityTypes[0]`, típicament “Speedrun”) sense poder triar-ne un altre, i el botó “Edita” de cada targeta només permetia canviar el nom (un `prompt()`) — no hi havia manera de corregir el tipus, el trimestre ni la data un cop creada l’activitat.
- Substituïts els `prompt()` de crear/editar per un modal `ActivityEditor` (mateix patró que `WorkUnitEditor`): nom, un desplegable amb els tipus d’activitat actius, trimestre (1/2) i data opcional. S’usa tant per crear (“Nova activitat”) com per editar (botó “Edita” de cada targeta, ara pre-omplert amb les dades actuals). Bloquejat fins que hi hagi un nom i un tipus triat.
- **Verificat amb Playwright**: creada una activitat “Prova1” triant el tipus “Presentacio” (pes 0%, vegeu l’ampliació anterior) i trimestre 2 — la targeta mostra el tipus, el color de vora i el 0,0% correctes; en tornar a obrir “Edita” el formulari surt pre-omplert amb “Prova1” / “Presentacio” / “2”. `tsc --noEmit`, `npm test` (19/19) i `npm run build` correctes. Cap error de consola.

### Eliminació definitiva d’una activitat (fora de fase) · **Feta**

- Resposta a la pregunta de l’usuari: “Arxiva” **no elimina** una activitat, només la deixa de comptar en el càlcul conservant-ne l’historial (com a la resta de l’aplicació). Per al cas d’una activitat obsoleta o creada per error que es vol eliminar de veritat, faltava un “Elimina”.
- Afegit un botó “Elimina” a cada targeta d’activitat, amb el mateix nivell de confirmació que ja hi havia per eliminar un curs (secció 18): cal escriure el nom exacte de l’activitat en un `prompt()` per confirmar-ho; qualsevol altra cosa cancel·la l’operació. El missatge deixa clar que, a diferència d’“Arxiva”, no es pot desfer.
- **Neteja completa i sense referències penjades**: en eliminar-la, es treuen també les seves notes i l’estat d’avaluació als dos grups, l’historial de qualificacions vinculat, les relacions activitat–CA (`ActivityCriterionLink`) i qualsevol referència seva dins `activityIds`/`requiredActivityIds` de les UT (sense eliminar la UT sencera, només la referència a l’activitat esborrada).
- **Verificat amb Playwright**: creada una activitat de prova amb una relació CA (100%) i una nota; confirmació incorrecta no l’elimina, confirmació amb el nom exacte sí; després de l’eliminació no queda cap columna penjada a la Graella d’activitats ni cap fila a “Relacions RA · CA”, i el nombre total d’activitats torna a l’original. `tsc --noEmit`, `npm test` (19/19) i `npm run build` correctes. Cap error de consola.

### Auditoria i neteja de fitxers i configuració (fora de fase) · **Feta**

- Petició de l’usuari: auditar el projecte per detectar fitxers no utilitzats i codi/configuració millorable, com a primera passa d’una reestructuració més àmplia.
- **Fitxers eliminats del disc** (ja exclosos de git per `.gitignore`, però ocupant espai i confonent en una ullada al directori): els perfils de navegador `.audit-chrome/`, `.audit-edge/` i `.audit-edge-2/` i els scripts `.tmp-calculation-test.cjs`/`.tmp-import-test.cjs` (residus de sessions de verificació amb Playwright), les captures `audit-chrome.png`, `audit-ui.png` i `audit-ui-2.png` (les que l’usuari havia notat), i `tsconfig.tsbuildinfo` (artefacte de build regenerable).
- **`tsconfig.json`**: eliminats `plugins:[{name:"next"}]`, `paths:{"@/*":["./*"]}` i les entrades `next-env.d.ts`/`.next/types/**`/`.next/dev/types/**` d’`include` — residus d’una plantilla Next.js que mai s’ha fet servir (el projecte és 100% Vite); no feien res, però confonien.
- **`app/globals.css`**: eliminades ~35 regles CSS mortes (classes `.projection`, `.reportBtn`, `.chart`, `.insight`, `.student`, `.progress`, `.check`, `.danger`, `.caRow` i `.reportLogo`, amb totes les seves variants i referències dins de `@media`), confirmades una a una com a no referenciades a `app/page.tsx` — restes de versions anteriors de les pantalles Resum i Informe individual, ja substituïdes per `Card`, `.okStrong`, etc. Fitxer reduït d’uns 19,5 KB a 17,4 KB sense cap canvi visual.
- **Verificat**: `tsc --noEmit` i `npm run build` correctes; captures amb Playwright (dades reals importades de l’Excel) de Resum, Activitats i Configuració comuna comparades abans/després — idèntiques, cap error de consola a cap pestanya.
- **Pendent de decidir amb l’usuari**: `app/page.tsx` conté totes les pantalles de l’aplicació en un sol fitxer (uns 30 components en 94 línies físiques, d’estil molt dens). Dividir-lo en un fitxer per pantalla seria la part més gran de la reestructuració demanada, però també la de més risc (tocaria pràcticament tot el fitxer alhora); es planteja com a pas separat, a fer amb l’acord explícit de l’usuari sobre l’abast.

### Divisió d’`app/page.tsx` en un fitxer per pantalla (fora de fase) · **Feta**

- Continuació de l’auditoria anterior: `app/page.tsx` concentrava tota l’aplicació (~30 components) en un sol fitxer de 94 línies físiques molt denses. L’usuari, preguntat explícitament sobre l’abast, va triar la divisió completa per pantalles en lloc d’una divisió parcial o de deixar-ho tal com estava.
- **Mètode de la migració**: per evitar errors de transcripció en un fitxer amb tants accents i cometes catalanes (’, ç, à, ò...), el cos de cada component s’ha extret literalment del fitxer original línia a línia (cada component ja ocupava una única línia física) i s’ha traslladat sense reescriure’l; només les capçaleres d’importació de cada fitxer nou s’han escrit a mà. `tsc --noEmit` s’ha fet servir com a xarxa de seguretat per detectar qualsevol importació que faltés (“Cannot find name”), no per detectar errors de lògica.
- **Estructura resultant**:
  - `app/lib/helpers.ts`: funcions pures compartides entre pantalles (`findCourse`, `findGroup`, `activePeople`, `raShares`, `syncState`, `computeBands`, `raStatusReason`, `nextYear`, `normalize`, `typeColor`/`TYPE_COLORS`) i els tipus `Tab`/`Mutate`.
  - `app/components/shared.tsx`: peces d’UI reutilitzades per més d’una pantalla (`Card`, `PassBar`, `Histogram`, `Toggle`, `ExcelInput`).
  - `app/screens/`: un fitxer per pantalla — `Welcome`, `Dashboard`, `Courses`, `Students` (+ `CsvInput`), `Grades` (+ `HistoryModal`), `Grids` (+ `ActivityGrid`/`RaGrid`), `Activities` (+ `ActivityEditor`, `WeightsSummary`, `ActivityReport`, `RelationsOverview`, `LinksEditor`), `Config` (+ `WorkUnitEditor`, previsualitzacions d’impacte), `Data` (+ `ImportPreviewModal`), `Archived`, `StudentReport`, `Help`.
  - `app/page.tsx` queda com una closca prima (39 línies): l’estat de l’aplicació (`db`, pestanya activa, grup, missatges), la càrrega/desament amb `IndexedDbRepository`, i el `<nav>`/capçalera que trien quina pantalla mostrar.
- L’estil de codi original (una línia densa per component, sense embolcalls) es manté intacte dins de cada component — no s’ha reformatat res, només mogut de lloc.
- **Verificat**: `tsc --noEmit`, `npm test` (19/19) i `npm run build` correctes (el JS/CSS resultant té la mateixa mida que abans de dividir el fitxer). Amb Playwright i l’Excel real importat: captures de totes deu pestanyes, de l’informe individual (`raStatusReason`/`finalInteger`), de la Graella de RA (`raWeights`) i de la pantalla Notes (capçalera enganxosa) comparades una a una amb les captures d’abans de la divisió — idèntiques píxel a píxel, cap error de consola a cap pestanya.

### Capçalera enganxosa a la pantalla Alumnes (fora de fase) · **Feta**

- Petició de l’usuari: aplicar a la pantalla Alumnes el mateix patró de capçalera enganxosa que ja hi havia a Notes (i Activitats): en fer scroll per la llista, la capçalera de l’app, el títol de la pantalla, la barra d’eines (“X/25 alumnes”, “Importa CSV”, “Alta”) i la capçalera de la taula (Alumne/Estat/Nota/Accions) es queden fixos a dalt.
- Aplicats a `Students.tsx` els mateixos elements que ja feia servir `Grades.tsx`: classes `stickyPanel`/`toolsSticky`/`stickyThead` (ja existents a `globals.css`, cap regla nova) i el mateix mecanisme de mesura amb `useLayoutEffect`+`ResizeObserver` sobre la barra d’eines per calcular la posició `--thead-top` de la capçalera de la taula (necessari perquè l’alçada de la barra d’eines varia amb l’amplada de pantalla). A `page.tsx`, afegida la pestanya “alumnes” a la condició que aplica `headSticky` al bloc de títol.
- **Verificat**: `tsc --noEmit`, `npm test` (19/19) i `npm run build` correctes. Amb Playwright i l’Excel real importat: captura amb la llista desplaçada cap avall confirma que capçalera, títol, barra d’eines i capçalera de taula romanen visibles mentre les files d’alumnes es desplacen per sota. Cap error de consola.

### Avaluació inicial (qüestionaris diagnòstics) · **Feta**

- Petició: fer una avaluació inicial per UT (de moment UT1 i UT2) a partir del dossier PDF que genera el quadern digital, guardar-ne tot el detall i generar-ne conclusions personalitzades, **sense que mai formi part de la nota**.
- **Model**: nou valor `session: "diagnostica"` a `Activity`. Cap càlcul no la té en compte perquè el motor ja filtra per `session === "ordinaria"` (pesos, cobertura, lliuraments, activitats destacades); a més, les pantalles que recorrien totes les activitats (Resum, anàlisi i informe d’alumne, full de notes imprimible, evidències) l’exclouen amb `countsForGrade`. L’activitat no té tipus ni relacions amb CA. Test: `tests/diagnosticImport.test.ts` comprova que la importació de resultats no canvia nota, cobertura, mitjana, lliuraments ni pesos.
- **Dades**: `Group.diagnostics: DiagnosticResult[]` (migració: llista buida). Cada resultat guarda nota, blocs (encerts/errors/«no ho sé»/%/minuts), **cada pregunta amb l’enunciat, les opcions i la resposta de l’alumne**, temps registrat, sessions, integritat, empremta del dossier i avisos d’importació. La nota (0–10) també es reflecteix com a `Grade` de l’activitat diagnòstica perquè sigui visible a Notes (agrupada com «Avaluació inicial (no compta per a la nota)»).
- **PDF original**: es desa a part, en un magatzem propi d’IndexedDB (`attachments`, versió de BD 3), perquè la base principal es reescriu sencera a cada canvi. **No s’inclou a la còpia JSON**: per això els resultats i les conclusions sí que hi són, però el PDF només es conserva en aquest navegador.
- **Importació** (pantalla Avaluació › Avaluació inicial): un o diversos PDF alhora, lectura local amb `pdfjs-dist` (carregat només en importar), previsualització amb nota i avisos, assignació automàtica de l’alumne pel nom i cognoms (editable), substitució d’un resultat anterior de la mateixa persona i activitat. L’analitzador (`src/controllers/diagnosticParser.ts`) detecta la resposta marcada per la negreta (per pàgina, comparant amb l’etiqueta «Pregunta N») i comprova que el detall coincideix amb la taula-resum del PDF; si no coincideix, avisa.
- **Conclusions** (`src/model/diagnostic.ts`, per regles, sense text inventat): nivell d’entrada (≥8 alt, ≥6 adequat, ≥4 en procés, <4 amb necessitat de suport), estat per bloc (≥85 % domina, ≥60 % correcte, ≥40 % cal reforçar, <40 % prioritari), errades concretes amb el que va respondre, ús (o no) de «No ho sé», comparació amb la mitjana del grup (a partir de 3 resultats), avís de ritme molt ràpid (<15 s per pregunta) i d’integritat, i accions suggerides. Es mostren a l’**informe d’avaluació inicial**, un document propi i separat de l’informe individual del curs (que no en mostra res, perquè no es barregi amb resultats reals d’avaluació contínua): un informe per alumne (nota, nivell, blocs, conclusions, errades concretes, accions i comentari propi, guardat a `DiagnosticResult.comment`) o, des de «Informe del grup», un resum de grup d’una pàgina més un informe per alumne, un per pàgina, per imprimir-los tots alhora. A la pantalla de grup: blocs més febles i preguntes més fallades amb la resposta errònia més repetida.
- **Dues avaluacions (UT1 i UT2)**: cada UT és una activitat diagnòstica pròpia. A Anàlisi de l’alumne › «Informe inicial» i a l’informe de l’alumne es mostra la **comparació** (nota i nivell de cada UT, diferència, punt fort i bloc a reforçar de cada UT; les UT tenen blocs diferents, per això no es comparen bloc a bloc) i, si en falta una, «Pendent d’importar». L’informe d’un alumne porta una pàgina per UT. Quan l’alumne contesta «No ho sé» el quadern no escriu ✔/✖ sinó «— No ho sé», i en preguntes d’escriptura deixa el text d’ajuda «Escriu la resposta»: l’analitzador ho reconeix i comprova que el nombre de «No ho sé» coincideixi amb el resum.
- **Observació a l’aula** (Avaluació › Avaluació inicial › «Observació»): graella ràpida, una fila per alumne, sis ítems d’1 a 4 (autonomia, maneig de l’entorn, resolució d’errors, organització del treball, implicació en la tasca i comunicació tècnica; equivalents a 1-4-7-10), desada en cada clic i amb «no observat» si es torna a clicar el nivell. Els ítems descriuen què fa l’alumne amb la tasca, pel canal que sigui (la comunicació val oral, escrita, amb esquemes o demostrant-ho a la màquina), sense ítems d’atenció ni de conducta. **Factors de context** opcionals (llengua, expressió oral, ritme, altres) i una nota breu: expliquen com interpretar l’observació, **no són cap diagnòstic i no s’imprimeixen mai** (a l’informe només surt l’avís «interpretar tenint en compte el context»; amb factor de llengua o d’expressió oral, la comunicació tècnica no es comenta com a punt a reforçar). Es guarda a `Group.observations`, no compta per a la nota, apareix a l’informe d’avaluació inicial de l’alumne (també si encara no té cap qüestionari), a la pestanya «Informe inicial» i, com a mitjana per ítem, al resum de grup. En esborrar un alumne s’esborren també l’observació, els qüestionaris i els seus PDF. **Importació i exportació CSV** (`src/controllers/observationCsv.ts`): capçalera `alumne;autonomia;entorn;errors;organitzacio;implicacio;comunicacio;factors;nota` (separador `;` o `,`; valors d’1 a 4, buit = no observat; factors separats per `|`); els alumnes es relacionen pel nom (com els PDF), se substitueix l’observació dels que ja en tenien i es mostra un resum abans de confirmar. L’exportació inclou factors i notes, només per a ús propi.
- Limitacions conegudes: la selecció múltiple només mostra el que l’alumne va marcar (el PDF no revela la resposta correcta quan s’erra); l’analitzador depèn del format actual del quadern digital.

### Logo de l’institut · **Fet**

- El logo (`public/logo-institut.png`) surt a la barra lateral de l’aplicació (sobre una targeta blanca, perquè el logo té text fosc) i a la capçalera de tots els informes imprimibles: individual, de grup, d’activitat, graelles, extraordinària, full de qualificacions de l’alumne, informes i extraccions i informe d’avaluació inicial (aquest, a cada pàgina). Component `ReportLogo` a `app/components/shared.tsx`. Per canviar-lo n’hi ha prou de substituir el fitxer de `public/` mantenint el nom.

### Registre de decisions durant la implementació

Si durant una fase cal desviar-se d’una decisió d’aquest document, cal anotar-ho aquí amb la data i el motiu abans de continuar, en lloc de modificar silenciosament les seccions anteriors.
