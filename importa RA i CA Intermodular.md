# Prompt: generar el CSV d'importació de RA i CA del mòdul intermodular

Copia tot el contingut d'aquest fitxer (a partir de la línia "---" de sota) en una conversa nova de Claude, i afegeix-hi (enganxat o adjunt) el currículum oficial del mòdul intermodular (Resultats d'Aprenentatge i Criteris d'Avaluació) del qual vulguis generar el CSV.

---

Ets un assistent que ha de generar un fitxer CSV per importar Resultats d'Aprenentatge (RA) i Criteris d'Avaluació (CA) a l'aplicació local "RA · Avaluació" (gestió de qualificacions per cicles formatius). L'aplicació té un importador CSV a la pantalla Configuració → RA i CA → botó "Importa CSV (tots els RA i CA)", amb aquest format exacte:

## Format del CSV

- **4 columnes**: `RA, Descripció del RA, CA, Descripció del CA`.
- **Capçalera opcional**: si hi és, ha de ser exactament `ra,descripció ra,ca,descripció ca` (en minúscules).
- **Una fila per cada CA.** Si un RA té diversos CA, repeteix el mateix codi i descripció del RA a cada fila corresponent (no es posa el RA una sola vegada).
- Si una descripció conté comes, s'ha de posar entre cometes dobles (`"..."`).
- Codificació UTF-8 (accents i lletres catalanes com ç, l·l, etc. inclosos).

### Exemple

```csv
ra,descripció ra,ca,descripció ca
RA1,Instal·la i configura sistemes en xarxa,CA1.1,Instal·la el sistema operatiu
RA1,Instal·la i configura sistemes en xarxa,CA1.2,"Configura, prova i documenta la xarxa"
RA2,Administra usuaris i grups,CA2.1,Crea comptes d'usuari
```

### Com s'aplica en importar (per si cal ajustar codis)

- Els RA que no existeixin ja al mòdul es creen nous.
- Els CA amb un codi que ja existeix dins aquell mateix RA s'ometen (no es dupliquen ni se sobreescriuen).
- La comparació de codis (RA i CA) no distingeix majúscules/minúscules.

## La teva tasca

A partir del currículum oficial del **mòdul intermodular** que t'aportaré (o que ja tens més avall, si l'he enganxat en aquest mateix missatge), has de:

1. Identificar **tots** els Resultats d'Aprenentatge (RA) d'aquest mòdul, amb el seu codi oficial (p. ex. `RA1`, `RA2`...) i la seva descripció completa (l'enunciat del RA).
2. Per cada RA, identificar **tots** els seus Criteris d'Avaluació (CA), amb el codi oficial (p. ex. `CA1.1`, `CA1.2`...) i la descripció completa de cada criteri.
3. Generar el CSV complet seguint el format anterior exactament (una fila per CA, RA repetit a cada fila, cometes dobles a les descripcions amb comes, capçalera inclosa).
4. Retornar el resultat en un únic bloc de codi ` ```csv ` llest per desar com a fitxer `.csv` i importar directament a l'aplicació.

Si el currículum font no numera explícitament els RA/CA amb codis, numera'ls tu de manera seqüencial seguint la convenció `RA1, RA2...` i `CA1.1, CA1.2...` (número de RA seguit del número de CA dins d'aquell RA).

No abreugis ni resumeixis les descripcions: han de reproduir el text oficial del RA/CA tal com apareix a la font.
