// ---------------------------------------------------------------------------
//  Reactive stoichiometric engine for the formulation matrix.
//
//  CANONICAL STATE (single source of truth)
//    volume               : mL  – volume of the thin-film / working solution
//    columns[i].mw        : g/mol (DB value, user-overridable)
//    columns[i].stock     : mg/ml stock concentration (pipetting source)
//    columns[i].n         : mmol of lipid i in the solution (the AMOUNT)
//    columns[i].parts     : remembered composition weight (mirrors n, but
//                           survives when amounts are cleared so a ratio can
//                           be entered before a total concentration is known)
//
//  Everything else (molar %, molar ratio, concentration, mass, stock volume)
//  is DERIVED.  Editing a derived cell back-solves the canonical state:
//
//   • Composition rows  (molar ratio, molar %)  -> re-slice at CONSTANT total
//        concentration: the edited lipid takes/cedes share, the rest keep
//        their relative proportions.
//   • Amount rows       (conc mM, n mmol, mass mg) -> change ONLY that lipid's
//        amount; the total floats.  (This is what "edit the mass and watch
//        molar %, n and stock-volume recompute" requires.)
//   • Stock-volume cell -> back-solves the lipid's stock concentration.
// ---------------------------------------------------------------------------

export const MAX_COLUMNS = 15;

let _uid = 0;
export const newUid = () => `col_${Date.now().toString(36)}_${(_uid++).toString(36)}`;

// --- input parsing ---------------------------------------------------------
export function num(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (s === '') return null;
  const n = Number(s);
  return isFinite(n) ? n : null;
}
const nn = (n) => (n == null ? null : Math.max(0, n)); // clamp non-negative

// --- pretty number formatting ---------------------------------------------
export function fmt(v) {
  if (v == null || !isFinite(v)) return '';
  if (v === 0) return '0';
  const a = Math.abs(v);
  if (a < 1e-4 || a >= 1e7) return v.toExponential(2);
  let d;
  if (a >= 100) d = 2;
  else if (a >= 10) d = 3;
  else if (a >= 1) d = 3;
  else d = 4;
  let s = v.toFixed(d);
  if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
  return s;
}

// ---------------------------------------------------------------------------
//  DERIVE – compute every displayed quantity from canonical state
// ---------------------------------------------------------------------------
export function derive(state) {
  const cols = state.columns;
  const n = cols.length;
  const V = state.volume;
  const V_L = (V != null && V > 0) ? V / 1000 : null;

  const nArr = cols.map((c) => (c.n != null ? c.n : 0));
  const sumN = nArr.reduce((a, b) => a + b, 0);
  const hasAmounts = sumN > 0;

  // Composition is defined by the user-entered molar ratio parts. The molar
  // ratio is displayed exactly as entered (raw, 0.001–100); molar % is the
  // normalised form. Amounts (n) are kept proportional to these parts.
  const ratio = cols.map((c) => (c.parts || 0));
  const sumComp = ratio.reduce((a, b) => a + b, 0);

  const molPct = ratio.map((x) => (sumComp > 0 ? (100 * x) / sumComp : 0));

  const conc = cols.map((c, i) => (hasAmounts && V_L ? nArr[i] / V_L : null)); // mM
  const totalConc = (hasAmounts && V_L) ? sumN / V_L : null;

  const massN = cols.map((c) => (c.n != null ? c.n : null));
  const mass = massN.map((mn, i) => (mn != null ? mn * cols[i].mw : null)); // mg
  const vol = mass.map((m, i) =>
    (m != null && cols[i].stock != null && cols[i].stock > 0) ? (m / cols[i].stock) * 1000 : null); // µl

  const avgMW = sumComp > 0 ? molPct.reduce((a, p, i) => a + (p / 100) * cols[i].mw, 0) : null;

  const totals = {
    ratio: ratio.reduce((a, b) => a + b, 0),
    molPct: molPct.reduce((a, b) => a + b, 0),
    mw: avgMW,
    conc: totalConc,
    n: hasAmounts ? sumN : null,
    mass: mass.some((m) => m != null) ? mass.reduce((a, m) => a + (m || 0), 0) : null,
    vol: vol.some((m) => m != null) ? vol.reduce((a, m) => a + (m || 0), 0) : null,
  };

  return {
    molPct, ratio, conc, mass, vol, totalConc, sumN, avgMW, totals,
    V_L, hasAmounts,
    flags: {
      needsVolume: !(V != null && V > 0),
      needsComposition: sumComp <= 0,
      needsTotalConc: !hasAmounts && sumComp > 0,
    },
  };
}

// ---------------------------------------------------------------------------
//  internal helpers
// ---------------------------------------------------------------------------
// Keep every lipid's amount (n) proportional to its molar-ratio part while
// holding the total moles (=> total concentration) constant. This is the
// invariant that keeps conc/mass (derived from n) consistent with molar %
// (derived from parts). It is a no-op when no amounts exist yet — until a
// total concentration is set the composition lives purely in `parts`.
function reconcileAmounts(state) {
  const sumN = state.columns.reduce((a, c) => a + (c.n || 0), 0);
  if (sumN <= 0) return state;
  const sumP = state.columns.reduce((a, c) => a + (c.parts || 0), 0);
  if (sumP <= 0) return { ...state, columns: state.columns.map((c) => ({ ...c, n: null })) };
  return { ...state, columns: state.columns.map((c) => ({ ...c, n: (c.parts / sumP) * sumN })) };
}

