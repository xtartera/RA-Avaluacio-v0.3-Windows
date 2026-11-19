import {createCourse, emptyConfiguration, newId, type AcademicCourse, type Activity, type ActivityCriterionLink, type AssessmentCriterion, type LearningResult, type ProgramacioData, type ProgramSequenceRow, type ProgramUnit, type WorkUnit} from "../domain.ts";

/**
 * Plantilla del mòdul 0227 Serveis de xarxa (2n SMX), segons la programació didàctica PD_CF_SMX_0227_2627 (curs 2026/2027).
 * És un curs independent: té la seva configuració (pesos explícits, mitjana ponderada) i no toca la de cap altre mòdul.
 * L'RAemp (empresa, 10 %) queda fora: es resol a la junta d'avaluació. Els RA1-RA8 conserven els pesos de la programació (sumen 90 %).
 *
 * Com s'ha traduït la programació (revisable amb el professorat del mòdul):
 *  - Cada AEA és una unitat de treball (UT): AEA0 (preparació) … AEA9 (projecte). Els RA s'imparteixen en l'ordre 1, 2, 6, 7, 5, 3, 8, 4.
 *  - Instruments: pràctiques Pt (30 % de l'RA), proves escrites Pe (30 %) i projecte integrador Prj (40 % dels RA 1-6 i 8); l'RA7 és només Pt7 (100 %).
 *  - El projecte és una sola activitat amb part de set RA; el seu pes es reparteix entre els criteris de cada RA segons el pes de l'RA al mòdul.
 *  - Obligatòries: les pràctiques i la prova escrita de cada RA, amb mínim 4. La condició «projecte ≥ 5» i la regla «si Pt o Pe < 4 la nota de l'RA és la més baixa
 *    de les dues i el projecte no compta» surten només al text de la programació: l'app no les calcula.
 *  - El dossier teòric (Ds) no qualifica i no és una activitat. La verificació de l'entorn (Pt0) és Apte/No apte i no puntua.
 *  - La nota final s'arrodoneix a l'enter més proper (llindar 0,5).
 */

type Kind = "pract" | "pe" | "prj" | "apte";

interface RaSpec {code: string; description: string; /** Pes al mòdul, en %. */ weight: number; cas: string[]; inici: string; fi: string; continguts: string[]}
interface UnitSpec {
  n: number; title: string; hours: number; /** RA (1-8) que treballa. */ ras: number[];
  organitzadors: string; capacitats: string[]; documentacio: string; descripcio: string[];
  /** Files de la seqüència: text, organització, temps, metodologia, recursos. */ seq: [string, string, string, string, string][];
}

const range = (a: number, b: number) => Array.from({length: b - a + 1}, (_, i) => a + i);

