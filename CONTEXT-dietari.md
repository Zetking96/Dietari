# Dietari — guia de treball per a Claude

Document de traspàs entre sessions. **Llegeix això abans de tocar res**: t'estalvia haver de
tornar a buscar el mateix cada vegada.

Treballa sempre **en català**, concís, prosa directa. El Jaume és el propietari de la parada i
sap de què va el negoci: tracta'l com a igual, avisa dels riscos i digues-li quan una decisió
seva té una pega, però no li facis classes.

---

## 1. Què és i on viu

App de gestió comptable d'una parada de bacallà i conserves (Mercat de Provençals, Barcelona —
*Pesca Salada Gil*). **Un sol fitxer `index.html`** (~2.700 línies) amb HTML + CSS + JS, sense
build ni frameworks. SheetJS incrustat per exportar a Excel; Supabase per autenticació i dades.

| | |
|---|---|
| Carpeta | `C:\Users\Jaume Gil\Documents\0Mercat\Apps\App dietari` |
| Repo | `Zetking96/Dietari` (branca `main`) |
| Publicat a | https://zetking96.github.io/Dietari/ (GitHub Pages, **actiu**) |
| | https://dietari.netlify.app (Netlify, pausat per crèdits) |
| Desplegament | **`git push` i ja està** — es publica sol en 1-2 min. No cal pujar res a mà. |

---

## 2. El cicle de treball

El Jaume vol **el canvi fet i publicat**, sense plans ni fases pel mig. Edita, comprova,
comiteja i puja dins del mateix torn. El `push` forma part del canvi, no cal demanar permís.

```bash
# 1. Comprovació de sintaxi (executa-la SEMPRE després d'editar)
cd "C:\Users\Jaume Gil\Documents\0Mercat\Apps\App dietari"
START=$(grep -n '^<script>$' index.html | sed -n '2p' | cut -d: -f1)
END=$(grep -n '^</script>$' index.html | tail -1 | cut -d: -f1)
sed -n "$((START+1)),$((END-1))p" index.html > /tmp/dietari_check.js
node --check /tmp/dietari_check.js && echo SYNTAX_OK

# 2. Commit + push (l'autor ja està configurat al repo, no cal cap flag)
git add index.html && git commit -m "feat: ..." && git push
```

El `sed -n '2p'` agafa el **segon** `<script>` perquè el primer és el bundle de SheetJS.

---

## 3. Com provar les coses (això funciona bé, fes-ho servir)

No tens accés a les dades reals del Jaume (calen les seves credencials de Supabase, que **no has
de manejar mai**). Però pots provar la lògica de veritat injectant un estat fals a la pàgina:

```js
// mcp__Claude_Browser__navigate a file:///.../index.html  (amb force:true per recarregar)
// i després javascript_tool:
(function(){
try{
  S={activeYear:'2026',years:{'2026':anyBuit()}}; migra();
  Y().dies['2026-01-07']={ef:20000,tpv:15000,fpLines:[],fplLines:[],despLines:[],obs:''};
  vista='dietari'; ctx={mes:0,sub:'mes'};   // ⚠️ cal 'vista' si després crides render()
  render();
  return { /* el que vulguis comprovar */ };
}catch(e){return {ERROR:e.message,stack:(e.stack||'').split('\n').slice(0,3)};}
})()
```

**Paranys del test, no del codi** (m'hi he entrebancat més d'un cop):
- Si crides `render()` sense haver posat `vista`, es pinta la vista per defecte (`avui`) i sembla
  que el teu canvi no hi és.
- No comparis `eur0(1234)` amb `innerHTML`: el format porta un espai fi (nbsp) i mai coincideix.
  Llegeix `textContent` de les cel·les.
