# Dietari · Gestió de la parada

Aplicació web per a la gestió comptable diària d'un parador de bacallà i conserves (Mercat de Provençals, Barcelona — marca *Pesca Salada Gil*).

## Què fa

- **Dietari diari**: efectiu, TPV i línies de Fp, FpL i despeses (cada línia amb concepte, quantitat i si compta a recaptació).
- **Tancaments setmanals** (cada dissabte) i **caixa d'efectiu** amb calculadora setmanal del que se'n va utilitzant.
- **Compte corrent**: moviments del banc amb categories editables.
- **Factures** de proveïdors, amb pagaments en diversos terminis i apunt automàtic al banc.
- **Compres**: bacallà, olives, conserva i altres, amb IVA per producte, descompte de factura i càlcul de marges.
- **Resums** mensuals, quatrimestrals i anuals, amb comparació contra l'any anterior i històric des del 2020.
- **Exportació a Excel** de tot (full per dia, detall de línies, tancaments, banc, factures, compres…).

## Com s'usa

És una aplicació d'un sol fitxer (`index.html`). S'obre al navegador, s'entra amb correu i contrasenya, i les dades se sincronitzen al núvol.

## Stack

- **Front-end**: un únic `index.html` (HTML + CSS + JavaScript), amb [SheetJS](https://sheetjs.com) incrustat per a l'exportació a Excel.
- **Autenticació i dades**: [Supabase](https://supabase.com).
- **Allotjament**: [GitHub Pages](https://zetking96.github.io/Dietari/) (actiu) i [Netlify](https://dietari.netlify.app) (pausat).

## Desplegament

Automàtic: qualsevol `git push` a `main` publica la versió nova en un parell de minuts. No cal pujar cap fitxer a mà.

## Còpies de seguretat

Les dades viuen a Supabase, però es recomana **exportar l'Excel sovint** abans de fer operacions destructives (esborrar anys, tancaments o categories).

---

> El fitxer `CONTEXT-dietari.md` és documentació tècnica interna (model de dades, decisions, riscos), no forma part de la portada del projecte.
