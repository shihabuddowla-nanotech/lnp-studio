import { html, cx, tw, Card, Icon, Donut, MethodNote } from './common.js';
import { LIPID_CLASSES } from '../lipids.js';
import { fmt } from '../calc.js';

const PAYLOAD_TYPES = ['None', 'mRNA', 'saRNA', 'siRNA', 'pDNA', 'DNA', 'Small molecule (lipophilic)', 'Small molecule (hydrophilic)', 'Protein/Peptide'];

function LabeledNum({ label, value, onChange, step = 'any', min = 0, suffix }) {
  return html`<label class="flex flex-col gap-1">
    <span class=${cx('text-[11px]', tw.textMute)}>${label}</span>
    <div class=${cx('flex items-center rounded-md border focus-within:border-teal-500 focus-within:ring-1 focus-within:ring-teal-500/30', tw.surfaceInput, tw.border)}>
      <input type="number" step=${step} min=${min}
        class=${cx('w-full bg-transparent px-2 py-1.5 text-sm tabular-nums outline-none', tw.text)}
        value=${value == null ? '' : value}
        onInput=${(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} />
      ${suffix && html`<span class=${cx('px-2 text-[11px]', tw.textFaint)}>${suffix}</span>`}
    </div>
  </label>`;
}

function Bar({ value, max, color, height = 'h-2' }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return html`<div class=${cx('w-full overflow-hidden rounded-full bg-slate-200 shadow-inner dark:bg-zinc-700', height)}>
    <div class="h-full rounded-full transition-all" style=${{ width: pct + '%', background: color }}></div>
  </div>`;
}

function DivergingBar({ value, range = 60 }) {
  const half = Math.max(0, Math.min(50, (Math.abs(value) / range) * 50));
  const pos = value >= 0;
  return html`<div class="relative h-2.5 w-full rounded-full bg-slate-200 shadow-inner dark:bg-zinc-700">
    <div class="absolute left-1/2 top-0 h-full w-px bg-slate-400 dark:bg-zinc-500"></div>
    <div class="absolute top-0 h-full rounded-full"
      style=${{ left: pos ? '50%' : (50 - half) + '%', width: half + '%', background: pos ? '#e11d48' : '#0ea5e9' }}></div>
  </div>`;
}

function pdiColor(pdi) {
  if (pdi < 0.1) return '#059669';
  if (pdi < 0.2) return '#0d9488';
  if (pdi < 0.3) return '#d97706';
  return '#e11d48';
}

export function ClassBreakdown({ byClass }) {
  const entries = Object.entries(byClass).filter(([, v]) => v > 0.001);
  const total = entries.reduce((a, [, v]) => a + v, 0) || 1;
  return html`<div>
    <div class="flex h-3.5 w-full overflow-hidden rounded-full bg-slate-200 shadow-inner dark:bg-zinc-700">
      ${entries.map(([k, v]) => html`<div key=${k} title=${`${LIPID_CLASSES[k]?.label}: ${fmt(v)} mol%`}
        style=${{ width: (v / total) * 100 + '%', background: LIPID_CLASSES[k]?.color || '#94a3b8' }}></div>`)}
    </div>
    <div class="mt-2 flex flex-wrap gap-x-3 gap-y-1">
      ${entries.map(([k, v]) => html`<span key=${k} class=${cx('flex items-center gap-1 text-[11px]', tw.textMute)}>
        <span class="h-2 w-2 rounded-full" style=${{ background: LIPID_CLASSES[k]?.color }}></span>
        ${LIPID_CLASSES[k]?.label} ${fmt(v)}%</span>`)}
    </div>
  </div>`;
}