const RAS: RaSpec[] = [
  {code: "RA1", description: "Instal·la serveis de configuració dinàmica, descrivint-ne les característiques i aplicacions.", weight: 13.5, inici: "22/09/2026", fi: "05/10/2026", cas: [
    "Reconeix el funcionament dels mecanismes automatitzats de configuració dels paràmetres de xarxa.", "Identifica els avantatges que proporcionen.",
    "Il·lustra els procediments i pautes que intervenen en una sol·licitud de configuració dels paràmetres de xarxa.", "Instal·la un servei de configuració dinàmica dels paràmetres de xarxa.",
    "Prepara el servei per a assignar la configuració bàsica als sistemes d'una xarxa local.", "Realitza assignacions dinàmiques i estàtiques.",
    "Integra en el servei opcions addicionals de configuració.", "Verifica la correcta assignació dels paràmetres."], continguts: [
    "Adreça IP, màscara de xarxa, porta d'enllaç. Repàs de TCP/IP.", "Funcionament del protocol DHCP: fases de la sol·licitud i concessions.",
    "Servidor DHCP (isc-dhcp-server i introducció a Kea DHCP). Àmbits, rangs, exclusions, concessions i reserves.", "Opcions de configuració globals i per àmbit (porta d'enllaç, servidors DNS, domini)."]},
  {code: "RA2", description: "Instal·la serveis de resolució de noms, descrivint-ne les característiques i aplicacions.", weight: 13.5, inici: "06/10/2026", fi: "21/10/2026", cas: [
    "Identifica i descriu escenaris en els quals sorgeix la necessitat d'un servei de resolució de noms.", "Classifica els principals mecanismes de resolució de noms.",
    "Descriu l'estructura, nomenclatura i funcionalitat dels sistemes de noms jeràrquics.", "Instal·la un servei jeràrquic de resolució de noms.",
    "Prepara el servei per a emmagatzemar les respostes procedents de servidors de xarxes públiques i servir-les als equips de la xarxa local.",
    "Afegeix registres de noms corresponents a una zona nova, amb opcions relatives a servidors de correu i àlies.",
    "Treballa en grup per realitzar transferències de zona entre dos o més servidors.", "Comprova el funcionament correcte del servidor."], continguts: [
    "Sistemes de noms plans i jeràrquics. Fitxer hosts. Espai de noms de domini.", "Tipus de servidors DNS: autoritatius, cau i reenviadors (forwarders). Consultes recursives i iteratives.",
    "Zones primàries i secundàries. Transferències de zona. Zona inversa. Tipus de registres (SOA, NS, A, AAAA, CNAME, MX, PTR).",
    "Servidor BIND9: instal·lació, configuració i eines de comprovació (dig, nslookup, named-checkconf, named-checkzone)."]},
  {code: "RA3", description: "Instal·la serveis de transferència de fitxers, descrivint-ne les característiques i aplicacions.", weight: 9, inici: "19/11/2026", fi: "30/11/2026", cas: [
    "Estableix la utilitat i mode d'operació del servei de transferència de fitxers.", "Instal·la un servei de transferència de fitxers.", "Crea usuaris i grups per a accés remot al servidor.",
    "Configura l'accés anònim.", "Estableix límits en els diferents modes d'accés.", "Comprova l'accés al servidor, tant en mode actiu com en mode passiu.",
    "Realitza proves amb clients en línia de comandes i en mode gràfic."], continguts: [
    "Funcionament del servei FTP: mode actiu i passiu. Transferència en mode text i binari.", "Usuaris i grups. Accés anònim. Permisos. Quotes. Límit d'amplada de banda.",
    "Comandes de control, autenticació, gestió i transferència de fitxers. Clients en línia d'ordres i gràfics.", "Servidors vsftpd i ProFTPD. Seguretat: FTPS, SFTP i engabiament (chroot)."]},
  {code: "RA4", description: "Gestiona servidors de correu electrònic identificant-ne requeriments d'utilització i aplicant-hi criteris de configuració.", weight: 13.5, inici: "08/01/2027", fi: "20/01/2027", cas: [
    "Descriu els diferents protocols que intervenen en l'enviament i recollida del correu electrònic.", "Instal·la un servidor de correu electrònic.", "Crea comptes d'usuari i verifica l'accés d'aquests.",
    "Defineix àlies per als comptes de correu.", "Aplica mètodes per impedir usos indeguts del servidor de correu electrònic.",
    "Instal·la serveis per permetre la recollida remota del correu existent en les bústies d'usuari.", "Utilitza clients de correu electrònic per enviar i rebre correu."], continguts: [
    "Protocols de correu: SMTP, POP3 i IMAP, i les seves versions segures.", "Comptes de correu, àlies i bústies d'usuari.",
    "Servidor Postfix + Dovecot. Registres MX. Mesures contra usos indeguts (relay, TLS).", "Clients de correu electrònic (Evolution, Thunderbird, webmail)."]},
  {code: "RA5", description: "Gestiona servidors web identificant-ne requeriments d'utilització i aplicant-hi criteris de configuració.", weight: 13.5, inici: "09/11/2026", fi: "18/11/2026", cas: [
    "Descriu els fonaments i protocols en què es basa el funcionament d'un servidor web.", "Instal·la un servidor web.", "Crea llocs virtuals.",
    "Verifica les possibilitats existents per a discriminar el lloc de destinació del trànsit entrant al servidor.", "Configura la seguretat del servidor.",
    "Comprova l'accés dels usuaris al servidor.", "Diferencia i prova l'execució de codi al servidor i en el client.", "Instal·la mòduls sobre el servidor.",
    "Estableix mecanismes per assegurar les comunicacions entre el client i el servidor."], continguts: [
    "Protocols HTTP i HTTPS. Funcionament d'un servidor web.", "Servidors virtuals. Nom d'encapçalament d'ordinador central. Identificació d'un servidor virtual.",
    "Accés anònim i autenticat. Mètodes d'autenticació.", "Mòduls del servidor (userdir, ssl, http2). Execució de codi al servidor i al client.",
    "Seguretat: certificats, HTTPS, redireccions i capçaleres de seguretat. Servidors Apache i Nginx."]},
  {code: "RA6", description: "Gestiona mètodes d'accés remot descrivint-ne les característiques i instal·lant-hi els serveis corresponents.", weight: 9, inici: "22/10/2026", fi: "06/11/2026", cas: [
    "Descriu mètodes d'accés i administració remota de sistemes.", "Instal·la un servei d'accés remot en línia de comandaments.", "Instal·la un servei d'accés remot en mode gràfic.",
    "Comprova el funcionament d'ambdós mètodes.", "Identifica els principals avantatges i deficiències de cadascun.", "Realitza proves d'accés remot entre sistemes de diferent naturalesa.",
    "Realitza proves d'administració remota entre sistemes de diferent naturalesa."], continguts: [
    "Terminals en mode text: SSH, scp, autenticació per clau, túnels i X11 forwarding.", "Terminals en mode gràfic: VNC, RDP (xrdp) i clients d'escriptori remot (Remmina).",
    "Administració remota entre sistemes de diferent naturalesa (Linux i Windows)."]},
  {code: "RA7", description: "Desplega xarxes sense fils segures justificant la configuració triada i descrivint els procediments d'implantació.", weight: 9, inici: "14/12/2026", fi: "21/12/2026", cas: [
    "Instal·la un punt d'accés sense fil dins d'una xarxa local.", "Reconeix els protocols, modes de funcionament i principals paràmetres de configuració del punt d'accés.",
    "Selecciona la configuració més idònia sobre diferents escenaris de prova.", "Estableix un mecanisme adequat de seguretat per a les comunicacions sense fils.",
    "Usa diversos tipus de dispositius i adaptadors sense fils per a comprovar la cobertura.", "Instal·la un encaminador sense fil amb connexió a xarxa pública i serveis sense fils de xarxa local.",
    "Configura i prova l'encaminador des dels ordinadors de la xarxa local."], continguts: [
    "Punts d'accés. Estàndards 802.11, modes de funcionament i paràmetres (SSID, canal, potència).", "Encaminadors sense fils.", "Seguretat en xarxes sense fils (WPA2, WPA3).",
    "Connexió de màquines virtuals a la xarxa sense fils (adaptador pont)."]},
  {code: "RA8", description: "Estableix l'accés des de xarxes locals a xarxes públiques identificant possibles escenaris i aplicant programari específic.", weight: 9, inici: "30/11/2026", fi: "11/12/2026", cas: [
    "Instal·la i configura el maquinari d'un sistema amb accés a una xarxa privada local i a una xarxa pública.", "Instal·la una aplicació que actuï de passarel·la entre la xarxa privada local i la xarxa pública.",
    "Reconeix i diferencia les principals característiques i possibilitats de l'aplicació seleccionada.", "Configura els sistemes de la xarxa privada local per a accedir a la xarxa pública a través de la passarel·la.",
    "Estableix els procediments de control d'accés per a assegurar el trànsit que es transmet a través de la passarel·la.", "Implementa mecanismes per a accelerar les comunicacions entre la xarxa privada local i la pública.",
    "Identifica els possibles escenaris d'aplicació d'aquest tipus de mecanismes.", "Estableix un mecanisme que permeti reenviar trànsit de xarxa entre dues o més interfícies d'un mateix sistema.",
    "Comprova l'accés a una xarxa determinada des dels sistemes connectats a una altra xarxa diferent.",
    "Implanta i verifica la configuració per a accedir des d'una xarxa pública a un servei localitzat en una màquina d'una xarxa privada local."], continguts: [
    "Passarel·les a nivell d'aplicació: proxy directe (Squid) i proxy invers (Nginx).", "Emmagatzematge en memòria cau.", "Control d'accés mitjançant llistes (ACL).",
    "Encaminament de trànsit entre interfícies de xarxa. NAT i redirecció de ports."]},
];