// ---------------------------------------------------------------------------
//  EDIT HANDLERS  (each returns a new state object)
// ---------------------------------------------------------------------------

// Composition: molar ratio cell. The raw value (clamped to 0.001–100, or 0 to
// exclude the lipid) is stored verbatim as this lipid's part and displayed
// as-is. Amounts are redistributed to keep the total concentration constant.
export function editRatio(state, i, typed) {
  let v = num(typed);
  if (v == null) v = 0;
  if (v < 0) v = 0;
  else if (v > 100) v = 100;
  const cols = state.columns.map((c, j) => (j === i ? { ...c, parts: v } : c));
  return reconcileAmounts({ ...state, columns: cols });
}

// Direct inputs
export function setStock(state, i, typed) {
  const v = nn(num(typed));
  return { ...state, columns: state.columns.map((c, j) => (j === i ? { ...c, stock: v } : c)) };
}
export function setMW(state, i, typed) {
  const v = num(typed);
  if (v == null || v <= 0) return state;
  return { ...state, columns: state.columns.map((c, j) => (j === i ? { ...c, mw: v } : c)) };
}

// Master: volume of thin-film solution (mL) – keep concentration, scale amounts.
export function setVolume(state, typed) {
  const newV = nn(num(typed));
  const oldV = state.volume;
  const sumN = state.columns.reduce((a, c) => a + (c.n || 0), 0);
  if (sumN > 0 && oldV != null && oldV > 0 && newV != null && newV > 0) {
    const f = newV / oldV;
    return { ...state, volume: newV, columns: state.columns.map((c) => ({ ...c, n: c.n != null ? c.n * f : c.n })) };
  }
  return { ...state, volume: newV };
}

// Master: total concentration (mM). Holds the molar-ratio composition and
// (re)derives every lipid's amount from its part — never disturbs the ratios.
export function setTotalConc(state, typed) {
  const target = num(typed);
  const V_L = (state.volume != null && state.volume > 0) ? state.volume / 1000 : null;
  if (!V_L || target == null || target <= 0) return state;
  const sumP = state.columns.reduce((a, c) => a + (c.parts || 0), 0);
  if (sumP <= 0) return state;
  const cols = state.columns.map((c) => ({ ...c, n: (c.parts / sumP) * target * V_L }));
  return { ...state, columns: cols };
}

// ---------------------------------------------------------------------------
//  COLUMN / FORMULATION management
// ---------------------------------------------------------------------------
export function columnFromLipid(lipid) {
  return {
    uid: newUid(),
    lipidId: lipid.id,
    name: lipid.name,
    abbr: lipid.abbr,
    cls: lipid.cls,
    pka: lipid.pka ?? null,
    amines: lipid.amines ?? 0,
    mw: lipid.mw,
    stock: lipid.stock ?? null,
    link: lipid.link || null,      // product / reference URL (custom lipids)
    source: lipid.source || null,
    n: null,
    parts: 1, // default equal composition share until a ratio is entered
  };
}

export function addColumn(state, lipid) {
  if (state.columns.length >= MAX_COLUMNS) return state;
  // Reconcile so a lipid added to an already-scaled formulation receives its
  // molar-ratio share of the amount (keeps molar %, conc and mass consistent).
  return reconcileAmounts({ ...state, columns: [...state.columns, columnFromLipid(lipid)] });
}
export function removeColumn(state, uid) {
  const oldSumN = state.columns.reduce((a, c) => a + (c.n || 0), 0);
  const remaining = state.columns.filter((c) => c.uid !== uid);
  const sumP = remaining.reduce((a, c) => a + (c.parts || 0), 0);
  // Symmetric with addColumn: removing a lipid holds the TOTAL concentration
  // fixed (the anchor the user set). The remaining lipids re-absorb the freed
  // share at constant total moles, so molar % renormalises but the total — and
  // every other lipid's mass/stock-volume relative to it — stays put. Without
  // this the total silently ratchets down each time a lipid is removed.
  if (oldSumN > 0 && sumP > 0) {
    return { ...state, columns: remaining.map((c) => ({ ...c, n: (c.parts / sumP) * oldSumN })) };
  }
  return { ...state, columns: remaining };
}
export function clearAmounts(state) {
  // keep columns + composition, drop the absolute amounts
  return { ...state, columns: state.columns.map((c) => ({ ...c, n: null })) };
}

// Build a full formulation from an example / preset descriptor.
export function applyPreset(preset, lipidLookup) {
  const columns = preset.components.map((comp) => {
    const lipid = lipidLookup(comp.id);
    const col = columnFromLipid(lipid || { id: comp.id, name: comp.id, abbr: comp.id, cls: 'helper', mw: comp.mw || 700 });
    col.parts = comp.molPct;
    return col;
  });
  let state = { volume: preset.volume ?? 1, columns };
  // seed amounts from composition + total concentration
  state = setTotalConc(state, preset.totalConc);
  return state;
}
