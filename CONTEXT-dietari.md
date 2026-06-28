# Projecte "Dietari" — context per a Claude

Document de traspàs. Si reprens la feina sobre aquesta app, llegeix això primer.
Treballa sempre en català, concís, prosa directa. Tracta l'usuari (Jaume) com a igual i avisa de riscos o millors angles.

## Què és
App de gestió d'un parador de bacallà i conserves (Mercat de Provençals, Barcelona; marca Pesca Salada Gil). Un sol fitxer `index.html` (~330 KB) amb SheetJS incrustat. Autenticació + sincronització al núvol amb Supabase, allotjada a Netlify.

## Convencions de treball
- L'usuari adjunta l'última versió de `index.html`. Copia-la a un directori editable abans de tocar res.
- Qualsevol operació destructiva ha de ser un botó EXPLÍCIT (mai automàtica en carregar), perquè la sync de Supabase no esborri dades en altres dispositius.
- Reutilitza helpers i CSS existents. No reinventis estils.
- Abans de lliurar: `node --check` de tots els `<script>` + una prova de lògica aïllada de les funcions noves. Lliura a `/mnt/user-data/outputs/` i resumeix canvis i riscos.
- UI en català, mínim format.
- ⚠️ **El fitxer és gran (~330 KB): l'eina Edit/Write el TRUNCA en escriure** (talla el final, deixa el script sense tancar i l'app no arrenca). Edita per shell (`sed`/`cat`/heredoc) i comprova SEMPRE que acaba amb `arrenca();</script></body></html>` i que `wc -l` quadra. Desa per `cp`.
- Netlify (dietari.netlify.app) pot anar endarrerit respecte del fitxer del projecte. No el facis servir com a base sense comprovar versió.