export function PredictControls({ payload, setPayload, process, setProcess }) {
  return html`<div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
    <label class="col-span-2 flex flex-col gap-1 sm:col-span-1">
      <span class=${cx('text-[11px]', tw.textMute)}>Payload</span>
      <select class=${cx('rounded-md border px-2 py-1.5 text-sm outline-none focus:border-teal-500', tw.surfaceInput, tw.border, tw.text)}
        value=${payload.type} onChange=${(e) => setPayload({ ...payload, type: e.target.value })}>
        ${PAYLOAD_TYPES.map((t) => html`<option key=${t} value=${t}>${t}</option>`)}
      </select>
    </label>
    <${LabeledNum} label="Payload amount" suffix="µg" value=${payload.amount}
      onChange=${(v) => setPayload({ ...payload, amount: v })} />
    <${LabeledNum} label="N/P ratio (manual)" value=${payload.npRatio}
      onChange=${(v) => setPayload({ ...payload, npRatio: v })} />
    <${LabeledNum} label="Flow rate ratio" suffix="aq:org" value=${process.frr}
      onChange=${(v) => setProcess({ ...process, frr: v })} />
    <${LabeledNum} label="Total flow rate" suffix="ml/min" value=${process.tfr}
      onChange=${(v) => setProcess({ ...process, tfr: v })} />
  </div>`;
}

