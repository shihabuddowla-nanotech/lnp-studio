import { html, cx, tw, useState, useEffect, useMemo, Card, Icon, Pill, ThemeToggle, StatCard } from './common.js';
import { SearchBar } from './SearchBar.js';
import { FormulationMatrix, SIMatrix } from './Matrix.js';
import { PredictCards, PredictControls, ClassBreakdown } from './Predict.js';
import { CustomLipidModal } from './CustomLipidModal.js';
import { LIPID_CLASSES, EXAMPLE_FORMULATIONS } from '../lipids.js';
import {
  derive, addColumn, clearAmounts, applyPreset, setVolume, setTotalConc, MAX_COLUMNS, fmt,
} from '../calc.js';
import { predict } from '../predict.js';
import { initDB, getAllLipids, addCustomLipid } from '../db.js';
import { exportFormulation } from '../exportXlsx.js';

const LS_KEY = 'lnp.dashboard.v1';

function loadPersisted() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return null;
}

// Master numeric field — shows the (derived) value when idle, commits user
// input on change. It never auto-commits, so reading a derived value back into
// it cannot create a feedback/circular update loop.
function MasterField({ label, unit, value, placeholder, onCommit, big }) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState('');
  const display = focused ? draft : (value == null ? '' : fmt(value));
  // `big` (the master total concentration) is deliberately the SAME input/label
  // size as the editable "Vol. of stock" matrix row — equal-weight primary
  // controls — distinguished only by its bold teal colour and highlighted box.
  return html`<label class="flex flex-col gap-1">
    <span class=${cx('text-[12.5px] font-bold', tw.textSub)}>${label} <span class=${tw.textFaint}>(${unit})</span></span>
    <input type="text" inputmode="decimal"
      class=${cx('rounded-md border tabular-nums outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 px-2 py-1.5 text-sm',
        big ? 'w-44 font-bold text-teal-700 dark:text-teal-300' : 'w-28',
        tw.surfaceInput, tw.border, !big && tw.text)}
      value=${display} placeholder=${placeholder || '—'}
      onFocus=${(e) => { setFocused(true); setDraft(value == null ? '' : fmt(value)); requestAnimationFrame(() => e.target.select && e.target.select()); }}
      onBlur=${() => setFocused(false)}
      onChange=${(e) => { setDraft(e.target.value); onCommit(e.target.value); }} />
  </label>`;
}

const BTN_TONES = {
  slate: 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-zinc-600 dark:bg-zinc-700/40 dark:text-zinc-200 dark:hover:bg-zinc-700',
  teal: 'border-teal-500 bg-teal-50 text-teal-700 hover:bg-teal-100 dark:border-teal-600 dark:bg-teal-600/20 dark:text-teal-200 dark:hover:bg-teal-600/40',
  emerald: 'border-emerald-500 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-600 dark:bg-emerald-600/20 dark:text-emerald-200 dark:hover:bg-emerald-600/40',
  violet: 'border-violet-400 bg-violet-50 text-violet-700 hover:bg-violet-100 dark:border-violet-500/60 dark:bg-violet-500/15 dark:text-violet-200 dark:hover:bg-violet-500/30',
  rose: 'border-rose-400 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-500/60 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/25',
};
function Btn({ onClick, icon, children, disabled, tone = 'slate', title }) {
  return html`<button onClick=${onClick} disabled=${disabled} title=${title || ''}
    class=${cx('inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-medium shadow-sm transition hover:shadow active:scale-[0.97]',
      BTN_TONES[tone], disabled && 'opacity-40 cursor-not-allowed')}>
    ${icon && html`<${Icon} name=${icon} size=${15} />`}${children}</button>`;
}

