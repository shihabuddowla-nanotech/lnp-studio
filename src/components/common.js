// Shared React/htm bindings + tiny presentational primitives (theme-aware).
export const React = window.React;
export const html = window.htm.bind(React.createElement);
export const { useState, useEffect, useMemo, useRef, useCallback } = React;
import { fmt } from '../calc.js';

export function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

// --- semantic theme tokens (light default + dark: variant) -----------------
export const tw = {
  surface: 'bg-white dark:bg-zinc-800',
  surfaceMuted: 'bg-slate-50 dark:bg-zinc-900',
  surfaceInput: 'bg-white dark:bg-zinc-900/60',
  header: 'bg-white/85 dark:bg-zinc-900/85',
  border: 'border-slate-200 dark:border-zinc-700',
  borderSoft: 'border-slate-200/80 dark:border-zinc-700/70',
  text: 'text-slate-800 dark:text-zinc-100',
  textSub: 'text-slate-600 dark:text-zinc-300',
  textMute: 'text-slate-500 dark:text-zinc-400',
  textFaint: 'text-slate-400 dark:text-zinc-500',
  hover: 'hover:bg-slate-100 dark:hover:bg-zinc-700/50',
  ringFocus: 'focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30',
};

// --- inline icon set (path string OR array of path strings) ----------------
const PATHS = {
  plus: 'M12 5v14M5 12h14',
  trash: 'M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m1 0v12a1 1 0 01-1 1H8a1 1 0 01-1-1V7',
  download: 'M12 3v12m0 0l4-4m-4 4l-4-4M4 17v2a1 1 0 001 1h14a1 1 0 001-1v-2',
  cloud: 'M7 18a4 4 0 010-8 5 5 0 019.6-1.5A4.5 4.5 0 0117 18H7z',
  refresh: 'M4 4v5h5M20 20v-5h-5M5.5 9a7 7 0 0111.9-2.3L20 9M18.5 15a7 7 0 01-11.9 2.3L4 15',
  beaker: 'M9 3h6M10 3v6L5 19a1 1 0 001 1h12a1 1 0 001-1l-5-10V3',
  install: 'M12 3v10m0 0l3-3m-3 3l-3-3M5 17v2a2 2 0 002 2h10a2 2 0 002-2v-2',
  search: 'M21 21l-4.3-4.3M11 18a7 7 0 100-14 7 7 0 000 14z',
  x: 'M6 6l12 12M18 6L6 18',
  info: 'M12 8h.01M11 12h1v4h1M12 21a9 9 0 110-18 9 9 0 010 18z',
  save: 'M5 3h11l3 3v15H5zM8 3v5h7M8 21v-7h8v7',
  bolt: 'M13 3L4 14h7l-1 7 9-11h-7z',
  moon: 'M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z',
  sun: ['M12 16a4 4 0 100-8 4 4 0 000 8z', 'M12 4V2M12 22v-2M4 12H2M22 12h-2M5.6 5.6L4.2 4.2M19.8 19.8l-1.4-1.4M18.4 5.6l1.4-1.4M4.2 19.8l1.4-1.4'],
  link: ['M10 5H6a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1v-4', 'M14 5h5v5', 'M19 5l-8 8'],
  arrowUpRight: ['M7 17L17 7', 'M7 7h10v10'],
  chevronRight: 'M9 6l6 6-6 6',
};
export function Icon({ name, size = 16, className }) {
  const d = PATHS[name] || '';
  const ds = Array.isArray(d) ? d : [d];
  return html`<svg class=${className} width=${size} height=${size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    ${ds.map((p, i) => html`<path key=${i} d=${p} />`)}</svg>`;
}

// --- light/dark toggle -----------------------------------------------------
export function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  const toggle = () => {
    const next = !dark;
    document.documentElement.classList.toggle('dark', next);
    try { localStorage.setItem('lnp.theme', next ? 'dark' : 'light'); } catch (_) {}
    setDark(next);
  };
  return html`<button onClick=${toggle} aria-label="Toggle light or dark theme" title=${dark ? 'Switch to light mode' : 'Switch to dark mode'}
    class=${cx('inline-flex h-9 w-9 items-center justify-center rounded-full border transition', tw.border, tw.surface, tw.hover, tw.textSub)}>
    <${Icon} name=${dark ? 'sun' : 'moon'} size=${18} /></button>`;
}