## Estat / dades (després de la feina feta)
- `S = {activeYear, years:{}, ccCats:[...]}`. `Y()` = `S.years[S.activeYear]`. **`ccCats` és GLOBAL** (a `S`, no per any).
- Any (`anyBuit()`): `{dies, tanc, cc, factures, bacalla, olivesCat, olivesCompres, conserva, factorConserva:1.114}`.
- Dia: `Y().dies[ISO] = {ef, tpv, fpLines, fplLines, despLines, obs}`. `ef`/`tpv` = número únic. `fpLines`/`fplLines`/`despLines` = arrays de línies `{imp, c(concepte), rec(bool)}`. Cada línia decideix per separat si compta a recaptació (`rec`). Helpers: `lineSum(arr)`, `lineRec(arr)`, `dFp(d)`/`dFpl(d)`/`dDesp(d)` (sumes), `diaTeRes(d)` (dia no buit). **Model antic (`fp/fpl/desp` + `fpRec/fplRec` valor únic) migrat per `migraDies()` dins `migra()`** (idempotent: 1 línia per valor; despesa antiga → `rec:false`).
- Tancament: `Y().tanc[ISO_dissabte] = {caixa, banc, ingresTpv, notes}`. **Setmanal, clau = dissabte** (abans era mensual `YYYY-MM`; codi vell `clauMes` encara existeix però NO s'usa).
- Moviment banc: `{id, data(ISO), concepte, catId, estat, debe, haber, obs}`. La categoria es resol per `catId` via `ccCatNom(m)`.
- Categories banc (`S.ccCats`): `[{id, nom, role}]`. Rols interns: `'despcc'` i `'tpv'` (la lògica hi va lligada, no al nom → reanomenar és segur; esborrar-les trenca els seus càlculs). Seed: `CC_SEED`.
- Factura: `{id, num, ref, empresa, imp, concepte, categoria, estat('Pendent'|'Pagat'), mode, talo, dataPag(text lliure), dataPagISO(date), recDia(bool), obs}`.
- Olives catàleg: `{id, nom, tipus('Granel'|'Llaunes'), ord}` — **sense preu**. Compres: `{id, prod, set(dilluns ISO), quant, imp}`. €/kg = `imp/quant` via `pkg(imp,quant)`. `SEED_OLIVES` = 19 tipus (només nom+tipus).

## Arquitectura clau
- **Setmanes Dl–Ds (6 dies), cada setmana pertany al mes del seu DILLUNS.** Si vessa al mes següent, els dies queden al mes d'inici. Helpers: `mondayOnOrBefore`, `setmanaDe(ds)`, `dissabteDe(ds)`, `mesDeSetmana(satISO)`, `setmanesDelMes(any,mes)`, `isosDelMes`, `w0(sat)`.
- Recaptació: `recDia(d,ds) = ef + tpv + lineRec(fpLines) + lineRec(fplLines) + lineRec(despLines) + factDiaRec(ds)` (suma només les línies marcades `rec`, incloses despeses). `totalsRang(isos)` suma components (fp/fpl/desp via `dFp/dFpl/dDesp`) i rec; `totalsMes(mes)`.
- Enllaços al dia: `factDia(ds)`, `factDiaRec(ds)` (factures Pagat amb `dataPagISO===ds`); `despCCDia(ds)` (moviments banc rol `despcc` d'aquella data, només informatius). Render a `infoDiaHTML(ds)`.
- Categories: `ccCats()`, `ccCat(id)`, `ccCatByRole(role)`, `ccCatNom(m)`, `migra()` (mapa categoria-text antiga → `catId`, cridat a `iniciaApp`). `despCCMes`/`ingresTpvBancMes` filtren per rol.
- Resum anual: **quatrimestres** Q1 gen–abr, Q2 mai–ago, Q3 set–des (`Math.floor(mes/4)`), de ef/tpv/rec/desp/fp/fpl. Mes = suma de setmanes; any = suma de quatrimestres. **Sense IRPF/trimestral.**
- Vistes principals: `vAvui`/`bindAvui`, `vDietari`/`bindDietari` (tancament setmanal via `data-tancset`), `vTancament`/`bindTancament` (`ctx.tancSet` = dissabte), `vCC`/`formCC`, `vFactures`/`formFactura`, `vResumAnual`, `vConfig`/`bindConfig`, `exportaXLSX`. Olives: `vOlives`, `formOlivaCat`, `formOlivaCompra`, `formSetmanaOlives`, `olGraellaHTML`.
- Config té: crea any, factor conserva, inicialitza olives, gestió de categories del banc (afegir/reanomenar/esborrar), esborra tancaments de l'any, esborra l'any.

## Decisions ja preses (no tornis a preguntar)
1. Tancaments setmanals cada dissabte; mes=suma de setmanes, quatrimestre=suma de mesos, any=suma de quatrimestres. Tancaments mensuals vells: esborrats (botó a Config).
2. **Recaptació per línia** (juny 2026): cada línia de Fp/FpL/Despeses té la seva casella `rec`. En un dia hi pot haver diverses línies i només algunes sumen a recaptació. Despesa marcada `rec` **suma** a recaptació (criteri demanat per l'usuari). Entrada al formulari Avui amb blocs editables (+ línia / ✕). Export Excel: full `Dietari` amb totals/dia + full `Línies` amb el detall.
3. Categories del banc: globals, totes editables; lògica lligada a id/rol intern.
4. Al dia del dietari hi surten les 'Despeses cc' del banc, **només informatives** (no sumen).
5. Factura Pagada amb data: surt al dia amb commutador; si recaptació, suma; si no, informativa. IRPF no interessa (fora trimestral).
6. Olives: sense preu de referència; SEED només nom+tipus.

## Riscos / límits coneguts
- La recaptació ja NO és igual a efectiu+TPV (s'hi sumen Fp/FpL marcats i factures-rec). Volgut, però els components no quadren amb el total.
- Esborrar la categoria amb rol 'despcc' o 'tpv' trenca els seus càlculs i NO hi ha forma de reassignar el rol des de la UI (només reanomenar és segur). Possible millora futura: editor de rol.
- Factures amb només data en text lliure (antigues) no apareixen al dia; cal la data estructurada `dataPagISO`.
- L'arrencada completa amb Supabase no s'ha pogut provar en l'entorn de desenvolupament; la sync serialitza tot `S`, així que `ccCats` global i la resta haurien de viatjar bé. Recomanar exportar Excel abans d'esborrar res.
- `clauMes` i `ingresTpvBancMes` han quedat sense ús (codi mort inofensiu).

## Possibles passos següents (no demanats encara)
- Editor de rol per a categories del banc (reassignar 'despcc'/'tpv').
- Suport a diverses dates de pagament / pagaments parcials d'una factura.
- Decidir si el saldo caixa/banc dels tancaments setmanals s'ha de resumir d'alguna manera a nivell mensual (ara són snapshots per dissabte).
