import { html, cx, tw, Icon, CellInput, ReadCell } from './common.js';
import { LIPID_CLASSES } from '../lipids.js';
import { editRatio, setStock, removeColumn } from '../calc.js';

// Fixed column geometry so cells never resize when data is typed (table-fixed).
const W_LABEL = 224;   // property label column
const W_COL = 128;     // each lipid column
const W_TOTAL = 104;   // total column

// Sticky left label column + sticky header row (solid surface so scrolled
// content is masked cleanly under the frozen header/column).
const STICKY_LABEL = 'sticky left-0 z-10 bg-white dark:bg-zinc-800 group-hover:bg-teal-50/60 dark:group-hover:bg-teal-500/10';
const CORNER = `sticky left-0 top-0 z-30 border-b bg-white dark:bg-zinc-800 ${tw.borderSoft}`;
const HEAD = `sticky top-0 z-20 border-b bg-white dark:bg-zinc-800 ${tw.borderSoft}`;
const TOTAL_CELL = 'border-l-2 border-l-teal-300 bg-teal-50/70 group-hover:bg-teal-100/70 dark:border-l-teal-500/30 dark:bg-teal-500/10 dark:group-hover:bg-teal-500/15';

function LipidLabel({ col }) {
  // A purely numeric "abbreviation" is a leftover Avanti product code (no
  // parenthetical acronym was found when fetching) — show the chemical name instead.
  const label = /^\d+$/.test((col.abbr || '').trim()) ? (col.name || col.abbr) : col.abbr;
  // Clickable hyperlink when a product / reference URL is attached.
  if (col.link) {
    return html`<a href=${col.link} target="_blank" rel="noopener noreferrer" title=${`${col.name} — open product page`}
      class="inline-flex items-center gap-0.5 truncate text-[13px] font-bold text-teal-700 underline decoration-dotted underline-offset-2 hover:text-teal-500 dark:text-teal-300">
      ${label}<span class="opacity-70"><${Icon} name="link" size=${11} /></span></a>`;
  }
  return html`<span class=${cx('truncate text-[13px] font-bold', tw.text)} title=${col.name}>${label}</span>`;
}

function ColumnHeader({ col, onRemove }) {
  const meta = LIPID_CLASSES[col.cls] || { label: col.cls, color: '#94a3b8' };
  return html`<th class=${cx(HEAD, 'px-2 pb-2 pt-0 align-bottom')}>
    <div class="rounded-t-md" style=${{ borderTop: `3px solid ${meta.color}` }}></div>
    <div class="flex flex-col items-center gap-0.5 pt-1.5">
      <div class="flex max-w-full items-center gap-1">
        <span class="h-2 w-2 shrink-0 rounded-full" style=${{ background: meta.color }}></span>
        <${LipidLabel} col=${col} />
        <button class=${cx('shrink-0', tw.textFaint, 'hover:text-rose-500')} title="Remove lipid" onClick=${onRemove}>
          <${Icon} name="x" size=${13} /></button>
      </div>
      <span class=${cx('line-clamp-2 text-center text-[10px] leading-tight', tw.textMute)} style=${{ maxWidth: (W_COL - 16) + 'px' }} title=${col.name}>${col.name}</span>
      <span class="truncate text-[10px]" style=${{ color: meta.color }}>${meta.label}</span>
    </div>
  </th>`;
}

function ColGroup({ count }) {
  return html`<colgroup>
    <col style=${{ width: W_LABEL + 'px' }} />
    ${Array.from({ length: count }).map((_, i) => html`<col key=${i} style=${{ width: W_COL + 'px' }} />`)}
    <col style=${{ width: W_TOTAL + 'px' }} />
  </colgroup>`;
}

