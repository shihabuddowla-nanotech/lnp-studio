import { html, useState, useRef, useEffect, cx, tw, Icon } from './common.js';
import { LIPID_CLASSES } from '../lipids.js';
import { fmt } from '../calc.js';

export function SearchBar({ lipids, onAdd, disabled, usedIds }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const boxRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const ql = q.trim().toLowerCase();
  const matches = (!ql ? lipids : lipids.filter((l) =>
    l.name.toLowerCase().includes(ql) ||
    (l.abbr || '').toLowerCase().includes(ql) ||
    (l.cls || '').toLowerCase().includes(ql) ||
    (LIPID_CLASSES[l.cls]?.label || '').toLowerCase().includes(ql)
  )).slice(0, 9);

  const choose = (l) => {
    if (!l || disabled) return;
    onAdd(l);
    setQ('');
    setOpen(false);
    setHi(0);
  };

  const onKey = (e) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) { setOpen(true); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(h + 1, matches.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(matches[hi]); }
    else if (e.key === 'Escape') { setOpen(false); }
  };

  // `relative` (z-index:auto) so the absolute dropdown joins the root stacking
  // context and paints above sibling cards. No overflow clipping here.
  return html`<div class="relative" ref=${boxRef}>
    <div class=${cx('flex items-center gap-2 rounded-lg border px-3 py-2 transition', tw.surfaceInput,
      disabled ? 'border-slate-200 dark:border-zinc-800 opacity-60' : 'border-slate-300 dark:border-zinc-700 focus-within:border-teal-500 focus-within:ring-1 focus-within:ring-teal-500/30')}>
      <span class=${tw.textMute}><${Icon} name="search" /></span>
      <input
        class=${cx('w-full bg-transparent text-sm outline-none placeholder-slate-400 dark:placeholder-zinc-500', tw.text)}
        placeholder=${disabled ? 'Maximum of 15 lipids reached' : 'Search Avanti lipids — name, abbreviation or class…'}
        value=${q}
        disabled=${disabled}
        onFocus=${() => setOpen(true)}
        onInput=${(e) => { setQ(e.target.value); setOpen(true); setHi(0); }}
        onKeyDown=${onKey} />
      ${q && html`<button class=${cx(tw.textFaint, 'hover:text-slate-600 dark:hover:text-zinc-300')} onClick=${() => { setQ(''); setHi(0); }}><${Icon} name="x" size=${14} /></button>`}
    </div>

    ${open && !disabled && html`<div class=${cx('absolute left-0 z-[100] mt-1 w-full overflow-hidden rounded-xl border shadow-xl',
      tw.border, 'bg-white dark:bg-zinc-800')}>
      ${matches.length === 0 && html`<div class=${cx('px-3 py-3 text-sm', tw.textMute)}>No lipid matches “${q}”.</div>`}
      ${matches.map((l, i) => {
        const meta = LIPID_CLASSES[l.cls] || { label: l.cls, color: '#94a3b8' };
        const used = usedIds && usedIds.has(l.id);
        return html`<button key=${l.id}
          class=${cx('flex w-full items-center gap-3 px-3 py-2 text-left transition',
            i === hi ? 'bg-slate-100 dark:bg-zinc-700/60' : 'hover:bg-slate-50 dark:hover:bg-zinc-700/40')}
          onMouseEnter=${() => setHi(i)}
          onClick=${() => choose(l)}>
          <span class="h-2.5 w-2.5 shrink-0 rounded-full" style=${{ background: meta.color }}></span>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <span class=${cx('text-sm font-semibold', tw.text)}>${l.abbr}</span>
              <span class=${cx('truncate text-[11px]', tw.textMute)}>${l.name}</span>
              ${l.source === 'Custom' && html`<span class="rounded bg-violet-500/15 px-1 text-[9px] font-medium text-violet-600 dark:text-violet-300">custom</span>`}
              ${used && html`<span class="text-[10px] text-teal-600 dark:text-teal-400">• in matrix</span>`}
            </div>
            <div class=${cx('flex items-center gap-2 text-[11px]', tw.textFaint)}>
              <span style=${{ color: meta.color }}>${meta.label}</span>
              <span>·</span><span>${fmt(l.mw)} g/mol</span>
              ${l.pka != null && html`<span>·</span><span>pKa ${l.pka}</span>`}
            </div>
          </div>
          <span class=${tw.textFaint}><${Icon} name="plus" size=${15} /></span>
        </button>`;
      })}
    </div>`}
  </div>`;
}
