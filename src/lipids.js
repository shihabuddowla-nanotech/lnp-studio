// ---------------------------------------------------------------------------
//  Avanti Polar Lipids – seed repository
// ---------------------------------------------------------------------------
//  Each record:
//    id      : stable slug (used as DB primary key)
//    name    : full chemical name
//    abbr    : common abbreviation / catalog name
//    mw      : molar weight (g/mol)
//    pka     : apparent pKa (ionizable / titratable lipids only)
//    cls     : functional class -> drives the predictive engine
//              one of: ionizable | cationic | helper | cholesterol | peg |
//                      anionic | fluorescent
//    amines  : titratable nitrogen atoms per molecule (for N/P calc)
//    stock   : sensible default stock concentration (mg/ml) – user editable
//    smiles  : optional structure string
//    source  : provenance label
//
//  Molar weights follow Avanti / vendor spec sheets. Every value remains
//  user-editable inside the matrix.
// ---------------------------------------------------------------------------

export const LIPID_CLASSES = {
  ionizable:   { label: 'Ionizable',      color: '#f59e0b' },
  cationic:    { label: 'Cationic',       color: '#ef4444' },
  helper:      { label: 'Helper / PC-PE', color: '#38bdf8' },
  cholesterol: { label: 'Sterol',         color: '#a3e635' },
  peg:         { label: 'PEG-lipid',      color: '#c084fc' },
  anionic:     { label: 'Anionic',        color: '#2dd4bf' },
  fluorescent: { label: 'Fluorescent',    color: '#fb7185' },
};

