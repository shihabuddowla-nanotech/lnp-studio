// ---------------------------------------------------------------------------
//  Predictive engine — maps a chemical formulation + payload + process
//  parameters onto the expected LNP / liposome characteristics.
//
//  These are physically-motivated heuristic regressors (Henderson–Hasselbalch
//  for charge, exponential PEG/flow scaling for size, an N/P saturation curve
//  for encapsulation). They are intended as design-space guidance, not a
//  substitute for DLS / RiboGreen measurement.
// ---------------------------------------------------------------------------

const NUCLEIC_ACIDS = ['mRNA', 'saRNA', 'siRNA', 'pDNA', 'DNA'];
const NT_MW = 325;          // g/mol average per nucleotide (1 phosphate / nt)
const SIZE_FLOOR = 40;      // hard lower physical limit (nm)

const NP_OPTIMUM = { mRNA: 6, saRNA: 6, siRNA: 3, pDNA: 6, DNA: 6 };

export function isNucleicAcid(type) {
  return NUCLEIC_ACIDS.includes(type);
}

// Aggregate molar-% by functional class + ionizable pKa stats.
export function classify(state, d) {
  const agg = { ionizable: 0, cationic: 0, helper: 0, cholesterol: 0, peg: 0, anionic: 0, fluorescent: 0 };
  let pkaW = 0, pkaWsum = 0;
  let nAmine = 0; // mmol of titratable nitrogen (ionizable + cationic)
  state.columns.forEach((c, i) => {
    const p = d.molPct[i] || 0;
    if (agg[c.cls] != null) agg[c.cls] += p;
    if ((c.cls === 'ionizable') && c.pka != null) { pkaW += p * c.pka; pkaWsum += p; }
    if ((c.cls === 'ionizable' || c.cls === 'cationic') && c.n != null) nAmine += c.n * (c.amines || 1);
  });
  return {
    byClass: agg,
    pKaEff: pkaWsum > 0 ? pkaW / pkaWsum : null,
    nAmine_mmol: nAmine,
  };
}

const fProtonated = (pH, pKa) => 1 / (1 + Math.pow(10, pH - pKa)); // amine charged when protonated