/** Criteris que treballa el projecte integrador a cada RA (programació, AEA9). */
const PRJ_CAS: Record<number, number[]> = {1: range(4, 8), 2: range(4, 8), 3: range(2, 7), 4: range(2, 7), 5: range(2, 9), 6: range(2, 7), 8: range(2, 6)};

const SEQ_THEORY: [string, string, string, string, string] = ["Presentació del servei, recordatori de coneixements previs i explicació teòrica. Elaboració del dossier teòric (Ds).", "Grup classe", "", "Presentació del professor amb debat amb els alumnes", "Ordinador, pissarra digital, vídeos"];
const th = (h: string): [string, string, string, string, string] => [SEQ_THEORY[0], SEQ_THEORY[1], h, SEQ_THEORY[3], SEQ_THEORY[4]];
const part = (text: string, h: string): [string, string, string, string, string] => [text, "Individual", h, "Treball individual amb el suport del professor", "Ordinador, màquines virtuals"];
const exam: [string, string, string, string, string] = ["Prova escrita del RA i correcció en comú.", "Individual", "1h", "Individual", "Prova escrita"];

const UNITS: UnitSpec[] = [
  {n: 0, title: "Preparació de l'entorn de treball", hours: 6, ras: [], organitzadors: "Coneixements de sistemes operatius i xarxes locals de primer curs.", capacitats: ["Autonomia", "Organització del treball", "Responsabilitat"],
    documentacio: "Moodle del mòdul i repositori del mòdul a GitHub. 0-RA0-PrepEntorn/practiques.md. Vídeos de repàs TCP/IP.",
    descripcio: ["Presentació del mòdul, de la programació i del sistema d'avaluació.", "Instal·lació al host de VirtualBox i Git; compte GitHub i Obsidian (recomanables).",
      "Creació de les màquines virtuals del curs (Ubuntu Server amb 3 adaptadors, clients Ubuntu i Windows) i configuració dels adaptadors de xarxa (NAT, xarxa interna, host-only, pont).", "Repàs opcional de conceptes TCP/IP (vídeos)."],
    seq: [["Presentació del mòdul, de la programació i del sistema d'avaluació.", "Grup classe", "1h", "Exposició del professorat i resolució de dubtes", "Projector, Moodle, repositori del mòdul"],
      ["Instal·lació d'eines al host (VirtualBox, Git) i creació de les màquines virtuals.", "Individual", "3h", "Pràctica guiada (Pt0)", "Ordinador, ISO d'Ubuntu Server/Desktop i Windows, practiques.md de RA0"],
      ["Configuració dels adaptadors de xarxa i verificació final de l'entorn.", "Individual", "1h", "Pràctica guiada amb llista de verificació", "Ordinador, VirtualBox"],
      ["Repàs de conceptes TCP/IP.", "Grup classe", "1h", "Vídeos i preguntes al grup", "Vídeos RepasTCPIP"]]},
  {n: 1, title: "Servei de configuració dinàmica (DHCP)", hours: 12, ras: [1], organitzadors: "AEA0", capacitats: ["Autonomia", "Resolució de problemes", "Responsabilitat", "Organització del treball"],
    documentacio: "Moodle del mòdul i repositori del mòdul a GitHub. 1-RA1-DHCP/teoria.md i practiques.md. Vídeos DHCP (introducció, funcionament, configuració). Documentació oficial d'isc-dhcp-server i Kea.",
    descripcio: ["Teoria DHCP (vídeos i aula) i dossier teòric (Ds1).", "Part 1: instal·lació i configuració bàsica d'un servidor DHCP.", "Part 2: servidor DHCP amb dos àmbits (classe C i classe B) i reserves.",
      "Part 3: opcions DHCP avançades, globals i per àmbit.", "Part 4: introducció a Kea DHCP.", "Prova escrita DHCP (Pe1)."],
    seq: [th("3h"), part("Part 1 — Instal·lació i configuració bàsica del servidor DHCP.", "2h"), part("Part 2 — Servidor DHCP amb dos àmbits i reserves.", "2h"), part("Part 3 — Opcions DHCP globals i per àmbit.", "2h"), part("Part 4 — Introducció a Kea DHCP.", "2h"), exam]},
  {n: 2, title: "Servei de resolució de noms (DNS)", hours: 12, ras: [2], organitzadors: "AEA0, AEA1", capacitats: ["Autonomia", "Resolució de problemes", "Responsabilitat", "Organització del treball", "Treball en equip"],
    documentacio: "Moodle del mòdul i repositori del mòdul a GitHub. 2-RA2-DNS/teoria.md i practiques.md. Vídeos DNS (introducció, definicions, funcionament, registres, resolució inversa). Documentació de BIND9.",
    descripcio: ["Teoria DNS (vídeos i aula) i dossier teòric (Ds2).", "Part 1: instal·lació i configuració bàsica de BIND9 amb zona directa i forwarders.", "Part 2: zones inverses i registres addicionals (MX, CNAME).",
      "Part 3: servidor DNS secundari i transferències de zona (en grup).", "Prova escrita DNS (Pe2)."],
    seq: [th("5h"), part("Part 1 — BIND9 bàsic: zona directa i forwarders.", "2h"), part("Part 2 — Zones inverses i registres addicionals.", "2h"), part("Part 3 — Servidor DNS secundari i transferència de zona (per parelles).", "2h"), exam]},
  {n: 3, title: "Servei d'accés remot (SSH, VNC i RDP)", hours: 12, ras: [6], organitzadors: "AEA0", capacitats: ["Autonomia", "Resolució de problemes", "Responsabilitat", "Organització del treball"],
    documentacio: "Moodle del mòdul i repositori del mòdul a GitHub. 6-RA6-SSH/teoria.md, explicacio-esquema-ssh.md i practiques.md. Documentació d'OpenSSH, xrdp i Remmina.",
    descripcio: ["Teoria d'accés remot (vídeos i aula) i dossier teòric (Ds6).", "Part 1: SSH bàsic, scp i X11 forwarding.", "Part 2: autenticació per clau, securització del servei i túnels SSH.",
      "Part 3: escriptori remot amb VNC i RDP entre sistemes Linux i Windows.", "Prova escrita d'accés remot (Pe6)."],
    seq: [th("5h"), part("Part 1 — SSH bàsic, scp i X11 forwarding.", "2h"), part("Part 2 — Autenticació per clau, securització i túnels.", "2h"), part("Part 3 — Escriptori remot: VNC i RDP.", "2h"), exam]},
  {n: 4, title: "Xarxes sense fils", hours: 6, ras: [7], organitzadors: "AEA0", capacitats: ["Autonomia", "Resolució de problemes", "Responsabilitat", "Organització del treball", "Treball en equip"],
    documentacio: "Moodle del mòdul i repositori del mòdul a GitHub. 7-RA7-Wifi/teoria.md, practiques.md i checklist.md. Manual del punt d'accés D-Link.",
    descripcio: ["Teoria de xarxes sense fils (aula).", "Part 1: adaptador pont a VirtualBox (cablejat).", "Part 2: configuració del punt d'accés wifi D-Link amb seguretat WPA2/WPA3.",
      "Part 3: connexió de les màquines virtuals via pont cap al wifi i comprovació de cobertura.", "Avaluació en directe amb llista de comprovació (sense prova escrita)."],
    seq: [["Explicació teòrica: estàndards, modes de funcionament i seguretat wifi.", "Grup classe", "1,5h", "Presentació del professor amb debat amb els alumnes", "Ordinador, pissarra digital, vídeos"],
      ["Part 1 — Adaptador pont a VirtualBox.", "Individual", "1h", "Pràctica guiada", "Ordinador, VirtualBox, practiques.md de RA7"],
      ["Part 2 — Configuració del punt d'accés D-Link.", "Per parelles", "2h", "Pràctica guiada amb observació directa del professorat", "Punt d'accés D-Link, ordinador, adaptadors sense fils"],
      ["Part 3 — Connexió de les VMs al wifi i proves de cobertura. Preguntes de reflexió.", "Per parelles", "1,5h", "Pràctica i verificació en directe amb la llista de comprovació", "Punt d'accés, ordinadors, dispositius mòbils, checklist.md"]]},
  {n: 5, title: "Servidor web (HTTP/HTTPS)", hours: 12, ras: [5], organitzadors: "AEA0, AEA2", capacitats: ["Autonomia", "Resolució de problemes", "Responsabilitat", "Organització del treball"],
    documentacio: "Moodle del mòdul i repositori del mòdul a GitHub. 5-RA5-HTTP/teoria.md i practiques.md. Documentació d'Apache HTTP Server i Nginx.",
    descripcio: ["Teoria HTTP (vídeos i aula) i dossier teòric (Ds5).", "Part 1: Apache bàsic.", "Part 2: VirtualHosts, userdir i autenticació bàsica.", "Part 3: HTTPS, redirecció, HTTP/2 i capçaleres de seguretat.",
      "Part 4: introducció a Nginx com a servidor web.", "Prova escrita HTTP (Pe5)."],
    seq: [th("3h"), part("Part 1 — Apache bàsic.", "2h"), part("Part 2 — VirtualHosts, userdir i autenticació bàsica.", "3h"), part("Part 3 — HTTPS, redirecció, HTTP/2 i capçaleres de seguretat.", "2h"), part("Part 4 — Nginx com a servidor web.", "1h"), exam]},
  {n: 6, title: "Servei de transferència de fitxers (FTP)", hours: 12, ras: [3], organitzadors: "AEA0, AEA3", capacitats: ["Autonomia", "Resolució de problemes", "Responsabilitat", "Organització del treball"],
    documentacio: "Moodle del mòdul i repositori del mòdul a GitHub. 3-RA3-FTP/teoria.md i practiques.md. Documentació de vsftpd i ProFTPD.",
    descripcio: ["Teoria FTP (vídeos i aula) i dossier teòric (Ds3).", "Part 1: instal·lació i configuració bàsica de vsftpd (accés anònim i d'usuaris).", "Part 2: xifratge (FTPS i SFTP) i engabiament amb chroot.",
      "Part 3: ús intensiu de comandes, modes actiu/passiu i verificació de permisos.", "Prova escrita FTP (Pe3)."],
    seq: [th("4h"), part("Part 1 — vsftpd bàsic: accés anònim i usuaris.", "2h"), part("Part 2 — FTPS, SFTP i chroot.", "2h"), part("Part 3 — Comandes FTP i verificació de permisos.", "3h"), exam]},
  {n: 7, title: "Accés a xarxes públiques: servidor intermediari (proxy)", hours: 12, ras: [8], organitzadors: "AEA0, AEA2, AEA5", capacitats: ["Autonomia", "Resolució de problemes", "Responsabilitat", "Organització del treball"],
    documentacio: "Moodle del mòdul i repositori del mòdul a GitHub. 8-RA8-Proxy/teoria.md i practiques.md. Documentació de Squid i Nginx.",
    descripcio: ["Teoria de passarel·les i proxy (vídeos i aula) i dossier teòric (Ds8).", "Part 1: Squid, configuració bàsica i memòria cau.", "Part 2: Squid, ACL avançades i restriccions d'accés.",
      "Part 3: Nginx com a proxy invers per publicar un servei intern.", "Prova escrita proxy (Pe8)."],
    seq: [th("5h"), part("Part 1 — Squid: configuració bàsica i cau.", "2h"), part("Part 2 — Squid: ACL avançades i restriccions.", "2h"), part("Part 3 — Nginx com a proxy invers.", "2h"), exam]},
  {n: 8, title: "Servei de correu electrònic", hours: 12, ras: [4], organitzadors: "AEA0, AEA2", capacitats: ["Autonomia", "Resolució de problemes", "Responsabilitat", "Organització del treball"],
    documentacio: "Moodle del mòdul i repositori del mòdul a GitHub. 4-RA4-Mail/teoria.md i practiques.md. Documentació de Postfix i Dovecot.",
    descripcio: ["Teoria del correu electrònic (vídeos i aula) i dossier teòric (Ds4).", "Part 1: clients de correu amb comptes reals.", "Part 2: servidor Postfix + Dovecot amb DNS propi.",
      "Part 3: servidor de correu segur amb TLS (SMTPS i IMAPS).", "Prova escrita de correu (Pe4)."],
    seq: [th("4h"), part("Part 1 — Clients de correu amb comptes reals.", "2h"), part("Part 2 — Servidor Postfix + Dovecot amb DNS propi.", "3h"), part("Part 3 — Servidor de correu segur amb TLS.", "2h"), exam]},
  {n: 9, title: "Projecte integrador: serveis d'un petit ISP a l'aula", hours: 36, ras: [1, 2, 3, 4, 5, 6, 8], organitzadors: "AEA0 a AEA8",
    capacitats: ["Treball en equip", "Relació interpersonal", "Organització del treball", "Innovació", "Resolució de problemes", "Responsabilitat"],
    documentacio: "Moodle del mòdul i repositori del mòdul a GitHub. Projectes/Projecte1.md, Projecte2.md i esquemes de xarxa. Material de tots els RA del repositori. Documentació de Kea, BIND9, ProFTPD, Apache, Nginx, Postfix, Dovecot, Squid, Virtualmin, Proxmox VE i Guacamole.",
    descripcio: ["Projecte en grups de 2 o 3 persones que simula la infraestructura d'un petit proveïdor de serveis (ISP) a l'aula.", "Nucli obligatori (Projecte 1): DHCP intern, DNS, FTP, HTTP/HTTPS amb Nginx com a proxy invers i balancejador, i correu amb TLS.",
      "Ruta A: extensió del Projecte 1 amb Squid (proxy directe) i Virtualmin (panell d'ISP).", "Ruta B: Projecte 2, escriptori remot web amb Proxmox VE i Apache Guacamole.",
      "Lliurament d'un PDF amb les instruccions per replicar el projecte i d'un vídeo de funcionament.", "Autoavaluació, coavaluació i qüestionari individual."],
    seq: [["Presentació del projecte, formació dels grups i tria de ruta (A o B). Rol de portaveu setmanal.", "Grup classe i grups de 2-3", "1h", "Exposició i negociació en grup", "Projecte1.md, Projecte2.md, esquema de xarxa"],
      ["Disseny de l'escenari de xarxa i pla d'adreçament.", "Grups de 2-3", "3h", "Aprenentatge basat en projectes: planificació", "Ordinador, esquema del projecte"],
      ["Muntatge del nucli obligatori: DHCP, DNS, FTP, HTTP/HTTPS amb Nginx i correu amb TLS.", "Grups de 2-3", "20h", "Aprenentatge basat en projectes. Consultes al professorat a través del portaveu", "Ordinadors, màquines virtuals, xarxa de l'aula"],
      ["Ruta A: Squid i Virtualmin. Ruta B: Proxmox VE i Apache Guacamole.", "Grups de 2-3", "8h", "Aprenentatge basat en projectes", "Ordinadors, Proxmox VE, Guacamole, Squid, Virtualmin"],
      ["Elaboració del PDF d'instruccions i del vídeo de funcionament.", "Grups de 2-3", "3h", "Documentació tècnica", "Ordinador, eines ofimàtiques i d'edició de vídeo"],
      ["Demostració, autoavaluació, coavaluació i qüestionari individual.", "Individual i grups", "1h", "Avaluació formativa i compartida", "Rúbrica, qüestionaris del projecte"]]},
];