export const SEED_LIPIDS = [
  // ---- Ionizable lipids -------------------------------------------------
  { id: 'dlin-mc3-dma', name: 'DLin-MC3-DMA',  abbr: 'MC3',        mw: 642.09, pka: 6.44, cls: 'ionizable', amines: 1, stock: 50,
    smiles: 'CCCCCC/C=C\\C/C=C\\CCCCCCCCC(CCCCCC/C=C\\C/C=C\\CCCCC)OC(=O)CCC[N](C)C' , source: 'Avanti' },
  { id: 'dlin-kc2-dma', name: 'DLin-KC2-DMA',  abbr: 'KC2',        mw: 642.61, pka: 6.70, cls: 'ionizable', amines: 1, stock: 50, source: 'Avanti' },
  { id: 'sm-102',       name: 'SM-102',         abbr: 'SM-102',     mw: 710.18, pka: 6.68, cls: 'ionizable', amines: 1, stock: 50, source: 'Avanti' },
  { id: 'alc-0315',     name: 'ALC-0315',       abbr: 'ALC-0315',   mw: 766.29, pka: 6.09, cls: 'ionizable', amines: 1, stock: 50, source: 'Avanti' },
  { id: 'dodma',        name: 'DODMA (1,2-dioleyloxy-3-dimethylaminopropane)', abbr: 'DODMA', mw: 614.06, pka: 6.50, cls: 'ionizable', amines: 1, stock: 50, source: 'Avanti' },
  { id: 'dlindma',      name: 'DLinDMA',        abbr: 'DLinDMA',    mw: 583.03, pka: 6.30, cls: 'ionizable', amines: 1, stock: 50, source: 'Avanti' },
  { id: 'dodap',        name: '1,2-Dioleoyl-3-dimethylammonium-propane', abbr: 'DODAP', mw: 648.06, pka: 6.60, cls: 'ionizable', amines: 1, stock: 50, source: 'Avanti' },
  { id: 'c12-200',      name: 'C12-200',        abbr: 'C12-200',    mw: 978.66, pka: 7.10, cls: 'ionizable', amines: 5, stock: 25, source: 'Avanti' },

  // ---- Permanently cationic --------------------------------------------
  { id: 'dotap',        name: '1,2-Dioleoyl-3-trimethylammonium-propane (chloride salt)', abbr: 'DOTAP', mw: 698.54, cls: 'cationic', amines: 1, stock: 25,
    smiles: 'CCCCCCCC/C=C\\CCCCCCCCC(=O)OCC(C[N+](C)(C)C)OC(=O)CCCCCCC/C=C\\CCCCCCCC.[Cl-]', source: 'Avanti' },
  { id: 'dotma',        name: 'DOTMA',          abbr: 'DOTMA',      mw: 670.59, cls: 'cationic', amines: 1, stock: 25, source: 'Avanti' },
  { id: 'ddab',         name: 'Dimethyldioctadecylammonium bromide', abbr: 'DDAB', mw: 630.95, cls: 'cationic', amines: 1, stock: 25, source: 'Avanti' },
  { id: 'dc-chol',      name: 'DC-Cholesterol',  abbr: 'DC-Chol',   mw: 537.27, cls: 'cationic', amines: 1, stock: 25, source: 'Avanti' },

  // ---- Helper phospholipids (PC / PE) ----------------------------------
  { id: 'dspc', name: '1,2-Distearoyl-sn-glycero-3-phosphocholine', abbr: 'DSPC', mw: 790.15, cls: 'helper', amines: 0, stock: 25,
    smiles: 'CCCCCCCCCCCCCCCCCC(=O)OCC(COP([O-])(=O)OCC[N+](C)(C)C)OC(=O)CCCCCCCCCCCCCCCCC', source: 'Avanti' },
  { id: 'dppc', name: '1,2-Dipalmitoyl-sn-glycero-3-phosphocholine', abbr: 'DPPC', mw: 733.04, cls: 'helper', amines: 0, stock: 25, source: 'Avanti' },
  { id: 'dmpc', name: '1,2-Dimyristoyl-sn-glycero-3-phosphocholine', abbr: 'DMPC', mw: 677.93, cls: 'helper', amines: 0, stock: 25, source: 'Avanti' },
  { id: 'dopc', name: '1,2-Dioleoyl-sn-glycero-3-phosphocholine',    abbr: 'DOPC', mw: 786.11, cls: 'helper', amines: 0, stock: 25, source: 'Avanti' },
  { id: 'popc', name: '1-Palmitoyl-2-oleoyl-sn-glycero-3-phosphocholine', abbr: 'POPC', mw: 760.08, cls: 'helper', amines: 0, stock: 25, source: 'Avanti' },
  { id: 'dope', name: '1,2-Dioleoyl-sn-glycero-3-phosphoethanolamine', abbr: 'DOPE', mw: 744.03, cls: 'helper', amines: 0, stock: 25, source: 'Avanti' },
  { id: 'dppe', name: '1,2-Dipalmitoyl-sn-glycero-3-phosphoethanolamine', abbr: 'DPPE', mw: 691.96, cls: 'helper', amines: 0, stock: 25, source: 'Avanti' },
  { id: 'dspe', name: '1,2-Distearoyl-sn-glycero-3-phosphoethanolamine', abbr: 'DSPE', mw: 748.07, cls: 'helper', amines: 0, stock: 25, source: 'Avanti' },
  { id: 'pope', name: '1-Palmitoyl-2-oleoyl-sn-glycero-3-phosphoethanolamine', abbr: 'POPE', mw: 718.00, cls: 'helper', amines: 0, stock: 25, source: 'Avanti' },
  { id: 'esm',  name: 'Egg Sphingomyelin',     abbr: 'ESM',        mw: 703.03, cls: 'helper', amines: 0, stock: 25, source: 'Avanti' },

  // ---- Sterols ---------------------------------------------------------
  { id: 'cholesterol', name: 'Cholesterol (ovine wool, >98%)', abbr: 'Chol', mw: 386.65, cls: 'cholesterol', amines: 0, stock: 25,
    smiles: 'CC(C)CCCC(C)C1CCC2C1(CCC3C2CC=C4C3(CCC(C4)O)C)C', source: 'Avanti' },
  { id: 'b-sitosterol', name: 'β-Sitosterol',  abbr: 'β-Sito',     mw: 414.71, cls: 'cholesterol', amines: 0, stock: 25, source: 'Avanti' },

  // ---- PEG-lipids ------------------------------------------------------
  { id: 'dmg-peg2000',  name: '1,2-Dimyristoyl-rac-glycero-3-methoxypolyethylene glycol-2000', abbr: 'DMG-PEG2000', mw: 2509.20, cls: 'peg', amines: 0, stock: 25, source: 'Avanti' },
  { id: 'dspe-peg2000', name: 'DSPE-PEG2000 (methoxy)', abbr: 'DSPE-PEG2000', mw: 2805.50, cls: 'peg', amines: 0, stock: 25, source: 'Avanti' },
  { id: 'alc-0159',     name: 'ALC-0159 (PEG2000-DMG)', abbr: 'ALC-0159', mw: 2486.60, cls: 'peg', amines: 0, stock: 25, source: 'Avanti' },
  { id: 'dppe-peg2000', name: 'DPPE-PEG2000',  abbr: 'DPPE-PEG2000', mw: 2749.40, cls: 'peg', amines: 0, stock: 25, source: 'Avanti' },
  { id: 'dspe-peg2000-amine', name: 'DSPE-PEG2000 Amine', abbr: 'DSPE-PEG2000-NH2', mw: 2790.51, cls: 'peg', amines: 1, stock: 25, source: 'Avanti' },
  { id: 'dspe-peg2000-mal',   name: 'DSPE-PEG2000 Maleimide', abbr: 'DSPE-PEG2000-Mal', mw: 2942.62, cls: 'peg', amines: 0, stock: 25, source: 'Avanti' },
  { id: 'dspe-peg2000-biotin',name: 'DSPE-PEG2000 Biotin', abbr: 'DSPE-PEG2000-Biotin', mw: 3017.74, cls: 'peg', amines: 0, stock: 25, source: 'Avanti' },

  // ---- Anionic ---------------------------------------------------------
  { id: 'dops', name: '1,2-Dioleoyl-sn-glycero-3-phospho-L-serine (sodium salt)', abbr: 'DOPS', mw: 810.02, cls: 'anionic', amines: 0, stock: 25, source: 'Avanti' },
  { id: 'dopg', name: '1,2-Dioleoyl-sn-glycero-3-phospho-(1′-rac-glycerol) (sodium salt)', abbr: 'DOPG', mw: 797.03, cls: 'anionic', amines: 0, stock: 25, source: 'Avanti' },
  { id: 'dppa', name: '1,2-Dipalmitoyl-sn-glycero-3-phosphate (sodium salt)', abbr: 'DPPA', mw: 670.87, cls: 'anionic', amines: 0, stock: 25, source: 'Avanti' },

  // ---- Fluorescent probes ----------------------------------------------
  { id: '18-1-liss-rhod-pe', name: '18:1 Liss Rhod PE', abbr: 'Liss Rhod PE', mw: 1301.71, cls: 'fluorescent', amines: 0, stock: 1, source: 'Avanti' },
  { id: '18-1-nbd-pe',       name: '18:1 NBD PE',       abbr: 'NBD PE',       mw: 957.24,  cls: 'fluorescent', amines: 0, stock: 1, source: 'Avanti' },
];