// ---------------------------------------------------------------------------
export function predict(state, d, payload, process) {
  const cls = classify(state, d);
  const C = cls.byClass;
  const peg = C.peg, ion = C.ionizable, cat = C.cationic, anion = C.anionic, chol = C.cholesterol;
  const frr = (process && process.frr > 0) ? process.frr : 1;
  const tfr = (process && process.tfr > 0) ? process.tfr : 4;
  const pType = (payload && payload.type) || 'None';
  const NA = isNucleicAcid(pType);
  const warnings = [];

  // ---- N/P ratio --------------------------------------------------------
  let computedNP = null;
  if (NA && payload.amount > 0 && cls.nAmine_mmol > 0) {
    const p_mmol = (payload.amount / 1000) / NT_MW; // µg -> mg -> mmol phosphate
    if (p_mmol > 0) computedNP = cls.nAmine_mmol / p_mmol;
  }
  const np = computedNP != null ? computedNP : (payload && payload.npRatio > 0 ? payload.npRatio : null);
  const npOpt = NP_OPTIMUM[pType] || 6;

  // ---- Morphology logic tree -------------------------------------------
  let morphology, morphDesc, morphConf;
  if (!NA) {
    if (peg >= 25 && C.helper + chol < 40) {
      morphology = 'PEGylated Micelle';
      morphDesc = 'High PEG fraction with little bilayer-forming lipid favours small monolayer micelles rather than a closed bilayer.';
      morphConf = 0.6;
    } else {
      morphology = 'Aqueous Core Liposome';
      morphDesc = 'No ionizable/nucleic-acid complex present — bilayer-forming lipids self-assemble into a closed vesicle with an aqueous lumen.';
      morphConf = 0.85;
    }
  } else if (ion >= 20) {
    morphology = 'Solid Core LNP';
    morphDesc = 'Ionizable lipid electrostatically condenses the nucleic acid into an electron-dense inverted-micellar core surrounded by a lipid monolayer.';
    morphConf = 0.85;
  } else if (ion > 0) {
    morphology = 'Loosely-Packed LNP';
    morphDesc = `Ionizable lipid is present but low (${ion.toFixed(1)} mol%); expect incomplete core condensation and a more vesicular, leakier particle.`;
    morphConf = 0.6;
    warnings.push('Ionizable mol% is below the typical 25–50% window — core packing may be incomplete.');
  } else if (cat > 0) {
    morphology = 'Cationic Lipoplex';
    morphDesc = 'Permanently cationic lipid forms a multilamellar electrostatic complex (lipoplex) with the nucleic acid rather than a true LNP core.';
    morphConf = 0.7;
  } else {
    morphology = 'Passively-Loaded Vesicle';
    morphDesc = 'A nucleic acid is specified but no ionizable/cationic lipid is available to condense it — only inefficient passive aqueous entrapment is possible.';
    morphConf = 0.5;
    warnings.push('No ionizable or cationic lipid present to complex the nucleic acid payload.');
  }

  // ---- Size & PDI regressor --------------------------------------------
  const base = NA && (ion > 0 || cat > 0) ? 110 : 130; // nm baseline (LNP vs vesicle)
  const pegFactor = Math.exp(-0.37 * peg);
  const frrFactor = 1 / (1 + 0.12 * (frr - 1));
  const tfrFactor = 1 / (1 + 0.02 * Math.max(0, tfr - 4));
  let size = SIZE_FLOOR + (base - SIZE_FLOOR) * pegFactor * frrFactor * tfrFactor;
  size = Math.max(SIZE_FLOOR, size); // hard floor

  let pdi = 0.25 - 0.02 * peg - 0.01 * (frr - 1) - 0.005 * Math.max(0, tfr - 4);
  if (peg < 0.5) pdi += 0.06;          // little steric stabiliser -> more polydisperse
  if (chol > 50) pdi += 0.03;          // very high sterol can drive heterogeneity
  pdi = Math.min(0.4, Math.max(0.03, pdi));

  // ---- Zeta potential (Henderson–Hasselbalch) --------------------------
  const Zion = 70, Zcat = 65, Zan = 50, baseline = -1.5;
  const pegShield = 1 / (1 + 0.12 * peg);
  function zetaAt(pH) {
    const pKa = cls.pKaEff != null ? cls.pKaEff : 6.5;
    const fIon = ion > 0 ? fProtonated(pH, pKa) : 0;
    const ionCharge = Zion * (ion / 100) * fIon;
    const catCharge = Zcat * (cat / 100);                  // permanent +
    const anCharge = -Zan * (anion / 100);                 // phosphate ~ fully ionised >pH3
    const z = (ionCharge + catCharge + anCharge + baseline) * pegShield;
    return Math.max(-60, Math.min(60, z));
  }
  const zeta74 = zetaAt(7.4);
  const zeta40 = zetaAt(4.0);

  // ---- Encapsulation efficiency ----------------------------------------
  let ee = null, eeBasis = '';
  if (pType === 'None') {
    ee = null; eeBasis = 'No payload specified.';
  } else if (NA && ion > 0) {
    const ionFactor = Math.min(1, ion / 35);
    let core = np != null ? (1 - Math.exp(-2.5 * np / npOpt)) : 0.6;
    const excess = np != null ? Math.max(0, np - 2 * npOpt) : 0;
    const highPenalty = 1 / (1 + 0.03 * excess);
    ee = Math.max(0, Math.min(99, 95 * core * ionFactor * highPenalty));
    eeBasis = np != null
      ? `N/P ${np.toFixed(2)} vs optimum ${npOpt}; ionizable ${ion.toFixed(1)} mol%.`
      : `Set a payload amount or N/P ratio to refine (ionizable ${ion.toFixed(1)} mol%).`;
  } else if (NA && cat > 0) {
    let core = np != null ? (1 - Math.exp(-1.6 * np / npOpt)) : 0.6;
    ee = Math.max(0, Math.min(95, 80 * core));
    eeBasis = `Cationic lipoplex condensation (N/P ${np != null ? np.toFixed(2) : '—'}).`;
  } else if (NA) {
    ee = Math.max(2, Math.min(35, 8 + (size - SIZE_FLOOR) / 6));
    eeBasis = 'Passive aqueous entrapment only (no condensing lipid).';
  } else if (pType === 'Small molecule (lipophilic)') {
    ee = Math.max(50, Math.min(92, 85 - Math.max(0, chol - 40) * 0.3));
    eeBasis = 'Membrane partitioning of a lipophilic cargo.';
  } else { // hydrophilic small molecule / protein -> passive aqueous
    ee = Math.max(3, Math.min(45, 10 + (size - SIZE_FLOOR) / 5));
    eeBasis = 'Passive aqueous-lumen entrapment (trapped-volume limited).';
  }

  // ---- design-space warnings -------------------------------------------
  if (NA && ion > 0 && np != null && (np < npOpt * 0.5 || np > npOpt * 2.5)) {
    warnings.push(`N/P ratio ${np.toFixed(1)} is far from the ${npOpt}±${(npOpt * 0.5).toFixed(0)} optimum for ${pType}.`);
  }
  if (peg > 5) warnings.push(`PEG-lipid at ${peg.toFixed(1)} mol% is high — strong steric shielding will lower potency / uptake.`);
  if (NA && ion === 0 && cat === 0) { /* already warned above */ }
  if (Math.abs(d.totals.molPct - 100) > 0.5 && d.flags.needsComposition === false) {
    // composition normalises to 100 internally; informational only
  }

  return {
    morphology, morphDesc, morphConf,
    size, pdi, sizeFloorHit: size <= SIZE_FLOOR + 1e-6,
    zeta74, zeta40, pKaEff: cls.pKaEff,
    ee, eeBasis,
    np, computedNP, npOpt,
    byClass: C,
    payloadIsNA: NA,
    warnings,
  };
}