- El 2026 té **comissions TPV desades** de gener a juny (venen de l'Excel). Un mes «buit»
  d'aquest rang NO dona zero a `totalsMes`, dona un negatiu. Si has de saber si un mes té dades,
  mira `totalsRang(isosDelMes(m))` en cru.

Per diagnosticar les dades reals del Jaume: dona-li **UN sol script de consola** que ho imprimeixi
tot de cop (millor amb `console.table`), no una cadena d'anades i vingudes.

---

## 4. Mapa del codi

Les línies es mouen cada sessió: busca per **nom de funció** (`grep -n "function X"`), no per
número. Les seccions estan marcades amb `/* ===== NOM ===== */`:

`CONFIGURACIÓ SUPABASE` · `ESTAT I PERSISTÈNCIA` · `AUTENTICACIÓ` · `UTILITATS` · `NAVEGACIÓ` ·
`MODAL` · `VISTA: AVUI` · `VISTA: DIETARI` · `VISTA: TANCAMENT SETMANAL` · `VISTA: COMPTE CORRENT` ·
`VISTA: FACTURES` · `VISTA: MÉS` · `VISTA: COMPRES` · `Inventari` · `VISTA: TRESORERIA` ·
`VISTA: RESUM ANUAL` · `COMPARACIÓ ENTRE ANYS` · `EXPORTACIÓ XLSX` · `VISTA: CÒPIA` ·
`VISTA: CONFIGURACIÓ` · `ARRENCADA`

**Patró de vistes**: cada pantalla té `vXxx()` que retorna HTML i `bindXxx()` que hi lliga els
events. `render()` pinta `VISTES[vista]()` dins `#view` i crida `bindVista()`. `go(vista, ctx)` navega.
`ctx` és l'estat de la vista (mes, subpestanya, filtres…) i es perd en canviar d'any.

**On eres**: `render()` **manté l'alçada de scroll** per defecte; només puja a dalt amb
`render({top:true})`, i `go()` ho fa sol quan canvies de vista (o si cliques una pestanya del
menú). Com que desar refà la pàgina sencera, sense això cada canvi et tirava a dalt de tot.
La posició (`vista` + `ctx` + scroll) es desa a `sessionStorage['dietari.pos']` a cada `render()`
i mentre fas scroll; `restauraPos()` la torna a posar des de `iniciaApp()`. És sessionStorage a
posta: aguanta els refrescos, però un dia nou tornes a «Avui».
`modal()` desa l'alçada d'abans d'obrir-se i `tancaModal()` la torna a posar: al mòbil el teclat
desplaça la pàgina del darrere, i sense això en desar des d'un formulari sorties a dalt de tot.

**Helpers que ja existeixen (reutilitza'ls, no en facis de nous):**
`eur(n)` `eur0(n)` `num(v)` `numOrNull(v)` `r2(n)` `esc(s)` `uid()` `dataCA(iso)` `hui()`
`modal(html, onMount)` `mTitle(t)` `tancaModal()` `kpiGrid` `kpiGridWk` `kpiGridMes`
`dlOpts(vals)` `distinctVals(arr,key)`

---

## 5. Model de dades

```
S = { activeYear, years:{}, ccCats:[], compresNoms:{}, ivaDefecte }   ← ccCats i compresNoms són GLOBALS
Y() = S.years[S.activeYear]
```

`anyBuit()` → `{dies, tanc, cc, factures, bacalla, conserva, altres, olivesCat, olivesCompres,
comTpvMes, caixaMes, caixaSet, factorConserva}`

| Cosa | Forma |
|---|---|
| Dia | `dies[ISO] = {ef, tpv, fpLines, fplLines, despLines, obs}` |
| Línia del dia | `{imp, c, rec, quant, unitat}` — `quant`/`unitat` opcionals (inventari) |
| Tancament | `tanc[ISO_dissabte] = {caixa, banc, ingresTpv, notes}` |
| Banc | `{id, data, concepte, catId, estat, debe, haber, obs, recDia, srcFact, srcPag}` |
| Factura | `{id, num, empresa, imp, concepte, categoria, estat, pagaments:[], recDia, pdf, auto, srcType, srcId}` |
| Pagament | `{id, data, talo, imp, mode, banc}` — `banc:true` genera l'apunt al compte corrent |
| Compra | `{id, prov, data, diaCat, productes:[], total}` a `bacalla` / `conserva` / `altres` |
| Producte | `{producte, qty, imp, pv, iva, unitat}` — `unitat` només a `altres` |
| Sortides caixa | `caixaSet[ISO_dilluns] = [{c, imp}]` |

**Categories del banc** (`S.ccCats`): `{id, nom, role}`. Rols interns: `despcc`, `tpv`, `pagfact`.
La lògica va lligada al **rol**, no al nom → reanomenar és segur, esborrar trenca els càlculs.

---

## 6. Regles de negoci que és fàcil trencar

1. **Setmanes Dl–Ds; cada setmana pertany al mes del seu DIMECRES** (regla de majoria de dies,
   com l'Excel del Jaume). `setmanesDelMes(any,mes)`, `isosDelMes(mes)`.
   Al banc, **els ingressos de TPV segueixen aquesta mateixa regla** (`ccDataMes`): un ingrés del
   3 d'agost que tanca la setmana del 27 de juliol compta al juliol, i el camp `tpvData` (dia de
   la venda) mana sobre la data del banc. La resta de moviments compten pel mes de la seva data.
2. **La comissió TPV es resta EXACTAMENT UN COP**, al total mensual (`totalsMes`). Les setmanes
   es queden amb el brut. Ja s'hi va anar i tornar; no la tornis a treure ni a duplicar.
3. **Recaptació ≠ efectiu + TPV.** També hi sumen les línies de Fp/FpL/Despeses marcades `rec` i
   les factures/despeses c/c marcades `rec`. És volgut.
4. **Coeficient** = `(Recaptació ÷ (Despeses + Fp + FpL) − 1) × 100`. «Despeses» inclou les de
   compte corrent i «Fp» inclou FpL. Viu al Resum anual, no a la taula mensual.
5. **La caixa d'efectiu arrenca el juliol** (`CAIXA_DES=6`) i encadena mes a mes cap enrere.
   Suma l'efectiu **real** de cada setmana (entrat − utilitzat). Les sortides d'efectiu **no**
   toquen recaptació ni despeses: són dos llibres diferents.
6. **Anys 2020–2025: només lectura.** Les xifres viuen a la constant `HISTORIC` del codi, no a
   Supabase. Només totals mensuals. El 2020 no separa Fp de FpL ni té despeses c/c.
7. **Als costos, pujar és dolent**: `CAMP_COST` inverteix el color de les comparacions.
8. **`esc()` a tot el text lliure** que vagi a HTML. S'ha auditat i està net; no ho espatllis.
9. Per calcular sobre un altre any, commuta `S.activeYear` i **restaura-ho al `finally`**
   (patró de `acumulaRang`, `valMesAny`). Mai el deixis canviat.

---

## 7. Estat de les funcionalitats (juliol 2026)

- **Dietari**: entrada diària per línies, setmanes Dl–Ds **plegades** (només la fila de totals;
  cliques la capçalera i es despleguen els dies, el tancament i les observacions — estat a
  `ctx.setmObertes`), tancament setmanal, caixa d'efectiu amb calculadora setmanal de sortides,
  comparació interanual (fletxa + % clicable) a Recaptació, Despeses, Despeses c/c, Fp i FpL.
- **Compte corrent**: un moviment nou surt ja com a **TPV / concepte «TPV» / Ingressat** (és el
  que més s'apunta); en canviar de categoria l'estat torna a «Pagat». Al *Resum del mes per
  categoria*, cada fila és clicable i obre el desglossament (`ccCatResumHTML`): totals, taula per
  concepte i tots els moviments, cadascun clicable per editar-lo.
- **Resum anual**: taula mensual, quatrimestres, recaptació per dia de la setmana, i el bloc
  comparatiu — selector de l'any de referència (val per a tot el bloc, `ctx.compAny`) → *rang de
  mesos lliure* (dos desplegables, `ctx.compDes`/`ctx.compFins`; el títol canvia a «Març–Maig»
  quan no arrenca al gener) → *Quatrimestres* → *Any complet* → *Tendència de tots els anys*
  (amb columna «vs [any de referència]» a més de la cadena «vs any ant.»).
- **Compres**: Bacallà · Olives · Conserva · Altres (noms editables a Config). IVA per producte,
  import final de factura i descompte. «Altres» té unitat lliure per producte i barreja factures
  amb el que s'apunta al dia a dia.
  **Benefici previst** (`beneficiLinies`, `benCells`) als subtotals per quatrimestre de Bacallà i
  Conserva i als «Totals de l'any» d'Olives: `Σ qty×pv − Σ import`, contra el cost **sense IVA**.
  Les línies sense preu de venda no hi compten i el peu de taula diu quants € queden fora.
  Les olives guarden el preu de venda al **catàleg** (`olivesCat[].pv`, €/kg) amb excepció
  opcional per compra (`olivesCompres[].pv`); `olPv()` resol quin mana.
- **Factures**: pagaments múltiples amb forma de pagament i apunt al banc opcional; conversió de
  factura normal a compra.
- **Seguretat**: auditada i tancada (RLS, bucket per carpeta d'usuari, registres tancats,
  reautenticació per canviar accés, CSP i SRI). Vegeu la memòria `seguretat-supabase`.

---

## 8. Coses que no s'han fet (i per què)

- **Franja mes a mes amb el % de cada mes** al Resum anual: oferta i no triada. Si la demana, és
  ràpida.
- **Passar automàticament les despeses del dia a la calculadora d'efectiu**: ara s'apunten a mà.
- **2FA (TOTP)**: desproporcionat per un ús d'una sola persona sense dades de tercers.
- **CSP amb hash dels scripts inline**: caldria refer el hash a cada edició i un oblit deixaria
  l'app en blanc.
- `supabase-js` està **fixat a la 2.111.0** amb SRI: ja no s'actualitza sol. Cal pujar-la a mà de
  tant en tant.

---

## 9. Notes pràctiques

- `Read` sobre tot `index.html` **falla** (supera el límit de tokens). Llegeix per trossos amb
  `offset`/`limit`, o millor `grep -n` per trobar el que busques.
- `Edit` funciona bé amb aquest fitxer (desenes d'edicions per sessió sense problemes). L'avís
  antic que el truncava ja no aplica.
- `.claude/` està al `.gitignore`: les skills instal·lades no es publiquen.
- Les dades es desen a Supabase amb retard d'1,5 s (`save()` → `pushRemote`), i també a
  `localStorage` per treballar sense connexió.