export function App() {
  const persisted = useMemo(loadPersisted, []);
  const [lipids, setLipids] = useState([]);
  const [state, setState] = useState(persisted?.state || { volume: 1, columns: [] });
  const [payload, setPayload] = useState(persisted?.payload || { type: 'mRNA', amount: 271, npRatio: 6 });
  const [process, setProcess] = useState(persisted?.process || { frr: 3, tfr: 12 });
  const [online, setOnline] = useState(navigator.onLine);
  const [toast, setToast] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const d = useMemo(() => derive(state), [state]);
  const prediction = useMemo(() => predict(state, d, payload, process), [state, d, payload, process]);

  useEffect(() => {
    initDB().then((ls) => setLipids(ls))
      .catch((e) => setToast({ kind: 'err', text: 'Database initialisation failed: ' + e.message }));

    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ state, payload, process })); } catch (_) {}
  }, [state, payload, process]);

  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 4000); return () => clearTimeout(t); } }, [toast]);

  const usedIds = useMemo(() => new Set(state.columns.map((c) => c.lipidId)), [state.columns]);
  const lipidById = useMemo(() => { const m = new Map(); lipids.forEach((l) => m.set(l.id, l)); return m; }, [lipids]);

  const onAdd = (lipid) => setState((s) => addColumn(s, lipid));

  const loadPreset = (key) => {
    const preset = EXAMPLE_FORMULATIONS[key];
    if (!preset) return;
    setState(applyPreset(preset, (id) => lipidById.get(id)));
    if (preset.payload) setPayload(preset.payload);
    if (preset.process) setProcess(preset.process);
    setToast({ kind: 'ok', text: `Loaded ${preset.label}` });
  };

  const saveCustomLipid = async (data) => {
    const rec = await addCustomLipid(data);
    setLipids(await getAllLipids());
    if (usedIds.has(rec.id)) {
      setToast({ kind: 'ok', text: `${rec.abbr} is already in the repository and matrix — entry updated.` });
    } else {
      setState((s) => addColumn(s, rec));
      setToast({ kind: 'ok', text: `Added ${rec.abbr} to the repository and matrix.` });
    }
  };

  const doExport = () => {
    if (!state.columns.length) { setToast({ kind: 'err', text: 'Add at least one lipid before exporting.' }); return; }
    exportFormulation({ state, d, prediction, payload, process });
    setToast({ kind: 'ok', text: 'Excel workbook exported.' });
  };

  const atMax = state.columns.length >= MAX_COLUMNS;
  const hasCols = state.columns.length > 0;

  return html`<div class=${cx('min-h-screen', tw.text)}>
    <header class=${cx('sticky top-0 z-50 border-b backdrop-blur', tw.border, tw.header)}>
      <div class="h-[3px] w-full bg-gradient-to-r from-teal-500 via-sky-500 to-violet-500"></div>
      <div class="mx-auto flex max-w-[1400px] flex-wrap items-center gap-3 px-4 py-3">
        <div class="flex items-center gap-3">
          <img src="icons/icon-192.png" alt="" class="h-9 w-9 rounded-lg shadow-sm ring-1 ring-teal-500/20 dark:ring-teal-400/20" />
          <div>
            <h1 class=${cx('text-base font-bold leading-tight tracking-tight', tw.text)}>LNP / Liposome Formulation Studio</h1>
            <p class=${cx('text-[11px] font-medium leading-tight', tw.textMute)}>Pharmaceutical Nanotechnology, University of Helsinki</p>
            <p class=${cx('text-[10px] leading-tight', tw.textFaint)}>Reactive formulation matrix · Avanti repository · predictive engine</p>
          </div>
        </div>
        <div class="ml-auto flex items-center gap-2">
          <${Pill} color=${online ? '#059669' : '#e11d48'} dot=${true} title=${online ? 'Connected to the internet' : 'No internet connection'}>
            ${online ? 'Online' : 'Offline'}</${Pill}>
          <${ThemeToggle} />
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-[1400px] space-y-5 px-4 py-5">

      <!-- Snapshot stats — at-a-glance state of the current formulation -->
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <${StatCard} hero=${true} label="Total Concentration" icon="beaker"
          value=${d.totalConc == null ? null : fmt(d.totalConc)} unit="mM"
          footer=${`${state.columns.length} lipid${state.columns.length === 1 ? '' : 's'} · ${state.volume ? fmt(state.volume) + ' mL film' : 'volume not set'}`} />
        <${StatCard} label="Lipids in Matrix" icon="info"
          value=${state.columns.length} unit=${`/ ${MAX_COLUMNS}`}
          footer="repository slots used" />
        <${StatCard} label="Predicted Size" icon="bolt"
          value=${hasCols ? fmt(prediction.size) : null} unit="nm"
          footer=${hasCols ? `PDI ${fmt(prediction.pdi)}` : 'add lipids to predict'} />
        <${StatCard} label="Encapsulation Eff." icon="bolt"
          value=${hasCols && prediction.ee != null ? fmt(prediction.ee) : null} unit="%"
          footer=${hasCols && prediction.np != null ? `N/P ${fmt(prediction.np)} · opt. ${prediction.npOpt}` : 'set a payload to predict'} />
      </div>

      <!-- Repository + controls (elevated above the matrix's sticky headers, below the app header) -->
      <div class="relative z-40">
      <${Card} title="Lipid Repository" accent="violet" icon=${html`<${Icon} name="search" />`}
        subtitle=${`${lipids.length} lipids cached locally · ${state.columns.length}/${MAX_COLUMNS} in matrix`}
        right=${html`<select onChange=${(e) => { if (e.target.value) { loadPreset(e.target.value); e.target.value = ''; } }}
          class=${cx('rounded-md border px-2 py-1.5 text-[13px] outline-none focus:border-teal-500', tw.surfaceInput, tw.border, tw.text)}>
          <option value="">Load example…</option>
          ${Object.entries(EXAMPLE_FORMULATIONS).map(([k, v]) => html`<option key=${k} value=${k}>${v.label}</option>`)}
        </select>`}>
        <${SearchBar} lipids=${lipids} onAdd=${onAdd} disabled=${atMax} usedIds=${usedIds} />
        <div class="mt-3 flex flex-wrap items-center justify-between gap-3">
          <${Btn} onClick=${() => setModalOpen(true)} icon="plus" tone="violet" title="Add a lipid not in the catalog">Add custom lipid</${Btn}>
          <div class="flex flex-wrap items-center gap-2">
            <${Btn} onClick=${() => setState((s) => clearAmounts(s))} disabled=${!hasCols} title="Keep composition, clear amounts">Clear amounts</${Btn}>
            <${Btn} onClick=${doExport} icon="download" tone="teal" disabled=${!hasCols}>Export .xlsx</${Btn}>
          </div>
        </div>
      </${Card}>
      </div>

      ${!hasCols && html`<div class=${cx('rounded-2xl border border-dashed p-8 text-center', tw.border, tw.surfaceMuted)}>
        <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400"><${Icon} name="beaker" size=${24} /></div>
        <h3 class=${cx('text-sm font-semibold', tw.text)}>Start a formulation</h3>
        <p class=${cx('mx-auto mt-1 max-w-md text-[13px]', tw.textMute)}>Search the repository above to add lipids (up to ${MAX_COLUMNS}) as columns, or load a literature example to see the reactive matrix and predictions in action.</p>
        <div class="mt-4 flex flex-wrap justify-center gap-2">
          ${Object.entries(EXAMPLE_FORMULATIONS).map(([k, v]) => html`<${Btn} key=${k} onClick=${() => loadPreset(k)} icon="bolt" tone="teal">${v.label}</${Btn}>`)}
        </div>
      </div>`}

      ${hasCols && html`<div class="space-y-5">
        <!-- Prominent master control: total concentration + volume -->
        <div class=${cx('rounded-2xl border p-4 shadow-sm', 'border-teal-300/70 bg-gradient-to-br from-teal-50 via-teal-50/70 to-sky-50/50 dark:border-teal-500/30 dark:from-teal-500/10 dark:via-teal-500/5 dark:to-sky-500/5')}>
          <div class="flex flex-wrap items-end gap-x-8 gap-y-3">
            <${MasterField} big=${true} label="Total Concentration in Thin Film Solution" unit="mM"
              value=${d.totalConc} placeholder="set me" onCommit=${(v) => setState((s) => setTotalConc(s, v))} />
            <${MasterField} label="Solution volume" unit="mL"
              value=${state.volume} placeholder="1" onCommit=${(v) => setState((s) => setVolume(s, v))} />
            <div class=${cx('ml-auto max-w-sm text-[11px] leading-relaxed', tw.textMute)}>
              Setting the total redistributes each lipid’s concentration by its molar %. Editing any individual concentration, ratio or mass recalculates this total instantly.
            </div>
          </div>
        </div>

        ${(d.flags.needsVolume || d.flags.needsTotalConc) && html`<div class="flex items-start gap-2 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-[13px] text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
          <span class="mt-0.5"><${Icon} name="info" size=${15} /></span>
          <div>
            ${d.flags.needsVolume && html`<div>Enter the <b>solution volume</b> (mL) to unlock concentration, mass and stock-volume calculations.</div>`}
            ${d.flags.needsTotalConc && html`<div>Composition is set — enter a <b>total lipid concentration</b> (mM) above to auto-generate the per-lipid amounts.</div>`}
          </div>
        </div>`}

        <${Card} title="Reactive Formulation Matrix" accent="teal"
          subtitle="Insert Molar ratios and Stock Solution Concentration">
          <${FormulationMatrix} state=${state} d=${d} setState=${setState} />
        </${Card}>

        <${Card} title="SI Unit Reference" accent="sky" subtitle="Read-only SI conversion of the matrix above">
          <${SIMatrix} state=${state} d=${d} />
        </${Card}>

        <div class="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div class="space-y-4 xl:col-span-1">
            <${Card} title="Process & Payload" accent="violet" icon=${html`<${Icon} name="bolt" />`}
              subtitle="Drives the predictive engine">
              <${PredictControls} payload=${payload} setPayload=${setPayload} process=${process} setProcess=${setProcess} />
              <div class=${cx('mt-4 border-t pt-3', tw.borderSoft)}>
                <div class=${cx('mb-2 text-[11px] font-semibold uppercase tracking-wide', tw.textMute)}>Composition by class</div>
                <${ClassBreakdown} byClass=${prediction.byClass} />
              </div>
              ${prediction.warnings.length > 0 && html`<div class="mt-3 space-y-1">
                ${prediction.warnings.map((w, i) => html`<div key=${i} class="flex items-start gap-1.5 text-[11px] text-rose-600 dark:text-rose-400">
                  <span class="mt-0.5"><${Icon} name="info" size=${12} /></span><span>${w}</span></div>`)}
              </div>`}
            </${Card}>
          </div>
          <div class="xl:col-span-2">
            <${PredictCards} prediction=${prediction} />
          </div>
        </div>
      </div>`}

      <footer class=${cx('space-y-1 pb-6 pt-2 text-center text-[11px]', tw.textFaint)}>
        <p>Heuristic predictions for formulation design — validate by DLS, zeta and RiboGreen. Your saved lipids and current formulation are stored locally in this browser.</p>
        <p>© ${new Date().getFullYear()} Shihab Ud Dowla · Pharmaceutical Nanotechnology, University of Helsinki. All rights reserved.</p>
      </footer>
    </main>

    <${CustomLipidModal} open=${modalOpen} onClose=${() => setModalOpen(false)} onSave=${saveCustomLipid} />

    ${toast && html`<div class=${cx('fixed bottom-4 left-1/2 z-[80] -translate-x-1/2 rounded-lg border px-4 py-2 text-sm shadow-xl',
      toast.kind === 'err'
        ? 'border-rose-400 bg-rose-50 text-rose-700 dark:border-rose-500/50 dark:bg-rose-950 dark:text-rose-200'
        : 'border-emerald-400 bg-emerald-50 text-emerald-700 dark:border-emerald-500/50 dark:bg-emerald-950 dark:text-emerald-200')}>
      ${toast.text}</div>`}
  </div>`;
}