export function PredictCards({ prediction: p }) {
  return html`<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">

    <!-- Morphology -->
    <${Card} title="Morphology" accent="teal" icon=${html`<${Icon} name="beaker" />`}
      subtitle="Structural classification">
      <div class="flex items-start justify-between gap-3">
        <div class="rounded-xl bg-teal-500/10 px-3 py-2 text-xl font-bold text-teal-600 dark:text-teal-300">${p.morphology}</div>
        <div class="shrink-0 text-right">
          <div class=${cx('text-[10px] uppercase', tw.textFaint)}>confidence</div>
          <div class=${cx('text-sm font-semibold', tw.text)}>${Math.round(p.morphConf * 100)}%</div>
        </div>
      </div>
      <${Bar} value=${p.morphConf * 100} max=${100} color="#0d9488" height="h-1.5" />
      <p class=${cx('mt-2 text-[12px] leading-relaxed', tw.textMute)}>${p.morphDesc}</p>
      <${MethodNote}>
        <p>Assigned by a decision tree over composition and payload. With a nucleic-acid cargo, the ionizable-lipid fraction
        decides the outcome: <b>≥20 mol%</b> condenses the cargo into a solid inverted-micellar core (LNP); a lower fraction
        gives a loosely-packed, leakier particle; a permanently <b>cationic</b> lipid instead forms a multilamellar lipoplex;
        with neither, only passive entrapment in a vesicle is possible. Without a nucleic acid, a high PEG fraction with little
        bilayer-forming lipid favours micelles, otherwise a closed bilayer liposome forms.</p>
        <p>The <b>confidence</b> figure is a fixed per-branch weight reflecting how cleanly the composition matches one category.</p>
      </${MethodNote}>
    </${Card}>

    <!-- Size & PDI -->
    <${Card} title="Particle Size & Dispersity" accent="sky" icon=${html`<${Icon} name="bolt" />`}
      subtitle="Hydrodynamic diameter (DLS-equivalent)">
      <div class="flex items-end gap-4">
        <div class="rounded-xl bg-sky-500/10 px-3 py-2">
          <div class="text-3xl font-bold text-sky-600 dark:text-sky-300">${fmt(p.size)}<span class=${cx('text-base', tw.textFaint)}> nm</span></div>
          ${p.sizeFloorHit && html`<div class="text-[10px] text-amber-600 dark:text-amber-400">at 40 nm physical floor</div>`}
        </div>
        <div class="flex-1">
          <div class=${cx('flex items-center justify-between text-[11px]', tw.textMute)}><span>PDI</span><span class="font-semibold" style=${{ color: pdiColor(p.pdi) }}>${fmt(p.pdi)}</span></div>
          <${Bar} value=${p.pdi} max=${0.4} color=${pdiColor(p.pdi)} />
          <div class=${cx('mt-2 flex items-center justify-between text-[11px]', tw.textFaint)}><span>40 nm</span><span>size vs 200 nm</span></div>
          <${Bar} value=${p.size - 40} max=${160} color="#0ea5e9" />
        </div>
      </div>
      <${MethodNote}>
        <p>Hydrodynamic diameter from an empirical nanoprecipitation model. A baseline (<b>~110 nm</b> for ionizable/cationic
        LNPs, <b>~130 nm</b> for plain vesicles) is reduced by PEG content (exponential steric stabilisation) and by faster
        mixing — both a higher aqueous:organic <b>flow-rate ratio</b> and a higher <b>total flow rate</b> shrink particles. A
        hard <b>40 nm</b> physical floor is enforced.</p>
        <p><b>PDI</b> starts at 0.25 and falls with PEG and mixing, with penalties added for near-zero PEG or very high cholesterol.</p>
      </${MethodNote}>
    </${Card}>

    <!-- Zeta potential -->
    <${Card} title="Zeta Potential" accent="rose" icon=${html`<${Icon} name="bolt" />`}
      subtitle=${p.pKaEff != null ? `Apparent pKa ≈ ${fmt(p.pKaEff)}` : 'No ionizable lipid'}>
      <div class="space-y-3">
        ${[['Physiological pH 7.4', p.zeta74], ['Endosomal pH 4.0', p.zeta40]].map(([lbl, val]) => html`<div key=${lbl}>
          <div class="flex items-center justify-between text-[12px]">
            <span class=${tw.textMute}>${lbl}</span>
            <span class=${cx('font-bold tabular-nums', val >= 5 ? 'text-rose-600 dark:text-rose-400' : val <= -5 ? 'text-sky-600 dark:text-sky-400' : tw.text)}>${val > 0 ? '+' : ''}${fmt(val)} mV</span>
          </div>
          <${DivergingBar} value=${val} />
        </div>`)}
      </div>
      <p class=${cx('mt-2 text-[11px] leading-relaxed', tw.textFaint)}>Near-neutral at pH 7.4 with a strong positive shift at endosomal pH drives both stealth circulation and endosomal escape.</p>
      <${MethodNote}>
        <p>Net surface charge from the <b>Henderson–Hasselbalch</b> equation. An ionizable lipid's protonated (charged) fraction
        at a given pH is${' '}<span class="tabular-nums">1 / (1 + 10^(pH − pKa))</span>, weighted by its mol% and an intrinsic charge
        density. Permanently cationic and anionic lipids add fixed ± contributions, and PEG sterically shields the result.</p>
        <p>Evaluated at <b>physiological pH 7.4</b> and <b>endosomal pH 4.0</b> using the mol%-weighted apparent pKa of the
        ionizable lipids present.</p>
      </${MethodNote}>
    </${Card}>

    <!-- Encapsulation efficiency -->
    <${Card} title="Encapsulation Efficiency" accent="amber" icon=${html`<${Icon} name="beaker" />`}
      subtitle="Predicted payload trapping">
      ${p.ee == null
      ? html`<div class=${cx('py-3 text-sm', tw.textMute)}>Select a payload to estimate encapsulation.</div>`
      : html`<div class="flex items-center gap-4">
          <${Donut} value=${p.ee} color="#d97706" />
          <div class="min-w-0 flex-1">
            ${p.np != null && html`<div class=${cx('text-[12px]', tw.textMute)}>N/P <span class=${cx('font-semibold', tw.text)}>${fmt(p.np)}</span> · optimum ${p.npOpt}</div>`}
            <p class=${cx('mt-1 text-[11px] leading-relaxed', tw.textFaint)}>${p.eeBasis}</p>
          </div>
        </div>`}
      <${MethodNote}>
        <p>For nucleic acids, an <b>N/P saturation curve</b>: efficiency climbs as${' '}<span class="tabular-nums">1 − exp(−k · N/P ÷ N/P<sub>opt</sub>)</span> toward a ceiling set by the ionizable fraction,
        with a penalty once N/P greatly exceeds its optimum. <b>N/P</b> is the titratable amine content divided by payload
        phosphate (~325 g/mol per nucleotide).</p>
        <p>Lipophilic small molecules instead use <b>membrane partitioning</b>; hydrophilic and protein cargo use size-dependent${' '}<b>passive aqueous entrapment</b>.</p>
      </${MethodNote}>
    </${Card}>
  </div>`;
}
