# Pes de cada RA sobre la nota global

Aquest percentatge **no s'edita mai a mà**: es recalcula automàticament cada vegada que canvia alguna dada que hi intervé (activitats, tipus, ponderacions de CA, RA arxivats...). No hi ha cap botó "recalcula" perquè no fa falta — sempre que entris en aquesta pantalla, el valor que veus és el resultat actual.

## D'on surt el número

El pes d'un RA és la suma dels pesos de tots els seus CA (criteris d'avaluació), i el pes de cada CA ve de les activitats que hi contribueixen:

```text
pesActivitat  = pesDelTipus / nombre d'activitats actives d'aquell tipus
pesGlobalCA   = Σ (% assignat al CA en cada activitat × pesActivitat)
pesRA         = Σ pesGlobalCA (de tots els CA d'aquell RA)
```

En altres paraules: perquè un RA tingui pes, cal que —

1. tingui almenys un CA actiu,
2. aquest CA estigui vinculat a almenys una activitat (a la pestanya "CA" de la targeta d'activitat),
3. aquesta activitat pertanyi a un **tipus d'activitat amb una ponderació superior a 0%** (Configuració → Tipus i ponderacions).

Si falta qualsevol d'aquests tres punts, aquell RA (o una part del seu pes) simplement no compta — no és cap error de l'aplicació, és el resultat del càlcul amb les dades tal com estan configurades ara mateix.

## Què vol dir "Arxiva"

"Arxiva" apareix a diversos llocs (una activitat, un tipus d'activitat, un CA, un RA). En **cap** cas elimina res: tot l'historial i les notes es conserven, i es pot "Restaura" en qualsevol moment, aquí mateix o a la pantalla Arxivats.

El que sí fa és **treure aquell element del càlcul** mentre estigui arxivat:

- **Activitat arxivada** → deixa de comptar en el repartiment de pes del seu tipus (les altres activitats del mateix tipus es reparteixen el 100% del pes entre elles).
- **Tipus d'activitat arxivat** → cap de les seves activitats compta, encara que estiguin actives individualment.
- **CA arxivat** → el seu pes deixa de sumar-se al RA, encara que les activitats que hi apuntaven segueixin actives.
- **RA arxivat** → deixa de comptar-se a la nota global del mòdul, i tots els seus CA deixen de comptar automàticament (encara que ells mateixos estiguin marcats com a actius).

Per això, si arxives (o restaures) qualsevol d'aquests elements, els percentatges d'aquesta pantalla canviaran a l'instant: no és un efecte secundari estrany, és exactament el que "Arxiva" vol dir.

## Per què hauria de sumar 100%

Entre tots els RA actius, els pesos haurien de sumar 100%. Si la pantalla mostra un avís de suma diferent de 100%, normalment vol dir que falta configurar el pes d'algun tipus d'activitat (per exemple, un tipus creat automàticament en importar un CSV, que sempre neix amb pes 0%), o que hi ha CA actius sense cap activitat vinculada.

## Enters o decimals

Per defecte els percentatges es mostren arrodonits a l'enter més proper, per llegir-los d'un cop d'ull. El botó del costat permet canviar a mostrar-los amb 2 decimals, útil quan cal comprovar amb precisió per què la suma no arriba exactament al 100%.

---

*Per a l'explicació completa del motor de càlcul (notes, cobertura, "No assolit"...), consulta la pantalla "Com es calcula" del menú lateral.*
