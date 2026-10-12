# RA · Avaluació

Aplicació local per gestionar cursos, grups, alumnes, activitats i qualificacions per resultats d'aprenentatge.

## Estat de la versió

Aquesta primera versió funcional inclou 25 places per als grups A i B, resum analític, resultats per RA, activitats, cerca d'alumnes i informe individual imprimible amb comentari positiu editable.

Les dades actuals són una demostració inicial. El model (`src/model`) i els controladors de càlcul (`src/controllers`) estan separats de la vista (`app`) per facilitar millores visuals sense alterar la lògica.

## Obrir amb Visual Studio Code i executar en local

1. Descomprimeix el ZIP en una carpeta normal de Windows.
2. Instal·la [Node.js LTS](https://nodejs.org/) si encara no el tens.
3. Executa `1-INSTAL·LAR.bat` una única vegada.
4. Executa `2-OBRIR-APLICACIO.bat` cada vegada que vulguis obrir l'aplicació.
5. (Opcional) Executa `3-CREA-ACCES-DIRECTE.bat` una única vegada per crear una icona "RA Avaluació" a l'escriptori que obre l'aplicació amb un doble clic.
6. Per editar el projecte, obre `RA-Avaluacio.code-workspace` amb Visual Studio Code.

També es pot executar des del terminal integrat:

```bash
npm install
npm run dev
```

L'aplicació s'obre al navegador però s'executa íntegrament a l'ordinador local. La finestra del servidor ha de romandre oberta mentre es fa servir. Aquesta versió utilitza Vite estàndard i no necessita Cloudflare, Miniflare ni Microsoft Visual C++ Redistributable.

En una versió posterior s'hi connectarà la importació completa de l'Excel i la persistència local definitiva.

## Avaluació inicial

Menú Avaluació › Avaluació inicial: importa el dossier PDF del qüestionari diagnòstic del quadern digital (un per alumne). Els resultats no compten per a la nota i generen conclusions a l'informe individual. Els PDF es guarden només en aquest navegador (no van a la còpia JSON). Detall a `ESPECIFICACIO-FUNCIONAL.md`.
