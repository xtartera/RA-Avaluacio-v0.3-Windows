# Prompt: generar el CSV d'importació d'activitats del mòdul intermodular

Copia tot el contingut d'aquest fitxer (a partir de la línia "---" de sota) en una conversa nova de Claude, i afegeix-hi (enganxat o adjunt) el document amb les activitats definides per al mòdul intermodular del qual vulguis generar el CSV.

---

Ets un assistent que ha de generar un fitxer CSV per importar activitats a l'aplicació local "RA · Avaluació" (gestió de qualificacions per cicles formatius). L'aplicació té un importador CSV a la pantalla Activitats → botó "Importa CSV", amb aquest format exacte:

## Format del CSV

- **Columnes**: `Nom, Tipus d'activitat, Trimestre, Data (opcional, AAAA-MM-DD), CA (opcional), Percentatge (opcional)`.
- **Capçalera opcional**: si hi és, ha de ser exactament `nom,tipus,trimestre,data,ca,percentatge` (en minúscules).
- **Una fila per activitat.** Si una activitat treballa diversos CA, repeteix una fila per cada CA amb exactament el mateix nom, tipus, trimestre i data, canviant només el CA i el percentatge (igual que al CSV de RA/CA, on es repeteix el RA a cada fila del seu CA).
- Els CA han d'existir **prèviament** al mòdul (a Configuració → RA i CA) i s'identifiquen pel seu codi (p. ex. `CA1.1`); un CA que no existeixi s'ometrà amb un avís, no es crea. Si una activitat no té cap CA associat, deixa les columnes CA i Percentatge buides — l'activitat es crea igualment, sense relacions (es podrien afegir després manualment).
- Si el tipus d'activitat indicat no existeix encara al mòdul, es crea automàticament (amb pes 0%, ajustable després a Configuració → Tipus i ponderacions).
- El trimestre ha de ser un número enter dins del nombre de trimestres configurats al mòdul (normalment 1, 2 o 3).
- Si el nom de l'activitat conté comes, s'ha de posar entre cometes dobles (`"..."`).
- Codificació UTF-8 (accents i lletres catalanes inclosos).
- **Important**: les activitats importades s'apliquen a **TOTS els grups** del curs, no a un de sol.

### Exemple

```csv
nom,tipus,trimestre,data,ca,percentatge
Examen U1,Examen,1,2026-10-15,CA1.1,40
Examen U1,Examen,1,2026-10-15,CA2.3,60
Pràctica servidors,Pràctica,1,,CA3.1,100
```

(La tercera fila mostra una activitat sense data, i la primera/segona mostren una mateixa activitat "Examen U1" repartida entre dos CA amb percentatges que sumen 100%.)

## La teva tasca

A partir del document amb les activitats del **mòdul intermodular** que t'aportaré (o que ja tens més avall, si l'he enganxat en aquest mateix missatge), has de:

1. Identificar **totes** les activitats definides, amb el seu nom, el tipus d'activitat (p. ex. Examen, Pràctica, Treball, Presentació...), el trimestre en què es fa, i la data si consta.
2. Per cada activitat, identificar els CA amb què està relacionada i el percentatge que hi assigna cadascun (si el document ho especifica). Els percentatges de CA d'una mateixa activitat haurien de sumar 100%; si no hi ha aquesta informació al document, deixa les columnes CA i Percentatge buides per a aquesta activitat.
3. Generar el CSV complet seguint el format anterior exactament (una fila per activitat, o una fila per cada CA si en té diversos, repetint nom/tipus/trimestre/data; cometes dobles als noms amb comes; capçalera inclosa).
4. Retornar el resultat en un únic bloc de codi ` ```csv ` llest per desar com a fitxer `.csv` i importar directament a l'aplicació.

Si el document font no especifica el tipus d'activitat, dedueix-lo del context (Examen, Pràctica, Treball...) de manera consistent per a totes les activitats similars. No inventis codis de CA que no apareguin al document ni al mòdul ja configurat: si no n'estàs segur, deixa la relació sense omplir en comptes d'endevinar-la.
