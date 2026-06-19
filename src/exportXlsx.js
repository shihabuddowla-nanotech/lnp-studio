// ---------------------------------------------------------------------------
//  Excel export (SheetJS / xlsx).  Produces a multi-sheet workbook:
//    1. Formulation   – the primary calculator matrix
//    2. SI Units      – the read-only SI mirror
//    3. Predictions   – LNP characteristic estimates
//    4. Lipid Library – the lipids used (with structure data)
// ---------------------------------------------------------------------------
const XLSX = window.XLSX;

const r = (v, dp = 4) => (v == null || !isFinite(v) ? '' : Number(Number(v).toFixed(dp)));

export function buildWorkbook({ state, d, prediction, payload, process }) {
  const cols = state.columns;
  const abbrs = cols.map((c) => c.abbr || c.name);

  // ---- Sheet 1: Formulation matrix -------------------------------------
  const head = ['Property / Lipid', ...abbrs, 'Total'];
  const m = [
    head,
    ['Molar ratio', ...d.ratio.map((v) => r(v, 3)), r(d.totals.ratio, 3)],
    ['Molar %', ...d.molPct.map((v) => r(v, 3)), r(d.totals.molPct, 2)],
    ['Molar weight (g/mol)', ...cols.map((c) => r(c.mw, 2)), r(d.totals.mw, 2)],
    ['Stock solution conc. (mg/ml)', ...cols.map((c) => r(c.stock, 3)), ''],
    ['Conc. in thin film sol. (mM)', ...d.conc.map((v) => r(v, 4)), r(d.totals.conc, 4)],
    ['n (mmol) in thin film sol.', ...cols.map((c) => r(c.n, 6)), r(d.totals.n, 6)],
    ['Mass (mg)', ...d.mass.map((v) => r(v, 5)), r(d.totals.mass, 5)],
    ['Vol. of stock for 1 ml film (µl)', ...d.vol.map((v) => r(v, 3)), r(d.totals.vol, 3)],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(m);
  ws1['!cols'] = [{ wch: 30 }, ...abbrs.map(() => ({ wch: 14 })), { wch: 12 }];

  // ---- Sheet 2: SI Units -----------------------------------------------
  const V_L = d.V_L;
  const si = [
    head,
    ['Conc. in thin film sol. (M)', ...d.conc.map((v) => (v == null ? '' : r(v / 1000, 7))), r(d.totalConc == null ? null : d.totalConc / 1000, 7)],
    ['Volume of thin film sol. (l)', ...cols.map(() => ''), r(V_L, 6)],
    ['n (mol) in thin film sol.', ...cols.map((c) => (c.n == null ? '' : r(c.n / 1000, 9))), r(d.totals.n == null ? null : d.totals.n / 1000, 9)],
    ['Mass (g)', ...d.mass.map((v) => (v == null ? '' : r(v / 1000, 7))), r(d.totals.mass == null ? null : d.totals.mass / 1000, 7)],
    ['Vol. of stock for 1 ml film (ml)', ...d.vol.map((v) => (v == null ? '' : r(v / 1000, 6))), r(d.totals.vol == null ? null : d.totals.vol / 1000, 6)],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(si);
  ws2['!cols'] = ws1['!cols'];

  // ---- Sheet 3: Predictions --------------------------------------------
  const p = prediction;
  const pred = [
    ['LNP / Liposome Predicted Characteristics', ''],
    ['Generated', new Date().toLocaleString()],
    ['', ''],
    ['Payload type', payload.type],
    ['Payload amount (µg)', r(payload.amount, 3)],
    ['Flow rate ratio (aq:org)', r(process.frr, 2)],
    ['Total flow rate (ml/min)', r(process.tfr, 2)],
    ['', ''],
    ['Morphology', p.morphology],
    ['Morphology note', p.morphDesc],
    ['Predicted size (nm)', r(p.size, 1)],
    ['Predicted PDI', r(p.pdi, 3)],
    ['Size floor hit (40 nm)', p.sizeFloorHit ? 'YES' : 'no'],
    ['Zeta @ pH 7.4 (mV)', r(p.zeta74, 1)],
    ['Zeta @ pH 4.0 (mV)', r(p.zeta40, 1)],
    ['Apparent pKa (ionizable)', r(p.pKaEff, 2)],
    ['Encapsulation efficiency (%)', p.ee == null ? 'n/a' : r(p.ee, 1)],
    ['EE basis', p.eeBasis],
    ['N/P ratio (used)', p.np == null ? 'n/a' : r(p.np, 2)],
    ['N/P optimum', p.npOpt],
    ['', ''],
    ['Composition by class (mol%)', ''],
    ['  Ionizable', r(p.byClass.ionizable, 2)],
    ['  Cationic', r(p.byClass.cationic, 2)],
    ['  Helper (PC/PE)', r(p.byClass.helper, 2)],
    ['  Sterol', r(p.byClass.cholesterol, 2)],
    ['  PEG-lipid', r(p.byClass.peg, 2)],
    ['  Anionic', r(p.byClass.anionic, 2)],
    ['', ''],
    ['Warnings', p.warnings.length ? '' : 'none'],
    ...p.warnings.map((w) => ['', w]),
  ];
  const ws3 = XLSX.utils.aoa_to_sheet(pred);
  ws3['!cols'] = [{ wch: 30 }, { wch: 60 }];

  // ---- Sheet 4: Lipid library ------------------------------------------
  const lib = [['Abbr', 'Name', 'Class', 'MW (g/mol)', 'pKa', 'Stock (mg/ml)', 'SMILES']];
  cols.forEach((c) => lib.push([c.abbr, c.name, c.cls, r(c.mw, 2), c.pka == null ? '' : c.pka, r(c.stock, 2), c.smiles || '']));
  const ws4 = XLSX.utils.aoa_to_sheet(lib);
  ws4['!cols'] = [{ wch: 16 }, { wch: 44 }, { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 50 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws1, 'Formulation');
  XLSX.utils.book_append_sheet(wb, ws2, 'SI Units');
  XLSX.utils.book_append_sheet(wb, ws3, 'Predictions');
  XLSX.utils.book_append_sheet(wb, ws4, 'Lipid Library');
  return wb;
}

export function exportFormulation(args, filename) {
  const wb = buildWorkbook(args);
  const name = filename || `LNP_formulation_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.xlsx`;
  XLSX.writeFile(wb, name);
}
