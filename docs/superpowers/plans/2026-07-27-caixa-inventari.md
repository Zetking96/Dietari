# Efectiu acumulat + Inventari de conceptes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Change the "Efectiu acumulat" figure to `bancari + normal − factures pendents`, and let daily Fp/FpL/Despeses concepts optionally carry a quantity+unit so they roll up into a new "Inventari" tab.

**Architecture:** Single-file vanilla JS app (`index.html`, no build step, no framework, no test runner). All changes are additive edits to existing functions inside the inline `<script>` block (currently lines 191–1947) and to the CSS in `<style>`. No new files, no new dependencies.

**Tech Stack:** Plain HTML/CSS/JS, Supabase (data persistence, untouched by this plan), SheetJS (bundled, untouched).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-27-caixa-inventari-design.md` — every task below implements one section of it.
- No test framework exists in this repo (no `package.json`). Do not add one. "Testing" for this plan means:
  1. **Syntax check** (fast, no login needed) after every JS edit — see command below.
  2. **Visual smoke check** in the Browser tool — load the page, confirm no console errors (the login screen must still render; you will NOT log in, since that requires the user's real Supabase credentials, which must never be entered by an agent).
  3. A final **manual verification checklist** handed to the user, since only they can log in and see real data.
- Git author is already configured correctly on this repo (`user.email = 128684439+Zetking96@users.noreply.github.com`, `user.name = Zetking96`) — plain `git commit` needs no extra flags.
- Commit after every task (small, working diffs). **Do not run `git push`** at any point in this plan — pushing publishes to the live GitHub Pages/Netlify site and needs the user's explicit go-ahead in the moment, which is out of scope for task execution and must be asked for separately after all tasks are done.
- Syntax-check command (run from the repo root; robust to line-number drift since it locates the script tags by content, not by line number):

  ```bash
  START=$(grep -n '^<script>$' index.html | sed -n '2p' | cut -d: -f1)
  END=$(grep -n '^</script>$' index.html | tail -1 | cut -d: -f1)
  sed -n "$((START+1)),$((END-1))p" index.html > /tmp/dietari_check.js
  node --check /tmp/dietari_check.js && echo SYNTAX_OK
  ```

  Expected output ends with `SYNTAX_OK`. If it errors instead, the last edit broke JS syntax — fix before continuing.

---

### Task 1: Shared `facturesPendentsTotal()` helper

**Files:**
- Modify: `index.html` — add helper function near `distinctVals`/`dlOpts` (around line 1272), and replace 3 duplicated inline calculations.

**Interfaces:**
- Produces: `facturesPendentsTotal(fs)` — `fs` optional array of factura objects (defaults to `Y().factures`); returns the sum of `max(0, imp − factPagat(f))` across them. Used by Task 2 for the new "Efectiu acumulat" formula.

- [ ] **Step 1: Add the helper function**

Find this exact block (it's right before `function provList()`):

```js
function distinctVals(arr,key){return [...new Set((arr||[]).map(x=>String(x[key]||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ca'));}
function dlOpts(vals){return vals.map(v=>`<option value="${esc(v)}"></option>`).join('');}
function provList(){
```

Replace it with:

```js
function distinctVals(arr,key){return [...new Set((arr||[]).map(x=>String(x[key]||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ca'));}
function dlOpts(vals){return vals.map(v=>`<option value="${esc(v)}"></option>`).join('');}
/* Total pendent de pagar d'un conjunt de factures (per defecte, totes les de l'any actiu) */
function facturesPendentsTotal(fs){return (fs||Y().factures).reduce((s,f)=>s+Math.max(0,num(f.imp)-factPagat(f)),0);}
function provList(){
```

- [ ] **Step 2: Replace the 3 duplicated calculations to use the helper**

In `vFactures()`, find:

```js
  if(q)fs=fs.filter(f=>[f.num,f.empresa,f.concepte,f.talo,f.obs].concat(factPags(f).map(p=>p.talo)).some(v=>String(v??'').toLowerCase().includes(q)));
  const pend=Y().factures.reduce((s,f)=>s+Math.max(0,num(f.imp)-factPagat(f)),0);
```

Replace with:

```js
  if(q)fs=fs.filter(f=>[f.num,f.empresa,f.concepte,f.talo,f.obs].concat(factPags(f).map(p=>p.talo)).some(v=>String(v??'').toLowerCase().includes(q)));
  const pend=facturesPendentsTotal();
```

In `provResumHTML()`, find:

```js
  const tot=fs.reduce((s,f)=>s+num(f.imp),0);
  const pend=fs.reduce((s,f)=>s+Math.max(0,num(f.imp)-factPagat(f)),0);
```

Replace with:

```js
  const tot=fs.reduce((s,f)=>s+num(f.imp),0);
  const pend=facturesPendentsTotal(fs);
```

In `vTresoreria()`, find:

```js
  let ultim=null,ultimK=null;
  Object.keys(Y().tanc).sort().forEach(k=>{const t=Y().tanc[k];if(t.caixa!=null||t.banc!=null){ultim=t;ultimK=k;}});
  const pend=Y().factures.reduce((s,f)=>s+Math.max(0,num(f.imp)-factPagat(f)),0);
```

Replace with:

```js
  let ultim=null,ultimK=null;
  Object.keys(Y().tanc).sort().forEach(k=>{const t=Y().tanc[k];if(t.caixa!=null||t.banc!=null){ultim=t;ultimK=k;}});
  const pend=facturesPendentsTotal();
```

- [ ] **Step 3: Syntax check**

Run the syntax-check command from Global Constraints. Expected: `SYNTAX_OK`.

- [ ] **Step 4: Visual smoke check**

Use the Browser tool to open `index.html` (via `preview_start` with a static file server, e.g. `python -m http.server` in the repo root, then navigate to it) and confirm the login page renders with no console errors (`read_console_messages`, `onlyErrors: true` should be empty). Do not log in.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "refactor: extreu facturesPendentsTotal() per no repetir el càlcul de pendents"
```

---

### Task 2: "Efectiu acumulat" = bancari + normal − pendents

**Files:**
- Modify: `index.html` — the "Caixa d'efectiu" card inside `vDietari()`, the breakdown functions right after it, and the click bindings in `bindDietari()`.

**Interfaces:**
- Consumes: `facturesPendentsTotal()` from Task 1; existing `caixaEfectiuMes(mes)`, `caixaBancariMes(mes)`, `caixaAjustMes(mes)`, `breakdownCaixaHTML(mes)`, `obreBreakdownCaixa(mes)`, `r2(n)`, `eur0(n)`.
- Produces: `breakdownCaixaTotalHTML(mes)`, `obreBreakdownCaixaTotal(mes)` — used only inside this task's own binding, no other task depends on them.

- [ ] **Step 1: Update the card markup in `vDietari()`**

Find this exact block:

```js
  if(mes>=CAIXA_DES){
    const efAcum=caixaEfectiuMes(mes), ajust=caixaAjustMes(mes), banc=caixaBancariMes(mes);
    h+=`<div class="card"><h3>Caixa d'efectiu <span class="muted" style="font-weight:400;font-size:.8rem">(clica per veure d'on surt)</span></h3>
      <div class="kpi clickable" data-caixaef="${mes}" style="margin-bottom:10px"><div class="l">Efectiu acumulat</div><div class="v num">${eur0(efAcum)}</div></div>
      <div class="row2">
        <div><label for="cx_ajust">Ajust (+/−)</label><input id="cx_ajust" class="num" inputmode="decimal" value="${ajust||''}"></div>
        <div><label for="cx_banc">Efectiu bancari</label><input id="cx_banc" class="num" inputmode="decimal" value="${banc??''}"></div>
      </div>
      <button class="primary" id="cx_desa" data-mes="${mes}" style="margin-top:8px">Desa</button>
      <p class="muted" style="margin:6px 2px 0">L'efectiu comença amb l'acumulat del mes anterior i hi suma cada setmana. L'ajust és per corregir manualment; l'efectiu bancari és un valor a part, sense fórmula.</p>
    </div>`;
  }
```

Replace with:

```js
  if(mes>=CAIXA_DES){
    const efAcum=caixaEfectiuMes(mes), ajust=caixaAjustMes(mes), banc=caixaBancariMes(mes);
    const pend=facturesPendentsTotal(), totalAcum=r2((banc||0)+efAcum-pend);
    h+=`<div class="card"><h3>Caixa d'efectiu <span class="muted" style="font-weight:400;font-size:.8rem">(clica per veure d'on surt)</span></h3>
      <div class="kpi clickable" data-caixatot="${mes}" style="margin-bottom:6px"><div class="l">Efectiu acumulat</div><div class="v num">${eur0(totalAcum)}</div></div>
      <div class="kpi clickable" data-caixaef="${mes}" style="margin-bottom:10px"><div class="l">Efectiu normal</div><div class="v num">${eur0(efAcum)}</div></div>
      <div class="row2">
        <div><label for="cx_ajust">Ajust (+/−)</label><input id="cx_ajust" class="num" inputmode="decimal" value="${ajust||''}"></div>
        <div><label for="cx_banc">Efectiu bancari</label><input id="cx_banc" class="num" inputmode="decimal" value="${banc??''}"></div>
      </div>
      <button class="primary" id="cx_desa" data-mes="${mes}" style="margin-top:8px">Desa</button>
      <p class="muted" style="margin:6px 2px 0">Efectiu acumulat = efectiu bancari + efectiu normal − factures pendents de pagar. L'efectiu normal comença amb l'acumulat del mes anterior i hi suma cada setmana (ajust manual a part); l'efectiu bancari és un valor a part, sense fórmula.</p>
    </div>`;
  }
```

- [ ] **Step 2: Add the new breakdown function, right after the existing one**

Find this exact block:

```js
function obreBreakdownCaixa(mes){
  modal(mTitle('Efectiu acumulat · '+MESOS[mes]+' '+S.activeYear)+breakdownCaixaHTML(mes),el=>{
    el.querySelectorAll('[data-mk]').forEach(x=>x.addEventListener('click',()=>{const p=x.dataset.mk.split('|');obreBreakdownMes(parseInt(p[0]),p[1]);}));
    el.querySelectorAll('[data-caixaprev]').forEach(x=>x.addEventListener('click',()=>obreBreakdownCaixa(parseInt(x.dataset.caixaprev))));
  });
}
```

Replace with:

```js
function obreBreakdownCaixa(mes){
  modal(mTitle('Efectiu normal · '+MESOS[mes]+' '+S.activeYear)+breakdownCaixaHTML(mes),el=>{
    el.querySelectorAll('[data-mk]').forEach(x=>x.addEventListener('click',()=>{const p=x.dataset.mk.split('|');obreBreakdownMes(parseInt(p[0]),p[1]);}));
    el.querySelectorAll('[data-caixaprev]').forEach(x=>x.addEventListener('click',()=>obreBreakdownCaixa(parseInt(x.dataset.caixaprev))));
  });
}
/* ---- Detall del gran "Efectiu acumulat": bancari + normal − pendents ---- */
function breakdownCaixaTotalHTML(mes){
  const efAcum=caixaEfectiuMes(mes), banc=caixaBancariMes(mes)||0, pend=facturesPendentsTotal();
  const tot=r2(banc+efAcum-pend);
  let h='<div class="scrollx"><table><thead><tr><th>Concepte</th><th class="n">Import</th></tr></thead><tbody>';
  h+=`<tr><td>Efectiu bancari</td><td class="n">${eur0(banc)}</td></tr>`;
  h+=`<tr class="clickable" data-caixaef="${mes}"><td>Efectiu normal</td><td class="n">${eur0(efAcum)}</td></tr>`;
  h+=`<tr><td>− Factures pendents de pagar</td><td class="n">${eur0(-pend)}</td></tr>`;
  h+=`<tr class="total"><td>Efectiu acumulat</td><td class="n"><b>${eur0(tot)}</b></td></tr></tbody></table></div>`;
  return h;
}
function obreBreakdownCaixaTotal(mes){
  modal(mTitle('Efectiu acumulat · '+MESOS[mes]+' '+S.activeYear)+breakdownCaixaTotalHTML(mes),el=>{
    el.querySelectorAll('[data-caixaef]').forEach(x=>x.addEventListener('click',()=>obreBreakdownCaixa(parseInt(x.dataset.caixaef))));
  });
}
```

- [ ] **Step 3: Bind the click on the new big KPI**

Find:

```js
  document.querySelectorAll('[data-caixaef]').forEach(el=>el.addEventListener('click',()=>obreBreakdownCaixa(parseInt(el.dataset.caixaef))));
```

Replace with:

```js
  document.querySelectorAll('[data-caixatot]').forEach(el=>el.addEventListener('click',()=>obreBreakdownCaixaTotal(parseInt(el.dataset.caixatot))));
  document.querySelectorAll('[data-caixaef]').forEach(el=>el.addEventListener('click',()=>obreBreakdownCaixa(parseInt(el.dataset.caixaef))));
```

- [ ] **Step 4: Syntax check**

Run the syntax-check command. Expected: `SYNTAX_OK`.

- [ ] **Step 5: Visual smoke check**

Reload the page in the Browser tool, confirm no console errors. (Full behavioral check needs a real login — deferred to Task 6's manual checklist.)

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "feat: Efectiu acumulat = bancari + normal - factures pendents, amb desglossament"
```

---

### Task 3: Quantity + unit on Fp/FpL/Despeses lines

**Files:**
- Modify: `index.html` — CSS for `.lrow`, `lineBlockHTML()`, `vAvui()`, `bindAvui()` (the `readBlock`/`cp`/`netLines` closures).

**Interfaces:**
- Produces: each line object gains optional `quant` (number|null) and `unitat` (string, `''` if empty). Consumed by Task 4's `invLinies()`.
- Produces: `totesLinies(key)` (key: `'fpLines'|'fplLines'|'despLines'`, returns flat array of line objects across all days), `conceptesUsats(key)`, `unitatsUsades()`. `totesLinies` is consumed by Task 4.

- [ ] **Step 1: CSS — make room for the new inputs**

Find this exact block:

```css
.lrow{display:grid; grid-template-columns:88px 1fr auto auto; gap:6px; align-items:center; margin-bottom:6px;}
.lrow .li-c{min-width:0;}
```

Replace with:

```css
.lrow{display:grid; grid-template-columns:88px 1fr auto auto; gap:6px; align-items:center; margin-bottom:6px;}
.lrow .li-c{min-width:0;}
.lrow .li-qty{grid-column:1/-1; display:flex; gap:6px; margin:-2px 0 2px;}
.lrow .li-quant{width:76px;}
.lrow .li-unitat{flex:1; min-width:0;}
```

- [ ] **Step 2: `lineBlockHTML()` — render the new inputs and per-block concept datalist**

Find this exact block:

```js
function lineBlockHTML(key){
  const def=BLK_DEF[key], arr=avuiLines[key]||[];
  let h=`<div class="lineblk" data-blk="${key}"><div class="lbhead"><span class="lbtitle">${def.lab}</span><span class="num lbsum" id="sum_${key}">${eur0(lineSum(arr.map(l=>({imp:l.imp}))))}</span></div>`;
  arr.forEach((l,i)=>{
    h+=`<div class="lrow" data-k="${key}" data-i="${i}">
      <input class="num li-imp" inputmode="decimal" placeholder="0,00" value="${l.imp??''}">
      <input class="li-c" placeholder="concepte" value="${esc(l.c||'')}">
      <label class="li-reclbl" title="Compta com a recaptació"><input type="checkbox" class="li-rec" ${l.rec?'checked':''}> rec</label>
      <button class="small li-del" type="button" aria-label="Esborra la línia">✕</button>
    </div>`;
  });
  h+=`<button class="small li-add" type="button" data-k="${key}">+ línia</button></div>`;
  return h;
}
```

Replace with:

```js
function lineBlockHTML(key){
  const def=BLK_DEF[key], arr=avuiLines[key]||[];
  let h=`<div class="lineblk" data-blk="${key}"><div class="lbhead"><span class="lbtitle">${def.lab}</span><span class="num lbsum" id="sum_${key}">${eur0(lineSum(arr.map(l=>({imp:l.imp}))))}</span></div>`;
  arr.forEach((l,i)=>{
    h+=`<div class="lrow" data-k="${key}" data-i="${i}">
      <input class="num li-imp" inputmode="decimal" placeholder="0,00" value="${l.imp??''}">
      <input class="li-c" placeholder="concepte" value="${esc(l.c||'')}" list="dl_concepte_${key}">
      <label class="li-reclbl" title="Compta com a recaptació"><input type="checkbox" class="li-rec" ${l.rec?'checked':''}> rec</label>
      <button class="small li-del" type="button" aria-label="Esborra la línia">✕</button>
      <div class="li-qty">
        <input class="num li-quant" inputmode="decimal" placeholder="quant." value="${l.quant??''}">
        <input class="li-unitat" placeholder="unitat (caixes, kg…)" value="${esc(l.unitat||'')}" list="dl_unitats">
      </div>
    </div>`;
  });
  h+=`<button class="small li-add" type="button" data-k="${key}">+ línia</button></div>`;
  return h;
}
```

- [ ] **Step 3: Add the datalist-source helpers, right after `dFp`/`dFpl`/`dDesp`**

Find this exact block:

```js
function dFp(d,ds){return (d?lineSum(d.fpLines):0)+factDiaBloc(ds,'fp')+olivesDiaBloc(ds,'fp');}
function dFpl(d,ds){return (d?lineSum(d.fplLines):0)+factDiaBloc(ds,'fpl')+olivesDiaBloc(ds,'fpl');}
function dDesp(d,ds){return (d?lineSum(d.despLines):0)+factDiaBloc(ds,'desp');}
```

Replace with:

```js
function dFp(d,ds){return (d?lineSum(d.fpLines):0)+factDiaBloc(ds,'fp')+olivesDiaBloc(ds,'fp');}
function dFpl(d,ds){return (d?lineSum(d.fplLines):0)+factDiaBloc(ds,'fpl')+olivesDiaBloc(ds,'fpl');}
function dDesp(d,ds){return (d?lineSum(d.despLines):0)+factDiaBloc(ds,'desp');}
/* Totes les línies (de tots els dies de l'any actiu) d'un bloc: 'fpLines'|'fplLines'|'despLines' */
function totesLinies(key){
  const out=[];
  Object.values(Y().dies).forEach(d=>{(d[key]||[]).forEach(l=>out.push(l));});
  return out;
}
function conceptesUsats(key){return distinctVals(totesLinies(key),'c');}
function unitatsUsades(){
  const all=[...totesLinies('fpLines'),...totesLinies('fplLines'),...totesLinies('despLines')];
  return distinctVals(all,'unitat');
}
```

`distinctVals` and `dlOpts` are defined later in the file (around line 1272) but that's fine — functions declared with `function` are hoisted, so calling them earlier in file order is valid.

- [ ] **Step 4: `vAvui()` — render the datalists once, and read/write `quant`/`unitat`**

Find this exact block:

```js
function vAvui(){
  const ds=ctx.data||hui();
  const d=dia(ds)||{};
  const dow=new Date(ds+'T12:00').getDay();
  const avis=dow===0?'<div class="warn">Aquest dia és diumenge (tancat). Pots desar igualment si cal.</div>':'';
  const cp=a=>(a||[]).map(l=>({imp:l.imp,c:l.c||'',rec:!!l.rec}));
  avuiLines={fp:cp(d.fpLines),fpl:cp(d.fplLines),desp:cp(d.despLines)};
  return `<h2>Entrada del dia</h2>
  <div class="card" id="cardAvui">
    <label for="f_data">Data</label>
    <input type="date" id="f_data" value="${ds}">
    ${avis}
    <div class="row2">
      <div><label for="f_ef">Efectiu</label><input id="f_ef" class="num" inputmode="decimal" placeholder="0,00" value="${d.ef??''}"></div>
      <div><label for="f_tpv">TPV</label><input id="f_tpv" class="num" inputmode="decimal" placeholder="0,00" value="${d.tpv??''}"></div>
    </div>
    <div id="blkFp">${lineBlockHTML('fp')}</div>
    <div id="blkFpl">${lineBlockHTML('fpl')}</div>
    <div id="blkDesp">${lineBlockHTML('desp')}</div>
    <label for="f_obs">Observacions (talons, factures, ingressos al banc…)</label>
    <textarea id="f_obs">${esc(d.obs||'')}</textarea>
    <div class="recline"><span class="l">Recaptació</span><span class="v num" id="recVal">${eur0(recDia(d,ds))}</span></div>
    <div class="muted" id="tpvInfo" style="margin-top:2px"></div>
    <button class="primary" id="desaDia">Desa el dia</button>
  </div>
  ${infoDiaHTML(ds)}
  <div class="card" id="resumSetmanaAvui"></div>`;
}
```

Replace with:

```js
function vAvui(){
  const ds=ctx.data||hui();
  const d=dia(ds)||{};
  const dow=new Date(ds+'T12:00').getDay();
  const avis=dow===0?'<div class="warn">Aquest dia és diumenge (tancat). Pots desar igualment si cal.</div>':'';
  const cp=a=>(a||[]).map(l=>({imp:l.imp,c:l.c||'',rec:!!l.rec,quant:l.quant,unitat:l.unitat||''}));
  avuiLines={fp:cp(d.fpLines),fpl:cp(d.fplLines),desp:cp(d.despLines)};
  return `<h2>Entrada del dia</h2>
  <div class="card" id="cardAvui">
    <label for="f_data">Data</label>
    <input type="date" id="f_data" value="${ds}">
    ${avis}
    <div class="row2">
      <div><label for="f_ef">Efectiu</label><input id="f_ef" class="num" inputmode="decimal" placeholder="0,00" value="${d.ef??''}"></div>
      <div><label for="f_tpv">TPV</label><input id="f_tpv" class="num" inputmode="decimal" placeholder="0,00" value="${d.tpv??''}"></div>
    </div>
    <div id="blkFp">${lineBlockHTML('fp')}</div>
    <div id="blkFpl">${lineBlockHTML('fpl')}</div>
    <div id="blkDesp">${lineBlockHTML('desp')}</div>
    <datalist id="dl_concepte_fp">${dlOpts(conceptesUsats('fpLines'))}</datalist>
    <datalist id="dl_concepte_fpl">${dlOpts(conceptesUsats('fplLines'))}</datalist>
    <datalist id="dl_concepte_desp">${dlOpts(conceptesUsats('despLines'))}</datalist>
    <datalist id="dl_unitats">${dlOpts(unitatsUsades())}</datalist>
    <label for="f_obs">Observacions (talons, factures, ingressos al banc…)</label>
    <textarea id="f_obs">${esc(d.obs||'')}</textarea>
    <div class="recline"><span class="l">Recaptació</span><span class="v num" id="recVal">${eur0(recDia(d,ds))}</span></div>
    <div class="muted" id="tpvInfo" style="margin-top:2px"></div>
    <button class="primary" id="desaDia">Desa el dia</button>
  </div>
  ${infoDiaHTML(ds)}
  <div class="card" id="resumSetmanaAvui"></div>`;
}
```

The datalists are rendered once, outside `#blkFp`/`#blkFpl`/`#blkDesp` — `renderBlock()` (Step 5) only replaces those inner containers when a line is added/removed, so the datalists stay in the DOM and keep working after re-renders.

- [ ] **Step 5: `bindAvui()` — read the new fields into `avuiLines`, and push blank ones with them**

Find this exact block:

```js
  const readBlock=key=>{const arr=[];
    document.querySelectorAll('.lrow[data-k="'+key+'"]').forEach(row=>{
      arr.push({imp:row.querySelector('.li-imp').value,c:row.querySelector('.li-c').value,rec:row.querySelector('.li-rec').checked});});
    return arr;};
```

Replace with:

```js
  const readBlock=key=>{const arr=[];
    document.querySelectorAll('.lrow[data-k="'+key+'"]').forEach(row=>{
      arr.push({imp:row.querySelector('.li-imp').value,c:row.querySelector('.li-c').value,rec:row.querySelector('.li-rec').checked,
        quant:row.querySelector('.li-quant').value,unitat:row.querySelector('.li-unitat').value});});
    return arr;};
```

Find:

```js
    if(add){const k=add.dataset.k; syncLines(); avuiLines[k].push({imp:'',c:'',rec:false}); renderBlock(k); recalc(); return;}
```

Replace with:

```js
    if(add){const k=add.dataset.k; syncLines(); avuiLines[k].push({imp:'',c:'',rec:false,quant:'',unitat:''}); renderBlock(k); recalc(); return;}
```

- [ ] **Step 6: `bindAvui()` — persist `quant`/`unitat` on save**

Find this exact block:

```js
    syncLines();
    const netLines=arr=>arr.map(l=>({imp:numOrNull(l.imp),c:(l.c||'').trim(),rec:!!l.rec}))
      .filter(l=>l.imp!=null||l.c).map(l=>({imp:l.imp==null?0:l.imp,c:l.c,rec:l.rec}));
    const d={ef:numOrNull($('#f_ef').value),tpv:numOrNull($('#f_tpv').value),
      fpLines:netLines(avuiLines.fp),fplLines:netLines(avuiLines.fpl),despLines:netLines(avuiLines.desp),
      obs:$('#f_obs').value.trim()};
```

Replace with:

```js
    syncLines();
    const netLines=arr=>arr.map(l=>({imp:numOrNull(l.imp),c:(l.c||'').trim(),rec:!!l.rec,quant:numOrNull(l.quant),unitat:(l.unitat||'').trim()}))
      .filter(l=>l.imp!=null||l.c||l.quant!=null||l.unitat).map(l=>({imp:l.imp==null?0:l.imp,c:l.c,rec:l.rec,quant:l.quant,unitat:l.unitat}));
    const d={ef:numOrNull($('#f_ef').value),tpv:numOrNull($('#f_tpv').value),
      fpLines:netLines(avuiLines.fp),fplLines:netLines(avuiLines.fpl),despLines:netLines(avuiLines.desp),
      obs:$('#f_obs').value.trim()};
```

- [ ] **Step 7: Syntax check**

Run the syntax-check command. Expected: `SYNTAX_OK`.

- [ ] **Step 8: Visual smoke check**

Reload in the Browser tool, confirm no console errors.

- [ ] **Step 9: Commit**

```bash
git add index.html
git commit -m "feat: quantitat i unitat opcionals a les línies de Fp/FpL/Despeses del dia"
```

---

### Task 4: Inventory aggregation + detail view

**Files:**
- Modify: `index.html` — add new functions near `olivaResumHTML`/`bindResumLinks` (around line 1400).

**Interfaces:**
- Consumes: `num`/`eur0`/`dataCA`/`esc`/`mTitle`/`modal`/`tancaModal`/`go` (all pre-existing). Reads `Y().dies` directly (not `totesLinies` from Task 3 — that helper is for datalist suggestions and doesn't carry the date/bloc context this task needs).
- Produces: `invArticles()` → `[{key, c, unitat, quant, imp, n}]` sorted by name then unit. `obreInvArticleResum(key)` — opens the modal for one article. Both consumed by Task 5's `vInventari()`.

- [ ] **Step 1: Add the aggregation and detail functions**

Find this exact block:

```js
function obreOlivaResum(prodId){const p=Y().olivesCat.find(x=>x.id===prodId);modal(mTitle(p?p.nom:'Oliva')+olivaResumHTML(prodId),el=>bindResumLinks(el));}
```

Replace with:

```js
function obreOlivaResum(prodId){const p=Y().olivesCat.find(x=>x.id===prodId);modal(mTitle(p?p.nom:'Oliva')+olivaResumHTML(prodId),el=>bindResumLinks(el));}
/* ===== Inventari: articles amb quantitat de les línies Fp/FpL/Despeses del dia ===== */
const INV_BLOCS=[['fpLines','Fp'],['fplLines','FpL'],['despLines','Despeses']];
/* Totes les línies amb quantitat, de tots els blocs, amb la data i el bloc d'origen */
function invLinies(){
  const out=[];
  Object.keys(Y().dies).forEach(ds=>{
    const d=Y().dies[ds];
    INV_BLOCS.forEach(([key,lab])=>{
      (d[key]||[]).forEach(l=>{
        if(l.quant==null||!(l.c||'').trim())return;
        out.push({ds,bloc:lab,c:l.c.trim(),unitat:(l.unitat||'').trim(),quant:num(l.quant),imp:num(l.imp)});
      });
    });
  });
  return out;
}
/* Articles = (concepte, unitat) normalitzats, amb quantitat i import acumulats de l'any */
function invArticles(){
  const map={};
  invLinies().forEach(l=>{
    const k=l.c.toLowerCase()+'|'+l.unitat.toLowerCase();
    if(!map[k])map[k]={key:k,c:l.c,unitat:l.unitat,quant:0,imp:0,n:0};
    map[k].quant+=l.quant; map[k].imp+=l.imp; map[k].n++;
  });
  return Object.values(map).sort((a,b)=>a.c.localeCompare(b.c,'ca')||a.unitat.localeCompare(b.unitat,'ca'));
}
function invArticleResumHTML(key){
  const lines=invLinies().filter(l=>(l.c.toLowerCase()+'|'+l.unitat.toLowerCase())===key).sort((a,b)=>a.ds<b.ds?1:-1);
  const q=lines.reduce((s,l)=>s+l.quant,0), im=lines.reduce((s,l)=>s+l.imp,0);
  let h=`<div class="recline"><span class="l">Total comprat</span><span class="v num">${q.toLocaleString('ca-ES')}${lines[0]?' '+esc(lines[0].unitat):''}</span></div>`;
  h+=`<div class="recline"><span class="l">Import total</span><span class="v num">${eur0(im)}</span></div>`;
  h+='<h3>Totes les compres ('+lines.length+')</h3><div class="scrollx"><table><thead><tr><th>Data</th><th>Bloc</th><th class="n">Quant.</th><th class="n">Import</th></tr></thead><tbody>';
  lines.forEach(l=>{h+=`<tr class="clickable" data-dia="${l.ds}"><td>${dataCA(l.ds)}</td><td>${esc(l.bloc)}</td><td class="n">${l.quant.toLocaleString('ca-ES')}</td><td class="n">${eur0(l.imp)}</td></tr>`;});
  h+='</tbody></table></div>';
  return h;
}
function obreInvArticleResum(key){
  const art=invArticles().find(a=>a.key===key); if(!art)return;
  modal(mTitle(art.c+(art.unitat?' · '+art.unitat:''))+invArticleResumHTML(key),el=>{
    el.querySelectorAll('tr[data-dia]').forEach(tr=>tr.addEventListener('click',()=>{tancaModal();go('avui',{data:tr.dataset.dia});}));
  });
}
```

- [ ] **Step 2: Syntax check**

Run the syntax-check command. Expected: `SYNTAX_OK`. (Nothing calls these functions yet — that's Task 5 — so there's no behavior to smoke-check beyond syntax.)

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: agregació d'inventari (invArticles) i detall per article"
```

---

### Task 5: "Inventari" tab in Compres

**Files:**
- Modify: `index.html` — `vCompres()`, `bindCompres()`, `render()` (FAB visibility), the `#fab` click handler.

**Interfaces:**
- Consumes: `invArticles()`, `obreInvArticleResum(key)` from Task 4.

- [ ] **Step 1: Add the tab button and dispatch a new `vInventari()`**

Find this exact block:

```js
function vCompres(){
  const tab=ctx.tab||'bacalla'; ctx.tab=tab;
  let h=`<h2>Compres</h2><div class="subtabs">
    ${[['bacalla','Bacallà'],['olives','Olives'],['conserva','Conserva i altres']].map(([k,t])=>`<button data-tab="${k}" class="${k===tab?'on':''}">${t}</button>`).join('')}</div>`;
  if(tab==='bacalla')h+=vBacalla();
  else if(tab==='olives')h+=vOlives();
  else h+=vConserva();
  return h;
}
```

Replace with:

```js
function vCompres(){
  const tab=ctx.tab||'bacalla'; ctx.tab=tab;
  let h=`<h2>Compres</h2><div class="subtabs">
    ${[['bacalla','Bacallà'],['olives','Olives'],['conserva','Conserva i altres'],['inventari','Inventari']].map(([k,t])=>`<button data-tab="${k}" class="${k===tab?'on':''}">${t}</button>`).join('')}</div>`;
  if(tab==='bacalla')h+=vBacalla();
  else if(tab==='olives')h+=vOlives();
  else if(tab==='conserva')h+=vConserva();
  else h+=vInventari();
  return h;
}
function vInventari(){
  const arts=invArticles();
  if(!arts.length)return '<div class="card muted">Encara no hi ha cap línia de Fp/FpL/Despeses amb quantitat. Afegeix una quantitat i una unitat a una línia des de «Entrada del dia» i apareixerà aquí.</div>';
  let h='<div class="card tight"><div class="scrollx"><table><thead><tr><th>Article</th><th class="n">Quantitat</th><th class="n">Import</th></tr></thead><tbody>';
  arts.forEach(a=>{h+=`<tr class="clickable" data-inv="${esc(a.key)}"><td>${esc(a.c)}</td><td class="n">${a.quant.toLocaleString('ca-ES')} ${esc(a.unitat)}</td><td class="n">${eur0(a.imp)}</td></tr>`;});
  h+='</tbody></table></div></div>';
  return h;
}
```

- [ ] **Step 2: Bind clicks on inventory rows**

Find this exact block:

```js
  const ac=$('#addCat'); if(ac)ac.addEventListener('click',()=>formOlivaCat());
}
```

Replace with:

```js
  const ac=$('#addCat'); if(ac)ac.addEventListener('click',()=>formOlivaCat());
  document.querySelectorAll('[data-inv]').forEach(el=>el.addEventListener('click',()=>obreInvArticleResum(el.dataset.inv)));
}
```

- [ ] **Step 3: Don't show the "+" FAB, and don't open the conserva form, on the Inventari tab**

Find this exact line:

```js
  fab.style.display=['cc','factures','compres'].includes(vista)?'block':'none';
```

Replace with:

```js
  fab.style.display=(['cc','factures'].includes(vista)||(vista==='compres'&&ctx.tab!=='inventari'))?'block':'none';
```

Find this exact block:

```js
  else if(vista==='compres'){
    if(ctx.tab==='bacalla')formBacalla();
    else if(ctx.tab==='olives')formSetmanaOlives(ctx.setOl);
```

Read a few more lines below it in the file to get the closing brace right before making the edit (the block continues past what's quoted above — locate the line `else formConserva();` that follows and the block's closing `}`), then change:

```js
  else if(vista==='compres'){
    if(ctx.tab==='bacalla')formBacalla();
    else if(ctx.tab==='olives')formSetmanaOlives(ctx.setOl);
    else formConserva();
```

to:

```js
  else if(vista==='compres'){
    if(ctx.tab==='bacalla')formBacalla();
    else if(ctx.tab==='olives')formSetmanaOlives(ctx.setOl);
    else if(ctx.tab==='conserva')formConserva();
```

(Only the `else formConserva();` → `else if(ctx.tab==='conserva')formConserva();` line changes; everything else in that handler stays as-is.)

- [ ] **Step 4: Syntax check**

Run the syntax-check command. Expected: `SYNTAX_OK`.

- [ ] **Step 5: Visual smoke check**

Reload in the Browser tool, confirm no console errors.

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "feat: pestanya Inventari a Compres, amb detall per article"
```

---

### Task 6: Manual verification with the user + push

This app requires a real Supabase login to see actual data, which the agent must never enter (credentials are the user's alone to handle). This task hands verification to the user and only pushes once they confirm.

- [ ] **Step 1: Give the user a verification checklist**

Ask the user to open the app (their locally running copy or, after push, the published site) logged in as themself, and check:

1. Dietari → Mes (a month ≥ juliol 2026): the "Caixa d'efectiu" card now shows **two** rows — a big "Efectiu acumulat" and a smaller "Efectiu normal" below it.
2. Click "Efectiu normal": opens the old familiar breakdown (mes anterior + setmanes + ajust).
3. Click "Efectiu acumulat": opens a new breakdown showing Efectiu bancari / Efectiu normal / − Factures pendents de pagar / Total, and the total matches `banc + normal − pendents` by hand.
4. Entrada del dia: each Fp/FpL/Despeses line now has two extra small fields (quantitat, unitat) under the concept. Type a concept (e.g. "Croquetes"), a quantity (e.g. 7) and a unit (e.g. "caixes"), save the day.
5. Compres → Inventari (new 4th tab): "Croquetes" appears with 7 caixes. Click it: shows the one line just added, with date, bloc, quantity, import.
6. Add another day with "croquetes" / 3 / "caixes": Inventari now shows 10 caixes total for Croquetes.
7. Everything that worked before (recaptació, weekly/monthly totals, existing Fp/FpL/Despeses lines from the gener–juliol import) still looks correct — nothing regressed.

- [ ] **Step 2: Fix anything the user reports**

If step 1 surfaces a problem, fix it as a normal follow-up edit + commit (not part of this checklist, since the exact issue is unknown ahead of time).

- [ ] **Step 3: Push, only after explicit confirmation**

Ask the user directly: "Tot correcte — vols que faci `git push` per publicar-ho a GitHub Pages/Netlify?" Only run `git push` after they say yes.

```bash
git push
```