// A canonical, literature-standard MC3 mRNA-LNP as a one-click demo.
export const EXAMPLE_FORMULATIONS = {
  'mc3-mrna-lnp': {
    label: 'MC3 mRNA-LNP (50:10:38.5:1.5)',
    totalConc: 10,      // mM total lipid in the thin-film / working solution
    volume: 1,          // mL
    components: [
      { id: 'dlin-mc3-dma', molPct: 50.0 },
      { id: 'dspc',         molPct: 10.0 },
      { id: 'cholesterol',  molPct: 38.5 },
      { id: 'dmg-peg2000',  molPct: 1.5 },
    ],
    // ~N/P 6 for the 0.005 mmol ionizable amine in this 10 mM / 1 mL batch
    payload: { type: 'mRNA', amount: 271, npRatio: 6 },
    process: { frr: 3, tfr: 12 },
  },
  'sm102-mrna-lnp': {
    label: 'SM-102 mRNA-LNP (50:10:38.5:1.5)',
    totalConc: 10,
    volume: 1,
    components: [
      { id: 'sm-102',      molPct: 50.0 },
      { id: 'dspc',        molPct: 10.0 },
      { id: 'cholesterol', molPct: 38.5 },
      { id: 'dmg-peg2000', molPct: 1.5 },
    ],
    payload: { type: 'mRNA', amount: 271, npRatio: 6 },
    process: { frr: 3, tfr: 12 },
  },
  'classic-liposome': {
    label: 'Conventional Liposome (DSPC:Chol 55:45)',
    totalConc: 20,
    volume: 1,
    components: [
      { id: 'dspc',        molPct: 55.0 },
      { id: 'cholesterol', molPct: 45.0 },
    ],
    payload: { type: 'None', amount: 0, npRatio: 0 },
    process: { frr: 1, tfr: 4 },
  },
};
