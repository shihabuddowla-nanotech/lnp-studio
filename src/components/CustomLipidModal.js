import { html, cx, tw, useState, useEffect, useRef, Icon, Spinner } from './common.js';
import { LIPID_CLASSES } from '../lipids.js';

const CLASS_OPTIONS = Object.entries(LIPID_CLASSES).map(([k, v]) => ({ value: k, label: v.label }));
const OFFLINE_MSG = 'Could not fetch data online. Please enter details manually.';

function Field({ label, hint, required, children }) {
  return html`<label class="flex flex-col gap-1">
    <span class=${cx('text-[12px] font-medium', tw.textSub)}>${label}${required && html`<span class="ml-0.5 text-rose-500">*</span>`}</span>
    ${children}
    ${hint && html`<span class=${cx('text-[10.5px]', tw.textFaint)}>${hint}</span>`}
  </label>`;
}

export function CustomLipidModal({ open, onClose, onSave }) {
  const [form, setForm] = useState({ name: '', abbr: '', mw: '', link: '', cls: 'helper', pka: '' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(null); // { kind:'ok'|'warn', text }
  const [busy, setBusy] = useState(false);
  const [fetching, setFetching] = useState(false);
  const lastFetched = useRef('');

  useEffect(() => {
    if (open) {
      setForm({ name: '', abbr: '', mw: '', link: '', cls: 'helper', pka: '' });
      setError(''); setNotice(null); setBusy(false); setFetching(false); lastFetched.current = '';
    }
  }, [open]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && open) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const titratable = form.cls === 'ionizable' || form.cls === 'cationic';

  // --- auto-fetch lipid data from an Avanti product URL (server-side proxy) ---
  const doFetch = async () => {
    const url = form.link.trim();
    if (!url || fetching) return;
    lastFetched.current = url;
    if (!/^https?:\/\//i.test(url)) { setNotice({ kind: 'warn', text: 'Enter a full product URL starting with http:// or https://' }); return; }
    if (!navigator.onLine) { setNotice({ kind: 'warn', text: OFFLINE_MSG }); return; }
    setFetching(true); setNotice(null); setError('');
    try {
      const res = await fetch('/api/fetch-lipid?url=' + encodeURIComponent(url));
      const data = await res.json();
      if (data && data.ok) {
        setForm((f) => ({
          ...f,
          abbr: data.abbr || f.abbr,
          name: data.name || f.name,
          mw: data.mw != null ? String(data.mw) : f.mw,
          cls: data.cls || f.cls,
        }));
        setNotice({ kind: 'ok', text: `Fetched “${data.name || data.abbr}” from Avanti — review and save.` });
      } else {
        setNotice({ kind: 'warn', text: (data && data.error) || OFFLINE_MSG });
      }
    } catch (_) {
      setNotice({ kind: 'warn', text: OFFLINE_MSG });
    } finally {
      setFetching(false);
    }
  };

  const submit = async () => {
    const mw = Number(form.mw);
    if (!form.abbr.trim() && !form.name.trim()) { setError('Please enter a lipid name or abbreviation.'); return; }
    if (!(mw > 0)) { setError('Molecular weight must be a positive number (g/mol).'); return; }
    if (form.link.trim() && !/^https?:\/\//i.test(form.link.trim())) { setError('The product link must start with http:// or https://'); return; }
    setBusy(true);
    try {
      await onSave({
        name: form.name.trim() || form.abbr.trim(),
        abbr: form.abbr.trim() || form.name.trim(),
        mw, link: form.link.trim() || null, cls: form.cls,
        pka: titratable && form.pka !== '' ? Number(form.pka) : null,
      });
      onClose();
    } catch (e) {
      setError('Could not save: ' + e.message);
      setBusy(false);
    }
  };

  const inputCls = cx('w-full rounded-md border px-2.5 py-1.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30', tw.surfaceInput, tw.border, tw.text);
  // input that can show a trailing spinner while fetching
  const SpinField = ({ children }) => html`<div class="relative">${children}
    ${fetching && html`<span class=${cx('pointer-events-none absolute right-2 top-1/2 -translate-y-1/2', tw.textMute)}><${Spinner} size=${14} /></span>`}</div>`;

  return html`<div class="fixed inset-0 z-[110] flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick=${onClose}></div>
    <div class=${cx('relative w-full max-w-md rounded-xl border shadow-2xl', tw.border, tw.surface)}>
      <div class=${cx('flex items-center justify-between border-b px-4 py-3', tw.borderSoft)}>
        <div class="flex items-center gap-2">
          <span class="text-violet-600 dark:text-violet-400"><${Icon} name="plus" /></span>
          <h2 class=${cx('text-sm font-semibold', tw.text)}>Add custom lipid</h2>
        </div>
        <button class=${cx(tw.textFaint, 'hover:text-slate-600 dark:hover:text-zinc-200')} onClick=${onClose}><${Icon} name="x" /></button>
      </div>

      <div class="space-y-3 p-4">
        <${Field} label="Product / reference web link" hint="Paste an Avanti URL and Fetch to auto-fill. Opens in a new tab from the matrix header.">
          <div class="flex gap-2">
            <input class=${inputCls} type="url" placeholder="https://avantiresearch.com/product/870128"
              value=${form.link} onInput=${set('link')}
              onBlur=${() => { if (form.link.trim() && form.link.trim() !== lastFetched.current) doFetch(); }} />
            <button onClick=${doFetch} disabled=${fetching || !form.link.trim()}
              class="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-teal-500 bg-teal-50 px-3 py-1.5 text-[13px] font-semibold text-teal-700 transition hover:bg-teal-100 disabled:opacity-50 dark:border-teal-600 dark:bg-teal-600/20 dark:text-teal-200 dark:hover:bg-teal-600/40">
              ${fetching ? html`<${Spinner} size=${14} />Fetching` : html`<${Icon} name="cloud" size=${15} />Fetch`}</button>
          </div>
        </${Field}>

        <div class="grid grid-cols-2 gap-3">
          <${Field} label="Abbreviation / product name" required>
            <${SpinField}><input class=${inputCls} placeholder="e.g. 870128 or DPPC" value=${form.abbr} disabled=${fetching} onInput=${set('abbr')} /></${SpinField}>
          </${Field}>
          <${Field} label="Molecular weight" required hint="g/mol">
            <${SpinField}><input class=${inputCls} type="number" min="0" step="any" placeholder="e.g. 996.30" value=${form.mw} disabled=${fetching} onInput=${set('mw')} /></${SpinField}>
          </${Field}>
        </div>

        <${Field} label="Full chemical name">
          <${SpinField}><input class=${inputCls} placeholder="e.g. 16:0 DBCO PE" value=${form.name} disabled=${fetching} onInput=${set('name')} /></${SpinField}>
        </${Field}>

        <div class="grid grid-cols-2 gap-3">
          <${Field} label="Class" hint="Drives the predictive engine">
            <select class=${inputCls} value=${form.cls} disabled=${fetching} onChange=${set('cls')}>
              ${CLASS_OPTIONS.map((o) => html`<option key=${o.value} value=${o.value}>${o.label}</option>`)}
            </select>
          </${Field}>
          ${titratable && html`<${Field} label="Apparent pKa" hint="optional">
            <input class=${inputCls} type="number" step="any" placeholder="e.g. 6.44" value=${form.pka} onInput=${set('pka')} />
          </${Field}>`}
        </div>

        ${notice && html`<div class=${cx('flex items-start gap-1.5 rounded-md border px-3 py-2 text-[12px]',
          notice.kind === 'ok'
            ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300'
            : 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200')}>
          <span class="mt-0.5"><${Icon} name="info" size=${13} /></span><span>${notice.text}</span></div>`}
        ${error && html`<div class="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-[12px] text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300">${error}</div>`}
      </div>

      <div class=${cx('flex items-center justify-end gap-2 border-t px-4 py-3', tw.borderSoft)}>
        <button class=${cx('rounded-lg border px-3 py-1.5 text-[13px] font-medium', tw.border, tw.textSub, tw.hover)} onClick=${onClose}>Cancel</button>
        <button disabled=${busy || fetching} onClick=${submit}
          class="inline-flex items-center gap-1.5 rounded-lg border border-emerald-600 bg-emerald-600 px-3 py-1.5 text-[13px] font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50">
          <${Icon} name="save" size=${15} />${busy ? 'Saving…' : 'Save to repository'}</button>
      </div>
    </div>
  </div>`;
}