/** Textos de la programació del mòdul (apartats 4, 5 i 6 de PD_CF_SMX_0227_2627). */
const TEXTS: Pick<ProgramacioData, "estrategies" | "tac" | "diversitat" | "organitzacio" | "assistencia" | "termini" | "avaluacio" | "espais" | "condicions" | "recuperacio"> = {
  estrategies: [
    "L'enfocament pedagògic d'aquesta programació es fonamenta en la integració de diverses metodologies actives que situen l'alumnat com a protagonista del seu procés d'aprenentatge: el constructivisme, l'aprenentatge observacional, l'aprenentatge cooperatiu i l'aprenentatge basat en projectes (ABP), aplicades de manera complementària al llarg del curs.",
    "Cada bloc del mòdul se centra en un servei de xarxa i segueix la mateixa seqüència: breu introducció teòrica amb vídeos i elaboració d'un dossier teòric, pràctiques de laboratori virtualitzat de dificultat creixent i una prova escrita. El curs acaba amb un projecte integrador que simula la infraestructura d'un petit proveïdor de serveis (ISP) a l'aula.",
    "Constructivisme: cada bloc parteix dels coneixements previs (TCP/IP, sistemes operatius i blocs anteriors) i les pràctiques augmenten de dificultat de manera progressiva. L'ordre d'impartició dels RA està pensat perquè cada servei reforci el que s'ha treballat abans.",
    "Aprenentatge observacional: el professorat fa demostracions en directe de les configuracions dels serveis abans que l'alumnat les reprodueixi a les seves màquines virtuals.",
    "Aprenentatge cooperatiu: algunes pràctiques es fan per parelles (transferència de zona DNS, punt d'accés sense fils) i el projecte integrador es fa en grups de 2 o 3 persones. Cada grup té un portaveu setmanal, rol rotatiu, que fa les consultes al professorat i transmet les respostes a la resta del grup.",
    "Pràctiques de laboratori virtualitzat: cada RA té un mínim de tres parts pràctiques sobre màquines virtuals (Ubuntu Server i clients Ubuntu/Windows). Cada pràctica inclou objectius, tasques, verificació i preguntes, i se'n lliura un informe.",
    "Aprenentatge basat en projectes (ABP): el projecte integrador (36 hores) planteja muntar els serveis d'un petit ISP. Cada grup tria una ruta: la ruta A amplia el projecte amb un proxy directe (Squid) i un panell d'ISP (Virtualmin); la ruta B hi afegeix una plataforma d'escriptori remot web (Proxmox VE i Apache Guacamole). Es lliura un PDF amb les instruccions per replicar el projecte i un vídeo de funcionament, i es fa autoavaluació i coavaluació.",
  ].join("\n\n"),
  tac: "L'eina principal de treball, comunicació i relació amb l'alumnat serà l'aula virtual Moodle (calendari, lliuraments, qualificacions i comunicació). El material del mòdul (teoria, pràctiques i enunciats dels projectes) es publica en un repositori de GitHub en format web, i s'acompanya de vídeos explicatius. L'alumnat treballa amb VirtualBox i màquines virtuals, Git i GitHub, eines de documentació i eines ofimàtiques i d'edició de vídeo per documentar el projecte.",
  diversitat: [
    "Es contemplen mesures per atendre la diversitat de ritmes i necessitats: tot el material és accessible en línia (repositori i Moodle), de manera que l'alumnat pot avançar al seu ritme i recuperar sessions; pràctiques amb parts de dificultat creixent i parts guiades; tutories individualitzades de seguiment i orientació. Actualment no s'aplica cap mesura flexibilitzadora del currículum (semipresencialitat, organització horària adaptada o validació). Si calgués, es podria adaptar el calendari de pràctiques i proves mantenint els mateixos instruments d'avaluació.",
    "Desdoblament: d'acord amb les orientacions del cicle, el mòdul té un desdoblament del 100 %: el grup classe es divideix en dues meitats (subgrups A i B), que fan totes les hores del mòdul per separat (132 hores cadascun, 6 hores setmanals).",
    "Activitats complementàries: no hi ha activitats complementàries previstes. Si durant el curs sorgeix alguna oportunitat relacionada amb els serveis de xarxa (visita a una empresa o centre de dades, xerrada d'una persona experta), s'incorporarà a la programació.",
    "Llengua anglesa: en aquest mòdul no es treballen els resultats d'aprenentatge relatius a la llengua anglesa.",
  ].join("\n\n"),
  organitzacio: [
    "El mòdul professional s'organitza en una activitat inicial de preparació de l'entorn, vuit activitats d'ensenyament-aprenentatge, una per a cada resultat d'aprenentatge, i un projecte integrador final. L'ordre d'impartició és: preparació de l'entorn, RA1 (DHCP), RA2 (DNS), RA6 (accés remot), RA7 (xarxes sense fils), RA5 (servidor web), RA3 (FTP), RA8 (proxy), RA4 (correu electrònic) i projecte integrador.",
    "El mòdul es basa en els coneixements de Xarxes Locals i Sistemes Operatius Monolloc de primer curs i es complementa amb Sistemes Operatius en Xarxa i Seguretat Informàtica de segon curs. El format dels projectes (PDF d'instruccions i vídeo) aprofita les eines treballades a Aplicacions Ofimàtiques i Aplicacions Web.",
  ].join("\n\n"),
  assistencia: "L'assistència és obligatòria. En el cas de superar el 20% de faltes, l'alumnat perdrà el dret a l'avaluació contínua i haurà d'anar a segona convocatòria (juny) per superar el mòdul.",
  termini: "Només s'acceptaran les pràctiques i els projectes lliurats dins del termini indicat. Només en casos justificats, i sota el criteri de l'equip docent, es podran admetre fora de termini. La preparació de l'entorn de treball no puntua, però és obligatòria per poder fer les pràctiques.",
  avaluacio: [
    "Al començament del mòdul, l'equip docent proporcionarà informació detallada sobre els resultats d'aprenentatge, els criteris d'avaluació, els continguts i els diferents instruments d'avaluació utilitzats.",
    "Els alumnes poden presentar-se a dues convocatòries en el curs escolar. La primera convocatòria (ordinària) sempre comptabilitza. A la convocatòria de juny si l'alumne no es presenta no comptabilitza. Per superar el mòdul professional, els alumnes tenen el dret a presentar-se fins a quatre convocatòries. Si no se supera en aquestes quatre convocatòries es pot sol·licitar una convocatòria extraordinària a la direcció del centre.",
    "L'assistència a les classes és obligatòria. Si un alumne falta a més del 20% de les classes perdrà el dret a l'avaluació contínua i haurà de presentar-se a la segona convocatòria (juny) per poder superar el mòdul professional.",
    "Si es detecta alguna activitat copiada, tant l'alumne que ha copiat, com aquell que s'ha deixat copiar, quedaran automàticament suspesos.",
    "Instruments d'avaluació de cada RA: pràctiques (Pt), un conjunt de pràctiques per RA, amb 3 o 4 parts, avaluades de 0 a 10 (preguntes i funcionament 80 % i informe 20 %); proves escrites (Pe), una prova per RA en acabar les pràctiques (excepte el RA7), avaluades de 0 a 10; projecte integrador (Prj), nota de grup de 0 a 10 a partir de l'autoavaluació (20 %), la coavaluació (30 %) i l'avaluació del professorat (50 %), de manera que si la diferència entre la nota de l'alumnat i la del professorat és de 3 punts o més només compta la del professorat, i un qüestionari individual valida la participació de cada membre; dossier teòric (Ds), seguiment del treball a l'aula, que no qualifica; i llista de comprovació, observació en directe del funcionament de la xarxa sense fils (RA7).",
    "L'avaluació serà contínua i formativa permetent a l'equip docent incloure qualsevol adaptació o modificació en el procés, en qualsevol moment. Les dates indiquen l'inici del subgrup que comença abans i el final del subgrup que acaba més tard. D'acord amb les orientacions del cicle, el mòdul no es pot qualificar fins que no s'ha completat l'estada a l'empresa.",
  ].join("\n\n"),
  espais: [
    "Cada alumne/a treballa amb un ordinador de l'aula taller amb capacitat per executar diverses màquines virtuals. Gràcies al desdoblament, cada alumne/a disposa del seu propi equip durant totes les sessions.",
    "Els recursos didàctics emprats seran principalment eines i programari lliure: VirtualBox, Ubuntu Server i Ubuntu Desktop, isc-dhcp-server i Kea, BIND9, vsftpd i ProFTPD, Postfix i Dovecot, Apache i Nginx, OpenSSH, xrdp, VNC i Remmina, Squid, Virtualmin, Proxmox VE i Apache Guacamole, a més de clients Windows 10/11, Git i GitHub. El material principal d'estudi és el repositori del mòdul, complementat amb vídeos, apunts (material M7 Serveis de xarxa, guia de Linux) i la plataforma Netacad com a recurs de consulta.",
    "Els espais destinats al desenvolupament de les activitats del Mòdul Professional (MP) al llarg del curs seran les aules i els tallers d'informàtica assignats als subgrups. Aquestes aules disposen d'un ordinador per alumne amb capacitat per executar diverses màquines virtuals, connexió a Internet mitjançant xarxa cablejada i/o sense fils, pissarra digital interactiva, punt d'accés sense fils D-Link i adaptadors sense fils (RA7) i xarxa de l'aula per interconnectar els escenaris del projecte integrador.",
    "L'alumnat disposarà del programari necessari per al correcte desenvolupament i superació del mòdul professional. Així mateix, els grups implicats tindran accés a un campus virtual, mitjançant el qual es facilitaran els materials didàctics, s'informarà sobre les activitats, pràctiques i treballs a realitzar i els terminis de lliurament, es realitzarà el lliurament de les activitats pràctiques, es podran consultar les qualificacions de manera continuada i es facilitarà la comunicació entre el professorat i l'alumnat, així com entre els mateixos alumnes.",
    "No està permès l'ús de telèfons mòbils dins del recinte del centre educatiu.",
  ].join("\n\n"),
  condicions: [
    "Haver lliurat les pràctiques del RA i tenir-hi una qualificació igual o superior a 4.",
    "Haver-se presentat a la prova escrita del RA i tenir-hi una qualificació igual o superior a 4.",
    "Haver obtingut una nota igual o superior a 5 en el projecte.",
    "Obtenir una nota del RA igual o superior a 5.",
    "Si la nota de les pràctiques o de la prova escrita és inferior a 4, no es fa la mitjana: la nota del RA serà la més baixa de les dues i el projecte no comptarà. El RA7 només s'avalua amb les pràctiques (Pt_7).",
  ].join("\n"),
  recuperacio: [
    "Dossier teòric (Ds): no es recupera, ja que serveix per fer el seguiment del treball a l'aula.",
    "Pràctiques (Pt): es poden lliurar les pràctiques pendents en acabar el projecte. La nota màxima en recuperació és un 5.",
    "Proves escrites (Pe): al final de cada trimestre hi ha un període de recuperació o millora de nota de les proves del trimestre anterior. Al tercer trimestre es poden recuperar les proves de tot el curs. La nota definitiva és la de l'última prova feta.",
    "Projecte (Prj): si cal recuperar-lo, la nota màxima és un 5.",
    "Segona convocatòria (juny): l'alumnat amb algun RA no superat es pot presentar a una prova escrita dels RA pendents, després d'haver lliurat tots els projectes que treballen aquests RA.",
  ].join("\n"),
};

