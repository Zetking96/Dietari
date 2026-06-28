[README.md](https://github.com/user-attachments/files/29441517/README.md)
# Dietari · Gestió de la parada

Aplicació web per a la gestió comptable diària d'un parador de bacallà i conserves (Mercat de Provençals, Barcelona — marca *Pesca Salada Gil*).

## Què fa

- **Dietari diari**: efectiu, TPV i línies de Fp, FpL i despeses (cada línia amb concepte i si compta a recaptació).
- **Tancaments setmanals** (cada dissabte), amb resum per mes, quadrimestre i any.
- **Compte corrent**: moviments del banc amb categories editables.
- **Factures** de proveïdors (pendents/pagades, enllaç al dia).
- **Olives, bacallà i conserva**: catàleg, compres i càlcul de marges.
- **Exportació a Excel** de tot (full per dia, detall de línies, tancaments, banc, factures…).

## Com s'usa

És una aplicació d'un sol fitxer (`index.html`). S'obre al navegador, s'entra amb correu i contrasenya, i les dades se sincronitzen al núvol.

## Stack

- **Front-end**: un únic `index.html` (HTML + CSS + JavaScript), amb [SheetJS](https://sheetjs.com) incrustat per a l'exportació a Excel.
- **Autenticació i dades**: [Supabase](https://supabase.com).
- **Allotjament**: [Netlify](https://www.netlify.com) → https://dietari.netlify.app

## Desplegament

Es publica a Netlify pujant el fitxer `index.html`. Cada canvi al fitxer requereix tornar-lo a desplegar perquè el web quedi al dia.

## Còpies de seguretat

Les dades viuen a Supabase, però es recomana **exportar l'Excel sovint** abans de fer operacions destructives (esborrar anys, tancaments o categories).

---

> El fitxer `CONTEXT-dietari.md` és documentació tècnica interna (model de dades, decisions, riscos), no forma part de la portada del projecte.