export function Card({ title, subtitle, icon, accent = 'teal', children, right, className }) {
  return html`<div class=${cx('rounded-2xl border border-t-2 shadow-sm transition-shadow duration-200 hover:shadow-md',
    `border-t-${accent}-400 dark:border-t-${accent}-500`, tw.border, tw.surface, className)}>
    ${(title || right) && html`<div class=${cx('flex items-center justify-between gap-2 border-b px-4 py-2.5', tw.borderSoft)}>
      <div class="flex min-w-0 items-center gap-2">
        ${icon && html`<span class=${cx('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', `bg-${accent}-500/10 text-${accent}-600 dark:bg-${accent}-500/15 dark:text-${accent}-400`)}>${icon}</span>`}
        <div class="min-w-0">
          <div class=${cx('truncate text-sm font-semibold tracking-tight', tw.text)}>${title}</div>
          ${subtitle && html`<div class=${cx('truncate text-[11px]', tw.textMute)}>${subtitle}</div>`}
        </div>
      </div>
      ${right}
    </div>`}
    <div class="p-4">${children}</div>
  </div>`;
}

export function Pill({ children, color = '#64748b', title, dot }) {
  return html`<span title=${title || ''}
    class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium"
    style=${{ color, borderColor: color + '66', background: color + '1a' }}>
    ${dot && html`<span class="h-1.5 w-1.5 shrink-0 rounded-full" style=${{ background: color }}></span>`}${children}</span>`;
}

// Compact "snapshot" KPI tile. `hero` renders a filled accent tile for the
// headline number; plain tiles sit on the page surface as secondary stats.
export function StatCard({ label, value, unit, footer, icon, hero }) {
  const muteCls = hero ? 'text-teal-50/85' : tw.textMute;
  const faintCls = hero ? 'text-teal-50/70' : tw.textFaint;
  return html`<div class=${cx('rounded-2xl p-4 shadow-sm',
    hero ? 'bg-gradient-to-br from-teal-600 to-teal-500 dark:from-teal-700 dark:to-teal-600' : cx('border', tw.border, tw.surface))}>
    <div class="flex items-start justify-between gap-2">
      <span class=${cx('text-[11px] font-semibold uppercase tracking-wide', muteCls)}>${label}</span>
      <span class=${cx('flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
        hero ? 'bg-white/15 text-white' : cx('border', tw.border, tw.textMute))}>
        <${Icon} name="arrowUpRight" size=${13} /></span>
    </div>
    <div class=${cx('mt-2 text-[26px] font-bold leading-tight tabular-nums', hero ? 'text-white' : tw.text)}>
      ${value == null ? html`<span class=${faintCls}>—</span>` : value}${unit && html`<span class=${cx('ml-1 text-xs font-medium', muteCls)}>${unit}</span>`}
    </div>
    ${footer && html`<div class=${cx('mt-2 flex items-center gap-1.5 truncate text-[11px]', muteCls)}>
      ${icon && html`<${Icon} name=${icon} size=${12} />`}<span class="truncate">${footer}</span>
    </div>`}
  </div>`;
}

// Circular progress ring with a centered percentage — for single-value
// "how full is this" metrics (e.g. encapsulation efficiency).
export function Donut({ value, size = 88, stroke = 9, color = '#0d9488' }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = value == null ? null : Math.max(0, Math.min(100, value));
  const offset = pct == null ? c : c * (1 - pct / 100);
  return html`<div class="relative shrink-0" style=${{ width: size + 'px', height: size + 'px' }}>
    <svg width=${size} height=${size} viewBox=${`0 0 ${size} ${size}`} class="-rotate-90">
      <circle cx=${size / 2} cy=${size / 2} r=${r} fill="none" stroke-width=${stroke} class="stroke-slate-200 dark:stroke-zinc-700" />
      <circle cx=${size / 2} cy=${size / 2} r=${r} fill="none" stroke-width=${stroke} stroke=${color}
        stroke-linecap="round" stroke-dasharray=${c} stroke-dashoffset=${offset}
        style=${{ transition: 'stroke-dashoffset 0.6s ease' }} />
    </svg>
    <div class="absolute inset-0 flex items-center justify-center">
      <span class=${cx('text-lg font-bold', tw.text)}>${pct == null ? '—' : Math.round(pct) + '%'}</span>
    </div>
  </div>`;
}