const TYPE_NAME: Record<Kind, string> = {pract: "Pràctica", pe: "Prova escrita", prj: "Projecte", apte: "Apte/No apte"};

/** Crea el curs «Serveis de xarxa» (0227) amb els RA1-RA8, les AEA0-AEA9, les activitats, els pesos i la programació del mòdul. */
export function buildServeisCourse(academicYear: string, groupCodes: string[] = ["A", "B"]): AcademicCourse {
  const course = createCourse(academicYear, emptyConfiguration(), false, groupCodes);
  const cfg = course.configuration;
  cfg.moduleName = "Serveis de xarxa"; cfg.abbreviation = "SX";
  cfg.termCount = UNITS.length; cfg.raAveraging = "weighted"; cfg.weightMode = "explicit"; cfg.roundingThreshold = .5; cfg.requiredActivityMinGrade = 4; cfg.requiredByAverage = false;
  const types = (Object.keys(TYPE_NAME) as Kind[]).map(k => ({kind: k, id: newId("type")}));
  cfg.activityTypes = types.map(t => ({id: t.id, name: TYPE_NAME[t.kind], weight: 0, status: "active" as const}));
  const typeId = (k: Kind) => types.find(t => t.kind === k)!.id;

  const learningResults: LearningResult[] = [], criteria: AssessmentCriterion[] = [], activities: Activity[] = [], links: ActivityCriterionLink[] = [], workUnits: WorkUnit[] = [];
  const casOf: AssessmentCriterion[][] = [];
  RAS.forEach((spec, ri) => {
    const ra: LearningResult = {id: newId("ra"), code: spec.code, description: spec.description, order: ri + 1, status: "active", moduleWeight: spec.weight / 100};
    learningResults.push(ra);
    const cas = spec.cas.map((description, i) => ({id: newId("ca"), learningResultId: ra.id, code: `${ri + 1}.${i + 1}`, description, order: i + 1, status: "active" as const}));
    criteria.push(...cas); casOf.push(cas);
  });
  const raW = (n: number) => RAS[n - 1].weight;
  let order = 0;
  const addActivity = (name: string, kind: Kind, term: number, shares: {ra: number; share: number}[], linkSpec: {ra: number; cas: number[]; allocation: number}[]): Activity => {
    const act: Activity = {id: newId("activity"), name, activityTypeId: typeId(kind), term, date: null, order: ++order, status: "active", session: "ordinaria", recoversRaIds: [],
      raShares: shares.map(s => ({raId: learningResults[s.ra - 1].id, share: s.share}))};
    activities.push(act);
    for (const l of linkSpec) for (const n of l.cas) links.push({id: newId("link"), activityId: act.id, criterionId: casOf[l.ra - 1][n - 1].id, allocation: l.allocation / l.cas.length});
    return act;
  };

  const unitIds: string[] = [], unitActivities = new Map<string, Activity[]>(), unitRequired = new Map<string, Activity[]>();
  UNITS.forEach((u, ui) => {
    const term = ui + 1, acts: Activity[] = [], req: Activity[] = [];
    if (u.n === 0) acts.push(addActivity("Pt0", "apte", term, [], []));
    else if (u.n === 9) {
      const ras = [1, 2, 3, 4, 5, 6, 8], total = ras.reduce((s, r) => s + raW(r), 0);
      // Cada RA rep del projecte el 40 % del seu pes: el pes de l'activitat es reparteix entre els criteris de cada RA en proporció al pes de l'RA.
      acts.push(addActivity("Prj", "prj", term, ras.map(r => ({ra: r, share: .4})), ras.map(r => ({ra: r, cas: PRJ_CAS[r], allocation: raW(r) / total}))));
    } else {
      const r = u.ras[0], all = range(1, RAS[r - 1].cas.length), solo = r === 7;
      const pt = addActivity(`Pt${r}`, "pract", term, [{ra: r, share: solo ? 1 : .3}], [{ra: r, cas: all, allocation: 1}]);
      acts.push(pt); req.push(pt);
      if (!solo) { const pe = addActivity(`Pe${r}`, "pe", term, [{ra: r, share: .3}], [{ra: r, cas: all, allocation: 1}]); acts.push(pe); req.push(pe); }
    }
    const id = newId("unit");
    unitIds.push(id); unitActivities.set(id, acts); unitRequired.set(id, req);
    workUnits.push({id, name: `AEA${u.n}: ${u.title}`, order: ui + 1, status: "active", activityIds: acts.map(a => a.id), requiredActivityIds: req.map(a => a.id), learningResultIds: u.ras.map(r => learningResults[r - 1].id)});
  });
  Object.assign(cfg, {learningResults, criteria, activities, links, workUnits});

  // Programació: dades escrites del document (dates, continguts, hores, descripcions i seqüències de cada AEA).
  const programUnits: Record<string, ProgramUnit> = {};
  UNITS.forEach((u, ui) => {
    const id = unitIds[ui], acts = unitActivities.get(id)!;
    const activityHours: Record<string, number> = {};
    // La prova escrita fa 1 h; la resta de les hores de l'AEA (teoria, pràctiques i dossier) van a la pràctica; el projecte i Pt0 ocupen tota l'AEA.
    for (const a of acts) activityHours[a.id] = a.name.startsWith("Pe") ? 1 : acts.length === 1 ? u.hours : u.hours - 1;
    const sequencia: ProgramSequenceRow[] = u.seq.map(([text, organitzacio, temps, metodologia, recursos]) => ({text, organitzacio, temps, metodologia, recursos, localitzacio: "Aula"}));
    programUnits[id] = {hores: String(u.hours), activityHours, descripcio: u.descripcio.join("\n\n"), organitzadors: u.organitzadors, capacitats: u.capacitats.join("\n"), documentacio: u.documentacio, sequencia};
  });
  cfg.programacio = {
    codiCicle: "IC10", codiModul: "0227", grup: "2SMX (subgrups A i B)", horesCentre: "132", horesEmpresa: "66",
    raContinguts: Object.fromEntries(RAS.map((r, i) => [learningResults[i].id, r.continguts.join("\n")])),
    raDates: Object.fromEntries(RAS.map((r, i) => [learningResults[i].id, {inici: r.inici, fi: r.fi}])),
    units: programUnits, ...TEXTS,
  };
  return course;
}
