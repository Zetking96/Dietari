# Disseny: Efectiu acumulat + Inventari de conceptes

Data: 2026-07-27
Fitxer: `index.html` (aplicació d'un sol fitxer, HTML+CSS+JS sense frameworks)

## Context

L'app "Dietari" porta la comptabilitat de Pesca Salada Gil. A la vista Dietari → Mes hi ha
una targeta "Caixa d'efectiu" (des de juliol 2026, `CAIXA_DES`) amb:

- Un acumulador d'efectiu (`caixaEfectiuMes`): mes anterior + efectiu de les setmanes + ajust manual.
- Un camp manual "Efectiu bancari" (`caixaBancariMes`), sense fórmula.

Per altra banda, cada dia es poden afegir línies lliures a Fp / FpL / Despeses
(`fpLines` / `fplLines` / `despLines`), cadascuna `{imp, c, rec}` (import, concepte de text
lliure, si compta a recaptació). Aquestes línies no porten cap noció de quantitat.

Aquest document cobreix dues millores independents.

## Feature 1 — Efectiu acumulat = bancari + normal − pendents

**Problema:** la xifra gran "Efectiu acumulat" de la targeta només reflecteix l'efectiu en mà
(no bancari, no descompta factures pendents), cosa que no dona la posició real de tresoreria
del moment.

**Canvi:**

- La xifra gran "Efectiu acumulat" passa a calcular-se com:
  `Efectiu bancari (caixaBancariMes) + Efectiu normal (caixaEfectiuMes) − Factures pendents de pagar`.
- "Factures pendents de pagar" reutilitza el mateix total global que ja es fa servir a la
  vista Factures i a Tresoreria: `Y().factures.reduce((s,f)=>s+Math.max(0,num(f.imp)-factPagat(f)),0)`.
  Es puja a una funció compartida `facturesPendentsTotal()` per no repetir la fórmula
  (actualment duplicada 3 cops al fitxer) i es reutilitza als 3 llocs.
- L'acumulador actual (mes anterior + setmanes + ajust) es manté tal qual però passa a
  mostrar-se com a fila secundària **"Efectiu normal"**, clicable, obrint el mateix
  desglossament que ja existeix avui (`breakdownCaixaHTML`, sense canvis de contingut,
  només de títol si cal).
- La xifra gran també és clicable: obre un desglossament nou de 3 línies —
  Efectiu bancari / Efectiu normal (clicable cap al desglossament detallat existent) /
  − Factures pendents de pagar — amb el total a sota.
- Si `caixaBancariMes(mes)` és `null` (no s'ha omplert), es tracta com 0 en el càlcul del
  total gran, igual que ja fa la resta de l'app amb valors buits.

**Sense canvis:** el comportament per mesos anteriors a `CAIXA_DES` (la targeta ni es mostra),
els inputs d'ajust i d'efectiu bancari, i el desglossament setmana/mes existent.

## Feature 2 — Inventari a partir dels conceptes del dia

**Objectiu:** poder anotar quantitats als conceptes de Fp/FpL/Despeses (p.ex. "7 caixes de
croquetes") i consultar quant se n'ha comprat durant l'any, sense canviar com funciona avui
la part d'import/recaptació.

### Model de dades

Cada línia de `fpLines`, `fplLines` i `despLines` guanya dos camps opcionals:

```js
{ imp, c, rec, quant, unitat }
```

- `quant`: número (com `imp`), pot ser `null`/absent.
- `unitat`: text lliure (p.ex. "caixes", "kg", "unitats"), pot ser `null`/absent.
- Si tots dos són buits, la línia es desa exactament com ara (compatible amb totes les
  dades ja importades de gener–juliol 2026, que no en tindran).

### Entrada (vista "Entrada del dia")

A cada fila de línia (`lrow`) dels 3 blocs (Fp, FpL, Despeses) s'afegeixen dos camps nous,
petits, després del concepte:

- Input numèric "quant." amb el mateix estil que l'import.
- Input de text "unitat" amb `<datalist>` d'unitats ja usades a l'aplicació (llista global,
  com el patró d'autocompletar que ja existeix per proveïdors — `distinctVals`).

El camp de concepte (`li-c`) també guanya un `<datalist>` amb els conceptes ja usats als
mateixos 3 blocs, per facilitar reutilitzar el mateix nom exacte (i per tant que s'agrupin
bé a l'inventari).

Aquests camps són opcionals: si es deixen buits, la línia funciona igual que avui.

### Agrupació en articles d'inventari

Un "article" és la parella **(concepte, unitat)** normalitzada amb `trim().toLowerCase()`
per la comparació (la visualització mostra el text tal com s'ha escrit més recentment).
Es distingeix per unitat perquè no es pot sumar "7 caixes" amb "3 kg" del mateix concepte
sense conversió; si un dia es compra el mateix concepte amb unitats diferents, apareixen com
dos articles separats a l'inventari.

Només compten com a article les línies que tenen `quant` omplert (les línies amb concepte
però sense quantitat no generen entrada d'inventari, encara que sumin a l'import normal).

### Vista nova "Inventari"

Una 4a pestanya dins de la vista Compres (al costat de Bacallà / Olives / Conserva), amb el
mateix patró de pestanyes (`data-tab`) que ja existeix a `vCompres`.

- Llista de tots els articles de l'any actiu, ordenats alfabèticament: nom, quantitat total
  acumulada i unitat.
- En clicar un article, s'obre un detall amb totes les línies que hi han contribuït (data,
  bloc d'origen Fp/FpL/Despeses, quantitat, import), i els totals de quantitat i d'import a
  sota.

## Fora d'abast (explícitament exclòs)

- No es converteixen unitats entre elles (p.ex. caixes → kg).
- No es toca res de Bacallà / Olives / Conserva (ja tenen el seu propi sistema de
  quantitats a Compres).
- No s'afegeix quantitat a les factures ni a les despeses de compte corrent.
- No es migren retroactivament quantitats a les línies ja desades de gener–juliol 2026.