// Collapsible "how this is computed" disclosure for the prediction cards.
// Always closes with a standing reminder that the figures are theoretical
// estimates — so every predicted value carries the caveat with it.
export function MethodNote({ children }) {
  return html`<details class=${cx('group mt-3 border-t pt-2.5', tw.borderSoft)}>
    <summary class=${cx('flex cursor-pointer select-none list-none items-center gap-1.5 text-[11px] font-medium [&::-webkit-details-marker]:hidden',
      tw.textMute, 'hover:text-slate-700 dark:hover:text-zinc-200')}>
      <${Icon} name="info" size=${12} />How this is estimated
      <span class="ml-auto transition-transform group-open:rotate-90"><${Icon} name="chevronRight" size=${13} /></span>
    </summary>
    <div class=${cx('mt-2 space-y-2 text-[11px] leading-relaxed', tw.textMute)}>
      ${children}
      <p class="border-l-2 border-amber-400 pl-2 text-[10.5px] italic text-amber-700 dark:border-amber-500/60 dark:text-amber-300/90">
        Theoretical estimate from a physically-motivated heuristic — not a measurement. Real-world values vary with lipid
        chemistry, mixing hardware and storage; always validate experimentally (DLS, zeta, RiboGreen).
      </p>
    </div>
  </details>`;
}

// Spinner for inline loading states.
export function Spinner({ size = 14, className }) {
  return html`<svg class=${cx('animate-spin', className)} width=${size} height=${size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="3" opacity="0.25" />
    <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
  </svg>`;
}

// Numeric cell. Editable cells read as clear, interactive inputs (white field,
// subtle border, focus ring); read-only cells are visually muted (soft fill,
// no border/ring) so it is obvious which values are auto-generated.
export function CellInput({ value, onCommit, editable = true, placeholder, title, strong }) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState('');
  const display = focused ? draft : (value == null ? '' : fmt(value));
  const stateCls = editable
    ? 'text-sm font-medium bg-white dark:bg-zinc-900/40 border border-slate-300 dark:border-zinc-600 text-slate-800 dark:text-zinc-100 focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30'
    : strong
      ? 'text-[13px] font-semibold bg-gray-50 dark:bg-zinc-800/50 border border-transparent text-slate-700 dark:text-zinc-200 cursor-default'
      : 'text-[13px] bg-gray-50 dark:bg-zinc-800/50 border border-transparent text-slate-500 dark:text-zinc-400 cursor-default';
  return html`<input
    type="text" inputmode="decimal"
    class=${cx('w-full rounded px-2 py-1.5 text-right tabular-nums outline-none transition', stateCls)}
    value=${display}
    placeholder=${placeholder || (editable ? '—' : '')}
    title=${title || (editable ? '' : 'Auto-generated — edit molar ratio, stock concentration or the total concentration instead')}
    readOnly=${!editable}
    tabIndex=${editable ? 0 : -1}
    onFocus=${(e) => { if (!editable) return; setFocused(true); setDraft(value == null ? '' : fmt(value)); requestAnimationFrame(() => e.target.select && e.target.select()); }}
    onBlur=${() => setFocused(false)}
    onChange=${(e) => { if (!editable) return; setDraft(e.target.value); onCommit(e.target.value); }}
  />`;
}

export function ReadCell({ value, suffix, strong }) {
  return html`<div class=${cx('px-2 py-1.5 text-right text-[13px] tabular-nums', strong ? cx('font-semibold', tw.text) : tw.textSub)}>
    ${value == null ? html`<span class="text-slate-400 dark:text-zinc-600">—</span>` : html`${fmt(value)}${suffix ? html`<span class="ml-0.5 text-[10px] text-slate-400 dark:text-zinc-500">${suffix}</span>` : ''}`}
  </div>`;
}
