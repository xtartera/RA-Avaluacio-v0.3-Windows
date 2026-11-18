# Normativa de referència per a les programacions (CFGM SMX)

Aquests documents s'han de tenir presents **cada vegada que es genera o es regenera una programació didàctica** (SOX 0224 i SI 0226).

| Fitxer | Què és | Què en fem servir |
|---|---|---|
| `Curriculum-RA-CA-continguts-SMX_mp_IC10.pdf` | Currículum vigent del CFGM SMX («mp_IC10», 50 p.): per mòdul, durada i hores centre/estada, **RA, criteris d'avaluació i continguts orientatius**, sense UF. Inclou també les activitats formatives per a l'estada. | Font principal dels RA, CA i continguts de cada programació. |
| `Decret-193-2013-curriculum-SMX_DOGC.pdf` | Decret 193/2013, de 9 de juliol, currículum del CFGM SMX (DOGC 6415, 11.7.2013). Modificat per l'Ordre EDU/186/2021 (modificació en tramitació). | Marc normatiu, competència general, capacitats clau, objectius generals, professorat i espais. |
| `Orientacions-centres-SMX-promocions-2024-2026.pdf` | Orientacions als centres per organitzar el CFGM SMX, promocions 2024-2026 i posteriors (DGFP, 24.4.2024). | Hores al centre i d'estada a l'empresa per mòdul, distribució per cursos, relació de competències (CPPeS) i objectius generals (OG) amb cada mòdul, ús de l'anglès. |

## On és al codi

`src/model/programacioNormativa.ts` recull les dades extretes d'aquests PDF:

- competència general, capacitats clau i llista del marc normatiu;
- text de totes les CPPeS (a–x) i dels OG (a–s);
- per mòdul (`SMX_MODULES`): codi, hores centre/estada i lletres de CPPeS i OG que li corresponen.

`src/model/programacio.ts` les fa servir com a valors per defecte (el professor les pot sobreescriure a l'editor).

## Dades per mòdul

| Mòdul | Codi | Curs | H centre | H estada |
|---|---|---|---|---|
| Sistemes operatius en xarxa (SOX) | 0224 | 2n | 132 | 66 |
| Seguretat informàtica (SI) | 0226 | 2n | 99 | 33 |

CPPeS: SOX = a, c, e, f, h, l, m, n, o, q, r, s · SI = a, c, i, j, l, n, p, q, u.
OG: SOX = a, c, d, f, g, h, i, j, k, l, m, o · SI = a, c, d, e, g, k, l.

## Pendent / a tenir en compte

- Les Orientacions indiquen que el Decret i el RD del títol són **en modificació**: cal revisar la normativa quan es publiqui.
- La lletra de les CPPeS d'aquest document segueix les Orientacions 2024 (t, u, v, w, x); el Decret de 2013 salta la «w» (t, u, v, x, y).
- No hi ha l'ordre d'avaluació vigent del Departament: queda una línia marcada per completar al marc normatiu.
- Les Orientacions demanen que almenys un mòdul del cicle (no Anglès) incorpori activitats en llengua anglesa.
- Les unitats formatives del Decret 2013 **no** s'usen: el mòdul s'organitza per RA.
- Els RA i CA de SI (5 RA, 9/10/6/8/6 CA) i de SOX (6 RA, 9/9/8/7/6/9 CA) de l'app coincideixen amb `mp_IC10` (comprovat 18.11.2026). Els continguts per RA es carreguen per defecte des de `programacioNormativa.ts` (camp `continguts`) i s'editen a l'editor.
- El document `mp_IC10` té petites errates de transcripció (p. ex. «Planificat i realitza» a SOX 1.3, «Interpretat» a SOX 5.6); l'app conserva el text corregit.