export function FormulationMatrix({ state, d, setState }) {
  const cols = state.columns;
  const minW = W_LABEL + cols.length * W_COL + W_TOTAL;

  // Only molar ratio, stock concentration and stock volume are editable; every
  // other quantity is auto-generated and locked to protect the stoichiometry.
  const rows = [
    { label: 'Molar ratio', editable: true,
      hint: 'EDITABLE. Relative molar parts (0.001–100), shown exactly as entered. Editing re-slices the composition at constant total concentration.',
      get: (i) => d.ratio[i], commit: editRatio, total: d.totals.ratio },
    { label: 'Molar %', editable: false, hint: 'Auto-generated from the molar ratios.',
      get: (i) => d.molPct[i], total: d.totals.molPct },
    { label: 'Molar weight', unit: 'g/mol', editable: false, hint: 'Auto-filled from the repository.',
      get: (i) => cols[i].mw, total: d.totals.mw, totalNote: 'avg' },
    { label: 'Stock solution conc.', unit: 'mg/ml', editable: true,
      hint: 'EDITABLE. Concentration of the stock you pipette from; drives the stock volume needed.',
      get: (i) => cols[i].stock, commit: setStock, total: null },
    { label: 'Conc. in thin film sol.', unit: 'mM', editable: false,
      hint: 'Auto-generated from the total concentration × molar %.',
      get: (i) => d.conc[i], total: d.totals.conc },
    { label: 'n in thin film sol.', unit: 'mmol', editable: false, hint: 'Auto-generated from concentration × volume.',
      get: (i) => cols[i].n, total: d.totals.n },
    { label: 'Mass', unit: 'mg', editable: false, hint: 'Auto-generated from n × molar weight.',
      get: (i) => d.mass[i], total: d.totals.mass },
    { label: 'Vol. of stock for 1 ml film', unit: 'µl', editable: false, strong: true,
      hint: 'Auto-generated: mass ÷ stock concentration.',
      get: (i) => d.vol[i], total: d.totals.vol },
  ];

  return html`<div class=${cx('overflow-x-auto rounded-lg border', tw.borderSoft)}>
    <table class="w-full table-fixed border-collapse" style=${{ minWidth: minW + 'px' }}>
      <${ColGroup} count=${cols.length} />
      <thead>
        <tr>
          <th class=${cx(CORNER, 'px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide', tw.textMute)}>
            Property
          </th>
          ${cols.map((c) => html`<${ColumnHeader} key=${c.uid} col=${c}
            onRemove=${() => setState((s) => removeColumn(s, c.uid))} />`)}
          <th class=${cx(HEAD, 'border-l-2 border-l-teal-300 dark:border-l-teal-500/30 px-2 pb-2 pt-1 text-center align-bottom text-[12px] font-bold text-teal-600 dark:text-teal-300')}>
            <div class="mb-1 rounded-t-md border-t-[3px] border-teal-500/70"></div>Total</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map((row, ri) => html`<tr key=${row.label} class=${cx('group transition-colors hover:bg-teal-50/40 dark:hover:bg-teal-500/5', ri % 2 ? 'bg-slate-50/60 dark:bg-zinc-900/30' : '')}>
          <td class=${cx(STICKY_LABEL, 'px-3 py-1.5 align-middle')}>
            <div class="flex items-center gap-1.5">
              <span class=${cx('text-[12.5px]', row.editable ? cx('font-medium', tw.text) : row.strong ? cx('font-semibold', tw.text) : tw.textSub)}>${row.label}</span>
              ${row.unit && html`<span class=${cx('text-[10px]', tw.textFaint)}>(${row.unit})</span>`}
              ${row.editable && html`<span class="rounded bg-teal-500/15 px-1 text-[9px] font-semibold uppercase text-teal-700 dark:text-teal-300">edit</span>`}
              <span class=${cx('cursor-help', tw.textFaint, 'hover:text-slate-600 dark:hover:text-zinc-300')} title=${row.hint}><${Icon} name="info" size=${12} /></span>
            </div>
          </td>
          ${cols.map((c, i) => {
            const canEdit = row.editable && (!row.needsAmount || c.n != null);
            return html`<td key=${c.uid} class="p-1 align-middle">
              <${CellInput} value=${row.get(i)} editable=${canEdit} strong=${row.strong}
                onCommit=${(v) => row.commit && setState((s) => row.commit(s, i, v))} />
            </td>`;
          })}
          <td class=${cx('p-1 align-middle', TOTAL_CELL)}>
            <${ReadCell} value=${row.total} strong=${true} suffix=${row.totalNote} />
          </td>
        </tr>`)}
      </tbody>
    </table>
  </div>`;
}

export function SIMatrix({ state, d }) {
  const cols = state.columns;
  const minW = W_LABEL + cols.length * W_COL + W_TOTAL;
  const rows = [
    { label: 'Conc. in thin film sol.', unit: 'M', get: (i) => (d.conc[i] == null ? null : d.conc[i] / 1000), total: d.totalConc == null ? null : d.totalConc / 1000 },
    { label: 'Volume of thin film sol.', unit: 'l', get: () => null, total: d.V_L, onlyTotal: true },
    { label: 'n in thin film sol.', unit: 'mol', get: (i) => (cols[i].n == null ? null : cols[i].n / 1000), total: d.totals.n == null ? null : d.totals.n / 1000 },
    { label: 'Mass', unit: 'g', get: (i) => (d.mass[i] == null ? null : d.mass[i] / 1000), total: d.totals.mass == null ? null : d.totals.mass / 1000 },
    { label: 'Vol. of stock for 1 ml film', unit: 'ml', get: (i) => (d.vol[i] == null ? null : d.vol[i] / 1000), total: d.totals.vol == null ? null : d.totals.vol / 1000 },
  ];
  return html`<div class=${cx('overflow-x-auto rounded-lg border', tw.borderSoft)}>
    <table class="w-full table-fixed border-collapse" style=${{ minWidth: minW + 'px' }}>
      <${ColGroup} count=${cols.length} />
      <thead>
        <tr>
          <th class=${cx(CORNER, 'px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide', tw.textMute)}>SI property</th>
          ${cols.map((c) => html`<th key=${c.uid} class=${cx(HEAD, 'truncate px-2 py-2 text-center text-[12px] font-semibold', tw.textSub)} title=${c.name}>${c.abbr}</th>`)}
          <th class=${cx(HEAD, 'border-l-2 border-l-teal-300 dark:border-l-teal-500/30 px-2 py-2 text-center text-[12px] font-bold text-teal-600 dark:text-teal-300')}>Total</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map((row, ri) => html`<tr key=${row.label} class=${cx('group transition-colors hover:bg-teal-50/40 dark:hover:bg-teal-500/5', ri % 2 ? 'bg-slate-50/60 dark:bg-zinc-900/30' : '')}>
          <td class=${cx(STICKY_LABEL, 'px-3 py-1.5 align-middle')}>
            <span class=${cx('text-[12.5px]', tw.textSub)}>${row.label}</span>
            <span class=${cx('ml-1 text-[10px]', tw.textFaint)}>(${row.unit})</span>
          </td>
          ${cols.map((c, i) => html`<td key=${c.uid} class="p-1 align-middle">
            ${row.onlyTotal ? html`<${ReadCell} value=${null} />` : html`<${ReadCell} value=${row.get(i)} />`}
          </td>`)}
          <td class=${cx('p-1 align-middle', TOTAL_CELL)}><${ReadCell} value=${row.total} strong=${true} /></td>
        </tr>`)}
      </tbody>
    </table>
    <div class=${cx('border-t px-3 py-1.5 text-[11px]', tw.borderSoft, tw.textFaint)}>Read-only SI mirror of the matrix above.</div>
  </div>`;
}
